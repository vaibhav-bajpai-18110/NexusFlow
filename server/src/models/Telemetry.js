
const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      trim: true,
      minlength: [2, "Device ID must contain at least 2 characters"]
    },
    sensorId: {
      type: String,
      required: [true, "Sensor ID is required"],
      trim: true,
      minlength: [2, "Sensor ID must contain at least 2 characters"]
    },
    timestamp: {
      type: Date,
      required: [true, "Timestamp is required"]
    },
    metric: {
      type: String,
      required: [true, "Metric is required"],
      trim: true,
      minlength: [1, "Metric cannot be empty"]
    },
    value: {
      type: Number,
      required: [true, "Value is required"],
      validate: {
        validator: Number.isFinite,
        message: "Value must be a finite number"
      }
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      minlength: [1, "Unit cannot be empty"]
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    collection: "telemetry",
    timeseries: {
      timeField: "timestamp",
      metaField: "deviceId",
      granularity: "seconds"
    }
  }
);

// Supports retrieving a device's telemetry in timestamp order.
telemetrySchema.index({ deviceId: 1, timestamp: -1 });

module.exports =
  mongoose.models.Telemetry ||
  mongoose.model("Telemetry", telemetrySchema);
