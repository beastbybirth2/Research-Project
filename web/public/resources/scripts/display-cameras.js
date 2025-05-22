const API_URL_CAMERAS = 'http://localhost:5000/api/cameras';
const API_URL_KNOWN_FACES = 'http://localhost:5000/api/known-faces';
const API_URL_FACE_ALERT = 'http://localhost:5000/api/face-alert';
const API_BASE_URL = 'http://localhost:5000';
const MODELS_URL = '/resources/models'; // Path relative to camera.html

let faceApiLoaded = false;
const detectionIntervals = {};
const faceDetectionOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
let knownFaceMatcher = null;
const unknownFaceSendTimestamps = {}; // cameraId_faceIndex: timestamp

const unknownFaceTracker = {}; // Format: { cameraId: { detectionBoxKey: { count: N, firstSeen: timestamp, alerted: false } } }
const UNKNOWN_FACE_CONFIRMATION_FRAMES = 2; // Number of consecutive frames to see an unknown face before alerting
const UNKNOWN_FACE_ALERT_COOLDOWN = 30000; // 30 seconds cooldown per specific unknown face before re-alerting
const UNKNOWN_FACE_TRACKER_TTL = 60000;

const MAX_RECENT_UNKNOWNS = 10; // How many recent unknowns to display
let recentUnknownFacesQueue = [];


async function loadFaceApiModels() {
    console.log("[FaceAPI] Attempting to load models from:", MODELS_URL);
    const manifestSuffix = '-weights_manifest.json';
    const modelUris = {
        tinyFaceDetector: `${MODELS_URL}/tiny_face_detector_model${manifestSuffix}`,
        faceLandmark68Net: `${MODELS_URL}/face_landmark_68_model${manifestSuffix}`,
        faceRecognitionNet: `${MODELS_URL}/face_recognition_model${manifestSuffix}`,
        ssdMobilenetv1: `${MODELS_URL}/ssd_mobilenetv1_model${manifestSuffix}`
    };

    try {
        // Test if one of the manifest files is accessible
        const testUrl = modelUris.tinyFaceDetector.replace(manifestSuffix, '.bin'); // test a .bin file
        console.log("[FaceAPI] Testing model file accessibility with:", testUrl);
        const testResponse = await fetch(testUrl.replace(manifestSuffix, '_model.bin')); // or a .bin file
        if (!testResponse.ok) {
            console.error(`[FaceAPI] Failed to fetch a test model file (${testUrl}). Status: ${testResponse.status}. Ensure models are in 'public/resources/models/' and server serves them.`);
            $('#cameras-container').html(`<div class="alert alert-danger">Error: Could not access face detection model files at ${MODELS_URL}. Please check server configuration and file paths.</div>`);
            return; // Stop further loading if a basic file isn't found
        }
        console.log("[FaceAPI] Test model file access successful.");

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL)
        ]);
        faceApiLoaded = true;
        console.log("[FaceAPI] All models loaded successfully.");
        await loadKnownFaces();
        fetchAndDisplayCameras();
    } catch (error) {
        console.error("[FaceAPI] CRITICAL ERROR loading models:", error);
        let errorMsg = `Failed to load face detection models. See console for details.`;
        if (error.message && error.message.includes('404')) {
            errorMsg += ` One or more model files were not found (404). Ensure models are in ${MODELS_URL} and served correctly.`;
        }
        $('#cameras-container').html(`<div class="alert alert-danger">${errorMsg}</div>`);
    }
}

function addRecentUnknownFace(logEntry) {
    // Add to the beginning of the queue
    recentUnknownFacesQueue.unshift({
        logId: logEntry._id,
        faceImage: logEntry.faceImage,
        cameraName: logEntry.cameraName,
        timestamp: new Date(logEntry.timestamp).toLocaleString()
    });
    // Keep the queue size limited
    if (recentUnknownFacesQueue.length > MAX_RECENT_UNKNOWNS) {
        recentUnknownFacesQueue.pop();
    }
    renderRecentUnknownFaces();
}

function renderRecentUnknownFaces() {
    const listElement = $('#recent-unknowns-list');
    listElement.empty(); // Clear previous entries
    console.log('updating')
    if (recentUnknownFacesQueue.length === 0) {
         // The :empty::after CSS pseudo-element will show the "No recent..." message
        return;
    }

    recentUnknownFacesQueue.forEach(entry => {
        const thumb = $('<img>')
            .addClass('unknown-face-thumbnail')
            .attr('src', entry.faceImage)
            .attr('alt', `Unknown face on ${entry.cameraName} at ${entry.timestamp}`)
            .attr('title', `Camera: ${entry.cameraName}\nTime: ${entry.timestamp}\nID: ${entry.logId}`);
        // Optional: Add click listener to show more details in a modal
        // thumb.on('click', () => showIntrusionDetailsModal(entry));
        listElement.append(thumb);
    });
}

async function loadKnownFaces() {
    if (!faceApiLoaded) {
        console.warn("[KnownFaces] FaceAPI not loaded, skipping loading known faces.");
        return;
    }
    console.log("[KnownFaces] Fetching known faces...");
    try {
        const response = await fetch(API_URL_KNOWN_FACES);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const serverData = await response.json();
        console.log("[KnownFaces] Received from server (raw):", JSON.stringify(serverData, null, 2));

        const labeledDescriptors = serverData.map(item => {
            if (!item.descriptors || !Array.isArray(item.descriptors) || item.descriptors.length === 0) {
                 console.warn(`[KnownFaces Load] No valid descriptors array for "${item.label}". Skipping this label.`);
                 return null;
            }

            const reconstructedFloat32Arrays = item.descriptors.map((descElement, descIndex) => {
                let actualDescArray;

                // ---- THIS IS THE KEY CHANGE ----
                if (Array.isArray(descElement)) {
                    actualDescArray = descElement; // It's already an array
                } else if (typeof descElement === 'object' && descElement !== null) {
                    // It's an object like {"0": val, "1": val, ...}, convert to array
                    console.warn(`[KnownFaces Load] Descriptor for "${item.label}" index ${descIndex} is an object, converting to array.`);
                    actualDescArray = Object.values(descElement);
                } else {
                    console.error(`[KnownFaces Load] Descriptor for "${item.label}" index ${descIndex} is not an array or a convertible object:`, descElement);
                    return null;
                }
                // ---- END OF KEY CHANGE ----

                if (actualDescArray.length !== 128) {
                    console.error(`[KnownFaces Load] Converted/original descriptor for "${item.label}", index ${descIndex} has incorrect length. Expected 128, got ${actualDescArray.length}.`);
                    console.log(`Problematic descriptor (after potential conversion) for ${item.label}[${descIndex}]:`, actualDescArray);
                    return null; 
                }
                
                if (!actualDescArray.every(n => typeof n === 'number' && !isNaN(n))) {
                    console.error(`[KnownFaces Load] Descriptor array for "${item.label}", index ${descIndex} contains non-numeric or NaN values after conversion.`);
                    console.log(`Problematic non-numeric descriptor for ${item.label}[${descIndex}]:`, actualDescArray);
                    return null;
                }
                return new Float32Array(actualDescArray);
            }).filter(d => d !== null); 

            if (reconstructedFloat32Arrays.length === 0) {
                console.warn(`[KnownFaces Load] No valid descriptors for "${item.label}" after filtering. This label won't be used for matching.`);
                return null;
            }
            return new faceapi.LabeledFaceDescriptors(item.label, reconstructedFloat32Arrays);
        }).filter(ld => ld !== null); 

        if (labeledDescriptors.length > 0) {
            knownFaceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
            console.log("[KnownFaces] FaceMatcher created/updated for labels:", labeledDescriptors.map(ld => ld.label).join(', '));
        } else {
            knownFaceMatcher = null;
            console.log("[KnownFaces] No valid known faces to create a matcher.");
        }
    } catch (error) {
        console.error("[KnownFaces] Error loading known faces:", error);
        knownFaceMatcher = null;
    }
}
async function startFaceDetection(cameraId, imgElementId, overlayCanvasId) {
    if (!faceApiLoaded) { /* ... */ return; }
    if (detectionIntervals[cameraId]) { /* ... */ return; }

    const imgElement = document.getElementById(imgElementId);
    const overlayCanvas = document.getElementById(overlayCanvasId);
    const cameraCard = $(`#${cameraId}`);
    const cameraName = cameraCard.find('.card-title').text() || 'Unnamed Camera';

    if (!imgElement || !overlayCanvas) { /* ... */ return; }
    console.log(`[FaceDetect] Starting detection loop for ${cameraId}`);
    
    if (!unknownFaceTracker[cameraId]) {
        unknownFaceTracker[cameraId] = {};
    }

    detectionIntervals[cameraId] = setInterval(async () => {
        if (!imgElement.parentNode || !imgElement.complete || imgElement.naturalWidth === 0) return;
        const displaySize = { width: imgElement.offsetWidth, height: imgElement.offsetHeight };
        if (displaySize.width === 0 || displaySize.height === 0) return;
        faceapi.matchDimensions(overlayCanvas, displaySize);

        // Cleanup old entries in tracker for this camera
        const nowForCleanup = Date.now();
        for (const boxKey in unknownFaceTracker[cameraId]) {
            if (nowForCleanup - unknownFaceTracker[cameraId][boxKey].lastSeen > UNKNOWN_FACE_TRACKER_TTL) {
                delete unknownFaceTracker[cameraId][boxKey];
            }
        }

        try {
            const detections = await faceapi.detectAllFaces(imgElement, faceDetectionOptions)
                .withFaceLandmarks()
                .withFaceDescriptors();

            const context = overlayCanvas.getContext('2d');
            context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            const currentFrameDetections = new Set(); // To track which boxes are seen in this frame

            if (detections.length > 0) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                resizedDetections.forEach(async (detection, i) => {
                    const box = detection.detection.box;
                    // Create a somewhat stable key for the detection based on its rough position and size
                    // This helps track the same "unknown" person across slight movements.
                    const detectionBoxKey = `${Math.round(box.x / 20)}_${Math.round(box.y / 20)}_${Math.round(box.width / 20)}_${Math.round(box.height / 20)}`;
                    currentFrameDetections.add(detectionBoxKey);

                    let bestMatch = { label: 'unknown', distance: 1.0 };
                    let boxColor = 'red';
                    let label = 'Identifying...'; // Initial state

                    if (detection.descriptor) {
                        if (detection.descriptor.length !== 128) { /* ... error handling ... */ return; }
                        if (knownFaceMatcher) {
                            bestMatch = knownFaceMatcher.findBestMatch(detection.descriptor);
                            if (bestMatch.label !== 'unknown') {
                                boxColor = 'lightgreen';
                                label = `${bestMatch.label} (${bestMatch.distance.toFixed(2)})`;
                                // If it was previously tracked as unknown, reset its state
                                if (unknownFaceTracker[cameraId][detectionBoxKey]) {
                                    delete unknownFaceTracker[cameraId][detectionBoxKey];
                                }
                            } else {
                                label = `Unknown (${bestMatch.distance.toFixed(2)})`;
                            }
                        } else {
                            label = 'Unknown (Matcher N/A)';
                        }
                    } else {
                        label = 'No Descriptor';
                    }
                    
                    new faceapi.draw.DrawBox(box, { label, boxColor }).draw(overlayCanvas);

                    if (bestMatch.label === 'unknown' && detection.descriptor) {
                        const now = Date.now();
                        if (!unknownFaceTracker[cameraId][detectionBoxKey]) {
                            unknownFaceTracker[cameraId][detectionBoxKey] = {
                                count: 1,
                                firstSeen: now,
                                lastSeen: now,
                                alerted: false,
                                faceImageSnapshot: null // Will store image when count is met
                            };
                        } else {
                            unknownFaceTracker[cameraId][detectionBoxKey].count++;
                            unknownFaceTracker[cameraId][detectionBoxKey].lastSeen = now;
                        }

                        const trackerEntry = unknownFaceTracker[cameraId][detectionBoxKey];

                        if (trackerEntry.count >= UNKNOWN_FACE_CONFIRMATION_FRAMES && !trackerEntry.alerted) {
                            // Check cooldown only if we are about to alert
                            const lastGlobalAlertTime = unknownFaceSendTimestamps[cameraId] || 0; // Use a camera-wide cooldown for general unknown alerts
                            
                            if (now - lastGlobalAlertTime > UNKNOWN_FACE_ALERT_COOLDOWN) {
                                // Take snapshot if not already taken for this confirmed unknown sequence
                                if (!trackerEntry.faceImageSnapshot) {
                                    try {
                                        const faceCanvases = await faceapi.extractFaces(imgElement, [detection.detection]);
                                        if (faceCanvases.length > 0) {
                                            trackerEntry.faceImageSnapshot = faceCanvases[0].toDataURL('image/jpeg', 0.8);
                                            faceCanvases.forEach(fc => fc.remove());
                                        }
                                    } catch (extractError) {
                                        console.error(`[FaceExtract] Error extracting face on ${cameraId}:`, extractError);
                                    }
                                }
                                
                                if (trackerEntry.faceImageSnapshot) {
                                    sendUnknownFaceAlert(trackerEntry.faceImageSnapshot, cameraName);
                                    trackerEntry.alerted = true; // Mark as alerted for this specific tracked box
                                    unknownFaceSendTimestamps[cameraId] = now; // Update camera-wide cooldown timestamp
                                    
                                    // Optionally, reset count to allow re-alert after cooldown if still unknown
                                    // or keep alerted=true to prevent re-alert for this specific person/box
                                    // For now, we mark alerted=true, and the boxKey will eventually expire or be deleted if the person leaves.
                                }
                            } else {
                                console.log(`[Alert] Unknown face ${detectionBoxKey} confirmed on ${cameraName}, but in camera-wide cooldown.`);
                            }
                        }
                    }
                });
            }

            // For any boxes that were tracked but not seen in this frame, reset their count.
            for (const boxKey in unknownFaceTracker[cameraId]) {
                if (!currentFrameDetections.has(boxKey)) {
                    unknownFaceTracker[cameraId][boxKey].count = 0; // Reset count if face is momentarily lost
                    // Or, you could implement a grace period before resetting count
                }
            }

        } catch (error) {
            console.error(`[FaceDetect] Error during detection for ${cameraId}:`, error);
        }
    }, 500); // Detection interval (ms). Frame rate for alert logic = 1000ms / this_interval * UNKNOWN_FACE_CONFIRMATION_FRAMES
             // e.g., 1000/200ms * 5 frames = 1 second confirmation time
}

async function sendUnknownFaceAlert(faceImageDataUrl, cameraName) {
    console.log(`[Alert] Sending unknown face from ${cameraName}`);
    try {
        const response = await fetch(API_URL_FACE_ALERT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faceImage: faceImageDataUrl, cameraName })
        });
        if (response.ok) {
            const result = await response.json(); // Expecting { message, logId, loggedEntry }
            console.log('[Alert] Unknown face alert processed by server:', result.message);
            if (result.loggedEntry) {
                addRecentUnknownFace(result.loggedEntry);
            }
        } else {
            console.error('[Alert] Failed to send alert:', response.status, await response.text());
        }
    } catch (error) { console.error('[Alert] Error sending alert:', error); }
}

function stopFaceDetection(cameraId) {
    if (detectionIntervals[cameraId]) {
        console.log(`[FaceDetect] Stopping detection for ${cameraId}`);
        clearInterval(detectionIntervals[cameraId]);
        delete detectionIntervals[cameraId];
        const overlayCanvas = document.getElementById(`overlay-${cameraId}`);
        if (overlayCanvas) overlayCanvas.getContext('2d').clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
}
window.retryDroidCam = (elementId, streamUrl) => { /* ... (no change from original) ... */ };
const fetchData = async () => { /* ... (no change from original, uses API_URL_CAMERAS) ... */
    try {
        const data = await $.get(`${API_URL_CAMERAS}`);
        return data;
    } catch (error) {
        console.error('Error fetching cameras:', error);
        $('#cameras-container').html('<div class="alert alert-danger">Failed to load camera data.</div>');
        throw error;
    }
};

const createCard = (data) => { /* ... (Ensure overlay canvas is present as in previous step) ... */
    const cardWrapper = document.createElement('div');
    cardWrapper.classList.add('col-lg-6', 'col-md-12', 'mb-4');
    cardWrapper.dataset.cameraUrl = data.url;
    cardWrapper.dataset.cameraType = data.type;
    cardWrapper.dataset.cameraId = data._id;

    const ipMatch = data.url.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/);
    const displayIpPort = ipMatch ? ipMatch[1] : 'Invalid URL';
    const directViewUrl = ipMatch ? `http://${displayIpPort}` : '#';

    cardWrapper.innerHTML = `
      <div class="card h-100" id='${data._id}'>
        <div class="card-body d-flex flex-column">
          <h4 class="card-title text-center">${data.name}</h4>
          <div class="video-container flex-grow-1" id="container-${data._id}">
             ${data.status ?
               `<p class="text-center text-muted pt-5">Initializing stream...</p>` :
               `<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>`
             }
             <canvas id="overlay-${data._id}" class="video-overlay" style="position: absolute; top: 0; left: 0;"></canvas>
          </div>
          <div class="card-text mt-3 small">
            <p class="mb-1">Status: <span class="status-value fw-bold">${data.status ? 'ON' : 'OFF'}</span></p>
            <p class="mb-1">Type: <span class="fw-bold">${data.type}</span></p>
            <p class="mb-1">Address: <span class="fw-bold">${displayIpPort}</span></p>
          </div>
        </div>
         <div class="card-footer d-flex justify-content-between align-items-center">
            <div>
                <button class="btn btn-sm btn-primary toggle-button me-2">
                  <i class="fa-solid fa-toggle-${data.status ? 'on' : 'off'}"></i> Toggle
                </button>
                <a href="${directViewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-info view-button">
                    <i class="fa-solid fa-external-link-alt"></i> View Direct
                </a>
            </div>
            <button class="btn btn-sm btn-danger remove-button">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
      </div>
    `;
    return cardWrapper;
};

const initDroidCamStream = (videoContainerElement, originalStreamUrl) => {
    videoContainerElement.innerHTML = '';
    const ipMatch = originalStreamUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/);
    if (!ipMatch) { /* ... error handling ... */ return; }
    const ipPortForProxy = ipMatch[1];
    const cameraElementId = videoContainerElement.id.replace('container-', '');
    const imgElementId = `img-${cameraElementId}`;
    const overlayCanvasId = `overlay-${cameraElementId}`; // This must match the ID in createCard

    const proxyUrl = `${API_BASE_URL}/api/droidcam-proxy?url=${encodeURIComponent(ipPortForProxy)}&t=${Date.now()}`;
    const img = document.createElement('img');
    img.id = imgElementId;
    img.crossOrigin = "anonymous";
    img.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;';
    img.src = proxyUrl;
    img.alt = `Live feed for ${ipPortForProxy}`;

    // Re-add overlay if cleared by innerHTML
    const overlay = document.createElement('canvas');
    overlay.id = overlayCanvasId;
    overlay.classList.add('video-overlay'); // Ensure styles apply
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';


    img.onerror = () => { /* ... (error handling, ensure overlay is re-added if container is cleared) ... */
        stopFaceDetection(cameraElementId);
        videoContainerElement.innerHTML = `<div class="alert alert-warning p-2 small">...Connection Error...</div>`;
        videoContainerElement.appendChild(overlay); // Re-append overlay after clearing
    };
    img.onload = () => {
        console.log(`[DroidCam] Stream loaded for ${imgElementId}. Starting face detection.`);
        startFaceDetection(cameraElementId, imgElementId, overlayCanvasId);
    };
    videoContainerElement.appendChild(img);
    videoContainerElement.appendChild(overlay); // Add overlay
};
const initWebRTCStream = (el, url) => { /* ... */ };
const initRTSPStream = (el, url) => { /* ... */ };
const initIPCameraStream = (el, url) => initDroidCamStream(el, url);
const initCameraStream = (containerId, cameraData) => { /* ... (ensure it handles the overlay setup if needed, though initDroidCam does it now) ... */
    const videoElement = document.getElementById(containerId);
    if (!videoElement) return;
    const isLikelyDroidCam = cameraData.url.includes(':4747') || cameraData.url.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/);

    if (isLikelyDroidCam || cameraData.type === 'mjpeg') {
        initDroidCamStream(videoElement, cameraData.url);
    } else if (cameraData.type === 'webrtc') {
        initWebRTCStream(videoElement, cameraData.url);
    } else if (cameraData.type === 'rtsp') {
        initRTSPStream(videoElement, cameraData.url);
    } else if (cameraData.type === 'ip') {
        initIPCameraStream(videoElement, cameraData.url);
    } else {
        videoElement.innerHTML = `<div class="alert alert-secondary p-2 small">Unsupported camera type: ${cameraData.type}</div>`;
         const overlay = document.createElement('canvas'); // Still add overlay for consistency
         overlay.id = `overlay-${cameraData._id}`;
         overlay.classList.add('video-overlay');
         overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';
         videoElement.appendChild(overlay);
    }
};
const camerasContainer = document.getElementById('cameras-container');
async function fetchAndDisplayCameras() { /* ... (no change) ... */
    try {
        const data = await fetchData();
        camerasContainer.innerHTML = '';
        if (!data || data.length === 0) { /* ... */ return; }
        data.forEach(cameraData => {
            const cardWrapper = createCard(cameraData);
            camerasContainer.appendChild(cardWrapper); // It's a row, append col- wrappers
            if (cameraData.status) {
                 initCameraStream(`container-${cameraData._id}`, cameraData);
            }
        });
        setupEventListeners();
    } catch (err) { /* ... */ }
}

function setupEventListeners() {
    $(camerasContainer).off('click'); // Prevent duplicates

    $(camerasContainer).on('click', '.remove-button', function() { /* ... (call stopFaceDetection) ... */ });
    $(camerasContainer).on('click', '.toggle-button', function() { /* ... (call start/stopFaceDetection) ... */
        const cardWrapper = $(this).closest('.col-lg-6');
        const card = cardWrapper.find('.card');
        const cameraId = card.attr('id');
        const videoContainer = card.find('.video-container');
        // ... (rest of toggle logic) ...
        if (newStatus) { // Turning ON
            // ... (ensure overlay exists before initCameraStream)
            if (!videoContainer.find(`#overlay-${cameraId}`).length) {
                const overlay = document.createElement('canvas');
                overlay.id = `overlay-${cameraId}`;
                /* ... set overlay styles ... */
                videoContainer.append(overlay);
            }
            initCameraStream(`container-${cameraId}`, { /* ... cameraData ... */ status: true });
        } else { // Turning OFF
            stopFaceDetection(cameraId);
            // ... (ensure overlay exists even if content is replaced)
             if (!videoContainer.find(`#overlay-${cameraId}`).length && videoContainer.html().includes('camera-offline')) {
                const overlay = document.createElement('canvas');
                overlay.id = `overlay-${cameraId}`;
                /* ... set overlay styles ... */
                videoContainer.append(overlay);
            }
        }
        // ... (AJAX call and error handling with UI revert, ensure overlay is handled there too)
    });
    $(camerasContainer).on('click', '.view-button', function() { /* ... */ });

    // Add Known Face Form Handler
    $('#add-known-face-form').on('submit', async function(e) {
        e.preventDefault();
        if (!faceApiLoaded) { /* ... alert ... */ return; }

        const name = $('#knownFaceNameInput').val();
        const imageFile = $('#knownFaceImageInput')[0].files[0];
        const statusDiv = $('#add-face-status-message');
        statusDiv.html('<div class="alert alert-info p-2">Processing...</div>');

        if (!name || !imageFile) { /* ... alert ... */ return; }

        try {
            const image = await faceapi.bufferToImage(imageFile);
            // Use SsdMobilenetv1 for single image processing as it's generally more accurate
            const detection = await faceapi.detectSingleFace(image, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection || !detection.descriptor) {
                statusDiv.html('<div class="alert alert-danger p-2">No face detected or descriptor computation failed. Use a clear, single face image.</div>');
                return;
            }
            // Send descriptor as array of plain numbers
            const descriptors = [Array.from(detection.descriptor)];

            const response = await fetch(API_URL_KNOWN_FACES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, descriptors })
            });
            const result = await response.json();
            if (response.ok) {
                statusDiv.html(`<div class="alert alert-success p-2">Face "${name}" added/updated! Reloading known faces...</div>`);
                $('#add-known-face-form')[0].reset();
                await loadKnownFaces(); // Crucial to update the matcher
            } else {
                statusDiv.html(`<div class="alert alert-danger p-2">Error: ${result.error || response.statusText}</div>`);
            }
        } catch (error) {
            console.error("Error adding known face (client-side):", error);
            statusDiv.html(`<div class="alert alert-danger p-2">Client-side error processing image: ${error.message}</div>`);
        }
    });
}

$(document).ready(function() {
    renderRecentUnknownFaces();
    loadFaceApiModels();
});