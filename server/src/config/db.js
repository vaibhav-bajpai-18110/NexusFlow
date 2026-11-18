
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    // Check whether MongoDB URI is configured
    if (!mongoURI) {
      throw new Error(
        "MONGODB_URI is missing. Please configure it in your .env file."
      );
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });

    console.log("MongoDB connected successfully");

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

// Handle unexpected MongoDB connection errors
mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", error.message);
});

module.exports = connectDB;
