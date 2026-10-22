
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

// Define the fields stored for each pregnancy week.
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['mom', 'doctor', 'admin'],
        default: 'mom'
    },
    password: {
        type: String,
        required: true
    },  
    passwordChangedAt: Date
})

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
}
// Create the Mongoose model used to query the Weeks collection.
const userModel = mongoose.model("Users", userSchema)

module.exports = userModel;