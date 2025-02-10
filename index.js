var express = require('express');
var app = express();
var cors = require('cors'); // Додаємо CORS

// Налаштування CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
var db = require('./db');
var UserRoutes = require('./controller/user');

//middleware
app.use('/api/booking', UserRoutes);

//first make sure db connection is successful
//then start the express server
db.query("Select * from booking")
    .then(function (data) {
        console.log("succeeded");
        app.listen(3000, function () {
            console.log('server started at 3000');
        });
    })
    .catch(function (err) {
        console.log('failed');
        console.error('Database connection error:', err);
    });

// Обробка помилок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});