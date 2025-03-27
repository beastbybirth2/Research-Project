const apiUrl = `http://localhost:5000/api/acs`;
const API_URL_TEST = `http://localhost:5000/api/acs/test`;
let acstatus = `on`
try {
  const fetchData = async () => {

    const data = await $.get(`${apiUrl}`)

    return data;
  }
  // create a card element with the given data
  const createCard = (data) => {
    const card = document.createElement('div');
    card.classList.add('col-md-4');
    disableCard = (data.status == "on");
    card.innerHTML = `
  <div class="card ac-card ${disableCard ? '' : ' text-bg-secondary'}" id = '${data._id}'>
  <div class="card-header">
         <h2>${data.name}: <span style ="color: #dc3545;">${data.status.toUpperCase()}<span><button class="btn btn-danger remove-button"style="float: right"><i class="fa-solid fa-trash-can "></i></button></h2> 
      </div>
      <div class="card-body}">
        <div class="row">
          <div class="col">
            <h4>Temperature <i class="fa-solid fa-temperature-arrow-down"></i></h4>
            <div class="temperature-controls">
              <button class="btn btn-sm btn-secondary decrease-temperature">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="temperature">${data.temp}&deg;C</span>
              <button class="btn btn-sm btn-secondary increase-temperature">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
          </div>
          <div class="col">
            <h4>Fan Speed <i class="fa-solid fa-fan fa-spin"></i></h4>
            <div class="fan-speed-controls">
              <button class="btn btn-sm btn-secondary decrease-fan-speed" >
                <i class="fa-solid fa-minus fa-beat"></i>
              </button>
              <span class="fan-speed">${data.fan}</span>
              <button class="btn btn-sm btn-secondary increase-fan-speed" >
                <i class="fa-solid fa-plus fa-beat"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary toggle-button">
        <i class="fa-regular fa-circle-dot"></i> Power On/Off
        </button>
        
      </div>
`;
    return card;
  };
  function updateACCard(card, tempValue, fanValue) {
    // update the temperature and fan speed values on the card
    card.querySelector(".temperature").textContent = tempValue + "°C";
    card.querySelector(".fan-speed").textContent = fanValue;

    // send an API request to update the AC status with the new values
    const id = card.id;
    status = acstatus;
    const body = {
      id,
      status,
      tempValue,
      fanValue
    }

    // $.post(`${apiUrl}/update`, body)
    //     .then(response => {
    //         //location.href = '/';
    //     })
    //     .catch(error => {
    //         console.error(`Error: ${error}`);
    //     });
  }
  // create a container element to hold the cards
  const container = document.createElement('div');
  container.classList.add('container');

  // fetch the data and create a card for each item
  fetchData().then((data) => {
    console.log(data);
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

    // get all AC cards and add event listeners for temperature and fan speed control buttons
    const acCards = document.querySelectorAll(".ac-card");
    console.log(acCards)

    acCards.forEach(card => {

      const tempControls = card.querySelector(".temperature-controls");
      const fanControls = card.querySelector(".fan-speed-controls");
      const toggleButton = card.querySelector(".toggle-button");
      // add event listener for temperature control buttons
      tempControls.addEventListener("click", e => {
        if (!e.target.matches("button")) {
          return;
        }
        str = card.querySelector(".temperature").textContent.slice(0, -2);
        console.log(str);
        const currentValue = parseInt(str);
        newValue = currentValue;
        if (currentValue >= 16 && currentValue <= 30) {
          if (e.target.classList.contains("decrease-temperature") && currentValue > 16) {
            newValue = currentValue - 1;
          }
          else if (e.target.classList.contains("increase-temperature") && currentValue < 30) {
            newValue = currentValue + 1;
          }

        }
        else {

          if (e.target.classList.contains("decrease-temperature")) {
            newValue = 16;
          }
          else if (e.target.classList.contains("increase-temperature")) {
            newValue = 30;
          }
        }
        updateACCard(card, newValue, card.querySelector(".fan-speed").textContent);

      });


      // add event listener for fan speed control buttons
      fanControls.addEventListener("click", e => {
        if (!e.target.matches("button")) {
          return;
        }
        const currentValue = card.querySelector(".fan-speed").textContent;
        console.log(currentValue)

        const fanSpeeds = ["LOW", "MEDIUM", "HIGH"];
        index = fanSpeeds.indexOf(currentValue)
        console.log(index)
        newValue = currentValue;
        if (e.target.classList.contains("decrease-fan-speed") && index > 0) {
          newValue = fanSpeeds[index - 1];
          console.log(newValue)
        }
        else if (e.target.classList.contains("increase-fan-speed") && index < 2) {
          newValue = fanSpeeds[index + 1];
        }

        updateACCard(card, card.querySelector(".temperature").textContent.slice(0, -2), newValue);
      });
      toggleButton.addEventListener("click", e => {
        if (!e.target.matches("button")) {
          return;
        }

        acstatus = (card.querySelector(".card-header").textContent.includes("ON")) ? "off" : "on";

      });
    });
    // get all remove buttons and add an event listener for clicks
    const removeButtons = document.querySelectorAll(".remove-button");
    removeButtons.forEach(button => {
        button.addEventListener("click", e => {
            // get the card associated with this remove button and remove it from the DOM
            const card = e.target.closest(".card");
            console.log(card)
            $.post(`${API_URL}/acs/delete`, card.id)
            card.remove();
        });
    });
  });
} catch (e) {
  console.log(e);
}