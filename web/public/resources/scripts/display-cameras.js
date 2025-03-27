const API_URL = 'http://localhost:5000/api/cameras';

// Global retry function
window.retryDroidCam = (elementId, streamUrl) => {
    const element = document.getElementById(elementId);
    if (element) {
        initDroidCamStream(element, streamUrl);
    }
};

// Fetch data from MongoDB
const fetchData = async () => {
    try {
        const data = await $.get(`${API_URL}`);
        return data;
    } catch (error) {
        console.error('Error fetching cameras:', error);
        throw error;
    }
};

const createCard = (data) => {
    const card = document.createElement('div');
    card.classList.add('col-md-6', 'mb-4');
    card.dataset.cameraType = data.type;

    // Extract clean IP for display
    const ipMatch = data.url.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    const displayUrl = ipMatch ? `http://${ipMatch[1]}:4747` : data.url;

    card.innerHTML = `
      <div class="card" id='${data._id}'>
        <div class="card-body">
          <h2 class="card-title">${data.name}</h2>
          <div class="video-container" id="container-${data._id}">
            ${data.status ? 
              `<img id="video-${data._id}" style="width:100%;height:100%;object-fit:cover;">` : 
              `<div class="camera-offline">Camera is offline</div>`
            }
          </div>
          <div class="card-text mt-3">
            <p>Status: <span class="status-value">${data.status ? 'ON' : 'OFF'}</span></p>
            <p>Type: ${data.type}</p>
            <p>IP Address: ${ipMatch ? ipMatch[1] : 'Invalid URL'}</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary toggle-button">
              <i class="fa-solid fa-toggle-${data.status ? 'on' : 'off'}"></i> Toggle
            </button>
            <button class="btn btn-info view-button">
              <i class="fa-solid fa-external-link-alt"></i> View Directly
            </button>
            <button class="btn btn-danger remove-button" style="float: right">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
        </div>
      </div>
    `;

    return card;
};

// Initialize DroidCam stream with proxy
// Initialize DroidCam stream with proxy (IP only)
const initDroidCamStream = (videoElement, streamUrl) => {
    // Clear existing content
    videoElement.innerHTML = '';

    // Create container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';

    // Create image element
    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';

    // Format the URL (IP only)
    let displayUrl, proxyUrl;
    try {
        // Extract clean IP for display
        const ipMatch = streamUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (!ipMatch) throw new Error('Invalid IP format');
        
        const baseIp = ipMatch[1];
        displayUrl = `http://${baseIp}:4747/video`;
        
        // Create proxy URL (still uses localhost for the proxy)
        proxyUrl = `http://localhost:5000/api/droidcam-proxy?url=${encodeURIComponent(displayUrl)}&t=${Date.now()}`;
        img.src = proxyUrl;

    } catch (error) {
        videoElement.innerHTML = `
            <div class="alert alert-danger">
                <h4>Configuration Error</h4>
                <p>${error.message}</p>
                <p>URL: ${streamUrl}</p>
            </div>
        `;
        return;
    }

    // Error handling
    img.onerror = () => {
        videoElement.innerHTML = `
            <div class="alert alert-warning">
                <h4>Connection Error</h4>
                <p>Could not load camera feed.</p>
                <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-primary" 
                        onclick="retryDroidCam('${videoElement.id}', '${streamUrl}')">
                        Retry
                    </button>
                    <a href="${displayUrl}" 
                       target="_blank"
                       class="btn btn-sm btn-secondary">
                        Open Directly (${displayUrl.split('/')[2]})
                    </a>
                </div>
            </div>
        `;
    };

    container.appendChild(img);
    videoElement.appendChild(container);
};

// Update view button handler
$(document).on('click', '.view-button', function(e) {
    const card = $(this).closest('.card');
    const cameraUrl = card.find('.card-text p:nth-child(3)').text().replace('URL: ', '');
    
    // Extract clean IP address
    const ipMatch = cameraUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (!ipMatch) {
        alert('Invalid IP address in camera URL');
        return;
    }
    
    const baseIp = ipMatch[1];
    const viewUrl = `http://${baseIp}:4747`;
    
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
});

// Initialize stream based on camera type
const initCameraStream = (videoElementId, cameraData) => {
    const videoElement = document.getElementById(videoElementId);
    if (!videoElement) return;

    if (cameraData.url.includes('droidcam')) {
        initDroidCamStream(videoElement, cameraData.url);
    } else {
        switch(cameraData.type) {
            case 'webrtc':
                initWebRTCStream(videoElement, cameraData.url);
                break;
            case 'rtsp':
                initRTSPStream(videoElement, cameraData.url);
                break;
            case 'mjpeg':
                initMJPEGStream(videoElement, cameraData.url);
                break;
            case 'ip':
                initIPCameraStream(videoElement, cameraData.url);
                break;
            default:
                console.error('Unknown camera type:', cameraData.type);
        }
    }
};

// Other stream initializations (unchanged)
const initWebRTCStream = (videoElement, streamUrl) => {
    console.log(`Initializing WebRTC stream to ${streamUrl}`);
    videoElement.src = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
};

const initRTSPStream = (videoElement, streamUrl) => {
    videoElement.innerHTML = `
        <div class="alert alert-info">
            RTSP streams require special handling. 
            <a href="${streamUrl}" target="_blank">Open stream directly</a>
        </div>`;
};

const initMJPEGStream = (videoElement, streamUrl) => {
    initDroidCamStream(videoElement, streamUrl);
};

const initIPCameraStream = (videoElement, streamUrl) => {
    console.log(`Initializing IP Camera stream from ${streamUrl}`);
    videoElement.src = streamUrl;
};

// Create container and populate with camera cards
const container = document.getElementById('cameras-container');

// Fetch and display cameras
fetchData().then((data) => {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No cameras found. Add a camera to get started.</div>';
        return;
    }

    container.innerHTML = '';
    data.forEach(cameraData => {
        const card = createCard(cameraData);
        container.appendChild(card);
        
        if (cameraData.status) {
            initCameraStream(`container-${cameraData._id}`, cameraData);
        }
    });

    setupEventListeners();
}).catch(err => {
    console.error('Error loading cameras:', err);
    container.innerHTML = '<div class="alert alert-danger">Error loading cameras. Please try again later.</div>';
});

// Set up event listeners for buttons
function setupEventListeners() {
    // Remove button handler
    $(document).on('click', '.remove-button', function(e) {
        const card = $(this).closest('.card');
        const cameraId = card.attr('id');
        
        $.ajax({
            url: `${API_URL}/delete`,
            method: 'DELETE',
            data: { id: cameraId },
            success: function() {
                card.remove();
                if ($('.card').length === 0) {
                    container.innerHTML = '<div class="alert alert-info">No cameras found. Add a camera to get started.</div>';
                }
            },
            error: function(err) {
                console.error('Error deleting camera:', err);
                alert('Failed to delete camera. Please try again.');
            }
        });
    });

    // View button handler
    $(document).on('click', '.view-button', function(e) {
        const card = $(this).closest('.card');
        const cameraUrl = card.find('.card-text p:nth-child(3)').text().replace('URL: ', '');
        const httpUrl = cameraUrl.includes('droidcam') 
            ? cameraUrl.replace('rtsp://', 'http://').replace('/cam', '')
            : cameraUrl;
        window.open(httpUrl, '_blank', 'noopener,noreferrer');
    });

    // Toggle button handler
    $(document).on('click', '.toggle-button', function(e) {
        const card = $(this).closest('.card');
        const cameraId = card.attr('id');
        const statusElement = card.find('.status-value');
        const currentStatus = statusElement.text() === 'ON';
        const newStatus = !currentStatus;
        const cameraUrl = card.find('.card-text p:nth-child(3)').text().replace('URL: ', '');
        
        $.ajax({
            url: `${API_URL}/toggle`,
            method: 'POST',
            data: { id: cameraId, status: newStatus },
            success: function() {
                statusElement.text(newStatus ? 'ON' : 'OFF');
                const icon = $(e.target).find('i');
                icon.removeClass(`fa-toggle-${currentStatus ? 'on' : 'off'}`);
                icon.addClass(`fa-toggle-${newStatus ? 'on' : 'off'}`);
                
                const videoContainer = card.find('.video-container');
                if (newStatus) {
                    videoContainer.html(`<img id="video-${cameraId}" style="width:100%;height:100%;object-fit:cover;">`);
                    initCameraStream(`container-${cameraId}`, { 
                        _id: cameraId,
                        url: cameraUrl,
                        type: card.closest('[data-camera-type]').dataset.cameraType,
                        status: true
                    });
                } else {
                    videoContainer.html('<div class="camera-offline">Camera is offline</div>');
                }
            },
            error: function(err) {
                console.error('Error toggling camera status:', err);
                alert('Failed to toggle camera status. Please try again.');
            }
        });
    });
}