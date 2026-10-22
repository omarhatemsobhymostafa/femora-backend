const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const validator = require('../validator');

// Validate signup data, persist a password hash, and return the new account and token.
const signUp = async (req, res , next) => {
    try {
        // Read submitted fields defensively in case the request body is missing.
        const { name, email, password } = req.body || {};
        // Reject invalid email addresses before performing any database work.
        if (!validator.validateEmail(email)) {
            return res.status(400).json({ message: 'البريد الإلكتروني مش صح' });
        }
        // Enforce the minimum password length required for new accounts.
        if (!validator.validatePassword(password)) {
            return res.status(400).json({ message: 'لازم الباسورد يكون 8 حروف' });
        }

        // Normalize the identifier and hash the password before storing the user.
        const normalizedEmail = validator.normalizeEmail(email);
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await userModel.create({ name, email: normalizedEmail, password: hashedPassword });

        // Sign a token identifying the newly created user.
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        // Return the token and public account details, excluding the password hash.
        res.status(201).json({
            message: 'اليوزر اتعمل بنجاح',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
            
        });
    } catch (error) {
        // Forward database and token errors to the application's error middleware.
        next(error);
    }
}

// Validate credentials and issue a token when they match an existing account.
const login = async (req, res , next) => {
    // Reject malformed email addresses and empty passwords before querying.
    const { email, password } = req.body || {};
    // Validate the email format before looking up the account.
    if (!validator.validateEmail(email)) {
        return res.status(400).json({ message: 'البريد الإلكتروني مش صح' });
    }
    // Require a non-empty password for credential verification.
    if (!validator.validatePassword(password, 1)) {
        return res.status(400).json({ message: 'لازم تدخل الباسورد' });
    }

    // Passwords are excluded from normal queries, so select the hash for comparison.
    const user = await userModel.findOne({ email: validator.normalizeEmail(email) }).select('+password');
  
    // Use the same response for missing users and incorrect passwords.
    if (!user || !await user.correctPassword(password , user.password)) {
        return next(new Error("البريد الإلكتروني أو الباسورد مش صح"));
    }

    // Create a signed token for the authenticated account.
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    // Return the authentication result to the client.
    res.status(200).json({
        message: "تسجيل الدخول تم بنجاح",
        token
    });

}

// Authenticate bearer tokens and attach the matching current user to the request.
const protect = async (req, res, next) => {
    try{
        // Read the token only from a Bearer authorization header.
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Reject requests that do not provide an authentication token.
        if (!token){
            return next(new Error("انت مش مسجل دخول"));
        }

        // Verify token integrity and load the account referenced by its payload.
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

        const freshUser = await userModel.findById(decoded.id);
        // Reject tokens whose user account has been removed.
        if (!freshUser) {
            return next(new Error("اليوزر مش موجود"));
        }
        // Reject tokens issued before the user's latest password change.
        if (freshUser.changedPasswordAfter(decoded.iat)){
            return next(new Error("اليوزر غير مسموح له"));
        }

        // Make the authenticated user available to downstream middleware and handlers.
        req.user = freshUser;

       next()
    }catch(err){
        // Pass token verification and database errors to the error middleware.
        next(err)
    }
};

// Build middleware that allows a request only when the user's role is permitted.
const restricTo = (...roles)=>{
    return (req, res, next)=>{
        // Stop requests from authenticated users whose role is not allowed.
        if (!roles.includes(req.user.role)){
            return next(new Error("معندش صلاحية انك تعمل كدا"));
        }
        // Continue once the authenticated user passes the role check.
        next()
    }
}

// Export authentication and authorization middleware for route definitions.
module.exports = {signUp , login , protect , restricTo};