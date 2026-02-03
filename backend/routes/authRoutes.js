const express = require('express');
const router = express.Router();
const { login, teacherLogin, studentLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, login);
router.post('/teacher/login', loginLimiter, teacherLogin);
router.post('/student/login', loginLimiter, studentLogin);
router.get('/me', protect, getMe);

module.exports = router;
