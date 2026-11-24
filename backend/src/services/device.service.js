import { EventEmitter } from 'node:events';
import { AppError } from '../utils/AppError.js';

/**
 * Default demo devices matching the NexusFlow presentation (Slide 08 & Slide 12).
 */
const DEFAULT_DEMO_DEVICES = [
  {
    deviceId: 'TURBINE_001',
    id: 'TURBINE_001',
    name: 'Turbine 01',
    type: 'Temperature',
    unit: '°C',
    status: 'online',
    lastValue: 78,
    location: 'Turbine Hall A',
    description: 'Main steam turbine generator unit 1',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    deviceId: 'MOTOR_002',
    id: 'MOTOR_002',
    name: 'Motor 02',
    type: 'Vibration',
    unit: 'mm/s',
    status: 'online',
    lastValue: 2.1,
    location: 'Pump Station B',
    description: 'Centrifugal pump drive motor',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    deviceId: 'PUMP_003',
    id: 'PUMP_003',
    name: 'Pump 03',
    type: 'Pressure',
    unit: 'bar',
    status: 'offline',
    lastValue: null,
    location: 'Cooling Water Loop',
    description: 'Auxiliary cooling pump',
    lastSeen: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    deviceId: 'BOILER_004',
    id: 'BOILER_004',
    name: 'Boiler 04',
    type: 'Temperature',
    unit: '°C',
    status: 'online',
    lastValue: 71,
    location: 'Boiler House 2',
    description: 'High pressure steam boiler',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class DeviceService extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} deviceId -> device record */
    this.devices = new Map();
    this.resetToDefaults();
  }

  /**
   * Resets device registry to default demo devices.
   */
  resetToDefaults() {
    this.devices.clear();
    for (const dev of DEFAULT_DEMO_DEVICES) {
      const id = dev.deviceId.toUpperCase();
      this.devices.set(id, {
        ...dev,
        id,
        deviceId: id,
      });
    }
  }

  /**
   * Retrieves all devices with optional filtering and search.
   * @param {object} [filter]
   * @param {string} [filter.status] 'online' | 'offline'
   * @param {string} [filter.type] e.g. 'Temperature', 'Pressure', etc.
   * @param {string} [filter.search] search term matching deviceId or name
   */
  getAll(filter = {}) {
    let result = Array.from(this.devices.values());

    if (filter.status) {
      const targetStatus = filter.status.toLowerCase();
      result = result.filter((d) => d.status.toLowerCase() === targetStatus);
    }

    if (filter.type) {
      const targetType = filter.type.toLowerCase();
      result = result.filter((d) => d.type.toLowerCase() === targetType);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.deviceId.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.location && d.location.toLowerCase().includes(q))
      );
    }

    return result;
  }

  /**
   * Get a single device by its deviceId.
   * @param {string} deviceId
   */
  getById(deviceId) {
    if (!deviceId) return null;
    return this.devices.get(deviceId.toUpperCase().trim()) || null;
  }

  /**
   * Registers a new device in the system.
   * @param {object} deviceData
   */
  create(deviceData) {
    const rawId = deviceData.deviceId ?? deviceData.device_id ?? deviceData.id;
    const normalizedId = rawId ? rawId.toString().toUpperCase().trim() : '';

    if (!normalizedId) {
      throw new AppError('deviceId is required', 400);
    }

    if (this.devices.has(normalizedId)) {
      throw new AppError(`Device with ID "${normalizedId}" already exists`, 409);
    }

    const type = deviceData.type ? deviceData.type.trim() : 'General';
    const unit =
      deviceData.unit !== undefined && deviceData.unit !== null && deviceData.unit !== ''
        ? deviceData.unit.trim()
        : inferUnit(type);

    const now = new Date().toISOString();
    const newDevice = {
      deviceId: normalizedId,
      id: normalizedId,
      name: deviceData.name && deviceData.name.trim() ? deviceData.name.trim() : normalizedId,
      type,
      unit,
      status: deviceData.status ? deviceData.status.toLowerCase().trim() : 'offline',
      lastValue: deviceData.lastValue !== undefined ? deviceData.lastValue : null,
      location: deviceData.location ? deviceData.location.trim() : '',
      description: deviceData.description ? deviceData.description.trim() : '',
      metadata: deviceData.metadata || {},
      lastSeen: null,
      createdAt: now,
      updatedAt: now,
    };

    this.devices.set(normalizedId, newDevice);
    this.emit('deviceCreated', newDevice);
    return newDevice;
  }

  /**
   * Updates an existing device's metadata or status.
   * @param {string} deviceId
   * @param {object} updateData
   */
  update(deviceId, updateData) {
    const existing = this.getById(deviceId);
    if (!existing) {
      return null;
    }

    const type = updateData.type !== undefined ? updateData.type.trim() : existing.type;
    const unit = updateData.unit !== undefined ? updateData.unit.trim() : existing.unit;

    const updated = {
      ...existing,
      id: existing.deviceId,
      name: updateData.name !== undefined ? updateData.name.trim() : existing.name,
      type,
      unit,
      status: updateData.status !== undefined ? updateData.status.toLowerCase().trim() : existing.status,
      location: updateData.location !== undefined ? updateData.location.trim() : existing.location,
      description:
        updateData.description !== undefined
          ? updateData.description.trim()
          : existing.description,
      metadata: updateData.metadata !== undefined ? updateData.metadata : existing.metadata,
      updatedAt: new Date().toISOString(),
    };

    this.devices.set(existing.deviceId, updated);
    this.emit('deviceUpdated', updated);
    return updated;
  }

  /**
   * Deletes a device by its deviceId.
   * @param {string} deviceId
   */
  delete(deviceId) {
    const existing = this.getById(deviceId);
    if (!existing) {
      return false;
    }

    this.devices.delete(existing.deviceId);
    this.emit('deviceDeleted', existing);
    return true;
  }

  /**
   * Hook called when telemetry is received for a device.
   * Updates device status to 'online', sets lastSeen, and updates lastValue.
   * If the device is not registered, auto-registers it so telemetry is never lost.
   * @param {object} telemetryRecord
   */
  recordTelemetry(telemetryRecord) {
    if (!telemetryRecord || !telemetryRecord.deviceId) {
      return null;
    }

    const normalizedId = telemetryRecord.deviceId.toUpperCase().trim();
    let device = this.devices.get(normalizedId);

    // Pick a primary metric value to surface as lastValue (e.g., temperature, pressure, vibration)
    let primaryMetricValue = null;
    const metrics = telemetryRecord.metrics || {};
    const metricKeys = Object.keys(metrics);

    if (metricKeys.length > 0) {
      // Prefer temperature, vibration, pressure if present, else first metric
      const preferred = metricKeys.find((k) =>
        ['temperature', 'temp', 'vibration', 'pressure'].includes(k.toLowerCase())
      );
      primaryMetricValue = metrics[preferred || metricKeys[0]];
    }

    const timestamp = telemetryRecord.receivedAt || new Date().toISOString();

    if (!device) {
      // Auto-register discovered device
      const inferredType = metricKeys.length > 0 ? capitalize(metricKeys[0]) : 'Sensor';
      device = {
        deviceId: normalizedId,
        id: normalizedId,
        name: normalizedId,
        type: inferredType,
        unit: inferUnit(inferredType),
        status: 'online',
        lastValue: primaryMetricValue,
        lastMetrics: metrics,
        location: 'Auto-discovered',
        description: `Device automatically registered on telemetry ingestion`,
        lastSeen: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.devices.set(normalizedId, device);
      this.emit('deviceDiscovered', device);
    } else {
      device = {
        ...device,
        id: device.deviceId,
        status: 'online',
        lastValue: primaryMetricValue !== null ? primaryMetricValue : device.lastValue,
        lastMetrics: metrics,
        lastSeen: timestamp,
        updatedAt: timestamp,
      };
      this.devices.set(normalizedId, device);
      this.emit('deviceTelemetryUpdated', device);
    }

    return device;
  }

  /**
   * Returns operational statistics for the device registry.
   */
  getStats() {
    const all = Array.from(this.devices.values());
    const online = all.filter((d) => d.status === 'online').length;
    const offline = all.filter((d) => d.status === 'offline').length;

    const byType = {};
    for (const d of all) {
      byType[d.type] = (byType[d.type] || 0) + 1;
    }

    return {
      totalDevices: all.length,
      devicesOnline: online,
      devicesOffline: offline,
      byType,
    };
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function inferUnit(type) {
  const t = type.toLowerCase();
  if (t.includes('temp')) return '°C';
  if (t.includes('pressure')) return 'bar';
  if (t.includes('vibration')) return 'mm/s';
  if (t.includes('humidity')) return '%';
  return '';
}

export const deviceService = new DeviceService();
export { DeviceService };
