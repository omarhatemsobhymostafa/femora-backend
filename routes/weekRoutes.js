const express = require('express');
const router = express.Router();
const weeksController = require('../controllers/weeksController');
const authController = require('../controllers/authController');

// Allow public reads of all pregnancy-week records.
router.get('/weeks', weeksController.getAllWeeks);

// Allow a public lookup of one pregnancy week by its route parameter.
router.get('/weeks/:weekNumber', weeksController.getWeekByNumber);

// Restrict week updates to authenticated users with the administrator role.
router.patch('/weeks/:weekNumber', authController.protect, authController.restricTo('admin'), weeksController.editWeekByNumber);

// Export the router so app.js can mount these endpoints.
module.exports = router;
