const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const validator = require('../validator');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

const toPublicUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
});

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
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ message: 'خدمة تسجيل الحسابات غير مهيأة. يرجى إبلاغ الدعم.' });
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
            user: toPublicUser(newUser)
            
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
        }
        // Forward database and token errors to the application's error middleware.
        next(error);
    }
}

// Validate credentials and issue a token when they match an existing account.
const login = async (req, res) => {
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
    if (!process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'خدمة تسجيل الدخول غير مهيأة. يرجى إبلاغ الدعم.' });
    }

    // Passwords are excluded from normal queries, so select the hash for comparison.
    const user = await userModel.findOne({ email: validator.normalizeEmail(email) }).select('+password');
  
    // Use the same response for missing users and incorrect passwords.
    if (!user || !await user.correctPassword(password , user.password)) {
        return res.status(401).json({ message: "البريد الإلكتروني أو الباسورد مش صح" });
    }

    // Create a signed token for the authenticated account.
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    // Return the authentication result to the client.
    res.status(200).json({
        message: "تسجيل الدخول تم بنجاح",
        token,
        user: toPublicUser(user)
    });

}

// Verify a Google ID token, resolve the local account, and issue the app JWT.
const googleLogin = async (req, res, next) => {
    const { credential } = req.body || {};
    if (typeof credential !== 'string' || !credential) {
        return res.status(400).json({ message: 'بيانات تسجيل الدخول بجوجل غير مكتملة' });
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'تسجيل الدخول بجوجل غير مهيأ. يرجى إبلاغ الدعم.' });
    }

    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
    } catch (error) {
        if (error.response) {
            return next(error);
        }
        return res.status(401).json({ message: 'تعذر التحقق من حساب جوجل' });
    }

    const googleUser = ticket.getPayload();
    if (
        !googleUser ||
        !googleUser.sub ||
        !googleUser.email ||
        (googleUser.email_verified !== true && googleUser.email_verified !== 'true')
    ) {
        return res.status(401).json({ message: 'يلزم استخدام بريد إلكتروني موثق من جوجل' });
    }

    const email = validator.normalizeEmail(googleUser.email);
    let user = await userModel.findOne({ googleId: googleUser.sub });

    if (!user) {
        user = await userModel.findOne({ email }).select('+googleId');
        if (user) {
            if (user.googleId && user.googleId !== googleUser.sub) {
                return res.status(409).json({ message: 'هذا البريد مرتبط بحساب جوجل آخر' });
            }
            user.googleId = googleUser.sub;
            await user.save();
        } else {
            user = await userModel.create({
                name: googleUser.name || email.split('@')[0],
                email,
                googleId: googleUser.sub
            });
        }
    }

    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
        message: 'تسجيل الدخول بجوجل تم بنجاح',
        token,
        user: toPublicUser(user)
    });
};

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
            return res.status(401).json({ message: "انت مش مسجل دخول" });
        }

        // Verify token integrity and load the account referenced by its payload.
        let decoded;
        try {
            decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "جلسة الدخول غير صالحة" });
            }
            return next(error);
        }

        const freshUser = await userModel.findById(decoded.id);
        // Reject tokens whose user account has been removed.
        if (!freshUser) {
            return res.status(401).json({ message: "اليوزر مش موجود" });
        }
        // Reject tokens issued before the user's latest password change.
        if (freshUser.changedPasswordAfter(decoded.iat)){
            return res.status(401).json({ message: "اليوزر غير مسموح له" });
        }

        // Make the authenticated user available to downstream middleware and handlers.
        req.user = freshUser;

       next()
    }catch(err){
        // Pass token verification and database errors to the error middleware.
        next(err)
    }
};

// Return the public details of the authenticated account.
const getMe = (req, res) => {
    res.status(200).json({ user: toPublicUser(req.user) });
};

// Build middleware that allows a request only when the user's role is permitted.
const restricTo = (...roles)=>{
    return (req, res, next)=>{
        // Stop requests from authenticated users whose role is not allowed.
        if (!roles.includes(req.user.role)){
            return res.status(403).json({ message: "معندش صلاحية انك تعمل كدا" });
        }
        // Continue once the authenticated user passes the role check.
        next()
    }
}

// Export authentication and authorization middleware for route definitions.
module.exports = {signUp , login , googleLogin, protect , restricTo, getMe};