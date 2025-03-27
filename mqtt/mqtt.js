const mqtt = require('mqtt');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const config = require('./config/keys');
mongoose.connect(config.MongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const Light = require('./models/light.js');
const Graph = require('./models/graph.js');

var plotly = require('plotly')(config.PlotlyUsername, config.PlotlyPassword);
const app = express();
app.use(express.static('public'));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
const port = 5001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const client = mqtt.connect("mqtt://broker.hivemq.com:1883");

client.subscribe('/motion-status', (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`subscribed to /motion-status`);
  }
});
let statusArr = [];
let timestampArr = [];
client.on('message', (topic, message) => {

  if (topic == '/motion-status') {

    // const data = JSON.parse(message);
    // const doc = Light.findOne({"name": data.name })
    // const status = data.status;
    // doc.status = data.status;
    // doc.save();

    const data = JSON.parse(message.toString());
    const status = data.status;
    const timestamp = new Date().getTime();
    Graph.findOneAndUpdate(
      {},
      { $push: { statusArr: status, timestampArr: timestamp } },
      { new: true, upsert: true },
      function (err, graph) {
        if (err) throw err;
        console.log(`Updated Graph with status ${status} and timestamp ${timestamp}`);
      }
    );
  }
});
app.post('/motion-status', (req, res) => {

  const { name, status } = req.body;
  let text = JSON.stringify(req.body);
  //console.log(text)
  const topic = `/motion-status`;
  client.publish(topic, text, () => {
    res.send('published new message');
  });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

// Retrieve data from MongoDB and create Plotly graph
app.get('/graph', (req, res) => {
  Graph.findOne({}, function(err, graph) {
    if (err) throw err;

    const statusArr = graph.statusArr;
    const timestampArr = graph.timestampArr;

    // Combine statusArr and timestampArr into an array of objects
const data = timestampArr.map((timestamp, i) => ({ x: new Date(timestamp), y: statusArr[i] }));

// Sort the data array based on the x (timestamp) values
data.sort((a, b) => a.x - b.x);

// Define trace for Plotly graph
const trace1 = {
  x: data.map(obj => obj.x),
  y: data.map(obj => obj.y), // Convert boolean values to strings
  text: data.map(obj => obj.label), // Specify labels for each poin
  type: 'scatter'
};

const layout = {
  title: 'PIR Status vs Timestamp',
  xaxis: { title: 'Timestamp' },
  yaxis: { title: 'Status', tickvals: [0, 1], ticktext: ['false', 'true'],  }, // Reverse order of y-axis
  paper_bgcolor: 'rgb(17, 17, 17)',
  plot_bgcolor: 'rgb(17, 17, 17)',
  font: { color: '#fff' }, // Set the font color to white
};
var graphOptions = {layout: layout, filename: "simple-inset", fileopt: "overwrite"};

    // plotly.newPlot('mqtt-status-vs-timestamp', data, layout, function (err, msg) {
    //   if (err) return console.log(err);
    //   console.log(msg);
    // });
    plotly.plot( [trace1], graphOptions, function (err, msg) {
      if (err) return console.log(err);
      console.log(msg);
      var chart = msg.url+".embed";
      console.log(chart);
      //var page = "<p>Graph below:</p>"+"<iframe width=800 height=600 src=\'"+chart+"\'></iframe>";
      res.send(chart);
  });
  });
});