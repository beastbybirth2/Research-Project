

    const API_URL = 'http://localhost:5000/api/lights';
    const API_URL_TEST = `${API_URL}/test`;

    // fetch data from MongoDB
    const fetchData = async () => {

        const data = await $.get(`${API_URL}`)
        
        return data;
    }
    function getRandomColor() {
        // Generate random values for red, green, and blue components
        var red = Math.floor(Math.random() * 256);
        var green = Math.floor(Math.random() * 256);
        var blue = Math.floor(Math.random() * 256);

        // Convert the decimal values to hexadecimals and pad with 0 if needed
        var hexRed = red.toString(16).padStart(2, '0');
        var hexGreen = green.toString(16).padStart(2, '0');
        var hexBlue = blue.toString(16).padStart(2, '0');

        // Combine the components into a single color value in #rrggbb format
        var color = "#" + hexRed + hexGreen + hexBlue;

        return color;
    }

    // create a card element with the given data
    const createCard = (data) => {
        //for randomcolor
        var randomColor = getRandomColor();
        
        const card = document.createElement('div');
        card.classList.add('col-md-4');
        
        card.innerHTML = `
      <div class="card" id = '${data._id}'>
      <div class="card-body">
      <i class="fa-solid fa-lightbulb fa-10x bright" style="color:${randomColor}"></i>
      <span><h1>${data.name}</h1></span>
      
      <label for="color-picker-${data._id}">Choose a color:  </label>
      <input type="color" style="margin: 10px;" id="color-picker-${data._id}" class="color-picker" value="${randomColor}">
      <br>  
      <div class="card-footer">
      <button class="btn btn-primary toggle-button" ><i class="fa-solid fa-toggle-on"></i> Toggle</button>
      <button class="btn btn-danger remove-button"style="float: right"><i class="fa-solid fa-trash-can "></i> Remove</button>
    
      </div>
    </div>
      </div>
    `;


        return card;
    };

    // create a container element to hold the cards
    const container = document.createElement('div');
    container.classList.add('container');

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

        // get all color picker inputs and add an event listener for changes
        const colorPickers = document.querySelectorAll(".color-picker");
       
        colorPickers.forEach(picker => {
            picker.addEventListener("change", e => {
                // get the icon associated with this color picker and set its color to the selected color
                const icon = e.target.closest(".card").querySelector(".fa-lightbulb");
                console.log(icon)
                icon.style.color = e.target.value;
            });
        });

        // get all remove buttons and add an event listener for clicks
        const removeButtons = document.querySelectorAll(".remove-button");
        removeButtons.forEach(button => {
            button.addEventListener("click", e => {
                // get the card associated with this remove button and remove it from the DOM
                const card = e.target.closest(".card");
                console.log(card)
                card.remove();
            });
        });
  abc = false;
        // get all toggle buttons and add an event listener for clicks
        const toggleButtons = document.querySelectorAll(".toggle-button");
        toggleButtons.forEach(button => {
            button.addEventListener("click", e => {
                // get the icon associated with this toggle button and toggle the "bright" class on it
                const icon = e.target.closest(".card").querySelector(".fa-lightbulb");
                icon.style.opacity = (abc)? 0.1:0.9;
                abc = !abc
                console.log("toggled");
            });
        });
        
    });

