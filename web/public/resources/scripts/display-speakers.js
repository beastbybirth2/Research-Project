const API_URL = 'http://localhost:5000/api/speakers';
const API_URL_TEST = `${API_URL}/test`;

// fetch data from MongoDB
const fetchData = async () => {
    const data = await $.get(`${API_URL}`);
    return data;
};

function getRandomNumber() {
    // Generate a random number between 0 and 6
    const randomNum = Math.floor(Math.random() * 7);

    // Add 1 to the random number to get a value between 1 and 7
    return randomNum + 1;
}

// create a card element with the given data
const createCard = (data) => {
    const card = document.createElement('div');
    card.classList.add('col-md-4', 'speaker-card');

    card.innerHTML = `
    <div class="card" id="${data._id}">
      <img class="card-img-top" src="${data.image}" alt="${data.name}">
      <div class="card-body">
        <h5 class="card-title">${data.name}<button class="btn btn-danger remove-button"style="float: right"><i class="fa-solid fa-trash-can "></i></button></h5>
        <p class="card-text">${data.description}</p>
      </div>
      <div class="card-footer">
        <div id="music-player">
          <div class="player-controls">
            <button class="play-button"><i class="fa-solid fa-play"></i></button>
            <button class="pause-button" style = "display: none;"><i class="fa-solid fa-pause"></i></button>
            
            <input type="range" class="timeline-slider" min="0" max="100" step="0.1" value="0">
        
          </div>
          <div>
          <center>
          <button class="btn" ><i class="fa-solid fa-volume-high"></i>
            <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="1"></button>
          </div>
          </center>
         
        </div>
      </div>
    </div>
    `;

    // add event listeners for the play and pause buttons
    const playButton = card.querySelector('.play-button');
    const pauseButton = card.querySelector('.pause-button');
    const audio = new Audio(`./resources/audios/sample${getRandomNumber()}.mp3`);
    let isPlaying = false;

    playButton.addEventListener('click', () => {
        audio.play();
        isPlaying = true;
        playButton.style.display = 'none';
        pauseButton.style.display = 'inline-block';
    });

    pauseButton.addEventListener('click', () => {
        audio.pause();
        isPlaying = false;
        pauseButton.style.display = 'none';
        playButton.style.display = 'inline-block';
    });

    // add event listener for volume slider changes
    const volumeSlider = card.querySelector('.volume-slider');
    volumeSlider.addEventListener('input', () => {
        audio.volume = volumeSlider.value;
    });

    // add event listener for timeline slider changes
    const timelineSlider = card.querySelector('.timeline-slider');
    timelineSlider.addEventListener('input', () => {
        audio.currentTime = (audio.duration / 100) * timelineSlider.value;
    });

    // update timeline slider position as audio is playing
    audio.addEventListener('timeupdate', () => {
        if (!isPlaying) return;
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        const percent = (currentTime / duration) * 100;
        timelineSlider.value = percent;
    });

    // add event listener for remove button click
    const removeButton = card.querySelector('.remove-button');
    removeButton.addEventListener('click', () => {
        card.remove();
    });

    return card;
};


// create a container element to hold the cards
const container = document.getElementById('speakers-container');

// fetch the data and create a card for each item
fetchData().then((data) => {
    const rows = Math.ceil(data.length / 3); // calculate number of rows needed

    for (let i = 0; i < rows; i++) {
        const row = document.createElement('div');
        row.classList.add('row');

        for (let j = i * 3; j < i * 3 + 3 && j < data.length; j++) {
            const cardData = data[j];

            const card = createCard(cardData);

            // skip this iteration if the row element is undefined
            if (!row) {
                console.error('Error: row element is undefined');
                continue;
            }

            row.appendChild(card);
        }
        container.appendChild(row);
    }



    // add the container to the page
    document.body.appendChild(container);

    // get all remove buttons and add an event listener for clicks
    const removeButtons = document.querySelectorAll('.remove-button');
    removeButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            // get the card associated with this remove button and remove it from the DOM
            const card = e.target.closest('.card');
            console.log(card);
            
            $.post(`${API_URL}/speakers/delete`, card.id)
            card.remove();
        });
    });

    // get all buy buttons and add an event listener for clicks
    const buyButtons = document.querySelectorAll('.buy-button');
    buyButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            // get the card associated with this buybutton and log the ID to the console
            const card = e.target.closest('.card');
            const id = card.getAttribute('id');
            console.log(`Buy button clicked for speaker with ID: ${id}`);
        });
    });
});
