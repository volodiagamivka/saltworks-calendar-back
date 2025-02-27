const express = require('express');
const router = express.Router();
const cors = require('cors');
const random = require('random');
const app = express();
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcryptjs');
const axios = require('axios');
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));
app.options('*', cors());

const clientId = 'bc93e6ee-7e90-48d5-bb06-17355533f0d8';
const clientSecret = '~965CXVkZUkRDXmuOTcq9Qy7kO';
const activeCodes = {};
const CODE_LIFETIME = 5 * 60 * 1000;

setInterval(() => {
    const currentTime = Date.now();
    for (const phone in activeCodes) {
        if (currentTime - activeCodes[phone].timestamp > CODE_LIFETIME) {
            delete activeCodes[phone]; 
            console.log(`Code for phone ${phone} expired and removed.`);
        }
    }
}, CODE_LIFETIME); 

router.post('/get-token', async (req, res) => {
    try {
        console.log("Request started");

        const tokenResponse = await axios.post(
            'https://api-gateway.kyivstar.ua/idp/oauth2/token',
            new URLSearchParams({
                grant_type: 'client_credentials',
            }),
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        console.log("Token Response:", tokenResponse.data);
        const accessToken = tokenResponse.data.access_token;
        const code = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
        const userPhone = req.body.to;
        activeCodes[userPhone] = {
            code: code,
            timestamp: Date.now(),
        };
        const smsResponse = await axios.post(
            'https://api-gateway.kyivstar.ua/sandbox/rest/v1beta/sms',  
            {
                from: 'messagedesk',  
                to: userPhone,  
                text: `Your verification code is: ${code}`, 
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,  
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log("SMS Response:", smsResponse.data);
        res.json(smsResponse.data);
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send('An error occurred while fetching token or sending SMS');
    }
    console.log("Request finished");
});
router.post('/verify-code', (req, res) => {
    const { phone, code } = req.body;
    if (activeCodes[phone]) {
        const savedCode = activeCodes[phone].code;
        const timestamp = activeCodes[phone].timestamp;
        if (Date.now() - timestamp < CODE_LIFETIME) {
            if (savedCode === parseInt(code)) {
                const token = jwt.sign({ phone: phone }, process.env.JWT_SECRET, { expiresIn: '1h' });
                res.json({ token });
            } else {
                res.status(400).send({ success: false, message: 'Invalid code.' });
            }
        } else {
            res.status(400).send({ success: false, message: 'Code has expired.' });
        }
    } else {
        res.status(400).send({ success: false, message: 'No code sent to this phone number.' });
    }
});
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                console.log('JWT verification error:', err); 
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    console.log("Request Body:", req.body);

    if (!username || !password) {
        return res.status(400).send('No password and username!');
    }

    db.query("SELECT * FROM admin WHERE login = :username", {
        replacements: { username: username },
        type: db.QueryTypes.SELECT
    })
        .then((results) => {
            if (results.length === 0) {
                console.log("No user found");
                return res.status(401).send('Wrong username or password');
            }

            const admin = results[0];

            console.log("Stored password in DB:", admin.password);
            console.log("Entered password:", password);

            if (password !== admin.password) {
                console.log("Wrong password");
                return res.status(401).send('Wrong password');
            }

            const user = { username: admin.login };
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });

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
        type: db.QueryTypes.SELECT
    })
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

router.post('/calendar', function (req, res) {
    const { phone, email, name, timing, adults, guide_id, kids, is_individual } = req.body;

    db.query("CALL AddBooking(?, ?, ?, ?, ?, ?, ?, ?, ?)", {
        replacements: [phone, email, name, timing, adults, guide_id, kids, is_individual, false],
        type: db.QueryTypes.RAW
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
        SELECT t.timing, t.guide_id, g.name,t.saltwork, 
                t.id AS timing_id,
               MAX(b.is_individual) AS is_individual,
               SUM(b.adults + b.kids) AS total_people
        FROM timing t
        JOIN guide g ON t.guide_id = g.ID
        LEFT JOIN booking b ON t.ID = b.timing_id
        GROUP BY t.timing, t.guide_id, g.name;
    `, {
        type: db.QueryTypes.SELECT
    })
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

router.post('/admin', authenticateJWT, function (req, res) {
    const { timing, guide_name } = req.body;

    db.query("CALL AddNewTime(?, ?)", {
        replacements: [timing, guide_name],
        type: db.QueryTypes.RAW
    })
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({ error: err.message });
        });
});

router.delete('/admin', authenticateJWT, function (req, res) {
    const { booking_id } = req.body;

    db.query("CALL DeleteArrangement(?)", {
        replacements: [booking_id],
        type: db.QueryTypes.RAW
    })
        .then(data => res.send(data))
        .catch(err => {
            res.status(500).send({ error: err.message });
        });
});

router.put('/admin', authenticateJWT, function (req, res) {
    const { booking_id, new_adults, new_children , new_timing } = req.body;

    db.query("CALL ChangeArrangement(?, ?, ?, ?)", {
        replacements: [booking_id, new_adults, new_children, new_timing],
        type: db.QueryTypes.RAW
    })
        .then(data => res.send(data))
        .catch(err => {
            res.status(500).send({ error: err.message });
        });
});

router.delete('/user', authenticateJWT ,  function (req, res) {
    const { booking_id } = req.body;

    db.query("CALL DeleteArrangement(?)", {
        replacements: [booking_id],
        type: db.QueryTypes.RAW
    })
        .then(data => res.send(data))
        .catch(err => {
            res.status(500).send({ error: err.message });
        });
});

router.get('/user', authenticateJWT , function (req, res) {
    const { phone } = req.body;

    db.query("CALL GetBookingsByPhoneNumber(?)", {
        replacements: [phone],
        type: db.QueryTypes.RAW
    })
        .then(data => res.send(data))
        .catch(err => {
            res.status(500).send({ error: err.message });
        });
});

router.put('/user', authenticateJWT ,function (req, res) {
    const { booking_id, new_adults, new_children } = req.body;

    db.query("CALL ChangeArrangement(?, ?, ?)", {
        replacements: [booking_id, new_adults, new_children],
        type: db.QueryTypes.RAW
    })
        .then(data => res.send(data))
        .catch(err => {
            res.status(500).send({ error: err.message });
        });
});
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
            res.send(data);
        })
        .catch(err => res.status(500).send(err));
});

router.get('/calendar/:timingId/booking', authenticateJWT, function (req, res) {
    const { timingId } = req.params;

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
        WHERE t.ID = :timingId
        LIMIT 1;
    `, {
        replacements: { timingId },
        type: db.QueryTypes.SELECT
    })
        .then(data => {
            if (data && data.length > 0) {
                res.json(data[0]);
            } else {
                res.status(404).json({ error: 'Booking not found' });
            }
        })
        .catch(err => {
            console.error('Error fetching booking details:', err);
            res.status(500).json({ error: err.message });
        });
});

module.exports = router;
