
const mongoose = require("mongoose");

// Define a pregnancy record and associate it with the user who owns it.
const pregnancySchema = new mongoose.Schema(
  {
    // Reference the owning account and index it for user-scoped lookups.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    // Store the dates used to calculate the pregnancy timeline.
    lastPeriodDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },

    // Store gestational progress as a week number and remaining day count.
    currentWeek: {
      type: Number,
      required: true,
    },
    currentDay: {
      type: Number,
      required: true,
    },
    
  },
  // Track when each pregnancy document is created and updated.
  { timestamps: true }
);

// Register the schema as the Pregnancy model.
module.exports = mongoose.model(
  "Pregnancy",
  pregnancySchema
);
