import { EventEmitter } from 'node:events';
import { Subject } from 'rxjs';
import { filter, map, share } from 'rxjs/operators';
import { ruleService } from './rule.service.js';

/**
 * @typedef {Object} EvaluationResult
 * @property {boolean} matched - True if condition is met
 * @property {boolean} triggered - Alias for matched
 * @property {string} ruleId
 * @property {string} ruleName
 * @property {string} deviceId
 * @property {string} metric
 * @property {number} value - Actual telemetry value
 * @property {string} operator - Comparison operator
 * @property {number} threshold - Target threshold
 * @property {object|null} action - Configured action if matched
 * @property {string} reason - Detailed explanation of evaluation
 * @property {string} evaluatedAt - ISO timestamp of evaluation
 * @property {string} [telemetryTimestamp] - Original telemetry timestamp
 */

export class RuleEvaluationService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxAlerts = options.maxAlerts || 500;

    /**
     * In-memory alert history ring buffer.
     * @type {Array<EvaluationResult>}
     */
    this.alerts = [];

    /**
     * Operational statistics counter.
     */
    this.stats = {
      totalEvaluations: 0,
      totalMatches: 0,
      totalNonMatches: 0,
      totalAlertsEmitted: 0,
    };

    // -----------------------------------------------------------------------
    // RxJS Reactive Streams
    // -----------------------------------------------------------------------

    /**
     * Primary RxJS Subject stream receiving all incoming telemetry records.
     * @type {Subject<object>}
     */
    this.telemetry$ = new Subject();

    /**
     * Stream of all individual rule evaluation results (both matched and non-matched).
     * @type {Subject<EvaluationResult>}
     */
    this.evaluations$ = new Subject();

    /**
     * Stream of only matched / triggered evaluation alert events.
     * Derived via RxJS filter operator and shared across multicasting subscribers.
     */
    this.alerts$ = this.evaluations$.pipe(
      filter((res) => Boolean(res && res.matched)),
      share()
    );

    // Initialize the internal reactive pipeline
    this._initPipeline();
  }

  /**
   * Initializes the RxJS reactive subscription pipeline.
   * Telemetry arriving on telemetry$ is evaluated against active saved rules,
   * results are published to evaluations$, and matched alerts are recorded.
   * @private
   */
  _initPipeline() {
    // 1. Process incoming telemetry through RxJS pipeline
    this.telemetry$.subscribe({
      next: (telemetryRecord) => {
        try {
          this._evaluateTelemetryStream(telemetryRecord);
        } catch (err) {
          console.error('[RuleEvaluationService] Error evaluating telemetry in RxJS stream:', err);
        }
      },
      error: (err) => {
        console.error('[RuleEvaluationService] Telemetry stream error:', err);
      },
    });

    // 2. Listen to matched alerts stream and record alerts & emit events
    this.alerts$.subscribe({
      next: (alertResult) => {
        this._recordAlert(alertResult);
        this.emit('alert', alertResult);
      },
      error: (err) => {
        console.error('[RuleEvaluationService] Alerts stream error:', err);
      },
    });
  }

  /**
   * Evaluates a comparison condition between an actual value and threshold.
   * Supports:
   *  - Greater than: '>', '>='
   *  - Less than: '<', '<='
   *  - Equality: '==', '===', '=', 'eq'
   *  - Inequality: '!=', '!=='
   *
   * @param {number} value - Actual metric value from telemetry
   * @param {string} operator - Comparison operator
   * @param {number} threshold - Rule target threshold
   * @returns {boolean} True if condition is met, false otherwise
   */
  evaluateCondition(value, operator, threshold) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return false;
    }
    if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
      return false;
    }
    if (!operator || typeof operator !== 'string') {
      return false;
    }

    const op = operator.trim();

    switch (op) {
      // Greater than
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;

      // Less than
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;

      // Equality
      case '==':
      case '===':
      case '=':
      case 'eq':
        return value === threshold;

      // Inequality
      case '!=':
      case '!==':
      case 'ne':
        return value !== threshold;

      default:
        return false;
    }
  }

  /**
   * Evaluates a single rule against a telemetry record.
   *
   * @param {object} rule - Saved rule object
   * @param {object} telemetryRecord - Incoming telemetry record
   * @returns {EvaluationResult} Evaluation result
   */
  evaluateRule(rule, telemetryRecord) {
    const evaluatedAt = new Date().toISOString();

    if (!rule || !telemetryRecord) {
      return {
        matched: false,
        triggered: false,
        ruleId: rule?.ruleId || 'UNKNOWN',
        ruleName: rule?.name || 'Unknown Rule',
        deviceId: telemetryRecord?.deviceId || rule?.deviceId || 'UNKNOWN',
        metric: rule?.metric || 'unknown',
        value: NaN,
        operator: rule?.condition?.operator || '==',
        threshold: rule?.condition?.threshold ?? NaN,
        action: null,
        reason: 'Missing rule or telemetry record',
        evaluatedAt,
      };
    }

    const ruleDeviceId = (rule.deviceId || '').trim().toUpperCase();
    const telemetryDeviceId = (telemetryRecord.deviceId || '').trim().toUpperCase();

    // Check device relevance: wildcard '*' matches all devices, otherwise exact ID match
    if (ruleDeviceId !== '*' && ruleDeviceId !== telemetryDeviceId) {
      return {
        matched: false,
        triggered: false,
        ruleId: rule.ruleId,
        ruleName: rule.name,
        deviceId: telemetryRecord.deviceId || rule.deviceId,
        metric: rule.metric,
        value: NaN,
        operator: rule.condition?.operator || '==',
        threshold: rule.condition?.threshold ?? 0,
        action: null,
        reason: `Device mismatch: rule targets "${rule.deviceId}", telemetry from "${telemetryRecord.deviceId}"`,
        evaluatedAt,
      };
    }

    // Extract metric value (checks top-level then record.metrics object)
    let metricValue = telemetryRecord[rule.metric];
    if (metricValue === undefined && telemetryRecord.metrics) {
      metricValue = telemetryRecord.metrics[rule.metric];
    }

    if (metricValue === undefined || metricValue === null || typeof metricValue !== 'number' || !Number.isFinite(metricValue)) {
      return {
        matched: false,
        triggered: false,
        ruleId: rule.ruleId,
        ruleName: rule.name,
        deviceId: telemetryRecord.deviceId || rule.deviceId,
        metric: rule.metric,
        value: metricValue,
        operator: rule.condition?.operator || '==',
        threshold: rule.condition?.threshold ?? 0,
        action: null,
        reason: `Metric "${rule.metric}" is missing or non-numeric in telemetry`,
        evaluatedAt,
      };
    }

    const operator = rule.condition?.operator || '==';
    const threshold = Number(rule.condition?.threshold);
    const matched = this.evaluateCondition(metricValue, operator, threshold);

    const reason = matched
      ? `Condition matched: ${rule.metric} (${metricValue}) ${operator} ${threshold}`
      : `Condition not matched: ${rule.metric} (${metricValue}) does not satisfy ${operator} ${threshold}`;

    const result = {
      matched,
      triggered: matched,
      ruleId: rule.ruleId,
      ruleName: rule.name,
      deviceId: telemetryRecord.deviceId || rule.deviceId,
      metric: rule.metric,
      value: metricValue,
      operator,
      threshold,
      severity: matched ? rule.action?.severity || 'warning' : null,
      action: matched ? rule.action || null : null,
      reason,
      evaluatedAt,
      telemetryTimestamp: telemetryRecord.timestamp || evaluatedAt,
    };

    return result;
  }

  /**
   * Internal processor for incoming telemetry in the RxJS stream.
   * Retrieves relevant saved rules from ruleService and pushes each result to evaluations$.
   * @private
   * @param {object} telemetryRecord
   */
  _evaluateTelemetryStream(telemetryRecord) {
    if (!telemetryRecord || !telemetryRecord.deviceId) {
      return;
    }

    const targetDeviceId = telemetryRecord.deviceId.trim().toUpperCase();
    const allRules = ruleService.getAll({ status: 'active', enabled: true });

    // Filter relevant rules (exact deviceId or wildcard '*')
    const relevantRules = allRules.filter((r) => {
      const rDev = (r.deviceId || '').trim().toUpperCase();
      return rDev === '*' || rDev === targetDeviceId;
    });

    for (const rule of relevantRules) {
      this.stats.totalEvaluations += 1;
      const evaluation = this.evaluateRule(rule, telemetryRecord);

      if (evaluation.matched) {
        this.stats.totalMatches += 1;
        // Update rule lastTriggeredAt on the live rule object
        if (rule) {
          rule.lastTriggeredAt = evaluation.evaluatedAt;
        }
      } else {
        this.stats.totalNonMatches += 1;
      }

      // Publish to RxJS evaluations$ Subject
      this.evaluations$.next(evaluation);
    }
  }

  /**
   * Stores a matched alert in the ring buffer.
   * @private
   * @param {EvaluationResult} alertResult
   */
  _recordAlert(alertResult) {
    this.alerts.unshift(alertResult);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }
    this.stats.totalAlertsEmitted += 1;
  }

  /**
   * Ingests a telemetry record into the RxJS reactive rule evaluation pipeline.
   * Can be called directly or wired to TelemetryService.
   *
   * @param {object} telemetryRecord - Validated telemetry record
   * @returns {void}
   */
  processTelemetry(telemetryRecord) {
    if (telemetryRecord) {
      this.telemetry$.next(telemetryRecord);
    }
  }

  /**
   * Direct synchronous evaluation of a telemetry record against all relevant saved rules.
   * Returns an array of evaluation results (both matching and non-matching).
   *
   * @param {object} telemetryRecord
   * @param {Array<object>} [customRules] - Optional override of rules to evaluate against
   * @returns {Array<EvaluationResult>}
   */
  evaluateTelemetry(telemetryRecord, customRules) {
    if (!telemetryRecord || !telemetryRecord.deviceId) {
      return [];
    }

    const targetDeviceId = telemetryRecord.deviceId.trim().toUpperCase();
    const rulesToEvaluate = customRules || ruleService.getAll({ status: 'active', enabled: true });

    const relevantRules = rulesToEvaluate.filter((r) => {
      if (r.enabled === false || (r.status && r.status !== 'active')) {
        return false;
      }
      const rDev = (r.deviceId || '').trim().toUpperCase();
      return rDev === '*' || rDev === targetDeviceId;
    });

    const results = [];
    for (const rule of relevantRules) {
      const evalRes = this.evaluateRule(rule, telemetryRecord);
      if (evalRes.matched && rule) {
        rule.lastTriggeredAt = evalRes.evaluatedAt;
        this._recordAlert(evalRes);
        this.emit('alert', evalRes);
      }
      results.push(evalRes);
    }

    return results;
  }

  /**
   * Retrieves recorded alert history with optional filters.
   *
   * @param {object} [filter]
   * @param {string} [filter.deviceId]
   * @param {string} [filter.ruleId]
   * @param {string} [filter.severity]
   * @param {number} [filter.limit=50]
   * @returns {Array<EvaluationResult>}
   */
  getAlerts(filter = {}) {
    let result = [...this.alerts];

    if (filter.deviceId) {
      const dev = filter.deviceId.trim().toUpperCase();
      result = result.filter((a) => a.deviceId.toUpperCase() === dev);
    }

    if (filter.ruleId) {
      const rId = filter.ruleId.trim().toUpperCase();
      result = result.filter((a) => a.ruleId.toUpperCase() === rId);
    }

    if (filter.severity) {
      const sev = filter.severity.trim().toLowerCase();
      result = result.filter((a) => a.action?.severity?.toLowerCase() === sev);
    }

    const limit = filter.limit ? Math.min(Math.max(1, Number(filter.limit)), 1000) : 50;
    return result.slice(0, limit);
  }

  /**
   * Clears the in-memory alerts ring buffer and resets counters.
   */
  clearAlerts() {
    this.alerts = [];
    this.stats = {
      totalEvaluations: 0,
      totalMatches: 0,
      totalNonMatches: 0,
      totalAlertsEmitted: 0,
    };
  }

  /**
   * Alias for clearAlerts to reset service state in tests.
   */
  reset() {
    this.clearAlerts();
  }

  /**
   * Returns engine operational stats.
   */
  getStats() {
    return {
      ...this.stats,
      activeRulesCount: ruleService.getAll({ status: 'active', enabled: true }).length,
      alertsInBuffer: this.alerts.length,
    };
  }
}

/**
 * Singleton instance of RuleEvaluationService.
 */
export const ruleEvaluationService = new RuleEvaluationService();
export default ruleEvaluationService;
