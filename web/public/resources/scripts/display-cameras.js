// web/public/resources/scripts/display-cameras.js
const API_URL = 'http://localhost:5000/api/cameras';
const API_BASE_URL = 'http://localhost:5000'; // Define API base URL clearly

// Global retry function - Updated to use the proxy
window.retryDroidCam = (elementId, streamUrl) => {
    const element = document.getElementById(`container-${elementId}`); // Target the container div
    if (element) {
        console.log(`[Retry] Retrying stream for ${elementId} with URL ${streamUrl}`);
        initDroidCamStream(element, streamUrl); // Pass the container element and original URL
    } else {
        console.error(`[Retry] Could not find container element: container-${elementId}`);
    }
};

// Fetch data from MongoDB
const fetchData = async () => {
    try {
        const data = await $.get(`${API_URL}`);
        console.log("[FetchData] Camera data:", data); // Log fetched data
        return data;
    } catch (error) {
        console.error('Error fetching cameras:', error);
        $('#cameras-container').html('<div class="alert alert-danger">Failed to load camera data. Is the API server running?</div>');
        throw error;
    }
};

const createCard = (data) => {
    const cardWrapper = document.createElement('div'); // Use a wrapper for the column
    cardWrapper.classList.add('col-lg-6', 'col-md-12', 'mb-4'); // Adjust grid for better layout
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
          </div>
          <div class="card-text mt-3 small">
            <p class="mb-1">Status: <span class="status-value fw-bold">${data.status ? 'ON' : 'OFF'}</span></p>
            <p class="mb-1">Type: <span class="fw-bold">${data.type}</span></p>
            <p class="mb-1">Address: <span class="fw-bold">${displayIpPort}</span></p>
            <!-- <p style="font-size: 0.8em; color: grey;">(Original URL: ${data.url})</p> -->
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
    `; // Use h-100, d-flex for better card layout

    return cardWrapper;
};


// Initialize DroidCam stream using the backend proxy
const initDroidCamStream = (videoContainerElement, originalStreamUrl) => {
    videoContainerElement.innerHTML = ''; // Clear initializing message

    const ipMatch = originalStreamUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/);
    if (!ipMatch) {
        console.error(`[initDroidCamStream] Invalid URL format for proxy: ${originalStreamUrl}`);
        videoContainerElement.innerHTML = `<div class="alert alert-danger p-2 small">Invalid URL format: ${originalStreamUrl}</div>`;
        return;
    }
    const ipPortForProxy = ipMatch[1];
    const cameraElementId = videoContainerElement.id.replace('container-', '');

    // *** Use absolute URL for the proxy endpoint ***
    const proxyUrl = `${API_BASE_URL}/api/droidcam-proxy?url=${encodeURIComponent(ipPortForProxy)}&t=${Date.now()}`;
    console.log(`[initDroidCamStream] Setting img src to proxy URL: ${proxyUrl} for original: ${originalStreamUrl}`);

    const img = document.createElement('img');
    img.id = `img-${cameraElementId}`;
    // *** Add necessary styles for positioning within the container ***
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain'; // Use 'contain' or 'cover' as needed
    img.src = proxyUrl;
    img.alt = `Live feed for ${ipPortForProxy}`; // Add alt text

    img.onerror = () => {
        console.error(`[initDroidCamStream] Error loading stream for ${originalStreamUrl} via proxy ${proxyUrl}`);
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
        console.log(`[initDroidCamStream] Image stream loaded successfully for ${proxyUrl}`);
        // You could potentially remove a 'loading' class here if you added one
    };

    videoContainerElement.appendChild(img);
};

// --- initCameraStream and other stream types remain the same ---
// Initialize stream based on camera type - Calls the appropriate function
const initCameraStream = (videoContainerId, cameraData) => {
    const videoElement = document.getElementById(videoContainerId);
    if (!videoElement) {
        console.error(`[initCameraStream] Container element not found: ${videoContainerId}`);
        return;
    }

    console.log(`[initCameraStream] Initializing camera ID ${cameraData._id}, Type: ${cameraData.type}, URL: ${cameraData.url}`);

    const isLikelyDroidCam = cameraData.url.includes(':4747') || cameraData.url.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/);

    if (isLikelyDroidCam || cameraData.type === 'mjpeg') {
        console.log(`[initCameraStream] Using DroidCam/MJPEG logic for ${cameraData._id}`);
        initDroidCamStream(videoElement, cameraData.url);
    } else {
        switch(cameraData.type) {
            case 'webrtc':
                console.warn(`[initCameraStream] WebRTC for ${cameraData._id} not fully implemented.`);
                initWebRTCStream(videoElement, cameraData.url);
                break;
            case 'rtsp':
                 console.warn(`[initCameraStream] RTSP for ${cameraData._id} requires external handling.`);
                initRTSPStream(videoElement, cameraData.url);
                break;
            case 'ip':
                console.log(`[initCameraStream] Using IP Camera (likely MJPEG) logic for ${cameraData._id}`);
                initIPCameraStream(videoElement, cameraData.url);
                break;
            default:
                console.error(`[initCameraStream] Unknown camera type for ${cameraData._id}: ${cameraData.type}`);
                videoElement.innerHTML = `<div class="alert alert-secondary">Unsupported camera type: ${cameraData.type}</div>`;
        }
    }
};

const initWebRTCStream = (videoElement, streamUrl) => {
    console.log(`Initializing WebRTC stream to ${streamUrl}`);
    videoElement.innerHTML = `<div class="alert alert-info p-2 small">WebRTC stream placeholder for ${streamUrl}</div>`;
};

const initRTSPStream = (videoElement, streamUrl) => {
    console.log(`Initializing RTSP stream: ${streamUrl}`);
    videoElement.innerHTML = `
        <div class="alert alert-info p-2 small">
            RTSP streams require specific handling.
            <a href="${streamUrl}" target="_blank" rel="noopener noreferrer">Open directly</a>
        </div>`;
};

const initIPCameraStream = (videoElement, streamUrl) => {
    console.log(`Initializing IP Camera stream from ${streamUrl} - Assuming MJPEG, using proxy.`);
    initDroidCamStream(videoElement, streamUrl);
};


// Container and Fetching Logic (no major changes needed here)
const container = document.getElementById('cameras-container');
fetchData().then((data) => {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No cameras found. Add a camera using the "Add Device" page.</div>';
        return;
    }

    container.innerHTML = '';
    const row = document.createElement('div');
    row.classList.add('row');
    container.appendChild(row);

    data.forEach(cameraData => {
        const cardWrapper = createCard(cameraData);
        row.appendChild(cardWrapper);

        if (cameraData.status) {
            initCameraStream(`container-${cameraData._id}`, cameraData);
        }
    });

    setupEventListeners();
}).catch(err => {
    console.error('Error loading cameras:', err);
    container.innerHTML = '<div class="alert alert-danger">Error loading cameras. Please check the API server and try again later.</div>';
});

// Setup Event Listeners (no major changes needed here, ensure it's called)
function setupEventListeners() {
    $(container).off('click'); // Prevent duplicate listeners

    // Remove button handler
    $(container).on('click', '.remove-button', function(e) {
        const cardWrapper = $(this).closest('.col-lg-6');
        const card = cardWrapper.find('.card');
        const cameraId = card.attr('id');
        console.log(`[Remove] Clicked for ID: ${cameraId}`);
        if (!confirm(`Are you sure you want to delete camera "${card.find('.card-title').text()}"?`)) return;

        $.ajax({
            url: `${API_URL}/delete`, method: 'DELETE', data: JSON.stringify({ id: cameraId }), contentType: 'application/json',
            success: function(res) { console.log(`[Remove] Success for ID: ${cameraId}`, res); cardWrapper.remove(); if ($('#cameras-container .card').length === 0) container.innerHTML = '<div class="alert alert-info">No cameras left.</div>'; },
            error: function(jqXHR, textStatus, errorThrown) { console.error(`[Remove] Error deleting camera ${cameraId}:`, textStatus, errorThrown, jqXHR.responseText); alert(`Failed to delete camera: ${jqXHR.statusText || errorThrown}`); }
        });
    });

    // Toggle button handler
    $(container).on('click', '.toggle-button', function(e) {
        const cardWrapper = $(this).closest('.col-lg-6');
        const card = cardWrapper.find('.card');
        const cameraId = card.attr('id');
        const statusElement = card.find('.status-value');
        const currentStatus = statusElement.text() === 'ON';
        const newStatus = !currentStatus;
        const originalCameraUrl = cardWrapper.data('camera-url');
        const cameraType = cardWrapper.data('camera-type');
        console.log(`[Toggle] Clicked for ID: ${cameraId}. New status: ${newStatus}`);

        const buttonIcon = $(this).find('i');
        statusElement.text(newStatus ? 'ON' : 'OFF');
        buttonIcon.removeClass(`fa-toggle-${currentStatus ? 'on' : 'off'}`).addClass(`fa-toggle-${newStatus ? 'on' : 'off'}`);
        const videoContainer = card.find('.video-container');

        if (newStatus) {
            videoContainer.html(`<p class="text-center text-muted pt-5">Initializing stream...</p>`);
            setTimeout(() => { initCameraStream(`container-${cameraId}`, { _id: cameraId, url: originalCameraUrl, type: cameraType, status: true }); }, 50);
        } else {
            videoContainer.html('<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>');
        }

        $.ajax({
            url: `${API_URL}/toggle`, method: 'POST', data: JSON.stringify({ id: cameraId, status: newStatus }), contentType: 'application/json',
            success: function(res) { console.log(`[Toggle] Success for ID: ${cameraId}`, res); /* UI already updated */ },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error(`[Toggle] Error toggling camera ${cameraId}:`, textStatus, errorThrown, jqXHR.responseText);
                alert(`Failed to toggle camera status: ${jqXHR.statusText || errorThrown}`);
                // Revert UI
                statusElement.text(currentStatus ? 'ON' : 'OFF');
                buttonIcon.removeClass(`fa-toggle-${newStatus ? 'on' : 'off'}`).addClass(`fa-toggle-${currentStatus ? 'on' : 'off'}`);
                if (currentStatus) { videoContainer.html(`<p>Re-initializing stream after error...</p>`); initCameraStream(`container-${cameraId}`, { _id: cameraId, url: originalCameraUrl, type: cameraType, status: true }); }
                else { videoContainer.html('<div class="camera-offline d-flex justify-content-center align-items-center h-100">Camera is offline</div>'); }
            }
        });
    });

     // View Directly Button
     $(container).on('click', '.view-button', function(e) {
         console.log(`[View Directly] Clicked. Opening: ${$(this).attr('href')}`);
         // Default link action is sufficient
     });
}

// --- Make sure app.js loads navbar and modal templates ---
// Ensure app.js is included and loads navbar.html / modals.html correctly.