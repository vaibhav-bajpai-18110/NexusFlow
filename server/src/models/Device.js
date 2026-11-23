
const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      unique: true,
      trim: true,
      minlength: [2, "Device ID must contain at least 2 characters"]
    },
    name: {
      type: String,
      required: [true, "Device name is required"],
      trim: true,
      minlength: [2, "Device name must contain at least 2 characters"],
      maxlength: [100, "Device name cannot exceed 100 characters"]
    },
    deviceType: {
      type: String,
      trim: true,
      maxlength: [50, "Device type cannot exceed 50 characters"]
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Device owner is required"]
    },
    status: {
      type: String,
      enum: {
        values: ["online", "offline", "unknown"],
        message: "Invalid device status"
      },
      default: "unknown"
    },
    location: {
      latitude: {
        type: Number,
        min: [-90, "Latitude cannot be below -90"],
        max: [90, "Latitude cannot exceed 90"]
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude cannot be below -180"],
        max: [180, "Longitude cannot exceed 180"]
      },
      label: {
        type: String,
        trim: true,
        maxlength: [150, "Location label cannot exceed 150 characters"]
      }
    }
  },
  {
    timestamps: true,
    collection: "devices"
  }
);

// Index for retrieving devices belonging to a user.
deviceSchema.index({ owner: 1 });

module.exports =
  mongoose.models.Device || mongoose.model("Device", deviceSchema);
