const mongoose = require('mongoose');

module.exports = mongoose.model('Speaker', new mongoose.Schema({
  
  name: String,
  image: {
    type: String, default: 'https://picsum.photos/800'
  },
  description: {type: String, default: "Your music buddy"}
}, { collection : 'speakers' }));