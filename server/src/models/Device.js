const mongoose = require("mongoose");
const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      unique: true,
      trim: true,
      minlength: 2
    },
    deviceName: {
      type: String,
      required: [true, "Device name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    deviceType: {
      type: String,
      required: [true, "Device type is required"],
      trim: true
    },
    status: {
      type: String,
      enum: ["online", "offline", "unknown"],
      default: "unknown"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false,
    collection: "devices"
  }
);
module.exports = mongoose.models.Device ||
  mongoose.model("Device", deviceSchema);
