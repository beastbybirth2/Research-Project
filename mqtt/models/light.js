const mongoose = require('mongoose');

module.exports = mongoose.model('Light', new mongoose.Schema({
  name: String,
  status: Boolean
}, { collection : 'lights' }));