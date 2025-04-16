// web/public/resources/scripts/display-cameras.js
const API_URL = 'http://localhost:5000/api/cameras';
const API_BASE_URL = 'http://localhost:5000';
const MODELS_URL = '/resources/models'; // Path to your models folder in public

// --- Face Detection Globals ---
let faceApiLoaded = false;
const detectionIntervals = {}; // Store interval IDs for each camera { cameraId: intervalId }
const faceDetectionOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }); // Use Tiny model for performance

// --- Load Face API Models ---
async function loadFaceApiModels() {
    console.log("[FaceAPI] Loading models...");
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
            // Load other models if needed (landmarks, expressions, etc.)
            // faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
            // faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL)
        ]);
        faceApiLoaded = true;
        console.log("[FaceAPI] Models loaded successfully.");
        // Now fetch and display cameras after models are ready
        fetchAndDisplayCameras();
    } catch (error) {
        console.error("[FaceAPI] Error loading models:", error);
        $('#cameras-container').html('<div class="alert alert-danger">Failed to load face detection models. Face detection will be unavailable.</div>');
        // Optionally proceed without face detection: fetchAndDisplayCameras();
    }
}

// --- Start Face Detection Loop ---
async function startFaceDetection(cameraId, imgElementId, overlayCanvasId) {
    if (!faceApiLoaded) {
        console.warn("[FaceDetect] FaceAPI models not loaded yet, skipping detection start.");
        return;
    }
    if (detectionIntervals[cameraId]) {
        console.log(`[FaceDetect] Detection already running for ${cameraId}`);
        return; // Already running
    }

    const imgElement = document.getElementById(imgElementId);
    const overlayCanvas = document.getElementById(overlayCanvasId);

    if (!imgElement || !overlayCanvas) {
        console.error(`[FaceDetect] Cannot start: Missing image (${imgElementId}) or canvas (${overlayCanvasId}) for camera ${cameraId}`);
        return;
    }

    console.log(`[FaceDetect] Starting detection loop for ${cameraId}`);
    const displaySize = { width: imgElement.offsetWidth, height: imgElement.offsetHeight }; // Get display size initially
    faceapi.matchDimensions(overlayCanvas, displaySize); // Match canvas to image size

    // Store interval ID to allow stopping it later
    detectionIntervals[cameraId] = setInterval(async () => {
        if (!imgElement.parentNode) { // Check if element still exists
            console.log(`[FaceDetect] Image element ${imgElementId} removed, stopping detection.`);
            stopFaceDetection(cameraId);
            return;
        }
        
        // Re-check display size in case of layout changes (optional, might impact performance)
         const currentDisplaySize = { width: imgElement.offsetWidth, height: imgElement.offsetHeight };
         if (displaySize.width !== currentDisplaySize.width || displaySize.height !== currentDisplaySize.height) {
             console.log(`[FaceDetect] Resizing canvas for ${cameraId}`);
             displaySize.width = currentDisplaySize.width;
             displaySize.height = currentDisplaySize.height;
             faceapi.matchDimensions(overlayCanvas, displaySize);
         }


        try {
            // Perform detection directly on the img element
            const detections = await faceapi.detectAllFaces(imgElement, faceDetectionOptions);
            // Load .withFaceLandmarks().withFaceExpressions() if those models are loaded

            // Resize results to match the overlay canvas display size
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Clear previous drawings and draw new ones
            const context = overlayCanvas.getContext('2d');
            context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            faceapi.draw.drawDetections(overlayCanvas, resizedDetections);
            // faceapi.draw.drawFaceLandmarks(overlayCanvas, resizedDetections); // If landmarks are loaded
            // faceapi.draw.drawFaceExpressions(overlayCanvas, resizedDetections); // If expressions are loaded

        } catch(error) {
             console.error(`[FaceDetect] Error during detection for ${cameraId}:`, error);
             // Optionally stop detection on error, or just log it
             // stopFaceDetection(cameraId);
        }

    }, 100); // Adjust interval (e.g., 100ms = 10fps). Lower for smoother, higher for less CPU.
}

// --- Stop Face Detection Loop ---
function stopFaceDetection(cameraId) {
    if (detectionIntervals[cameraId]) {
        console.log(`[FaceDetect] Stopping detection loop for ${cameraId}`);
        clearInterval(detectionIntervals[cameraId]);
        delete detectionIntervals[cameraId];

        // Clear the overlay canvas
        const overlayCanvas = document.getElementById(`overlay-${cameraId}`);
        if (overlayCanvas) {
            const context = overlayCanvas.getContext('2d');
            context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
    }
}


// Global retry function
window.retryDroidCam = (elementId, streamUrl) => {
    const element = document.getElementById(`container-${elementId}`);
    if (element) {
        console.log(`[Retry] Retrying stream for ${elementId} with URL ${streamUrl}`);
        initDroidCamStream(element, streamUrl);
    } else {
        console.error(`[Retry] Could not find container element: container-${elementId}`);
    }
};

// Fetch data from MongoDB
const fetchData = async () => {
    try {
        const data = await $.get(`${API_URL}`);
        console.log("[FetchData] Camera data:", data);
        return data;
    } catch (error) {
        console.error('Error fetching cameras:', error);
        $('#cameras-container').html('<div class="alert alert-danger">Failed to load camera data. Is the API server running?</div>');
        throw error;
    }
};

const createCard = (data) => {
    const cardWrapper = document.createElement('div');
    cardWrapper.classList.add('col-lg-6', 'col-md-12', 'mb-4');
    cardWrapper.dataset.cameraUrl = data.url;
    cardWrapper.dataset.cameraType = data.type;
    cardWrapper.dataset.cameraId = data._id; // Use dataset for ID

    const ipMatch = data.url.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/);
    const displayIpPort = ipMatch ? ipMatch[1] : 'Invalid URL';
    const directViewUrl = ipMatch ? `http://${displayIpPort}` : '#';

    // --- Add Overlay Canvas ---
    cardWrapper.innerHTML = `
      <div class="card h-100" id='${data._id}'>
        <div class="card-body d-flex flex-column">
          <h4 class="card-title text-center">${data.name}</h4>
          <div class="video-container flex-grow-1" id="container-${data._id}">
             <!-- Stream IMG or Offline message goes here -->
             ${data.status ?
               `<p class="text-center text-muted pt-5">Initializing stream...</p>` :
               `<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>`
             }
             <!-- Overlay Canvas for Face Detection -->
             <canvas id="overlay-${data._id}" class="video-overlay"></canvas>
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


// Initialize DroidCam stream using the backend proxy
const initDroidCamStream = (videoContainerElement, originalStreamUrl) => {
    videoContainerElement.innerHTML = ''; // Clear placeholder/error

    const ipMatch = originalStreamUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/);
    if (!ipMatch) {
        console.error(`[initDroidCamStream] Invalid URL format for proxy: ${originalStreamUrl}`);
        videoContainerElement.innerHTML = `<div class="alert alert-danger p-2 small">Invalid URL: ${originalStreamUrl}</div>`;
        return;
    }
    const ipPortForProxy = ipMatch[1];
    const cameraElementId = videoContainerElement.id.replace('container-', ''); // Base ID (like camera._id)
    const imgElementId = `img-${cameraElementId}`;
    const overlayCanvasId = `overlay-${cameraElementId}`;

    const proxyUrl = `${API_BASE_URL}/api/droidcam-proxy?url=${encodeURIComponent(ipPortForProxy)}&t=${Date.now()}`;
    console.log(`[initDroidCamStream] Setting img src to proxy URL: ${proxyUrl} for camera ID: ${cameraElementId}`);

    const img = document.createElement('img');
    img.id = imgElementId;
    img.style.position = 'absolute';
    img.crossOrigin = "anonymous";
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.src = proxyUrl;
    img.alt = `Live feed for ${ipPortForProxy}`;

    // Re-create overlay canvas after clearing container
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = overlayCanvasId;
    overlayCanvas.classList.add('video-overlay'); // Add class if needed for CSS targeting

    img.onerror = () => {
        console.error(`[initDroidCamStream] Error loading stream for ${originalStreamUrl} via proxy ${proxyUrl}`);
        stopFaceDetection(cameraElementId); // Stop detection if stream fails
        videoContainerElement.innerHTML = `
            <div class="alert alert-warning p-2 small">
                <h6 class="alert-heading">Connection Error</h6>
                <p class="mb-1">Could not load feed from ${ipPortForProxy}.</p>
                <div class="mt-1">
                    <button class="btn btn-sm btn-primary"
                        onclick="window.retryDroidCam('${cameraElementId}', '${originalStreamUrl}')">
                        Retry
                    </button>
                     <a href="http://${ipPortForProxy}/video" target="_blank" rel="noopener noreferrer"
                       class="btn btn-sm btn-secondary ms-1">
                        Direct Link
                    </a>
                </div>
            </div>`;
    };

    img.onload = () => {
        console.log(`[initDroidCamStream] Image stream loaded successfully for ${imgElementId}. Starting detection.`);
        // Start face detection *after* the image has loaded its first frame
        startFaceDetection(cameraElementId, imgElementId, overlayCanvasId);
    };

    videoContainerElement.appendChild(img);
    videoContainerElement.appendChild(overlayCanvas); // Add overlay canvas
};

// --- Other init stream functions (WebRTC, RTSP, IP) - unchanged ---
const initWebRTCStream = (videoElement, streamUrl) => { console.log(`Initializing WebRTC stream to ${streamUrl}`); videoElement.innerHTML = `<div class="alert alert-info p-2 small">WebRTC stream placeholder for ${streamUrl}</div>`; };
const initRTSPStream = (videoElement, streamUrl) => { console.log(`Initializing RTSP stream: ${streamUrl}`); videoElement.innerHTML = `<div class="alert alert-info p-2 small">RTSP streams require specific handling. <a href="${streamUrl}" target="_blank" rel="noopener noreferrer">Open directly</a></div>`; };
const initIPCameraStream = (videoElement, streamUrl) => { console.log(`Initializing IP Camera stream from ${streamUrl} - Assuming MJPEG, using proxy.`); initDroidCamStream(videoElement, streamUrl); };

// --- initCameraStream remains the same ---
const initCameraStream = (videoContainerId, cameraData) => {
    const videoElement = document.getElementById(videoContainerId);
    if (!videoElement) { console.error(`[initCameraStream] Container element not found: ${videoContainerId}`); return; }
    console.log(`[initCameraStream] Initializing camera ID ${cameraData._id}, Type: ${cameraData.type}, URL: ${cameraData.url}`);
    const isLikelyDroidCam = cameraData.url.includes(':4747') || cameraData.url.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/);
    if (isLikelyDroidCam || cameraData.type === 'mjpeg') {
        console.log(`[initCameraStream] Using DroidCam/MJPEG logic for ${cameraData._id}`);
        initDroidCamStream(videoElement, cameraData.url);
    } else { /* ... rest of switch statement ... */ }
};


// Container and Fetching Logic
const container = document.getElementById('cameras-container');

async function fetchAndDisplayCameras() {
    console.log("[FetchAndDisplay] Fetching camera data...");
    try {
        const data = await fetchData();
        container.innerHTML = ''; // Clear loading message

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No cameras found. Add a camera using the "Add Device" page.</div>';
            return;
        }

        const row = document.createElement('div');
        row.classList.add('row');
        container.appendChild(row);

        data.forEach(cameraData => {
            const cardWrapper = createCard(cameraData);
            row.appendChild(cardWrapper);

            if (cameraData.status) {
                // Initialization will now happen via the toggle button logic if starting ON
                // OR if you explicitly want them to start on load:
                 initCameraStream(`container-${cameraData._id}`, cameraData);
            }
        });

        setupEventListeners(); // Set up listeners after cards are in the DOM

    } catch (err) {
        console.error('Error loading cameras:', err);
        // Error message is already handled in fetchData
    }
}


// --- Setup Event Listeners ---
function setupEventListeners() {
    $(container).off('click'); // Prevent duplicate listeners

    // Remove button handler
    $(container).on('click', '.remove-button', function(e) {
        const cardWrapper = $(this).closest('.col-lg-6');
        const card = cardWrapper.find('.card');
        const cameraId = card.attr('id');
        console.log(`[Remove] Clicked for ID: ${cameraId}`);
        if (!confirm(`Are you sure you want to delete camera "${card.find('.card-title').text()}"?`)) return;

        stopFaceDetection(cameraId); // Stop detection before removing

        $.ajax({ /* ... AJAX delete ... */
            url: `${API_URL}/delete`, method: 'DELETE', data: JSON.stringify({ id: cameraId }), contentType: 'application/json',
            success: function(res) { console.log(`[Remove] Success for ID: ${cameraId}`, res); cardWrapper.remove(); if ($('#cameras-container .card').length === 0) container.innerHTML = '<div class="alert alert-info">No cameras left.</div>'; },
            error: function(jqXHR, textStatus, errorThrown) { console.error(`[Remove] Error deleting camera ${cameraId}:`, textStatus, errorThrown, jqXHR.responseText); alert(`Failed to delete camera: ${jqXHR.statusText || errorThrown}`); }
        });
    });

    // Toggle button handler
    $(container).on('click', '.toggle-button', function(e) {
        const cardWrapper = $(this).closest('.col-lg-6');
        const card = cardWrapper.find('.card');
        const cameraId = card.attr('id'); // Get ID from card itself
        const statusElement = card.find('.status-value');
        const currentStatus = statusElement.text() === 'ON';
        const newStatus = !currentStatus;
        const originalCameraUrl = cardWrapper.data('camera-url');
        const cameraType = cardWrapper.data('camera-type');
        console.log(`[Toggle] Clicked for ID: ${cameraId}. New status: ${newStatus}`);

        const buttonIcon = $(this).find('i');
        const videoContainer = card.find('.video-container');

        // --- Update UI Optimistically ---
        statusElement.text(newStatus ? 'ON' : 'OFF');
        buttonIcon.removeClass(`fa-toggle-${currentStatus ? 'on' : 'off'}`).addClass(`fa-toggle-${newStatus ? 'on' : 'off'}`);

        if (newStatus) {
            videoContainer.html(`<p class="text-center text-muted pt-5">Initializing stream...</p>`);
            // Delay slightly to let UI update
            setTimeout(() => {
                 initCameraStream(`container-${cameraId}`, { _id: cameraId, url: originalCameraUrl, type: cameraType, status: true });
                 // Note: Face detection will start inside initDroidCamStream's onload if successful
            }, 50);
        } else {
            stopFaceDetection(cameraId); // Stop detection when turning off
            videoContainer.html('<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>');
        }

        // --- Send Update Request ---
        $.ajax({
            url: `${API_URL}/toggle`, method: 'POST', data: JSON.stringify({ id: cameraId, status: newStatus }), contentType: 'application/json',
            success: function(res) { console.log(`[Toggle] Success for ID: ${cameraId}`, res); /* UI already updated */ },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error(`[Toggle] Error toggling camera ${cameraId}:`, textStatus, errorThrown, jqXHR.responseText);
                alert(`Failed to toggle camera status: ${jqXHR.statusText || errorThrown}`);
                // --- Revert UI ---
                statusElement.text(currentStatus ? 'ON' : 'OFF');
                buttonIcon.removeClass(`fa-toggle-${newStatus ? 'on' : 'off'}`).addClass(`fa-toggle-${currentStatus ? 'on' : 'off'}`);
                if (currentStatus) { // If it was ON before the failed toggle
                    videoContainer.html(`<p>Re-initializing stream after error...</p>`);
                     initCameraStream(`container-${cameraId}`, { _id: cameraId, url: originalCameraUrl, type: cameraType, status: true });
                     // Detection should restart automatically via initDroidCamStream's onload
                } else { // If it was OFF before the failed toggle
                    stopFaceDetection(cameraId); // Ensure detection is stopped
                    videoContainer.html('<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>');
                }
            }
        });
    });

     // View Directly Button
     $(container).on('click', '.view-button', function(e) {
         console.log(`[View Directly] Clicked. Opening: ${$(this).attr('href')}`);
     });
}

// --- Initialize ---
// Load models first, then fetch and display cameras
loadFaceApiModels();