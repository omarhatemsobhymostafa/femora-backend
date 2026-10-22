require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 8080;
const databaseUrl = process.env.DATABASE_URL;

// Connect to MongoDB before accepting requests.
async function startServer() {
  try {
    await mongoose.connect(databaseUrl);
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

// Start the application.
startServer();