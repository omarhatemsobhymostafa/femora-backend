const express = require("express");
const weekRoutes = require("./routes/weekRoutes");
const userRoutes = require("./routes/userRoutes");
const pregnancyRoutes = require("./routes/pregnancyRoutes");

// Configure the Express application before it is started by server.js.
const app = express();

// Parse incoming JSON request bodies.
app.use(express.json());

// Mount all Weeks endpoints under the /api prefix.
app.use("/api/v1", weekRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", pregnancyRoutes);

module.exports = app;