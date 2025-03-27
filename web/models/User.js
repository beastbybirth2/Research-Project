const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  roomnumber: {
    type: String,
  },
  password: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { collection : 'Users' });

const User = mongoose.model('User', UserSchema);
module.exports = User;