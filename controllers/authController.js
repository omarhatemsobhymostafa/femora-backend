const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const validator = require('../validator');

// Create a user with a hashed password, then return a signed authentication token.
const signUp = async (req, res , next) => {
    try {
        const { name, email, password } = req.body || {};
        if (!validator.validateEmail(email)) {
            return res.status(400).json({ message: 'البريد الإلكتروني مش صح' });
        }
        if (!validator.validatePassword(password)) {
            return res.status(400).json({ message: 'لازم الباسورد يكون 8 حروف' });
        }

        const normalizedEmail = validator.normalizeEmail(email);
        // Store only the hash so the submitted password is not persisted directly.
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await userModel.create({ name, email: normalizedEmail, password: hashedPassword });

        // Include the new user's ID in the token so it can identify the user later.
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
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
        next(error);
    }
}

// Verify the submitted credentials and return a token for an existing user.
const login = async (req, res , next) => {
    const { email, password } = req.body || {};
    if (!validator.validateEmail(email)) {
        return res.status(400).json({ message: 'البريد الإلكتروني مش صح' });
    }
    if (!validator.validatePassword(password, 1)) {
        return res.status(400).json({ message: 'لازم تدخل الباسورد' });
    }

    // Passwords are excluded from normal queries, so select it for verification.
    const user = await userModel.findOne({ email: validator.normalizeEmail(email) }).select('+password');
  

    if (!user || !await user.correctPassword(password , user.password)) {
        return next(new Error("البريد الإلكتروني أو الباسورد مش صح"));
    }

    // Create a token for the authenticated user.
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(200).json({
        message: "تسجيل الدخول تم بنجاح",
        token
    });

}

const protect = async (req, res, next) => {
    try{
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token){
            return next(new Error("انت مش مسجل دخول"));
        }

        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

        const freshUser = await userModel.findById(decoded.id);
        if (!freshUser) {
            return next(new Error("اليوزر مش موجود"));
        }
        if (freshUser.changedPasswordAfter(decoded.iat)){
            return next(new Error("اليوزر غير مسموح له"));
        }
        req.user = freshUser;
       next()
    }catch(err){
        next(err)
    }
};

module.exports = {signUp , login , protect};