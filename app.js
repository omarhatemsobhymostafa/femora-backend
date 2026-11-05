const express = require("express");
const weekRoutes = require("./routes/weekRoutes");
const userRoutes = require("./routes/userRoutes");
const pregnancyRoutes = require("./routes/pregnancyRoutes");
const cors = require("cors");

// Create the application instance that server.js will start.
const app = express();
app.use(cors());
// Parse JSON bodies so route handlers can read request data from req.body.
app.use(express.json());

// Mount each feature's routes under the shared API version prefix.
app.use("/api/v1", weekRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", pregnancyRoutes);

// Keep API errors in JSON so frontend forms can show a useful message.
app.use((error, req, res, next) => {
  console.error("API request failed:", error);

  if (res.headersSent) {
    return next(error);
  }

  const requestedStatus = error.statusCode || error.status || 500;
  const status =
    Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599
      ? requestedStatus
      : 500;

  return res.status(status).json({
    message:
      status < 500 && error.message
        ? error.message
        : "حصل خطأ في الخادم. حاولي مرة أخرى لاحقًا.",
  });
});

// Export the configured app separately from the listener for reuse and testing.
module.exports = app;