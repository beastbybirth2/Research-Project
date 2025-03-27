const API_URL = 'http://localhost:5000/api';
// The following code is using JavaScript to add event listener to the device form 
// when submit button is clicked, it will prevent the default action from happening 


const deviceForm = document.getElementById("device-form");
deviceForm.addEventListener("submit", async(event) => {
  event.preventDefault();

  // The following code is selecting radio buttons and defining their values as "devicetype"   
  const selectedOption = document.querySelector('input[name="options"]:checked').id;
  devicetype = selectedOption;

  // These two variables are used to check if input fields have been filled out properly  
  var devicenamebool = true;


  // Here, we are getting user input values for the device name and device ID.
  // If either value is empty or null, then the respective boolean variable becomes false.   
  devicename = document.getElementById("devicename").value;

  thermotemp = document.getElementById('thermotemp').value;
  thermostatStatus = document.getElementById('thermostatStatus').value;
  lightStatus = document.getElementById('lightStatus').value;
  ACstatus = document.getElementById('ACstatus').value;
  ACtemperature = document.getElementById('ACtemperature').value;
  fanspeed = document.getElementById('fanspeed').value;
  instock = document.getElementById('instock').checked;
  description = document.getElementById('description').value;
  price = document.getElementById('price').value;
  imagelink = document.getElementById('imagelink').value;

  if (devicename === "") {
    devicenamebool = false;
  }


  //This block of code executes when both boolean values are true which means that the user should see results of inputs correctly
  else if (devicenamebool) {
    console.log("Device Name: " + devicename);

    console.log("Device Type: " + devicetype);

    
    if (devicetype == "speaker") {
      name = devicename;
      const body = {
        name
      }
      await $.post(`${API_URL}/speakers`, body)
        .then(response => {
          console.log(response);
        })
        .catch(error => {
          console.error(`Error: ${error}`);
        });
    }
    else if (devicetype == "light") {
      name = devicename;
      status = (lightStatus == 1);
      console.log(status);
      const body = {
        name,
        status
      };

      await $.post(`${API_URL}/lights`, body)
        .then(response => {
          console.log(response);
        })
        .catch(error => {
          console.error(`Error: ${error}`);
        });

    } else if (devicetype == "ac") {
      name = devicename;
      status = "on";
      temp = Number(ACtemperature)
      fan = fanspeed;
      const body = {
        name,
        status,
        temp,
        fan
      };

      await $.post(`${API_URL}/acs`, body)
        .then(response => {
          console.log(response);
        })
        .catch(error => {
          console.error(`Error: ${error}`);
        });
    }
    else if (devicetype == "laptop") {
      name = devicename;
      const body = {
        name,
        instock,
        imagelink,
        description,
        price,
      };

      await $.post(`${API_URL}/laptops`, body)
        .then(response => {
          console.log(response);
        })
        .catch(error => {
          console.error(`Error: ${error}`);
        });
    }
    else if (devicetype == "thermostat") {
      name = devicename;
      status = thermostatStatus;
      temperature = thermotemp;
      const body = {
        name, status, temperature
      }
      await $.post(`${API_URL}/thermostats`, body)
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.error(`Error: ${error}`);
      });
    }
    else if (devicetype == "other") {
      //nothing as of now
    }
   
    location.reload();
  }
});

function createCard(devicetype) {
  let data = [];
  //toggle visiblity of the portion
  if (data.length >= 1) {
    let abc = document.getElementById(devicetype + "s");
    abc.style.visibility = true;
  }
  //create a card
  const card = document.createElement("div");

  card.classList.add("card");

  const cardBody = document.createElement("div");
  cardBody.classList.add("card-body");

  const cardTitle = document.createElement("h5");
  cardTitle.classList.add("card-title");
  cardTitle.innerText = "Card " + (i + 1);

  const cardText = document.createElement("p");
  cardText.classList.add("card-devicetype");
  cardText.innerText = "Some quick example devicetype to build on the card title and make up the bulk of the card's content.";

  cardBody.appendChild(cardTitle);
  cardBody.appendChild(cardText);
  cardBody.appendChild(removeBtn);

  card.appendChild(cardBody);
  const cardGroup = document.getElementById(devicetype + "s")
  cardGroup.appendChild(card);
}

// for all the radio buttons
const buttons = document.querySelectorAll('.btn-group-toggle input[type="radio"]');

buttons.forEach(button => {
  button.addEventListener('click', event => {
    console.log(event.target.id)
    toggle(event.target.id)
  });
});


function toggle(text) {
  try {
  const acForm = document.getElementById("ac-form");
  const lightForm = document.getElementById("light-form");
  const laptopForm = document.getElementById("laptop-form");
  
  const thermostatForm = document.getElementById("thermostat-form");

  laptopForm.classList.add('hidden');
  lightForm.classList.add('hidden');

  acForm.classList.add('hidden');
  thermostatForm.classList.add('hidden');

  document.getElementById(text+"-form").classList.remove('hidden');
  } catch(e) {
    //console.log(e);
  }
}