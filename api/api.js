const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const app = express();
const port = 5000;
const db = require("./config/keys").MongoURI;
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
const Light = require("./models/light.js");
const AC = require("./models/ac.js");
const Speaker = require("./models/speaker.js");
const Thermostat = require("./models/thermostat.js");
const Laptop = require("./models/laptop.js");
const Camera = require("./models/camera.js");
const axios = require("axios");

const mqttApi = "http://localhost:5000/";
// enable CORS for all routes
app.use(cors());
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// Enable CORS for all requests
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/**
 * @api {get} /api/test Test API
 * @apiName TestAPI
 * @apiGroup General
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     "The API is working!"
 */
app.get("/api/test", (req, res) => {
  res.send("The API is working!");
});

/**
 * @api {get} /api/lights Request all lights
 * @apiName GetLights
 * @apiGroup Lights
 *
 * @apiSuccess {Object[]} lights List of all lights.
 * @apiSuccess {String} lights.name Name of the light.
 * @apiSuccess {Boolean} lights.status Status of the light.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "_id": "61a0bdc9e8b7c618d32674ac",
 *         "name": "Living Room Light",
 *         "status": true
 *       },
 *       {
 *         "_id": "61a0bdc9e8b7c618122674gc",
 *         "name": "Bedroom Light",
 *         "status": false
 *       }
 *     ]
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Error message"
 *     }
 */
app.get("/api/lights", async (req, res) => {
  const doc = await Light.find({});
  res.send(doc);
});
/**
 * @api {post} /api/lights Add Light Device
 * @apiName AddLightDevice
 * @apiGroup Lights
 *
 * @apiParam {String} name The name of the light device.
 * @apiParam {Boolean} status The status of the light device (true for on, false for off).
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Light device added successfully"
 *     }
 *
 * @apiErrorExample Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid request"
 *     }
 */
app.post("/api/lights", (req, res) => {
  const { name, status } = req.body;
  console.log(status);
  const newDevice = new Light({
    name,
    status,
  });
  newDevice.save();
});
/**
 * @api {post} /api/lights/delete Delete Light
 * @apiName DeleteLight
 * @apiGroup Lights
 *
 * @apiParam {String} id The ID of the light to be deleted.
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Light deleted successfully"
 *     }
 *
 * @apiErrorExample Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid ID"
 *     }
 */
app.post("/api/lights/delete", (req, res) => {
  const id = req.body;
  Light.deleteOne({ _id: id }, function (err) {
    if (err) {
      console.log("err");
    } else {
      console.log("Deleted query");
    }
  });
});
/**
 * @api {get} /api/lights/test Request all lights from mock data
 * @apiName GetLightsExample
 * @apiGroup Lights
 *
 * @apiSuccess {Object[]} lights List of all lights.
 * @apiSuccess {String} lights.name Name of the light.
 * @apiSuccess {Boolean} lights.status Status of the light.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
    "lights": [
        {
            "_id": 0,
            "name": "Philips",
            "status": "on"
        },
        {
            "_id": 1,
            "name": "Syska",
            "status": "off"
        },
        {
            "_id": 2,
            "name": "Actuary",
            "status": "on"
        }
    ]
}
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Error message"
 *     }
 */
app.get("/api/lights/test", (req, res) => {
  res.sendFile(__dirname + "/mock/bulbs.json");
});
/**
 * @api {post} /api/acs Add AC Device
 * @apiName AddACDevice
 * @apiGroup ACs
 *
 * @apiParam {String} name The name of the AC device.
 * @apiParam {String} status The status of the AC device.
 * @apiParam {String} temp The temperature setting of the AC device.
 * @apiParam {String} fan The fan speed setting of the AC device.
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "AC device added successfully"
 *     }
 *
 * @apiErrorExample Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid request"
 *     }
 */
// Air conditioning POST req
app.post("/api/acs", (req, res) => {
  const { name, status, temp, fan } = req.body;
  const newDevice = new AC({
    name,
    status,
    temp,
    fan,
  });
  newDevice.save();
});
/**
 * @api {get} /api/acs Request all acs
 * @apiName GetACs
 * @apiGroup ACs
 *
* @apiParam {String} name The name of the AC device.
 * @apiParam {String} status The status of the AC device.
 * @apiParam {String} temp The temperature setting of the AC device.
 * @apiParam {String} fan The fan speed setting of the AC device.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
    "acs": [
        {
            "_id": 0,
            "name": "Living Room",
            "status": "on",
            "temp": "19",
            "fan": "LOW"
        },
        {
            "_id": 1,
            "name": "Bedroom",
            "status": "off",
            "temp": "16",
            "fan": "LOW"
        },
        {
            "_id": 2,
            "name": "Workshop",
            "status": "on",
            "temp": "22",
            "fan": "HIGH"
        },
        {
            "_id": 3,
            "name": "Office",
            "status": "on",
            "temp": "23",
            "fan": "MEDIUM"
        }
    ]
}
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Error message"
 *     }
 */
app.get("/api/acs", async (req, res) => {
  const doc = await AC.find({});
  res.send(doc);
});
/**
 * @api {post} /api/acs/update Update AC Device
 * @apiName UpdateACDevice
 * @apiGroup ACs
 *
 * @apiParam {String} id The id of the AC device to update.
 * @apiParam {String} temp The new temperature to set for the AC device.
 * @apiParam {String} fan The new fan speed to set for the AC device.
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "AC device updated successfully"
 *     }
 *
 * @apiErrorExample Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid request"
 *     }
 */
app.post("/api/acs/update", (req, res) => {
  const { id, temp, fan } = req.body;
  AC.findOne({ _id: id }).exec(function (err, oldDevice) {
    if (err) {
      // Handle error
    } else if (oldDevice) {
      oldDevice.temp = temp;
      oldDevice.fan = fan;
      oldDevice.save(function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("document updated");
        }
      });
    } else {
      console.log("// Document not found");
    }
  });
});
/**
 * @api {post} /api/acs/delete Delete AC Device
 * @apiName DeleteACDevice
 * @apiGroup ACs
 *
 * @apiParam {String} id The id of the AC device to delete.
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "AC device deleted successfully"
 *     }
 *
 * @apiErrorExample Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid request"
 *     }
 */
app.post("/api/acs/delete", (req, res) => {
  const { id } = req.body;
  AC.deleteOne({ _id: id }, function (err) {
    if (err) {
      console.log("err");
    } else {
      console.log("Deleted query");
    }
  });
});
/**
 * @api {get} /api/acs/test Request all acs from mock data
 * @apiName GetACsExample
 * @apiGroup ACs
 *
 * @apiParam {String} name The name of the AC device.
 * @apiParam {String} status The status of the AC device.
 * @apiParam {String} temp The temperature setting of the AC device.
 * @apiParam {String} fan The fan speed setting of the AC device.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
    "acs": [
        {
            "_id": 0,
            "name": "Living Room",
            "status": "on",
            "temp": "19",
            "fan": "LOW"
        },
        {
            "_id": 1,
            "name": "Bedroom",
            "status": "off",
            "temp": "16",
            "fan": "LOW"
        },
        {
            "_id": 2,
            "name": "Workshop",
            "status": "on",
            "temp": "22",
            "fan": "HIGH"
        },
        {
            "_id": 3,
            "name": "Office",
            "status": "on",
            "temp": "23",
            "fan": "MEDIUM"
        }
    ]
}
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Error message"
 *     }
 */
app.get("/api/acs/test", (req, res) => {
  res.sendFile(__dirname + "/mock/acs.json");
});
//laptops
/**
 * @api {get} /api/laptops Get All Laptops
 * @apiName GetLaptops
 * @apiGroup Laptops
 *
 * @apiSuccess {Object[]} laptops List of laptops
 * @apiSuccess {String} laptops._id Laptop unique ID
 * @apiSuccess {String} laptops.brand Laptop brand name
 * @apiSuccess {String} laptops.model Laptop model name
 * @apiSuccess {Number} laptops.price Laptop price
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "laptops": [
 *         {
 *           "_id": "61a0bdc9e8b7c618d32674ab",
 *           "name": "Dell XPS 13",
 *           "descritpion": "Launched 2020",
 *           "instock": true,
 *           "price": "999"
 *         },
 *         {
 *           "_id": "61a0bdc9e8b7c618d32674ac",
 *           "name": "Apple MacBook Pro",
 *           "descritpion": "Launched 2022",
 *           "instock": false,
 *           "price": "1299"
 *         }
 *       ]
 *     }
 *
 * @apiError (Error 500) {Object} error Internal server error
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Internal server error"
 *     }
 */
app.get("/api/laptops", async (req, res) => {
  const doc = await Laptop.find({});
  res.send(doc);
});
/**
 * @api {post} /api/laptops Create a new laptop
 * @apiName CreateLaptop
 * @apiGroup Laptops
 * @apiParam {String} name Name of the laptop.
 * @apiParam {Boolean} instock Availability of the laptop.
 * @apiParam {String} imagelink Link to the image of the laptop.
 * @apiParam {String} description Description of the laptop.
 * @apiParam {Number} price Price of the laptop.
 *
 * @apiSuccessExample Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Laptop created successfully."
 *     }
 *
 * @apiErrorExample Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid request"
 *     }
 */
app.post("/api/laptops", (req, res) => {
  const { name, instock, imagelink, description, price } = req.body;
  image = imagelink;
  const newDevice = new Laptop({
    name,
    instock,
    image,
    description,
    price,
  });
  newDevice.save();
});
/**
 * @api {get} /api/lights/test Request mock laptops data
 * @apiName GetLightsExample
 * @apiGroup Laptops
 *
 * @apiSuccess {Object[]} laptops List of laptops
 * @apiSuccess {String} laptops._id Laptop unique ID
 * @apiSuccess {String} laptops.brand Laptop brand name
 * @apiSuccess {String} laptops.model Laptop model name
 * @apiSuccess {Number} laptops.price Laptop price
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
    "laptops": [
        {
            "_id": 1,
            "name": "ThinkBook 14 Gen 2",
            "instock": true,
            "description": "11th Generation Intel® Core™ i5-1135G7 Processor (2.40 GHz up to 4.20 GHz)",
            "image": "https://www.lenovo.com/medias/ThinkBook-14-Gen-2-Intel-hero.png?context=bWFzdGVyfHJvb3R8NjYwMDh8aW1hZ2UvcG5nfGg2NC9oZjYvMTMwMzMyMzY0NjM2NDYucG5nfDdlZWU5OGJlYzllYWI0OTM2NDcyMjMwYzA4ZmY3OWRjZDFkNTI4NjgxNWJhOGRmNmZlYTE3OWUzODhmOWQyZjM",
            "price": "700"
        },
        {
            "_id": 2,
            "name": "Galaxy Book3 360",
            "instock": false,
            "description": "40.62cm (16) AMOLED display, CPU / Memory (LPDDR5)",
            "image": "https://images.samsung.com/is/image/samsung/p6pim/in/2302/gallery/in-galaxy-book3-pro-14-inch-np940-447639-np940xfg-kc5in-thumb-534938460?imwidth=480",
            "price": "1000"
        },
        {
            "_id": 3,
            "name": "Asus Predator",
            "instock": true,
            "description": "11Th Gen Intel Core I9/17.3 Inches 4K Uhd Display/64Gb Ddr4 Ram/2Tb Ssd/1Tb HDD/RTX 3080 Graphics/Windows 10 Home/Per Key RGB Backlit Keyboard",
            "image": "https://m.media-amazon.com/images/W/IMAGERENDERING_521856-T1/images/I/81oz+NZ4QLL._SX450_.jpg",
            "price": "1100"
        },
        {
            "_id": 4,
            "name": "MSI Pulse",
            "instock": false,
            "description": "Intel 12th Gen. i9-12900H, 40CM QHD 165Hz Gaming Laptop/Windows 11 Home/NVIDIA RTX 3060, 12UEK-898IN",
            "image": "https://m.media-amazon.com/images/I/31mzR2UydbL._SY300_SX300_.jpg",
            "price": "1000"
        },
        {
            "_id": 5,
            "name": "APPLE 2020 Macbook Air M1",
            "instock": true,
            "description": "8 GB/256 GB SSD/Mac OS Big Sur",
            "image": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653084303665",
             "price": "800"
        }
    ]
}
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Error message"
 *     }
 */
app.get("/api/laptops/test", (req, res) => {
  res.sendFile(__dirname + "/mock/laptops.json");
});
/**
 * @api {delete} /api/laptops/delete Delete a laptop
 * @apiName DeleteLaptop
 * @apiGroup Laptops
 *
 * @apiParam {String} id The ID of the laptop to be deleted.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "Laptop deleted successfully"
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Laptop not found"
 *     }
 */
app.get("/api/laptops/delete", (req, res) => {
  const id = req.body;
  Laptop.deleteOne({ _id: id }, function (err) {
    if (err) {
      console.log("err");
    } else {
      console.log("Deleted query");
    }
  });
});
/**
 * @api {get} /api/speakers Get all speakers
 * @apiName GetSpeakers
 * @apiGroup Speakers
 *
 * @apiSuccess {Object[]} speakers List of speaker objects
 * @apiSuccess {String} speakers._id Unique identifier of the speaker
 * @apiSuccess {String} speakers.name Name of the speaker
 *
 * @apiError {String} error Error message, if any
 *
 * @apiDescription Get a list of all speakers.
 */
app.get("/api/speakers", async (req, res) => {
  const doc = await Speaker.find({});
  res.send(doc);
});
/**
 * @api {post} /api/speakers Add a new speaker
 * @apiName AddSpeaker
 * @apiGroup Speakers
 *
 * @apiParam {String} name Name of the speaker
 *
 * @apiSuccess {String} message Success message
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "laptops": [
 *         {
 *           "_id": "61a0bdc9e8b7c618d32674ab",
 *           "name": "Googel Home",
 *         },
 *         {
 *           "_id": "61a0bdc9e8b7c618d32674ac",
 *           "name": "Echo Dot",
 *         }
 *       ]
 *     }
 *
 * @apiError {String} error Error message, if any
 *
 * @apiDescription Add a new speaker to the database.
 */
app.post("/api/speakers", (req, res) => {
  const { name } = req.body;
  const newDevice = new Speaker({
    name,
  });
  newDevice.save();
});
/**
 * @api {get} /api/speakers/delete Delete a speaker
 * @apiName DeleteSpeaker
 * @apiGroup Speakers
 *
 * @apiParam {String} id Unique identifier of the speaker to be deleted
 *
 * @apiSuccess {String} message Success message
 *
 * @apiError {String} error Error message, if any
 *
 * @apiDescription Delete a speaker from the database.
 */
app.get("/api/speakers/delete", (req, res) => {
  const id = req.body;
  Speaker.deleteOne({ _id: id }, function (err) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.send("Deleted Speaker");
    }
  });
});
/**
 * @api {get} /api/speakers/test Request speakers mock data
 * @apiName GetSpeakersExample
 * @apiGroup Speakers
 *
 * @apiParam {String} id Unique identifier of the speaker to be deleted
 * @apiParam {String} laptops.name Speaker name

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
    "speakers": [
        {
            "_id": 1,
            "name": "Google Home"
        },
        {
            "_id": 2,
            "name": "Amaozon Echo"
        },
        {
            "_id": 3,
            "name": "Sonix X30"
        },
        {
            "_id": 4,
            "name": "JBL Twix"
        },
        {
            "_id": 5,
            "name": "Senheiser T232"
        }
    ]
}
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Error message"
 *     }
 */
app.get("/api/speakers/test", (req, res) => {
  res.sendFile(__dirname + "/mock/speakers.json");
});

/**
 * @api {get} /api/thermostats Request Thermostats information
 * @apiName GetThermostats
 * @apiGroup Thermostats
 *
 * @apiSuccess {String} name Name of the thermostat.
 * @apiSuccess {Boolean} status Status of the thermostat.
 * @apiSuccess {String} temperature Temperature of the thermostat.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [{
 *         "name": "Thermostat 1",
 *         "status": true,
 *         "temperature": "23"
 *     },
 *     {
 *         "name": "Thermostat 2",
 *         "status": false,
 *         "temperature": "20"
 *     }]
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Failed to retrieve thermostats."
 *     }
 */
app.get("/api/thermostats", async (req, res) => {
  const doc = await Thermostat.find({});
  res.send(doc);
});
/**
 * @api {post} /api/thermostats Add a new thermostat
 * @apiName AddThermostat
 * @apiGroup Thermostats
 *
 * @apiParam {String} name Name of the thermostat.
 * @apiParam {Boolean} status Status of the thermostat.
 * @apiParam {String} temperature Temperature of the thermostat.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "message": "Thermostat added successfully."
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Failed to add thermostat."
 *     }
 */
app.post("/api/thermostats", (req, res) => {
  const { name, status, temperature } = req.body;
  const newDevice = new Thermostat({
    name,
    status,
    temperature,
  });
  newDevice.save();
  res.send("Thermostat added successfully.");
});
app.get("/api/thermostats/test", (req, res) => {
  res.sendFile(__dirname + "/mock/thermostats.json");
});
/**
 * @api {delete} /api/thermostats/:id Delete a thermostat
 * @apiName DeleteThermostat
 * @apiGroup Thermostats
 *
 * @apiParam {String} id The ID of the thermostat to be deleted.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "message": "Thermostat deleted successfully."
 *     }
 * @apiError {String} error Error message, if any
 *
 * @apiDescription Delete a speaker from the database.
 */
app.get("/api/thermostats/delete", (req, res) => {
  const id = req.body;
  Thermostat.deleteOne({ _id: id }, function (err) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      console.log("Deleted query");
      res.send("Thermostat deleted successfully.");
    }
  });
});

app.get("/api/cameras", async (req, res) => {
  try {
    const doc = await Camera.find({});
    res.send(doc);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch cameras" });
  }
});

app.post("/api/cameras", async (req, res) => {
  try {
    const { name, status, url, type } = req.body;
    const newCamera = new Camera({
      name,
      status: status === "1",
      url,
      type,
    });
    console.log(newCamera);
    await newCamera.save();
    res.send({ message: "Camera added successfully.", id: newCamera._id });
  } catch (err) {
    res.status(500).send({ error: "Failed to add camera" });
  }
});

app.post("/api/cameras/toggle", async (req, res) => {
  try {
    const { id, status } = req.body;
    await Camera.findByIdAndUpdate(id, { status });
    res.send({ message: "Camera status updated successfully." });
  } catch (err) {
    res.status(500).send({ error: "Failed to toggle camera status" });
  }
});

app.delete("/api/cameras/delete", async (req, res) => {
  try {
    const { id } = req.body;
    await Camera.findByIdAndDelete(id);
    res.send({ message: "Camera deleted successfully." });
  } catch (err) {
    res.status(500).send({ error: "Failed to delete camera" });
  }
});

app.get('/api/droidcam-proxy', async (req, res) => {
  const requestUrl = req.query.url;
  console.log(`[Proxy] Received request for URL: ${requestUrl}`);

  // ... (keep validation and target URL construction) ...
  if (!requestUrl || !requestUrl.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
      console.error(`[Proxy] Error: Invalid URL format: "${requestUrl}". Expected IP or IP:PORT.`);
      return res.status(400).send('Invalid URL format. Provide only IP or IP:PORT.');
  }
  let targetIpPort = requestUrl.includes(':') ? requestUrl : `${requestUrl}:4747`;
  const videoUrl = `http://${targetIpPort}/video`;
  const mjpegUrl = `http://${targetIpPort}/mjpeg`;
  let targetUrl = videoUrl;
  // ... (keep retry logic if needed) ...

  let response;
  let connectionError = null;

  try {
       // ... (keep the logic to try /video then /mjpeg) ...
       // Example simplified try block - adapt if you kept the retry logic
       console.log(`[Proxy] Attempting connection to: ${targetUrl}`);
       response = await axios.get(targetUrl, {
          responseType: 'stream',
          timeout: 10000,
          headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Connection': 'keep-alive'
          }
       });

      const contentType = response.headers['content-type'];
       if (!contentType || !contentType.toLowerCase().includes('multipart/x-mixed-replace')) {
           // Handle non-MJPEG or try fallback...
           throw new Error(`Unexpected Content-Type: ${contentType}`);
       }
       // ... (rest of try/catch logic for retrying /mjpeg if needed) ...


  } catch (error) {
       // ... (keep existing error handling) ...
       connectionError = error; // Store error
       response = null;
  }


  // --- Final Check and Piping ---
  if (response) {
      // *** ADD CORS HEADER HERE ***
      res.set('Access-Control-Allow-Origin', '*'); // Allow any origin (for development)
      // For production, be more specific: res.set('Access-Control-Allow-Origin', 'http://localhost:3000');

      // Set MJPEG content type (if not already set by DroidCam response)
      const currentContentType = response.headers['content-type'];
      if (currentContentType && currentContentType.toLowerCase().includes('multipart/x-mixed-replace')) {
           res.set('Content-Type', currentContentType);
      } else {
           console.warn(`[Proxy] Forcing MJPEG Content-Type as it was missing or wrong.`);
           res.set('Content-Type', 'multipart/x-mixed-replace; boundary=--BoundaryString');
      }

      // Other streaming headers
      res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Connection': 'keep-alive'
      });

      console.log(`[Proxy] Piping stream from ${targetUrl} to client...`);
      response.data.pipe(res);

      // ... (keep stream 'end', 'error', and req 'close' handlers) ...
      response.data.on('end', () => { console.log(`[Proxy] Stream from ${targetUrl} ended.`); if (!res.writableEnded) { res.end(); } });
      response.data.on('error', (streamError) => { console.error(`[Proxy] Error piping stream from ${targetUrl}:`, streamError.message); if (!res.headersSent) { res.status(502).send(`Error during stream transfer: ${streamError.message}`); } else { res.end(); } });
      req.on('close', () => { console.log(`[Proxy] Client closed connection for ${targetUrl}. Aborting request.`); if (response.request && response.request.abort) { response.request.abort(); } else if (response.data && response.data.destroy) { response.data.destroy(); } });

  } else {
      // ... (keep existing final error handling) ...
      console.error(`[Proxy] Failed to establish MJPEG stream for ${requestUrl}. Last error: ${connectionError?.message}`);
      if (connectionError?.response) { res.status(connectionError.response.status).send(`Error from DroidCam server: ${connectionError.response.statusText}`); }
      else if (connectionError?.request) { res.status(504).send(`Could not get valid stream from DroidCam at ${targetIpPort}. (Code: ${connectionError.code || 'N/A'})`); }
      else { res.status(500).send(`Proxy error: ${connectionError?.message || 'Unknown error'}`); }
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
app.use(express.static(`${__dirname}/public/generated-docs`));

app.get("/docs", (req, res) => {
  res.sendFile(`${__dirname}/public/generated-docs/index.html`);
});
try {
  //Read data from sensor
  const { SerialPort, ReadlineParser } = require("serialport");
  const portName = "COM6";
  const baudRate = 9600;

  const sensorport = new SerialPort({ path: portName, baudRate: baudRate });
  const parser = new ReadlineParser();
  sensorport.pipe(parser);

  sensorport.on("open", function () {
    console.log("Serial port " + portName + " is open.");
  });

  parser.on("data", async function (data) {
    const sensorData = {
      name: 25,
      status: data.slice(0, -1) == "Motion detected",
    };
    console.log(sensorData);

    axios.post("http://localhost:5001/motion-status", sensorData);
  });
  sensorport.on("error", function (err) {
    console.error("Error:", err.message);
  });

  process.on("SIGINT", function () {
    sensorport.close(function (err) {
      if (err) {
        console.error("Error closing serial port:", err.message);
      }
      process.exit();
    });
  });
} catch (e) {
  console.log(e);
}
