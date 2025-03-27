const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
// Load User model
const User = require('../models/User');
const { forwardAuthenticated } = require('../config/auth');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

// Register
router.post('/register', async (req, res) => {
  const { name, email, roomnumber, password, password2 } = req.body;
  const errors = [];
  console.log('hi')
  // console.log(req)

  // Validation
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }
  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    return res.render('register', { errors, ...req.body });
  }

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errors.push({ msg: 'Email already exists' });
      return res.render('register', { errors, ...req.body });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      roomnumber,
      password: hashedPassword
    });

    await newUser.save();
    
    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/users/login');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error_msg', 'Registration failed. Please try again.');
    res.redirect('/users/register');
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(function (error) {
    if (error) { return next(error); }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
  });

});

module.exports = router;