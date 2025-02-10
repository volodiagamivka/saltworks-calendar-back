const express = require('express');
const router = express.Router();
const db = require('../db'); 
//http://localhost:3000/api/booking/
router.get('/us', function (req, res) {
    const { timing, guide_name } = req.body;
    db.query("Select * from booking")
        .then(data => res.send(data))
        .catch(err => res.send(err));
});
router.post('/calendar', function (req, res) {
    const { phone, timing, adults, guide_id, kids, is_individual } = req.body; 
    db.query("CALL AddBooking(?, ?, ?, ?, ?, ?)", [phone, timing, adults, guide_id, kids, is_individual])
        .then(data => res.send(data))
        .catch(err => res.send(err));
});
router.get('/calendar', function (req, res) {
    db.query("Select timing from timing")
        .then(data => res.send(data))
        .catch(err => res.send(err));
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
    db.query("CALL ÑhangeArrangement(?, ?, ?)", [booking_id, new_adults, new_children])
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