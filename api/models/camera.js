const mongoose = require('mongoose');

module.exports = mongoose.model('Camera', new mongoose.Schema({
    name: String,
    status: Boolean,
    url: String,
    type: String // 'webrtc', 'rtsp', 'mjpeg', 'ip'
}, { collection: 'cameras' }));