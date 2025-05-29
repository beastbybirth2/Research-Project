// web/public/resources/scripts/manage-known-faces.js
const API_URL_KNOWN_FACES = 'http://localhost:5000/api/known-faces';

$(document).ready(function() {
    fetchAndDisplayKnownFaces();
});

async function fetchAndDisplayKnownFaces() {
    const listContainer = $('#known-faces-list');
    listContainer.html('<p class="text-muted">Loading known faces...</p>'); 

    try {
        const response = await fetch(API_URL_KNOWN_FACES);
        if (!response.ok) {
            throw new Error(`Failed to fetch known faces: ${response.statusText}`);
        }
        const faces = await response.json();

        if (!faces || faces.length === 0) {
            listContainer.html('<p class="text-info">No known faces have been added yet.</p>');
            return;
        }

        listContainer.empty(); 

        faces.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by newest first

        faces.forEach(face => {
            const formattedDate = face.createdAt ? new Date(face.createdAt).toLocaleString() : 'N/A';
            const faceEntry = `
                <div class="face-entry" data-id="${face._id}">
                    <img src="${face.faceImagePreview || './resources/images/placeholder-face.png'}" alt="${face.label}" class="face-preview-img">
                    <div class="face-details">
                        <span class="face-name">${face.label}</span>
                        <span class="face-date">Added: ${formattedDate}</span>
                    </div>
                    <button class="btn btn-sm btn-danger remove-face-btn ms-auto"> <!-- ms-auto to push button to right -->
                        <i class="fas fa-trash-alt"></i> Remove
                    </button>
                </div>
            `;
            listContainer.append(faceEntry);
        });

        $('.remove-face-btn').on('click', handleRemoveFace);

    } catch (error) {
        console.error('Error fetching known faces:', error);
        listContainer.html(`<div class="alert alert-danger">Error loading faces: ${error.message}</div>`);
    }
}

async function handleRemoveFace() {
    const faceEntryDiv = $(this).closest('.face-entry');
    const faceId = faceEntryDiv.data('id');
    const faceName = faceEntryDiv.find('.face-name').text();

    if (!confirm(`Are you sure you want to remove the known face: "${faceName}"?`)) {
        return;
    }

    $('#status-message-global').html('<div class="alert alert-info">Removing face...</div>');

    try {
        const response = await fetch(`${API_URL_KNOWN_FACES}/${faceId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            $('#status-message-global').html(`<div class="alert alert-success">${result.message} Reload the camera page for changes to take effect.</div>`);
            faceEntryDiv.remove(); 
            if ($('#known-faces-list').children().length === 0) {
                 $('#known-faces-list').html('<p class="text-info">No known faces have been added yet.</p>');
            }
        } else {
            throw new Error(result.error || `Failed to remove face (status ${response.status})`);
        }
    } catch (error) {
        console.error('Error removing face:', error);
        $('#status-message-global').html(`<div class="alert alert-danger">Error removing face: ${error.message}</div>`);
    }
    
    setTimeout(() => {
        $('#status-message-global').empty();
    }, 7000);
}