import { EventEmitter } from 'node:events';
import { env } from '../config/env.js';
import { deviceService } from './device.service.js';

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
    const record = {
      ...event,
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
   * Returns recent telemetry history with optional filters.
   * @param {object} [options]
   * @param {string} [options.deviceId]
   * @param {number} [options.limit=50]
   */
  getHistory(options = {}) {
    const { deviceId, limit = 50 } = options;
    const effectiveLimit = Math.min(Math.max(1, Number(limit) || 50), this.maxHistory);

    let list = this.history;
    if (deviceId) {
      list = list.filter((r) => r.deviceId.toLowerCase() === deviceId.toLowerCase());
    }

    return list.slice(-effectiveLimit).reverse();
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
