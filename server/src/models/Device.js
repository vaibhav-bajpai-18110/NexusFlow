const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    deviceType: {
      type: String,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["online", "offline", "unknown"],
      default: "unknown"
    },
    location: {
      latitude: Number,
      longitude: Number,
      label: String
    }
  },
  {
    timestamps: true,
    collection: "devices"
  }
);

deviceSchema.index({ owner: 1 });

module.exports =
  mongoose.models.Device || mongoose.model("Device", deviceSchema);
