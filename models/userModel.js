
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

// Define the account fields, role constraints, and related active-record references.
const userSchema = new mongoose.Schema({
    // Keep the account's display name and unique sign-in email.
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },

    // Restrict accounts to supported roles and default new accounts to a mom role.
    role: {
        type: String,
        enum: ['mom', 'doctor', 'admin'],
        default: 'mom'
    },

    // Store the password hash required to authenticate the account.
    password: {
        type: String,
        required: true
    },

    // Optionally point to the user's currently selected pregnancy and child.
    activePregnancy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pregnancy",
      default: null,
    },

    activeChild: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      default: null,
    },
    
    // Store the time of a password change for token invalidation checks.
    passwordChangedAt: Date
},{ timestamps: true })

// Compare a supplied password with the stored bcrypt hash.
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return bcrypt.compare(candidatePassword, userPassword)
}

// Indicate whether a token predates the account's most recent password change.
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
}

// Register the schema as the user model used by authentication and account queries.
const userModel = mongoose.model("Users", userSchema)

module.exports = userModel;