/**
 * NexusFlow Device Data Schema Specification
 * Aligned with MongoDB / Mongoose ODM and NexusFlow Presentation (Slide 08 & 12).
 */
export const DeviceSchemaDefinition = {
  deviceId: {
    type: String,
    required: [true, 'deviceId is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [2, 'deviceId must be at least 2 characters'],
    maxlength: [50, 'deviceId cannot exceed 50 characters'],
  },
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [100, 'Device name cannot exceed 100 characters'],
  },
  type: {
    type: String,
    default: 'General',
    trim: true,
    maxlength: [50, 'Type cannot exceed 50 characters'],
  },
  unit: {
    type: String,
    default: '',
    trim: true,
    maxlength: [20, 'Unit cannot exceed 20 characters'],
  },
  status: {
    type: String,
    enum: {
      values: ['online', 'offline', 'maintenance'],
      message: '{VALUE} is not a valid device status',
    },
    default: 'offline',
  },
  lastValue: {
    type: Number,
    default: null,
  },
  lastMetrics: {
    type: Object,
    default: {},
  },
  location: {
    type: String,
    default: '',
    trim: true,
    maxlength: [150, 'Location cannot exceed 150 characters'],
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  metadata: {
    type: Object,
    default: {},
  },
  lastSeen: {
    type: Date,
    default: null,
  },
};

/**
 * Validates a plain device object against the NexusFlow Device schema specification.
 * Returns array of validation error messages, or empty array if valid.
 */
export function validateDeviceSchema(device) {
  const errors = [];

  if (!device || typeof device !== 'object') {
    return ['Device data must be an object'];
  }

  if (!device.deviceId || typeof device.deviceId !== 'string' || !device.deviceId.trim()) {
    errors.push('deviceId is required and must be a non-empty string');
  }

  if (device.name !== undefined && (typeof device.name !== 'string' || !device.name.trim())) {
    errors.push('name must be a non-empty string if provided');
  }

  if (
    device.status &&
    !['online', 'offline', 'maintenance'].includes(device.status.toLowerCase().trim())
  ) {
    errors.push('status must be one of: online, offline, maintenance');
  }

  if (device.lastValue !== undefined && device.lastValue !== null) {
    if (typeof device.lastValue !== 'number' || !Number.isFinite(device.lastValue)) {
      errors.push('lastValue must be a finite number or null');
    }
  }

  return errors;
}
