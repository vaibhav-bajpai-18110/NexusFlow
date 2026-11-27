import mongoose from 'mongoose';

/**
 * Mongoose Telemetry Model Schema.
 * Coordinates with Manya's Telemetry schema specification (docs/database-schema.md).
 * Uses MongoDB Timeseries collection configuration.
 */
const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      minlength: [2, 'Device ID must contain at least 2 characters'],
      index: true,
    },
    sensorId: {
      type: String,
      trim: true,
      default: null,
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      index: true,
    },
    metric: {
      type: String,
      trim: true,
      default: null,
    },
    value: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      trim: true,
      default: '',
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    collection: 'telemetry',
    timeseries: {
      timeField: 'timestamp',
      metaField: 'deviceId',
      granularity: 'seconds',
    },
  }
);

// Index for high performance time-series queries by device and timestamp
telemetrySchema.index({ deviceId: 1, timestamp: -1 });

const Telemetry =
  mongoose.models.Telemetry || mongoose.model('Telemetry', telemetrySchema);

export default Telemetry;
