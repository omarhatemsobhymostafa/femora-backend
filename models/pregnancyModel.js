
const mongoose = require("mongoose");

const pregnancySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    lastPeriodDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    currentWeek: {
      type: Number,
      required: true,
    },
    currentDay: {
      type: Number,
      required: true,
    },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Pregnancy",
  pregnancySchema
);
