const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email) =>
    typeof email === 'string' && emailPattern.test(email.trim());

const validatePassword = (password, minimumLength = 8) =>
    typeof password === 'string' && [...password].length >= minimumLength;

const normalizeEmail = (email) => email.trim().toLowerCase();

module.exports = { validateEmail, validatePassword, normalizeEmail };
