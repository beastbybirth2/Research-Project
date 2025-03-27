const API_URL = 'http://localhost:5000/api';

// Form submission handler
const deviceForm = document.getElementById("device-form");
deviceForm.addEventListener("submit", async(event) => {
  event.preventDefault();

  const selectedOption = document.querySelector('input[name="options"]:checked').id;
  const devicetype = selectedOption;
  const devicename = document.getElementById("devicename").value;

  // Basic validation
  if (!devicename) {
    alert("Please enter a device name");
    return;
  }

  try {
    let body = { name: devicename };
    
    switch(devicetype) {
      case "speaker":
        await $.post(`${API_URL}/speakers`, body);
        break;
        
      case "light":
        const lightStatus = document.getElementById('lightStatus').value;
        body.status = (lightStatus == "1");
        await $.post(`${API_URL}/lights`, body);
        break;
        
      case "ac":
        body.status = document.getElementById('ACstatus').value;
        body.temp = Number(document.getElementById('ACtemperature').value);
        body.fan = document.getElementById('fanspeed').value;
        await $.post(`${API_URL}/acs`, body);
        break;
        
      case "laptop":
        body.instock = document.getElementById('instock').checked;
        body.imagelink = document.getElementById('imagelink').value;
        body.description = document.getElementById('description').value;
        body.price = document.querySelector('.input-group input').value;
        await $.post(`${API_URL}/laptops`, body);
        break;
        
      case "thermostat":
        body.status = document.getElementById('thermostatStatus').value;
        body.temperature = document.getElementById('thermotemp').value;
        await $.post(`${API_URL}/thermostats`, body);
        break;
        
      case "camera":
        body.status = document.getElementById('cameraStatus').value === "1";
        body.url = document.getElementById('cameraUrl').value;
        body.type = document.getElementById('cameraType').value;
        await $.post(`${API_URL}/cameras`, body);
        break;
        
      case "other":
        // Handle other devices
        break;
    }
    
    alert("Device added successfully!");
    // location.reload();
  } catch (error) {
    console.error("Error adding device:", error);
    alert("Failed to add device. Please check console for details.");
  }
});

// Function to toggle form visibility
function toggle(deviceType) {
  // Get all form elements
  const forms = [
    'camera-form',
    'light-form',
    'ac-form',
    'laptop-form',
    'thermostat-form',
  ];

  // Hide all forms
  forms.forEach(formId => {
    const form = document.getElementById(formId);
    if (form) form.classList.add('hidden');
  });

  // Show the selected form if it exists
  const formToShow = document.getElementById(`${deviceType}-form`);
  if (formToShow) {
    formToShow.classList.remove('hidden');
  }
}

// Add event listeners to radio buttons
document.querySelectorAll('.btn-group-toggle input[type="radio"]').forEach(button => {
  button.addEventListener('click', event => {
    toggle(event.target.id);
  });
});

// Initialize by hiding all forms on page load
document.addEventListener('DOMContentLoaded', function() {
  toggle('none'); // This will hide all forms
});