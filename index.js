var express = require('express');
var app = express();
app.use(express.json());
var db = require('./db');
var UserRoutes = require('./controller/user'); // Added 'var' keyword
//middleware
app.use('/api/booking', UserRoutes);
//first make sure db connection is successful
//then start the express server
db.query("Select * from booking")
    .then(function (data) {
        console.log("succeeded");
        app.listen(3000, function() {
            console.log('server started at 3000');
        });
    })
    .catch(function (err) {
        console.log('failed');
    });
