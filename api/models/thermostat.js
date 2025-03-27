const mongoose = require('mongoose');

module.exports = mongoose.model('Thermostat', new mongoose.Schema({
  
  name: String,
  status: Boolean,
  temperature: String,
}, { collection : 'thermostats' }));