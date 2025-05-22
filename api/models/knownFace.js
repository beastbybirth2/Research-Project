const mongoose = require('mongoose');
const KnownFaceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  descriptors: [{ type: [Number] }], // Stores Float32Array as array of numbers
  // image: { type: String } // Optional: store a reference image data URL
}, { collection: 'known_faces', timestamps: true });
module.exports = mongoose.model('KnownFace', KnownFaceSchema);