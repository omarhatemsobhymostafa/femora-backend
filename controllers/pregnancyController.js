const pregnancyModel = require("../models/pregnancyModel");


// Validate the last-period date, calculate pregnancy timing, and save a record.
const createPregnancy = async (req, res) => {
    try {
        // Require a date value before attempting format or calendar validation.
        const { lastPeriodDate } = req.body;

        // Return a client error when the required date is absent.
        if (!lastPeriodDate) {
            return res.status(400).json({
                message: "دخلي معاد أول يوم في آخر دورة شهرية",
            });
        }

        // Enforce the exact YYYY-MM-DD input format before parsing the date.
        if (
            typeof lastPeriodDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(lastPeriodDate)
        ) {
            // Reject non-string values and dates outside the documented format.
            return res.status(400).json({
                message: "التاريخ لازم يكون بصيغة YYYY-MM-DD",
            });
        }

        // Parse in UTC and round-trip the value to reject impossible calendar dates.
        const date = new Date(`${lastPeriodDate}T00:00:00.000Z`);

        if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== lastPeriodDate
        ) {
            // Reject impossible calendar dates, such as an invalid day of a month.
            return res.status(400).json({
                message: "التاريخ غير صحيح",
            });
        }

        // Normalize today's date to UTC midnight so day calculations are timezone-safe.
        const today = new Date();
        const todayUTC = new Date(
            Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate()
            )
        );

        // A last-period date cannot be later than the current day.
        if (date > todayUTC) {
            return res.status(400).json({
                message: "مينفعش التاريخ يكون في المستقبل",
            });
        }

        // Derive elapsed pregnancy days and estimate the due date at 280 days.
        const diffDay = Math.floor(
            (todayUTC - date) / (1000 * 60 * 60 * 24)
        );

        const dueDate = new Date(date);
        dueDate.setUTCDate(dueDate.getUTCDate() + 280);

        // Persist the pregnancy for the currently authenticated user.
        const pregnancy = await pregnancyModel.create({
            user: req.user._id,
            lastPeriodDate: date,
            dueDate,
            currentWeek: Math.floor(diffDay / 7),
            currentDay: diffDay % 7,
        });

        // Return the created record with a success status.
        return res.status(201).json({
            message: "تم إنشاء الحمل بنجاح",
            pregnancy,
        });
    } catch (err) {
        // Report failures encountered while validating or saving the record.
        return res.status(500).json({
            message: "حصل خطأ في إنشاء الحمل",
            error: err.message,
        });
    }
};



// Retrieve every pregnancy record belonging to the authenticated user.
const getPregnancy = async (req, res) => {
  try {
    // Use lean results because this handler only returns data and does not mutate it.
    const pregnancy = await pregnancyModel
      .find({ user: req.user._id })
      .lean();

    // Distinguish an account without pregnancy records from a successful lookup.
    if (pregnancy.length === 0) {
      return res.status(404).json({
        message: "مفيش حمل مسجل للحساب ده",
      });
    }

    // Return all matching records to the caller.
    return res.status(200).json({
      message: "تم جلب الأحمال بنجاح",
      pregnancies: pregnancy,
    });
  } catch (err) {
    // Report database failures encountered during retrieval.
    return res.status(500).json({
      message: "حصل خطأ في جلب بيانات الحمل",
      error: err.message,
    });
  }
};



// Recalculate and update the authenticated user's pregnancy record.
const updatePregnancy = async (req, res) => {
  try {
    // Require a date value before validating its format and calendar value.
    const { lastPeriodDate } = req.body;

    // Return a client error when the required date is absent.
    if (!lastPeriodDate) {
      return res.status(400).json({
        message: "دخلي معاد أول يوم في آخر دورة شهرية",
      });
    }

    // Accept only the documented YYYY-MM-DD representation.
    if (
      typeof lastPeriodDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(lastPeriodDate)
    ) {
      // Reject non-string values and dates outside the documented format.
      return res.status(400).json({
        message: "التاريخ لازم يكون بصيغة YYYY-MM-DD",
      });
    }

    // Parse as UTC and reject dates that do not round-trip to the input value.
    const date = new Date(`${lastPeriodDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== lastPeriodDate
    ) {
      // Reject values that do not represent a real calendar date.
      return res.status(400).json({
        message: "التاريخ غير صحيح",
      });
    }

    // Normalize the current date to UTC midnight for a whole-day comparison.
    const now = new Date();

    const today = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    // Prevent updating the record with a future last-period date.
    if (date.getTime() > today) {
      return res.status(400).json({
        message: "مينفعش التاريخ يكون في المستقبل",
      });
    }

    // Recompute gestational week/day and the estimated due date from the new date.
    const diffDay = Math.floor(
      (today - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dueDate = new Date(date);
    dueDate.setUTCDate(dueDate.getUTCDate() + 280);

    const updatedPregnancy =
      await pregnancyModel.findOneAndUpdate(
        { user: req.user._id },
        {
          lastPeriodDate: date,
          dueDate,
          currentWeek: Math.floor(diffDay / 7),
          currentDay: diffDay % 7,
        },
        { new: true, runValidators: true }
      );

    // Return not-found when this user does not yet have a pregnancy record.
    if (!updatedPregnancy) {
      return res.status(404).json({
        message: "الحمل مش موجود",
      });
    }

    // Return the updated document after the validated database update.
    return res.status(200).json({
      message: "تم تحديث بيانات الحمل بنجاح",
      pregnancy: updatedPregnancy,
    });
  } catch (err) {
    // Report validation or database errors encountered during the update.
    return res.status(500).json({
      message: "حصل خطأ في تحديث الحمل",
      error: err.message,
    });
  }
};


// Export pregnancy handlers for the route module.
module.exports = {
    createPregnancy,
    getPregnancy,
    updatePregnancy
}
