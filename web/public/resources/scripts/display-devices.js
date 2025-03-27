$(document).ready(function () {
    const API_URL = "http://localhost:5000/api"
    // Fetch AC devices
    $.ajax({
        url: `${API_URL}/ac`,
        type: 'GET',
        success: function (data) {
            var acDevices = $('#ac-devices');
            data.forEach(function (device) {
                var deviceHtml = '<div class="card">' +

                    '<div class="card-body">' +
                    '<h5 class="card-title">' + device.name + '</h5>' +

                    '</div>' +
                    '</div>';
                acDevices.append(deviceHtml);
            });
        }
    });

    // Fetch laptop devices
    $.ajax({
        url: `${API_URL}/laptops`,
        type: 'GET',
        success: function (data) {
            var laptopDevices = $('#laptop-devices');
            data.forEach(function (device) {
                var deviceHtml = '<div class="card">' +

                    '<div class="card-body">' +
                    '<h5 class="card-title">' + device.name + '</h5>' +

                    '</div>' +
                    '</div>';
                laptopDevices.append(deviceHtml);
            });
        }
    });

    // Fetch light devices
    $.ajax({
        url: `${API_URL}/lights`,
        type: 'GET',
        success: function (data) {
            var lightDevices = $('#light-devices');
            data.forEach(function (device) {
                var deviceHtml = '<div class="card">' +

                    '<div class="card-body">' +
                    '<h5 class="card-title">' + device.name + '</h5>' +

                    '</div>' +
                    '</div>';
                lightDevices.append(deviceHtml);
            });
        }
    });

    // Fetch speaker devices
    $.ajax({
        url: `${API_URL}/speakers`,
        type: 'GET',
        success: function (data) {
            var speakerDevices = $('#speaker-devices');
            data.forEach(function (device) {
                var deviceHtml = '<div class="card">' +

                    '<div class="card-body">' +
                    '<h5 class="card-title">' + device.name + '</h5>' +

                    '</div>' +
                    '</div>';
                speakerDevices.append(deviceHtml);
            });
        }
    });

    // Fetch thermostat devices
    $.ajax({
        url: `${API_URL}/thermostats`,
        type: 'GET',
        success: function (data) {
            var thermostatDevices = $('#thermostat-devices');
            data.forEach(function (device) {
                var deviceHtml = '<div class="card">' +
                    '<div class="card-body">' +
                    '<h5 class="card-title">' + device.name + '</h5>' +
                    '</div>' +
                    '</div>';
                thermostatDevices.append(deviceHtml);
            });
        }
    });
});
