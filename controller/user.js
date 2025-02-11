const express = require('express');
const router = express.Router();
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*',  // ? ????????? ?????? ?? ?????????? ?????
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false  // ??????? ?? false, ??????? ????????????? origin: '*'
}));
app.options('*', cors());
const db = require('../db');
//http://localhost:3000/api/booking/
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
    `)
        .then(data => {
            // ?????????? ???? ? ???? ?????
            res.send(data);
        })
        .catch(err => res.send(err));
});


router.post('/calendar', function (req, res) {
    const { phone, timing, adults, guide_id, kids, is_individual } = req.body;

    db.query("CALL AddBooking(?, ?, ?, ?, ?, ?)", [phone, timing, adults, guide_id, kids, is_individual])
        .then(data => {
            res.status(200).send({ success: true, data });
        })
        .catch(err => {
            console.error('??????? ??? ????????? ??????????:', err);
            res.status(500).send({ success: false, error: err.message });
        });
});

router.get('/calendar', function (req, res) {
    // ???????? ????? ??? ??'??????? ??????? ?? ?????????? ????????? ?????????
    db.query(`
        SELECT t.timing, t.guide_id, g.name, 
               SUM(b.adults + b.kids) AS total_people
        FROM timing t
        JOIN guide g ON t.guide_id = g.ID
        LEFT JOIN booking b ON t.ID = b.timing_id
        GROUP BY t.timing, t.guide_id, g.name
    `)
        .then(data => res.json(data))  // ?????????? ????????? ?????? ? ??????? JSON
        .catch(err => res.status(500).send(err));  // ?????????? ???????, ???? ???? ???????
});

router.post('/admin', function (req, res) {
    const { timing, guide_name } = req.body;
    db.query("CALL AddNewTime(?, ?)", [timing, guide_name])
        .then(data => res.send(data))
        .catch(err => res.send(err));
});

router.delete('/user', function (req, res) {
    const { booking_id } = req.body;
    db.query("CALL DeleteArrangement(?)", [booking_id])
        .then(data => res.send(data))
        .catch(err => res.send(err));
});
router.get('/user', function (req, res) {
    const { phone } = req.body;
    db.query("CALL GetBookingsByPhoneNumber(?)", [phone])
        .then(data => res.send(data))
        .catch(err => res.send(err));
});

router.put('/user', function (req, res) {
    const { booking_id, new_adults, new_children } = req.body;
    db.query("CALL changeArrangement(?, ?, ?)", [booking_id, new_adults, new_children])
        .then(data => res.send(data))
        .catch(err => res.send(err));
});

router.post('/admin', function (req, res) {
    const { timing, guide_name } = req.body;
    db.query("CALL AddNewTime(?, ?)", [timing, guide_name])
        .then(data => res.send(data))
        .catch(err => res.send(err));
});
module.exports = router;