const express = require('express')
const fs = require('fs')
const port = 3060
const https = require('https')
var sslOptions = {
key: fs.readFileSync('key.pem'),
cert: fs.readFileSync('cert.pem'),
passphrase: 'tempxquest'
};
var app = express();

app.get('/', (req, res) => {
    res.send('hello world');
    });
var server = https.createServer(sslOptions, app).listen(port, function(){
console.log("Express server listening on port " + port);
});