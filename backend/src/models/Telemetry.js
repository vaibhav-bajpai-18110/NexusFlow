import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

telemetrySchema.index({ deviceId: 1, timestamp: -1 });

const Telemetry =
  mongoose.models.Telemetry || mongoose.model('Telemetry', telemetrySchema);

export default Telemetry;
