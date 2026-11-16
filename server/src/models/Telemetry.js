
const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true
    },
    sensorId: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    metric: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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

telemetrySchema.index({ deviceId: 1, sensorId: 1, timestamp: -1 });

module.exports =
  mongoose.models.Telemetry ||
  mongoose.model("Telemetry", telemetrySchema);
