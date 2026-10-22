const pregnancyModel = require("../models/pregnancyModel");


const createPregnancy = async (req, res) => {
    try {
        const { lastPeriodDate } = req.body;

        if (!lastPeriodDate) {
            return res.status(400).json({
                message: "دخلي معاد أول يوم في آخر دورة شهرية",
            });
        }

        // Validate the original string first
        if (
            typeof lastPeriodDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(lastPeriodDate)
        ) {
            return res.status(400).json({
                message: "التاريخ لازم يكون بصيغة YYYY-MM-DD",
            });
        }

        const date = new Date(`${lastPeriodDate}T00:00:00.000Z`);

        if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== lastPeriodDate
        ) {
            return res.status(400).json({
                message: "التاريخ غير صحيح",
            });
        }

        const today = new Date();
        const todayUTC = new Date(
            Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate()
            )
        );

        if (date > todayUTC) {
            return res.status(400).json({
                message: "مينفعش التاريخ يكون في المستقبل",
            });
        }

        const diffDay = Math.floor(
            (todayUTC - date) / (1000 * 60 * 60 * 24)
        );

        const dueDate = new Date(date);
        dueDate.setUTCDate(dueDate.getUTCDate() + 280);

        const pregnancy = await pregnancyModel.create({
            user: req.user._id,
            lastPeriodDate: date,
            dueDate,
            currentWeek: Math.floor(diffDay / 7),
            currentDay: diffDay % 7,
        });

        return res.status(201).json({
            message: "تم إنشاء الحمل بنجاح",
            pregnancy,
        });
    } catch (err) {
        return res.status(500).json({
            message: "حصل خطأ في إنشاء الحمل",
            error: err.message,
        });
    }
};



const getPregnancy = async (req, res) => {
  try {
    const pregnancy = await pregnancyModel
      .find({ user: req.user._id })
      .lean();

    if (pregnancy.length === 0) {
      return res.status(404).json({
        message: "مفيش حمل مسجل للحساب ده",
      });
    }

    return res.status(200).json({
      message: "تم جلب الأحمال بنجاح",
      pregnancies: pregnancy,
    });
  } catch (err) {
    return res.status(500).json({
      message: "حصل خطأ في جلب بيانات الحمل",
      error: err.message,
    });
  }
};



const updatePregnancy = async (req, res) => {
  try {
    const { lastPeriodDate } = req.body;

    if (!lastPeriodDate) {
      return res.status(400).json({
        message: "دخلي معاد أول يوم في آخر دورة شهرية",
      });
    }

    if (
      typeof lastPeriodDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(lastPeriodDate)
    ) {
      return res.status(400).json({
        message: "التاريخ لازم يكون بصيغة YYYY-MM-DD",
      });
    }

    const date = new Date(`${lastPeriodDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== lastPeriodDate
    ) {
      return res.status(400).json({
        message: "التاريخ غير صحيح",
      });
    }

    const now = new Date();

    const today = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    if (date.getTime() > today) {
      return res.status(400).json({
        message: "مينفعش التاريخ يكون في المستقبل",
      });
    }

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

    if (!updatedPregnancy) {
      return res.status(404).json({
        message: "الحمل مش موجود",
      });
    }

    return res.status(200).json({
      message: "تم تحديث بيانات الحمل بنجاح",
      pregnancy: updatedPregnancy,
    });
  } catch (err) {
    return res.status(500).json({
      message: "حصل خطأ في تحديث الحمل",
      error: err.message,
    });
  }
};


module.exports = {
    createPregnancy,
    getPregnancy,
    updatePregnancy
}
