const API_URL = 'http://localhost:5000/api/cameras';
const API_URL_TEST = `${API_URL}/test`;

// fetch data from MongoDB
const fetchData = async () => {
    const data = await $.get(`${API_URL}`);
    return data;
}

// create a card element with the given data
const createCard = (data) => {
    const card = document.createElement('div');
    card.classList.add('col-md-6', 'mb-4'); // Changed to col-md-6 for better video display

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

// Initialize WebRTC stream
const initWebRTCStream = (videoElementId, streamUrl) => {
    const videoElement = document.getElementById(videoElementId);
    
    // This is a placeholder - you'll need to implement the actual WebRTC connection
    // For now, we'll just show a placeholder for the stream
    console.log(`Initializing WebRTC stream for ${videoElementId} from ${streamUrl}`);
    
    // In a real implementation, you would:
    // 1. Create a peer connection
    // 2. Set up ICE candidates
    // 3. Add tracks to the connection
    // 4. Handle the stream
    
    // For demo purposes, we'll just show a "live" indicator
    videoElement.src = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
};

// create a container element to hold the cards
const container = document.getElementById('cameras-container');

// fetch the data and create a card for each item
fetchData().then((data) => {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No cameras found. Add a camera to get started.</div>';
        return;
    }

    data.forEach(cameraData => {
        const card = createCard(cameraData);
        container.appendChild(card);
        
        // Initialize stream if camera is on
        if (cameraData.status) {
            initWebRTCStream(`video-${cameraData._id}`, cameraData.url);
        }
    });

    // get all remove buttons and add an event listener for clicks
    $(document).on('click', '.remove-button', function(e) {
        const card = $(this).closest('.card');
        const cameraId = card.attr('id');
        
        $.ajax({
            url: `${API_URL}/delete`,
            method: 'DELETE',
            data: { id: cameraId },
            success: function() {
                card.remove();
            },
            error: function(err) {
                console.error('Error deleting camera:', err);
            }
        });
    });

    // get all toggle buttons and add an event listener for clicks
    $(document).on('click', '.toggle-button', function(e) {
        const card = $(this).closest('.card');
        const cameraId = card.attr('id');
        const statusElement = card.find('.status-value');
        const currentStatus = statusElement.text() === 'ON';
        const newStatus = !currentStatus;
        
        $.ajax({
            url: `${API_URL}/toggle`,
            method: 'POST',
            data: { id: cameraId, status: newStatus },
            success: function() {
                statusElement.text(newStatus ? 'ON' : 'OFF');
                const icon = $(e.target).find('i');
                icon.removeClass(`fa-toggle-${currentStatus ? 'on' : 'off'}`);
                icon.addClass(`fa-toggle-${newStatus ? 'on' : 'off'}`);
                
                // Initialize or stop the stream
                if (newStatus) {
                    const videoContainer = card.find('.video-container');
                    videoContainer.html(`<video id="video-${cameraId}" autoplay playsinline muted></video>`);
                    initWebRTCStream(`video-${cameraId}`, card.data('url'));
                } else {
                    const videoElement = document.getElementById(`video-${cameraId}`);
                    if (videoElement) {
                        videoElement.srcObject = null;
                    }
                    card.find('.video-container').html('<div class="camera-offline">Camera is offline</div>');
                }
            },
            error: function(err) {
                console.error('Error toggling camera status:', err);
            }
        });
    });
}).catch(err => {
    console.error('Error fetching cameras:', err);
    container.innerHTML = '<div class="alert alert-danger">Error loading cameras. Please try again later.</div>';
});