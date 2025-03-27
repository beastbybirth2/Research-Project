
// get the color radio button and color picker
const colorRadio = document.getElementById('colorRadio');
const colorPicker = document.getElementById('colorPicksRoom');
const removeRadio = document.getElementById("removeRadio");
let color;

// add event listener to color radio button
colorRadio.addEventListener('change', function () {
    console.log('ji')
    if (colorRadio.checked) {
        // show color picker if color radio button is checked
        colorPicker.classList.remove('hidden');
    } else {
        // hide color picker if color radio button is not checked
        colorPicker.classList.add('hidden');
    }

});
colorPicker.addEventListener("change", e => {
    color = e.target.value;
});
// Add event listener for removeRadio
removeRadio.addEventListener("change", function () {
    if (removeRadio.checked) {
        colorPicker.classList.add("hidden");
    }
});
