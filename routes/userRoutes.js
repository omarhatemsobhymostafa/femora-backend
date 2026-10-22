const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Expose public endpoints for account creation and login.
router.post('/signup', authController.signUp);
router.post('/login', authController.login);

// Export the router so app.js can mount these endpoints.
module.exports = router;
