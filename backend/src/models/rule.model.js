/**
 * NexusFlow Rule Schema Specification
 * Aligned with MongoDB / Mongoose ODM and NexusFlow Presentation (Slide 05, 06, 11).
 */
export const RuleSchemaDefinition = {
  ruleId: {
    type: String,
    required: [true, 'ruleId is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [2, 'ruleId must be at least 2 characters'],
    maxlength: [50, 'ruleId cannot exceed 50 characters'],
  },
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    minlength: [2, 'Rule name must be at least 2 characters'],
    maxlength: [100, 'Rule name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  deviceId: {
    type: String,
    required: [true, 'deviceId is required'],
    trim: true,
    uppercase: true,
  },
  metric: {
    type: String,
    required: [true, 'metric is required'],
    trim: true,
  },
  condition: {
    operator: {
      type: String,
      required: [true, 'condition operator is required'],
      enum: {
        values: ['>', '>=', '<', '<=', '==', '!='],
        message: '{VALUE} is not a valid condition operator',
      },
    },
    threshold: {
      type: Number,
      required: [true, 'condition threshold is required'],
    },
    window: {
      type: {
        type: String,
        default: 'none',
      },
      size: {
        type: Number,
        default: 1,
      },
    },
  },
  action: {
    type: {
      type: String,
      default: 'alert',
      enum: ['alert', 'notification', 'webhook'],
    },
    severity: {
      type: String,
      default: 'warning',
      enum: {
        values: ['critical', 'warning', 'info'],
        message: '{VALUE} is not a valid alert severity',
      },
    },
    message: {
      type: String,
      default: '',
    },
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'disabled'],
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  lastTriggeredAt: {
    type: Date,
    default: null,
  },
};

/**
 * Validates a plain rule object against the Rule schema specification.
 * Returns array of validation error messages, or empty array if valid.
 */
export function validateRuleSchema(rule) {
  const errors = [];

  if (!rule || typeof rule !== 'object') {
    return ['Rule data must be an object'];
  }

  if (!rule.name || typeof rule.name !== 'string' || !rule.name.trim()) {
    errors.push('name is required and must be a non-empty string');
  }

  if (!rule.deviceId || typeof rule.deviceId !== 'string' || !rule.deviceId.trim()) {
    errors.push('deviceId is required and must be a non-empty string');
  }

  if (!rule.metric || typeof rule.metric !== 'string' || !rule.metric.trim()) {
    errors.push('metric is required and must be a non-empty string');
  }

  if (!rule.condition || typeof rule.condition !== 'object') {
    errors.push('condition must be an object containing operator and threshold');
  } else {
    const validOperators = ['>', '>=', '<', '<=', '==', '!='];
    if (!validOperators.includes(rule.condition.operator)) {
      errors.push(`condition.operator must be one of: ${validOperators.join(', ')}`);
    }
    if (typeof rule.condition.threshold !== 'number' || !Number.isFinite(rule.condition.threshold)) {
      errors.push('condition.threshold must be a finite number');
    }
  }

  return errors;
}
