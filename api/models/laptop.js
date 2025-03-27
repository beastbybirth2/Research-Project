const mongoose = require('mongoose');

module.exports = mongoose.model('Laptop', new mongoose.Schema({
  name: String,
  instock: Boolean,
  image: { type: String, default: 'https://i.imgur.com/fxtZ0rx.jpg'},
  description: String,
  price: String,
}, { collection : 'laptops' }));
