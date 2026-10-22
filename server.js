require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");

// Read runtime configuration from the environment, with a local port fallback.
const PORT = process.env.PORT || 8080;
const databaseUrl = process.env.DATABASE_URL;

// Establish the database connection before accepting HTTP requests.
async function startServer() {
  try {
    await mongoose.connect(databaseUrl);
    console.log("Connected to MongoDB");

    // Begin listening only after MongoDB is available.
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    // Do not leave the process running when the required database is unavailable.
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

// Start the database connection and HTTP server.
startServer();