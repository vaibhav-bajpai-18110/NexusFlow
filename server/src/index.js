
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const deviceRoutes = require("./routes/deviceRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NexusFlow server is running"
  });
});

app.use("/api/devices", deviceRoutes);

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`NexusFlow server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;