const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const pregnancyController = require('../controllers/pregnancyController');

router.post('/create-pregnancy', authController.protect, pregnancyController.createPregnancy);
router.get('/get-pregnancy', authController.protect, pregnancyController.getPregnancy);
router.patch('/update-pregnancy', authController.protect, pregnancyController.updatePregnancy);

module.exports = router;
