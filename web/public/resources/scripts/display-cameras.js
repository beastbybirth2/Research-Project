// web/public/resources/scripts/display-cameras.js
const API_URL_CAMERAS = 'http://localhost:5000/api/cameras';
const API_URL_KNOWN_FACES = 'http://localhost:5000/api/known-faces';
const API_URL_FACE_ALERT = 'http://localhost:5000/api/face-alert';
const API_URL_SETTINGS = 'http://localhost:5000/api/settings'; // New base for settings
const API_BASE_URL = 'http://localhost:5000';
const MODELS_URL = '/resources/models';

let faceApiLoaded = false;
const detectionIntervals = {};
const faceDetectionOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
let knownFaceMatcher = null;
const unknownFaceSendTimestamps = {}; 

const unknownFaceTracker = {}; 
const UNKNOWN_FACE_CONFIRMATION_FRAMES = 2; 
const UNKNOWN_FACE_ALERT_COOLDOWN = 30000; 
const UNKNOWN_FACE_TRACKER_TTL = 60000;

const MAX_RECENT_UNKNOWNS = 10;
let recentUnknownFacesQueue = [];


async function loadFaceApiModels() {
    console.log("[FaceAPI] Attempting to load models from:", MODELS_URL);
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL) // Added this for better single image detection
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
    recentUnknownFacesQueue.unshift({
        logId: logEntry._id,
        faceImage: logEntry.faceImage,
        cameraName: logEntry.cameraName,
        timestamp: new Date(logEntry.timestamp).toLocaleString()
    });
    if (recentUnknownFacesQueue.length > MAX_RECENT_UNKNOWNS) {
        recentUnknownFacesQueue.pop();
    }
    renderRecentUnknownFaces();
}

function renderRecentUnknownFaces() {
    const listElement = $('#recent-unknowns-list');
    listElement.empty();
    if (recentUnknownFacesQueue.length === 0) {
        return;
    }
    recentUnknownFacesQueue.forEach(entry => {
        const thumb = $('<img>')
            .addClass('unknown-face-thumbnail')
            .attr('src', entry.faceImage)
            .attr('alt', `Unknown face on ${entry.cameraName} at ${entry.timestamp}`)
            .attr('title', `Camera: ${entry.cameraName}\nTime: ${entry.timestamp}\nID: ${entry.logId}`);
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
        
        const serverData = await response.json(); // Expecting [{_id, label, descriptors:[[Number]]}, ...]
        // console.log("[KnownFaces] Received from server (raw):", JSON.stringify(serverData, null, 2)); // Verbose

        const labeledDescriptors = serverData.map(item => {
            if (!item.descriptors || !Array.isArray(item.descriptors) || item.descriptors.length === 0) {
                 console.warn(`[KnownFaces Load] No valid descriptors array for "${item.label}". Skipping this label.`);
                 return null;
            }
            // The descriptors from server are already arrays of numbers.
            // We need to convert each inner array to a Float32Array.
            const reconstructedFloat32Arrays = item.descriptors.map((descArray, descIndex) => {
                if (!Array.isArray(descArray) || descArray.length !== 128) {
                    console.error(`[KnownFaces Load] Descriptor for "${item.label}", index ${descIndex} is not a 128-element array.`);
                    return null; 
                }
                if (!descArray.every(n => typeof n === 'number' && !isNaN(n))) {
                    console.error(`[KnownFaces Load] Descriptor array for "${item.label}", index ${descIndex} contains non-numeric or NaN values.`);
                    return null;
                }
                return new Float32Array(descArray);
            }).filter(d => d !== null); 

            if (reconstructedFloat32Arrays.length === 0) {
                console.warn(`[KnownFaces Load] No valid Float32Array descriptors for "${item.label}" after processing. This label won't be used.`);
                return null;
            }
            return new faceapi.LabeledFaceDescriptors(item.label, reconstructedFloat32Arrays);
        }).filter(ld => ld !== null); 

        if (labeledDescriptors.length > 0) {
            knownFaceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55); // Adjust threshold as needed
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

async function fetchCurrentAlertEmail() {
    try {
        const response = await fetch(`${API_URL_SETTINGS}/alert-recipient`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        $('#alertRecipientEmail').val(data.email || '');
    } catch (error) {
        console.error('Error fetching alert recipient email:', error);
        $('#alert-settings-status').html(`<div class="alert alert-warning alert-sm p-1">Could not load current alert email.</div>`);
    }
}


async function startFaceDetection(cameraId, imgElementId, overlayCanvasId) {
    if (!faceApiLoaded) { console.warn(`[FaceDetect] ${cameraId}: FaceAPI not loaded. Aborting.`); return; }
    if (detectionIntervals[cameraId]) { console.log(`[FaceDetect] ${cameraId}: Detection already running.`); return; }

    const imgElement = document.getElementById(imgElementId);
    const overlayCanvas = document.getElementById(overlayCanvasId);
    const cameraCard = $(`#${cameraId}`);
    const cameraName = cameraCard.find('.card-title').text() || 'Unnamed Camera';

    if (!imgElement || !overlayCanvas) { console.error(`[FaceDetect] ${cameraId}: Image or overlay canvas not found.`); return; }
    
    console.log(`[FaceDetect] Starting detection loop for ${cameraName} (${cameraId})`);
    
    if (!unknownFaceTracker[cameraId]) {
        unknownFaceTracker[cameraId] = {};
    }

    detectionIntervals[cameraId] = setInterval(async () => {
        if (!imgElement.parentNode || !imgElement.complete || imgElement.naturalWidth === 0) return;
        const displaySize = { width: imgElement.offsetWidth, height: imgElement.offsetHeight };
        if (displaySize.width === 0 || displaySize.height === 0) return;
        faceapi.matchDimensions(overlayCanvas, displaySize);

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
            const currentFrameDetections = new Set();

            if (detections.length > 0) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                resizedDetections.forEach(async (detection, i) => {
                    const box = detection.detection.box;
                    const detectionBoxKey = `${Math.round(box.x / 20)}_${Math.round(box.y / 20)}_${Math.round(box.width / 20)}_${Math.round(box.height / 20)}`;
                    currentFrameDetections.add(detectionBoxKey);

                    let bestMatch = { label: 'unknown', distance: 1.0 };
                    let boxColor = 'red';
                    let label = 'Identifying...'; 

                    if (detection.descriptor) {
                        if (detection.descriptor.length !== 128) { return; }
                        if (knownFaceMatcher) {
                            bestMatch = knownFaceMatcher.findBestMatch(detection.descriptor);
                            if (bestMatch.label !== 'unknown') {
                                boxColor = 'lightgreen';
                                label = `${bestMatch.label} (${bestMatch.distance.toFixed(2)})`;
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
                                faceImageSnapshot: null
                            };
                        } else {
                            unknownFaceTracker[cameraId][detectionBoxKey].count++;
                            unknownFaceTracker[cameraId][detectionBoxKey].lastSeen = now;
                        }

                        const trackerEntry = unknownFaceTracker[cameraId][detectionBoxKey];

                        if (trackerEntry.count >= UNKNOWN_FACE_CONFIRMATION_FRAMES && !trackerEntry.alerted) {
                            const lastGlobalAlertTime = unknownFaceSendTimestamps[cameraId] || 0;
                            
                            if (now - lastGlobalAlertTime > UNKNOWN_FACE_ALERT_COOLDOWN) {
                                if (!trackerEntry.faceImageSnapshot) {
                                    try {
                                        const faceCanvases = await faceapi.extractFaces(imgElement, [detection.detection]);
                                        if (faceCanvases.length > 0) {
                                            trackerEntry.faceImageSnapshot = faceCanvases[0].toDataURL('image/jpeg', 0.8);
                                            faceCanvases.forEach(fc => fc.remove());
                                        }
                                    } catch (extractError) {
                                        console.error(`[FaceExtract] Error extracting face on ${cameraName}:`, extractError);
                                    }
                                }
                                
                                if (trackerEntry.faceImageSnapshot) {
                                    sendUnknownFaceAlert(trackerEntry.faceImageSnapshot, cameraName);
                                    trackerEntry.alerted = true; 
                                    unknownFaceSendTimestamps[cameraId] = now; 
                                }
                            }
                        }
                    }
                });
            }

            for (const boxKey in unknownFaceTracker[cameraId]) {
                if (!currentFrameDetections.has(boxKey)) {
                    unknownFaceTracker[cameraId][boxKey].count = 0; 
                }
            }

        } catch (error) {
            console.error(`[FaceDetect] Error during detection for ${cameraName} (${cameraId}):`, error);
        }
    }, 500); 
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
            const result = await response.json();
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

window.retryDroidCam = (elementId, streamUrl) => { /* ... */ }; // Existing
const fetchData = async () => { /* ... */ 
    try {
        const data = await $.get(`${API_URL_CAMERAS}`);
        return data;
    } catch (error) {
        console.error('Error fetching cameras:', error);
        $('#cameras-container').html('<div class="alert alert-danger">Failed to load camera data.</div>');
        throw error; // Re-throw to be caught by caller if needed
    }
};

const createCard = (data) => { /* ... (overlay canvas definition as before) ... */ 
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

const initDroidCamStream = (videoContainerElement, originalStreamUrl) => { /* ... */
    videoContainerElement.innerHTML = ''; // Clear previous content
    const ipMatch = originalStreamUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/);
    if (!ipMatch) {
        videoContainerElement.innerHTML = `<div class="alert alert-danger p-2 small">Invalid DroidCam URL format.</div>`;
        return;
    }
    const ipPortForProxy = ipMatch[1];
    const cameraElementId = videoContainerElement.id.replace('container-', ''); // e.g., camera123
    const imgElementId = `img-${cameraElementId}`;
    const overlayCanvasId = `overlay-${cameraElementId}`;


    const proxyUrl = `${API_BASE_URL}/api/droidcam-proxy?url=${encodeURIComponent(ipPortForProxy)}&t=${Date.now()}`;
    const img = document.createElement('img');
    img.id = imgElementId;
    img.crossOrigin = "anonymous";
    img.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;'; // Keep image contained
    img.src = proxyUrl;
    img.alt = `Live feed for ${ipPortForProxy}`;

    const overlay = document.createElement('canvas');
    overlay.id = overlayCanvasId;
    overlay.classList.add('video-overlay');
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;'; // Ensure it's on top and transparent to clicks

    img.onerror = () => {
        console.error(`[DroidCam] Error loading stream for ${imgElementId} from ${proxyUrl}`);
        stopFaceDetection(cameraElementId); // Stop if it was running
        videoContainerElement.innerHTML = `<div class="alert alert-warning p-2 small">Stream error or DroidCam offline. <button class="btn btn-sm btn-link p-0" onclick="retryDroidCam('container-${cameraElementId}', '${originalStreamUrl}')">Retry</button></div>`;
        videoContainerElement.appendChild(overlay); // Re-add overlay
    };

    img.onload = () => {
        console.log(`[DroidCam] Stream loaded for ${imgElementId}. Starting face detection.`);
        startFaceDetection(cameraElementId, imgElementId, overlayCanvasId);
    };

    videoContainerElement.appendChild(img);
    videoContainerElement.appendChild(overlay); // Add overlay
};

const initWebRTCStream = (el, url) => { /* ... */ }; // Existing
const initRTSPStream = (el, url) => { /* ... */ };   // Existing
const initIPCameraStream = (el, url) => initDroidCamStream(el, url); // IP Camera now uses DroidCam logic


const initCameraStream = (containerId, cameraData) => { /* ... (no major change, but ensures overlay is handled by specific init functions like initDroidCamStream) ... */ 
    const videoElement = document.getElementById(containerId);
    if (!videoElement) return;

    const isLikelyDroidCam = cameraData.url.includes(':4747') || cameraData.url.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/);

    if (isLikelyDroidCam || cameraData.type === 'mjpeg') {
        initDroidCamStream(videoElement, cameraData.url);
    } else if (cameraData.type === 'webrtc') {
        initWebRTCStream(videoElement, cameraData.url);
    } else if (cameraData.type === 'rtsp') {
        initRTSPStream(videoElement, cameraData.url);
    } else if (cameraData.type === 'ip') { // Generic IP might be MJPEG-like
        initIPCameraStream(videoElement, cameraData.url);
    } else {
        videoElement.innerHTML = `<div class="alert alert-secondary p-2 small">Unsupported camera type: ${cameraData.type}</div>`;
        // Still add overlay for consistency if needed elsewhere
         const overlay = document.createElement('canvas');
         overlay.id = `overlay-${cameraData._id}`; // Consistent IDing
         overlay.classList.add('video-overlay');
         overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';
         videoElement.appendChild(overlay);
    }
};

const camerasContainer = document.getElementById('cameras-container');
async function fetchAndDisplayCameras() { /* ... (no change from before) ... */ 
    try {
        const data = await fetchData(); // This now throws on error
        camerasContainer.innerHTML = ''; // Clear loading/error message
        if (!data || data.length === 0) {
            camerasContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">No cameras configured yet. Add one!</div></div>';
            return;
        }

        data.forEach(cameraData => {
            const cardWrapper = createCard(cameraData);
            camerasContainer.appendChild(cardWrapper);
            if (cameraData.status) {
                 initCameraStream(`container-${cameraData._id}`, cameraData);
            }
        });
        setupEventListeners();
    } catch (err) {
        // Error already logged by fetchData, UI updated there too.
        // If fetchData didn't update UI on error, do it here:
        // camerasContainer.innerHTML = '<div class="alert alert-danger">Failed to load camera data.</div>';
    }
}

function setupEventListeners() {
    $(camerasContainer).off('click'); // Prevent duplicate listeners

    $(camerasContainer).on('click', '.remove-button', async function() {
        const cardWrapper = $(this).closest('.col-lg-6');
        const cameraId = cardWrapper.data('camera-id');
        if (confirm(`Are you sure you want to remove camera ${cardWrapper.find('.card-title').text()}?`)) {
            stopFaceDetection(cameraId);
            try {
                await $.ajax({
                    url: `${API_URL_CAMERAS}/delete`,
                    type: 'DELETE', // Make sure this matches server-side app.delete
                    data: JSON.stringify({ id: cameraId }), // Send ID in body for DELETE
                    contentType: 'application/json',
                });
                cardWrapper.remove();
            } catch (error) {
                console.error('Error deleting camera:', error);
                alert('Failed to delete camera.');
            }
        }
    });

    $(camerasContainer).on('click', '.toggle-button', async function() {
        const button = $(this);
        const cardWrapper = button.closest('.col-lg-6');
        const card = cardWrapper.find('.card');
        const cameraId = card.attr('id');
        const statusSpan = card.find('.status-value');
        const videoContainer = card.find('.video-container');
        const originalUrl = cardWrapper.data('camera-url');
        const cameraType = cardWrapper.data('camera-type');

        const currentStatus = statusSpan.text() === 'ON';
        const newStatus = !currentStatus;

        button.prop('disabled', true); // Disable button during operation

        try {
            await $.post(`${API_URL_CAMERAS}/toggle`, { id: cameraId, status: newStatus });
            statusSpan.text(newStatus ? 'ON' : 'OFF');
            button.find('i').toggleClass('fa-toggle-on fa-toggle-off');
            
            const overlayCanvasId = `overlay-${cameraId}`;
            let overlay = document.getElementById(overlayCanvasId);

            if (newStatus) { // Turning ON
                videoContainer.html(`<p class="text-center text-muted pt-5">Initializing stream...</p>`);
                if (!overlay) { // Ensure overlay exists
                    overlay = document.createElement('canvas');
                    overlay.id = overlayCanvasId;
                    overlay.classList.add('video-overlay');
                    overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';
                }
                videoContainer.append(overlay); // Append it again to ensure it's there if innerHTML wiped it
                initCameraStream(`container-${cameraId}`, { _id: cameraId, url: originalUrl, type: cameraType, status: true });
            } else { // Turning OFF
                stopFaceDetection(cameraId);
                videoContainer.html(`<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>`);
                if (!overlay) { // Ensure overlay exists for consistency (though not strictly needed when off)
                    overlay = document.createElement('canvas');
                    overlay.id = overlayCanvasId;
                    overlay.classList.add('video-overlay');
                    overlay.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';
                }
                 videoContainer.append(overlay);
            }
        } catch (error) {
            console.error('Error toggling camera:', error);
            alert(`Failed to toggle camera. Status might be inconsistent.`);
            // Revert UI optimistically or re-fetch state
            statusSpan.text(currentStatus ? 'ON' : 'OFF'); // Revert status text
            button.find('i').toggleClass('fa-toggle-on fa-toggle-off', currentStatus); // Revert icon
        } finally {
            button.prop('disabled', false);
        }
    });

$('#add-known-face-form').on('submit', async function(e) {
        e.preventDefault();
        if (!faceApiLoaded) { 
            $('#add-face-status-message').html('<div class="alert alert-warning p-2">FaceAPI models not loaded yet.</div>');
            return; 
        }

        const name = $('#knownFaceNameInput').val();
        const imageFile = $('#knownFaceImageInput')[0].files[0];
        const statusDiv = $('#add-face-status-message');
        statusDiv.html('<div class="alert alert-info p-2">Processing image...</div>');

        if (!name || !imageFile) { 
            statusDiv.html('<div class="alert alert-danger p-2">Name and image file are required.</div>');
            return;
        }

        try {
            const image = await faceapi.bufferToImage(imageFile);
            // Use SsdMobilenetv1 for single image processing as it's generally more accurate for enrollment
            const detectionResult = await faceapi.detectSingleFace(image, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detectionResult || !detectionResult.descriptor) {
                statusDiv.html('<div class="alert alert-danger p-2">No face detected or descriptor computation failed. Use a clear, single face image.</div>');
                return;
            }
            
            // Extract face image preview
            let faceImagePreview = null;
            try {
                // Use the bounding box from detectionResult.detection to extract the face
                // faceapi.extractFaces returns an array of HTMLCanvasElement
                const faceCanvases = await faceapi.extractFaces(image, [detectionResult.detection]);
                if (faceCanvases.length > 0) {
                    faceImagePreview = faceCanvases[0].toDataURL('image/jpeg', 0.7); // Use JPEG for smaller size, adjust quality
                    faceCanvases.forEach(canvas => canvas.remove()); // Clean up canvases
                } else {
                    console.warn("Could not extract face canvas for preview, though detection was successful.");
                }
            } catch (extractError) {
                console.error("Error extracting face for preview:", extractError);
                // Proceed without preview if extraction fails but descriptor is available
            }

            // Send descriptor as array of plain numbers
            const descriptors = [Array.from(detectionResult.descriptor)];

            const payload = { name, descriptors };
            if (faceImagePreview) {
                payload.faceImagePreview = faceImagePreview;
            }

            const response = await fetch(API_URL_KNOWN_FACES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok) {
                statusDiv.html(`<div class="alert alert-success p-2">Face "${name}" added/updated successfully! Reloading known faces data...</div>`);
                $('#add-known-face-form')[0].reset();
                await loadKnownFaces(); // Reload known faces to update the matcher
            } else {
                statusDiv.html(`<div class="alert alert-danger p-2">Error from server: ${result.error || response.statusText}</div>`);
            }
        } catch (error) {
            console.error("Error adding known face (client-side processing):", error);
            statusDiv.html(`<div class="alert alert-danger p-2">Client-side error processing image: ${error.message}. See console.</div>`);
        } finally {
            setTimeout(() => statusDiv.empty(), 7000);
        }
    });

    // Alert Settings Form Handler
    $('#alert-settings-form').on('submit', async function(e) {
        e.preventDefault();
        const newEmail = $('#alertRecipientEmail').val();
        const statusDiv = $('#alert-settings-status');

        if (!newEmail || !newEmail.includes('@')) { // Basic validation
            statusDiv.html('<div class="alert alert-danger alert-sm p-1">Please enter a valid email.</div>');
            return;
        }
        statusDiv.html('<div class="alert alert-info alert-sm p-1">Saving...</div>');
        try {
            const response = await fetch(`${API_URL_SETTINGS}/alert-recipient`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail })
            });
            const result = await response.json();
            if (response.ok) {
                statusDiv.html(`<div class="alert alert-success alert-sm p-1">Email updated to ${result.email}.</div>`);
            } else {
                statusDiv.html(`<div class="alert alert-danger alert-sm p-1">Error: ${result.error || response.statusText}</div>`);
            }
        } catch (error) {
            console.error('Error updating alert email:', error);
            statusDiv.html(`<div class="alert alert-danger alert-sm p-1">Failed to update email.</div>`);
        }
        setTimeout(() => statusDiv.empty(), 5000);
    });

}

$(document).ready(function() {
    renderRecentUnknownFaces();
    loadFaceApiModels();
    fetchCurrentAlertEmail();
});