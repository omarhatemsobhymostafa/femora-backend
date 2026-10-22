// Match a basic email address shape and reject whitespace in its components.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Check that an email is a string and matches the accepted email pattern.
const validateEmail = (email) =>
    typeof email === 'string' && emailPattern.test(email.trim());

// Require a string password with at least the requested number of characters.
const validatePassword = (password, minimumLength = 8) =>
    typeof password === 'string' && [...password].length >= minimumLength;

// Canonicalize email values before they are stored or used in lookups.
const normalizeEmail = (email) => email.trim().toLowerCase();

// Share the validation helpers with the controllers.
module.exports = { validateEmail, validatePassword, normalizeEmail };
