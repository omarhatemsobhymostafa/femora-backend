const express = require('express');
const router = express.Router();
const weeksController = require('../controllers/weeksController');
const authController = require('../controllers/authController');
// Return every week.
router.get('/weeks', weeksController.getAllWeeks);

// Return the week matching the number in the URL.
router.get('/weeks/:weekNumber', weeksController.getWeekByNumber);

// Update a week based on its number.
router.patch('/weeks/:weekNumber', authController.protect, authController.restricTo('admin'), weeksController.editWeekByNumber);

module.exports = router;
