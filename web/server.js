

const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const helmet = require("helmet");
const session = require('express-session')
const expressLayouts = require('express-ejs-layouts');

const passport = require('passport');
const flash = require('connect-flash');

const port = 3000;

require('./config/passport')(passport);

app.use(expressLayouts);
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    passphrase: 'tempxquest'
};

const mongoose = require('mongoose');
const db = require('./config/keys').MongoURI;

mongoose.connect(db, { useNewUrlParser: true })
    .then(() => console.log('Mongoose connected'))
    .catch(err => console.log(err));

const base = `${__dirname}/public`;
app.use(
    session({
        secret: 'xquest',
        resave: true,
        saveUninitialized: true
    })
);

app.use(flash());
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});


app.use(passport.initialize());
app.use(passport.session());

app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.originAgentCluster());
app.use(helmet.hsts());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());

app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));



app.get('/home', function (req, res) {
    res.sendFile(`${base}/home.html`);
});
app.get('/lighting', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/lighting.html`);
});

app.get('/laptops', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/laptop.html`);
});

app.get('/speakers', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/speaker.html`);
});
app.get('/airconditioning', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/airconditioning.html`);
});
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));
app.get('/camera', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/camera.html`);
});
app.get('/devices', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/device-list.html`);
});
app.get('/floor-plan', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/floorplan.html`);
});
app.get('/add-device', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/add-devices.html`);
});
app.get('/stats', ensureAuthenticated, (req, res) => {
    res.sendFile(`${base}/chart.html`);
});

app.get('/intrusion-logs', ensureAuthenticated, (req, res) => { 
    res.sendFile(`${base}/intrusion-logs.html`);
});

app.get('/me',  (req, res) => {
    res.sendFile(`${base}/me.html`);
});

app.get('*', (req, res) => {
    res.sendFile(`${base}/404.html`);
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
// var server = https.createServer(sslOptions, app).listen(port, function(){
//     console.log("Express server listening on port " + port);
//     });
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        // If user is authenticated, call next to proceed to the next middleware function
        return next();
    } else {
        // If user is not authenticated, redirect to the login page
        req.flash('error_msg', 'Please log in to view this page');
        res.redirect('/users/login');
    }
}