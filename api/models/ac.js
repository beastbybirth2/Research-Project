const mongoose = require('mongoose');

module.exports = mongoose.model('AC', new mongoose.Schema({
  name: String,
  status: String,
  temp: String,
  fan: String,
}, { collection : 'acs' }));