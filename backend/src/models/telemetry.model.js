/**
 * NexusFlow Telemetry Data Schema Specification
 * Aligned with MongoDB / Mongoose ODM and NexusFlow Presentation (Slide 12).
 */
export const TelemetrySchemaDefinition = {
  deviceId: {
    type: String,
    required: [true, 'deviceId is required'],
    trim: true,
    uppercase: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: [true, 'timestamp is required'],
    index: true,
  },
  metrics: {
    type: Object,
    required: [true, 'metrics dictionary is required'],
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  ingestedAt: {
    type: Date,
    default: Date.now,
  },
};

/**
 * Validates a plain telemetry record against the NexusFlow Telemetry schema specification.
 * Returns array of validation error messages, or empty array if valid.
 */
export function validateTelemetrySchema(telemetry) {
  const errors = [];

  if (!telemetry || typeof telemetry !== 'object') {
    return ['Telemetry record must be an object'];
  }

  if (!telemetry.deviceId || typeof telemetry.deviceId !== 'string' || !telemetry.deviceId.trim()) {
    errors.push('deviceId is required and must be a non-empty string');
  }

  if (!telemetry.timestamp || Number.isNaN(new Date(telemetry.timestamp).getTime())) {
    errors.push('timestamp must be a valid date');
  }

  if (!telemetry.metrics || typeof telemetry.metrics !== 'object' || Array.isArray(telemetry.metrics)) {
    errors.push('metrics must be an object containing sensor key-value pairs');
  } else if (Object.keys(telemetry.metrics).length === 0) {
    errors.push('metrics object cannot be empty');
  }

  return errors;
}
