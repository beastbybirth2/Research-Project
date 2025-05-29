// api/models/setting.js
const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: String,
    required: true
  }
}, { collection: 'settings', timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);