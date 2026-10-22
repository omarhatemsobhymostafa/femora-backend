const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const pregnancyController = require('../controllers/pregnancyController');

// Require authentication before creating, reading, or updating pregnancy data.
router.post('/create-pregnancy', authController.protect, pregnancyController.createPregnancy);
router.get('/get-pregnancy', authController.protect, pregnancyController.getPregnancy);
router.patch('/update-pregnancy', authController.protect, pregnancyController.updatePregnancy);

// Export the router so app.js can mount these endpoints.
module.exports = router;
