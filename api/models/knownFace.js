// api/models/knownFace.js
const mongoose = require('mongoose');

const KnownFaceSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descriptors: { 
    type: [[Number]],
    required: true,
    validate: [
        val => val.length > 0 && val.every(arr => Array.isArray(arr) && arr.length === 128 && arr.every(n => typeof n === 'number')),
        'Descriptors must be a non-empty array of 128-element number arrays.'
    ]
  },
  faceImagePreview: { // ADDED THIS FIELD
    type: String, // To store base64 Data URL
    required: false // Or true, if you always want a preview
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection : 'knownFaces' });

module.exports = mongoose.model('KnownFace', KnownFaceSchema);