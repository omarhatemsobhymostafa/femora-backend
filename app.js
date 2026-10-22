const express = require("express");
const weekRoutes = require("./routes/weekRoutes");
const userRoutes = require("./routes/userRoutes");
const pregnancyRoutes = require("./routes/pregnancyRoutes");

// Create the application instance that server.js will start.
const app = express();

// Parse JSON bodies so route handlers can read request data from req.body.
app.use(express.json());

// Mount each feature's routes under the shared API version prefix.
app.use("/api/v1", weekRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", pregnancyRoutes);

// Export the configured app separately from the listener for reuse and testing.
module.exports = app;