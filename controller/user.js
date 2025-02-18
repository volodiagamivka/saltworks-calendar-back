const express = require('express');
const router = express.Router();
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');  // Імпортуємо бібліотеку для роботи з JWT
const db = require('../db');
const bcrypt = require('bcryptjs');  // Import bcryptjs

app.use(cors({
    origin: '*',  // ? ????????? ?????? ?? ?????????? ?????
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false  // ??????? ?? false, ??????? ????????????? origin: '*'
}));
app.options('*', cors());
//http://localhost:3000/api/booking/
// Мідлвар для перевірки JWT токену
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Токен у форматі "Bearer <token>"

    if (token) {
        // Перевірка токену
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);  // Якщо токен не валідний
            }
            req.user = user;  // Якщо токен валідний, додаємо користувача до запиту
            next();  // Продовжуємо виконання наступного мідлвару або маршруту
        });
    } else {
        res.sendStatus(401);  // Якщо токен не надано, відмовляємо в доступі
    }
};

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Log the request body to verify it's being passed correctly
    console.log("Request Body:", req.body);

    // Check if username and password are provided
    if (!username || !password) {
        return res.status(400).send('No password and username!');
    }

    // Query to find admin by login
    db.query("SELECT * FROM admin WHERE login = :username", {
        replacements: { username: username },
        type: db.QueryTypes.SELECT
    })
        .then((results) => {
            if (results.length === 0) {
                console.log("No user found");
                return res.status(401).send('Wrong username or password');
            }

            const admin = results[0];  // Get the first result

            console.log("Stored password in DB:", admin.password);  // Log the stored password
            console.log("Entered password:", password);  // Log the entered password

            // Directly compare the entered password with the stored password
            if (password !== admin.password) {
                console.log("Wrong password");
                return res.status(401).send('Wrong password');
            }

            // If the password is valid, generate a JWT token
            const user = { username: admin.login };
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Send the token in the response
            res.json({ token });

        })
        .catch((err) => {
            console.error('Database error:', err);
            res.status(500).send('Internal Server Error');
        });
});



router.get('/us', function (req, res) {
    db.query(`
        SELECT 
            t.ID AS timing_id,
            t.timing,
            COALESCE(SUM(b.adults + b.kids), 0) AS total_people
        FROM calendar.timing t
        LEFT JOIN calendar.booking b ON t.ID = b.timing_id
        GROUP BY t.ID, t.timing, t.guide_id, t.is_free
        ORDER BY t.timing;
    `, {
        type: db.QueryTypes.SELECT  // Query type set to SELECT
    })
        .then(data => {
            res.json(data);  // Send data as JSON
        })
        .catch(err => {
            res.status(500).json({ error: err.message });  // Error handling
        });
});


router.post('/calendar', function (req, res) {
    const { phone, email, name, timing, adults, guide_id, kids, is_individual } = req.body;

    db.query("CALL AddBooking(?, ?, ?, ?, ?, ?, ?, ?, ?)", {
        replacements: [phone, email, name, timing, adults, guide_id, kids, is_individual, false],  // Using replacements to pass parameters
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => {
            res.status(200).send({ success: true, data });
        })
        .catch(err => {
            console.error('Error adding booking:', err);
            res.status(500).send({ success: false, error: err.message });
        });
});


router.get('/calendar', function (req, res) {
    db.query(`
        SELECT t.timing, t.guide_id, g.name, 
               MAX(b.is_individual) AS is_individual,
               SUM(b.adults + b.kids) AS total_people
        FROM timing t
        JOIN guide g ON t.guide_id = g.ID
        LEFT JOIN booking b ON t.ID = b.timing_id
        GROUP BY t.timing, t.guide_id, g.name;
    `, {
        type: db.QueryTypes.SELECT  // Query type set to SELECT
    })
        .then(data => {
            res.json(data);  // Send response data in JSON format
        })
        .catch(err => {
            res.status(500).json({ error: err.message });  // Handle errors
        });
});

router.post('/admin', authenticateJWT, function (req, res) {
    const { timing, guide_name } = req.body;

    db.query("CALL AddNewTime(?, ?)", {
        replacements: [timing, guide_name],  // Using replacements to pass parameters
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => {
            res.send(data);  // Send data response
        })
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});
router.delete('/admin', authenticateJWT, function (req, res) {
    const { booking_id } = req.body;

    db.query("CALL DeleteArrangement(?)", {
        replacements: [booking_id],  // Using replacements to pass the parameter
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => res.send(data))  // Send success response
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});

router.put('/admin', authenticateJWT, function (req, res) {
    const { booking_id, new_adults, new_children } = req.body;

    db.query("CALL changeArrangement(?, ?, ?)", {
        replacements: [booking_id, new_adults, new_children],  // Using replacements to pass the parameters
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => res.send(data))  // Send success response
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});

router.delete('/user', function (req, res) {
    const { booking_id } = req.body;

    db.query("CALL DeleteArrangement(?)", {
        replacements: [booking_id],  // Using replacements to pass the parameter
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => res.send(data))  // Send success response
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});

router.get('/user', function (req, res) {
    const { phone } = req.body;

    db.query("CALL GetBookingsByPhoneNumber(?)", {
        replacements: [phone],  // Using replacements to pass the parameter
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => res.send(data))  // Send data response
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});


router.put('/user', function (req, res) {
    const { booking_id, new_adults, new_children } = req.body;

    db.query("CALL changeArrangement(?, ?, ?)", {
        replacements: [booking_id, new_adults, new_children],  // Using replacements to pass the parameters
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => res.send(data))  // Send success response
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});


router.delete('/user', function (req, res) {
    const { booking_id } = req.body;

    db.query("CALL DeleteArrangement(?)", {
        replacements: [booking_id],  // Using replacements to pass the parameter
        type: db.QueryTypes.RAW  // If using stored procedure
    })
        .then(data => res.send(data))  // Send success response
        .catch(err => {
            res.status(500).send({ error: err.message });  // Handle errors
        });
});
// New route to retrieve bookings with user data
router.get('/user-bookings', function (req, res) {
    db.query(`
        SELECT 
            u.ID AS user_id,
            u.phone,
            u.email,
            u.name,
            b.timing_id,
            t.timing,
            b.adults,
            b.kids,
            b.is_individual
        FROM booking b
        JOIN user u ON b.user_id = u.ID
        JOIN timing t ON b.timing_id = t.ID
        ORDER BY t.timing;
    `)
        .then(data => {
            res.send(data); // Return the booking data along with user details
        })
        .catch(err => res.status(500).send(err)); // Handle any errors
});


module.exports = router;