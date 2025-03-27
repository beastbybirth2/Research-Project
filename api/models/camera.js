const mongoose = require('mongoose');

const Camera = mongoose.model('Camera', new mongoose.Schema({
    name: String,
    status: Boolean,
    url: String,
    type: String // 'webrtc', 'rtsp', 'mjpeg', 'ip'
}, { collection: 'cameras' }));