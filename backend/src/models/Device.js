import mongoose from 'mongoose';

/**
 * Mongoose Device Model Schema.
 * Coordinates with Manya's Device schema specification (docs/database-schema.md).
 */
const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Device ID must contain at least 2 characters'],
      maxlength: [50, 'Device ID cannot exceed 50 characters'],
    },
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
      minlength: [2, 'Device name must contain at least 2 characters'],
      maxlength: [100, 'Device name cannot exceed 100 characters'],
    },
    deviceType: {
      type: String,
      trim: true,
      maxlength: [50, 'Device type cannot exceed 50 characters'],
      default: 'General',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['online', 'offline', 'maintenance', 'unknown'],
        message: 'Invalid device status',
      },
      default: 'offline',
    },
    unit: {
      type: String,
      trim: true,
      maxlength: [20, 'Unit cannot exceed 20 characters'],
      default: '',
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    lastValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'devices',
  }
);

// Virtual for alias `type` <-> `deviceType`
deviceSchema.virtual('type')
  .get(function () {
    return this.deviceType;
  })
  .set(function (val) {
    this.deviceType = val;
  });

// Index for query performance
deviceSchema.index({ status: 1, deviceType: 1 });
deviceSchema.index({ owner: 1 });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;
