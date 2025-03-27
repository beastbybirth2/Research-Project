const API_URL = 'http://localhost:5000/api/cameras';

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

// Create a card element with the given data
const createCard = (data) => {
    const card = document.createElement('div');
    card.classList.add('col-md-6', 'mb-4');
    card.dataset.cameraType = data.type; // Store camera type in dataset

    card.innerHTML = `
      <div class="card" id='${data._id}'>
        <div class="card-body">
          <h2 class="card-title">${data.name}</h2>
          <div class="video-container">
            ${data.status ? 
              `<video id="video-${data._id}" autoplay playsinline muted></video>` : 
              `<div class="camera-offline">Camera is offline</div>`
            }
          </div>
          <div class="card-text mt-3">
            <p>Status: <span class="status-value">${data.status ? 'ON' : 'OFF'}</span></p>
            <p>Type: ${data.type}</p>
            <p>URL: ${data.url}</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary toggle-button">
              <i class="fa-solid fa-toggle-${data.status ? 'on' : 'off'}"></i> Toggle
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

// Initialize stream based on camera type
const initCameraStream = (videoElementId, cameraData) => {
    const videoElement = document.getElementById(videoElementId);
    if (!videoElement) return;
    console.log(videoElementId)
    console.log(cameraData)
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
};

// WebRTC Stream Initialization
const initWebRTCStream = (videoElement, streamUrl) => {
    console.log(`Initializing WebRTC stream to ${streamUrl}`);
    // Placeholder - implement actual WebRTC connection
    // For demo purposes, we'll use a sample video
    videoElement.src = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
};

// RTSP Stream Initialization (requires proxy/transcoding)
const initRTSPStream = (videoElement, streamUrl) => {
    console.log(`Initializing RTSP stream from ${streamUrl}`);
    
    // Clear any existing content
    videoElement.innerHTML = '';
    
    // Create an iframe that points to a simple HTML page with the stream
    const iframe = document.createElement('iframe');
    iframe.src = `/rtsp-player.html?stream=${encodeURIComponent(streamUrl)}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'autoplay';
    
    videoElement.appendChild(iframe);
};

// MJPEG Stream Initialization
const initMJPEGStream = (videoElement, streamUrl) => {
    console.log(`Initializing MJPEG stream from ${streamUrl}`);
    // MJPEG can be displayed directly in an img tag
    // For video element, we might need to use a library
    videoElement.innerHTML = `<img src="${streamUrl}" style="width:100%;height:100%;object-fit:cover;">`;
};

// IP Camera Stream Initialization
const initIPCameraStream = (videoElement, streamUrl) => {
    console.log(`Initializing IP Camera stream from ${streamUrl}`);
    // IP cameras often use RTSP or proprietary protocols
    // This would be similar to RTSP implementation
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

    // Clear existing content
    container.innerHTML = '';

    // Create a card for each camera
    data.forEach(cameraData => {
        const card = createCard(cameraData);
        container.appendChild(card);
        
        // Initialize stream if camera is active
        if (cameraData.status) {
            initCameraStream(`video-${cameraData._id}`, cameraData);
        }
    });

    // Set up event listeners
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
                // Show message if no cameras left
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

    // Toggle button handler
    $(document).on('click', '.toggle-button', function(e) {
        const card = $(this).closest('.card');
        const cardWrapper = $(this).closest('.col-md-6'); // Get the parent div that has data-camera-type
        const cameraId = card.attr('id');
        const statusElement = card.find('.status-value');
        const currentStatus = statusElement.text() === 'ON';
        const newStatus = !currentStatus;
        const cameraType = cardWrapper.data('camera-type'); // Get from the wrapper div
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
                    videoContainer.html(`<video id="video-${cameraId}" autoplay playsinline muted></video>`);
                    initCameraStream(`video-${cameraId}`, { 
                        type: cameraType, 
                        url: cameraUrl 
                    });
                } else {
                    const videoElement = document.getElementById(`video-${cameraId}`);
                    if (videoElement) {
                        // Stop all tracks if using WebRTC
                        if (videoElement.srcObject) {
                            videoElement.srcObject.getTracks().forEach(track => track.stop());
                        }
                        // Clear the source
                        videoElement.src = '';
                        // Remove the video element
                        videoElement.remove();
                    }
                    videoContainer.html('<div class="camera-offline">Camera is offline</div>');
                }
            },
            error: function(err) {
                console.error('Error toggling camera status:', err);
                alert('Failed to toggle camera status. Please try again.');
            }
        });
    })}