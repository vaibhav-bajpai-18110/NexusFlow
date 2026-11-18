import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    deviceType: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'Unknown',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance', 'unknown'],
      default: 'unknown',
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    location: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      label: { type: String, trim: true, maxlength: 150, default: '' },
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastValue: { type: mongoose.Schema.Types.Mixed, default: null },
    lastMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSeen: { type: Date, default: null },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'devices',
  }
);

deviceSchema.index({ status: 1, deviceType: 1 });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;

