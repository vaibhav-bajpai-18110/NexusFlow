import { EventEmitter } from 'node:events';
import { env } from '../config/env.js';
import { deviceService } from './device.service.js';
import { ruleService } from './rule.service.js';
import { ruleEvaluationService } from './ruleEvaluation.service.js';

class TelemetryService extends EventEmitter {
  constructor(maxHistory = env?.maxTelemetryBuffer || 1000) {
    super();
    this.maxHistory = maxHistory;
    /** @type {Array<object>} Ring buffer of recent telemetry */
    this.history = [];
    /** @type {Map<string, object>} Latest telemetry per device */
    this.latestByDevice = new Map();
    /** Total events ingested in this process session */
    this.totalEventsReceived = 0;
  }

  /**
   * Ingests a single validated telemetry event.
   * @param {object} event
   * @returns {object} The ingested record
   */
  ingest(event) {
    const metrics = { ...(event.metrics || {}) };
    for (const [k, v] of Object.entries(event)) {
      if (typeof v === 'number' && Number.isFinite(v) && k !== 'timestamp' && k !== 'value') {
        metrics[k] = v;
      }
    }
    if (event.metric && event.value !== undefined && typeof event.metric === 'string') {
      metrics[event.metric] = Number(event.value);
    }

    const record = {
      ...event,
      metrics,
      ...metrics,
      ingestedAt: new Date().toISOString(),
    };

    // Update ring buffer
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Update device registry cache
    this.latestByDevice.set(record.deviceId, {
      deviceId: record.deviceId,
      status: 'online',
      lastSeen: record.receivedAt || record.ingestedAt,
      lastTimestamp: record.timestamp,
      metrics: record.metrics,
      ...record.metrics,
    });

    this.totalEventsReceived += 1;

    // Update device registry service state
    try {
      deviceService.recordTelemetry(record);
    } catch (err) {
      console.error('[TelemetryService] Failed to update device registry for record:', err);
    }

    // Evaluate active rules against incoming telemetry record
    try {
      ruleService.evaluateAll(record);
    } catch (err) {
      console.error('[TelemetryService] Failed to evaluate rules for record:', err);
    }

    // Process telemetry through RxJS reactive rule evaluation engine
    try {
      ruleEvaluationService.processTelemetry(record);
    } catch (err) {
      console.error('[TelemetryService] Failed to process telemetry in RxJS engine:', err);
    }

    // Emit event for real-time subscribers (RxJS rule engine, WebSockets)
    this.emit('telemetry', record);

    return record;
  }

  /**
   * Ingests an array of validated telemetry events.
   * @param {Array<object>} events
   * @returns {Array<object>} Ingested records
   */
  ingestBatch(events) {
    return events.map((event) => this.ingest(event));
  }

  /**
   * Returns latest telemetry for a specific device, or all devices.
   * @param {string} [deviceId]
   */
  getLatest(deviceId) {
    if (deviceId) {
      return this.latestByDevice.get(deviceId) || null;
    }
    return Array.from(this.latestByDevice.values());
  }

  /**
   * Returns recent telemetry history with optional filters and pagination.
   * Supports: deviceId, startDate/from, endDate/to, metric, sort, limit, page.
   * @param {object} [options]
   * @param {string} [options.deviceId]
   * @param {string} [options.startDate]
   * @param {string} [options.endDate]
   * @param {string} [options.metric]
   * @param {string} [options.sort='desc']
   * @param {number} [options.limit=50]
   * @param {number} [options.page=1]
   */
  getHistory(options = {}) {
    const {
      deviceId,
      startDate,
      endDate,
      metric,
      sort = 'desc',
      limit = 50,
      page = 1,
    } = options;

    const effectiveLimit = Math.min(Math.max(1, Number(limit) || 50), this.maxHistory);
    const effectivePage = Math.max(1, Number(page) || 1);

    let list = [...this.history];

    if (deviceId) {
      const targetId = deviceId.toUpperCase().trim();
      list = list.filter((r) => r.deviceId.toUpperCase().trim() === targetId);
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      list = list.filter((r) => new Date(r.timestamp).getTime() >= startMs);
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime();
      list = list.filter((r) => new Date(r.timestamp).getTime() <= endMs);
    }

    if (metric) {
      const m = metric.trim();
      list = list.filter(
        (r) =>
          (r.metrics && r.metrics[m] !== undefined) ||
          r[m] !== undefined
      );
    }

    if (sort === 'asc') {
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else {
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    const total = list.length;
    const startIndex = (effectivePage - 1) * effectiveLimit;
    const paginatedRecords = list.slice(startIndex, startIndex + effectiveLimit);

    return {
      total,
      page: effectivePage,
      limit: effectiveLimit,
      totalPages: Math.ceil(total / effectiveLimit) || 1,
      records: paginatedRecords,
    };
  }

  /**
   * Returns operational telemetry statistics.
   */
  getStats() {
    return {
      totalEventsReceived: this.totalEventsReceived,
      activeDevicesCount: this.latestByDevice.size,
      bufferedHistoryCount: this.history.length,
    };
  }

  /**
   * Clears in-memory history and device map (primarily for unit tests).
   */
  clear() {
    this.history = [];
    this.latestByDevice.clear();
    this.totalEventsReceived = 0;
  }
}

export const telemetryService = new TelemetryService();
export { TelemetryService };
