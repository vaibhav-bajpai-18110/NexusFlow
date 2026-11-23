import { EventEmitter } from 'node:events';
import { AppError } from '../utils/AppError.js';

/**
 * Default demo rules matching the NexusFlow presentation (Slide 05 & Slide 08).
 */
const DEFAULT_DEMO_RULES = [
  {
    ruleId: 'RULE_001',
    name: 'Turbine Temperature Safety Rule',
    description: 'Trigger critical alert when Turbine 01 temperature exceeds 80°C',
    deviceId: 'TURBINE_001',
    metric: 'temperature',
    condition: {
      operator: '>',
      threshold: 80,
      window: { type: 'none', size: 1 },
    },
    action: {
      type: 'alert',
      severity: 'critical',
      message: 'Turbine 01 temperature above threshold (80°C)',
    },
    status: 'active',
    enabled: true,
    lastTriggeredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    ruleId: 'RULE_002',
    name: 'Motor Vibration Warning Rule',
    description: 'Warn when Motor 02 vibration exceeds 2.0 mm/s',
    deviceId: 'MOTOR_002',
    metric: 'vibration',
    condition: {
      operator: '>',
      threshold: 2.0,
      window: { type: 'none', size: 1 },
    },
    action: {
      type: 'alert',
      severity: 'warning',
      message: 'Motor 02 vibration approaching limit (2.0 mm/s)',
    },
    status: 'active',
    enabled: true,
    lastTriggeredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class RuleService extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} ruleId -> rule record */
    this.rules = new Map();
    this.resetToDefaults();
  }

  /**
   * Resets rule registry to default demo rules.
   */
  resetToDefaults() {
    this.rules.clear();
    for (const r of DEFAULT_DEMO_RULES) {
      this.rules.set(r.ruleId.toUpperCase(), {
        ...r,
        condition: { ...r.condition },
        action: { ...r.action },
      });
    }
  }

  /**
   * Generates a new unique rule ID if not provided.
   */
  generateRuleId() {
    let index = this.rules.size + 1;
    let candidate = `RULE_${String(index).padStart(3, '0')}`;
    while (this.rules.has(candidate)) {
      index++;
      candidate = `RULE_${String(index).padStart(3, '0')}`;
    }
    return candidate;
  }

  /**
   * Retrieve all rules with optional filtering and search.
   * @param {object} [filter]
   * @param {string} [filter.deviceId]
   * @param {string} [filter.status] 'active' | 'disabled'
   * @param {string} [filter.metric]
   * @param {string} [filter.severity] 'critical' | 'warning' | 'info'
   * @param {boolean|string} [filter.enabled]
   * @param {string} [filter.search]
   */
  getAll(filter = {}) {
    let result = Array.from(this.rules.values());

    if (filter.deviceId) {
      const targetDevice = filter.deviceId.toUpperCase().trim();
      result = result.filter(
        (r) => r.deviceId.toUpperCase().trim() === targetDevice || r.deviceId === '*'
      );
    }

    if (filter.status) {
      const targetStatus = filter.status.toLowerCase().trim();
      result = result.filter((r) => r.status.toLowerCase() === targetStatus);
    }

    if (filter.enabled !== undefined && filter.enabled !== null && filter.enabled !== '') {
      const isEnabled =
        typeof filter.enabled === 'boolean'
          ? filter.enabled
          : filter.enabled.toString().toLowerCase() === 'true';
      result = result.filter((r) => r.enabled === isEnabled);
    }

    if (filter.metric) {
      const targetMetric = filter.metric.toLowerCase().trim();
      result = result.filter((r) => r.metric.toLowerCase() === targetMetric);
    }

    if (filter.severity) {
      const targetSeverity = filter.severity.toLowerCase().trim();
      result = result.filter((r) => r.action?.severity?.toLowerCase() === targetSeverity);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.ruleId.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.deviceId.toLowerCase().includes(q) ||
          r.metric.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Get a single rule by its ruleId.
   * @param {string} id
   */
  getById(id) {
    if (!id) return null;
    return this.rules.get(id.toUpperCase().trim()) || null;
  }

  /**
   * Registers a new rule in the system.
   * @param {object} ruleData
   */
  create(ruleData) {
    const rawId = ruleData.ruleId || ruleData.id || this.generateRuleId();
    const normalizedId = rawId.toUpperCase().trim();

    if (this.rules.has(normalizedId)) {
      throw new AppError(`Rule with ID "${normalizedId}" already exists`, 409);
    }

    const now = new Date().toISOString();
    const isEnabled =
      ruleData.enabled !== undefined
        ? Boolean(ruleData.enabled)
        : ruleData.status
        ? ruleData.status.toLowerCase() === 'active'
        : true;

    const newRule = {
      ruleId: normalizedId,
      name: ruleData.name.trim(),
      description: ruleData.description ? ruleData.description.trim() : '',
      deviceId: ruleData.deviceId.trim().toUpperCase(),
      metric: ruleData.metric.trim(),
      condition: {
        operator: ruleData.condition.operator.trim(),
        threshold: Number(ruleData.condition.threshold),
        window: ruleData.condition.window || { type: 'none', size: 1 },
      },
      action: {
        type: ruleData.action?.type ? ruleData.action.type.trim().toLowerCase() : 'alert',
        severity: ruleData.action?.severity
          ? ruleData.action.severity.trim().toLowerCase()
          : 'warning',
        message: ruleData.action?.message
          ? ruleData.action.message.trim()
          : `${ruleData.name} triggered`,
      },
      status: isEnabled ? 'active' : 'disabled',
      enabled: isEnabled,
      lastTriggeredAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.rules.set(normalizedId, newRule);
    this.emit('ruleCreated', newRule);
    return newRule;
  }

  /**
   * Updates an existing rule.
   * @param {string} id
   * @param {object} updateData
   */
  update(id, updateData) {
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    const isEnabled =
      updateData.enabled !== undefined
        ? Boolean(updateData.enabled)
        : updateData.status !== undefined
        ? updateData.status.toLowerCase() === 'active'
        : existing.enabled;

    const updated = {
      ...existing,
      name: updateData.name !== undefined ? updateData.name.trim() : existing.name,
      description:
        updateData.description !== undefined
          ? updateData.description.trim()
          : existing.description,
      deviceId:
        updateData.deviceId !== undefined
          ? updateData.deviceId.trim().toUpperCase()
          : existing.deviceId,
      metric: updateData.metric !== undefined ? updateData.metric.trim() : existing.metric,
      condition: {
        ...existing.condition,
        ...(updateData.condition || {}),
        threshold:
          updateData.condition?.threshold !== undefined
            ? Number(updateData.condition.threshold)
            : existing.condition.threshold,
      },
      action: {
        ...existing.action,
        ...(updateData.action || {}),
      },
      status: isEnabled ? 'active' : 'disabled',
      enabled: isEnabled,
      updatedAt: new Date().toISOString(),
    };

    this.rules.set(existing.ruleId, updated);
    this.emit('ruleUpdated', updated);
    return updated;
  }

  /**
   * Deletes a rule by its ruleId.
   * @param {string} id
   */
  delete(id) {
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    this.rules.delete(existing.ruleId);
    this.emit('ruleDeleted', existing);
    return existing;
  }

  /**
   * Evaluates comparison condition between incoming metric value and rule threshold.
   * @param {number} value
   * @param {string} operator
   * @param {number} threshold
   * @returns {boolean}
   */
  evaluateCondition(value, operator, threshold) {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Evaluates a single rule against a telemetry data sample.
   * @param {object} rule
   * @param {object} telemetryData
   */
  evaluateRule(rule, telemetryData) {
    if (!rule || !telemetryData) {
      return { triggered: false, reason: 'Missing rule or telemetry data' };
    }

    // Check device match if rule targets a specific device
    if (rule.deviceId !== '*') {
      const incomingId = (telemetryData.deviceId || '').toString().trim().toUpperCase();
      if (incomingId && incomingId !== rule.deviceId.toUpperCase()) {
        return {
          triggered: false,
          reason: `Device mismatch: rule targets "${rule.deviceId}", received "${incomingId}"`,
        };
      }
    }

    // Extract value
    let val = telemetryData[rule.metric];
    if (val === undefined && telemetryData.metrics) {
      val = telemetryData.metrics[rule.metric];
    }

    if (val === undefined || val === null || typeof val !== 'number' || !Number.isFinite(val)) {
      return {
        triggered: false,
        reason: `Metric "${rule.metric}" is missing or not a valid number in telemetry`,
      };
    }

    const isTriggered = this.evaluateCondition(val, rule.condition.operator, rule.condition.threshold);

    return {
      triggered: isTriggered,
      ruleId: rule.ruleId,
      ruleName: rule.name,
      deviceId: telemetryData.deviceId || rule.deviceId,
      metric: rule.metric,
      value: val,
      operator: rule.condition.operator,
      threshold: rule.condition.threshold,
      action: isTriggered ? rule.action : null,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates all active rules against an incoming telemetry event.
   * Updates lastTriggeredAt for any rule that fires.
   * @param {object} telemetryRecord
   * @returns {Array<object>} Array of triggered evaluation results
   */
  evaluateAll(telemetryRecord) {
    if (!telemetryRecord || !telemetryRecord.deviceId) {
      return [];
    }

    const triggeredEvents = [];
    const targetId = telemetryRecord.deviceId.toUpperCase().trim();

    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.status !== 'active') {
        continue;
      }

      if (rule.deviceId !== '*' && rule.deviceId.toUpperCase() !== targetId) {
        continue;
      }

      const result = this.evaluateRule(rule, telemetryRecord);
      if (result.triggered) {
        rule.lastTriggeredAt = result.evaluatedAt;
        triggeredEvents.push(result);
        this.emit('ruleTriggered', result);
      }
    }

    return triggeredEvents;
  }
}

export const ruleService = new RuleService();
export { RuleService };
