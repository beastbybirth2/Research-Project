const mongoose = require('mongoose');
const UnknownFaceLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  faceImage: { type: String, required: true }, // Base64 data URL
  cameraName: { type: String },
}, { collection: 'unknown_face_logs', timestamps: true });
module.exports = mongoose.model('UnknownFaceLog', UnknownFaceLogSchema);