import mongoose from 'mongoose';
import Device from '../models/Device.js';
import Rule from '../models/Rule.js';
import Telemetry from '../models/Telemetry.js';
import { deviceService } from './device.service.js';
import { ruleService } from './rule.service.js';
import { telemetryService } from './telemetry.service.js';

const pendingWrites = new Set();
const writeErrors = [];

/**
 * Schedules an asynchronous database write operation without blocking caller.
 * @param {Function} operation
 */
function scheduleWrite(operation) {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const task = Promise.resolve()
    .then(operation)
    .catch((error) => {
      console.error('[Persistence] Async write error:', error.message);
      writeErrors.push(error);
    })
    .finally(() => {
      pendingWrites.delete(task);
    });

  pendingWrites.add(task);
}

/**
 * Flushes all pending database write operations.
 * @returns {Promise<void>}
 */
export async function flushPersistence() {
  while (pendingWrites.size > 0) {
    await Promise.allSettled([...pendingWrites]);
  }

  if (writeErrors.length > 0) {
    const error = writeErrors.shift();
    throw error;
  }
}

/**
 * Converts a Mongoose Device document into a clean API record.
 * @param {object} doc
 */
function toDeviceRecord(doc) {
  return {
    deviceId: doc.deviceId,
    id: doc.deviceId,
    name: doc.name,
    type: doc.deviceType || doc.type || 'General',
    unit: doc.unit || '',
    status: doc.status || 'offline',
    location: typeof doc.location === 'string' ? doc.location : doc.location?.label || '',
    description: doc.description || '',
    metadata: doc.metadata || {},
    lastValue: doc.lastValue ?? null,
    lastMetrics: doc.lastMetrics || {},
    lastSeen: doc.lastSeen ? new Date(doc.lastSeen).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Converts a Device record into a MongoDB document structure.
 * @param {object} record
 */
function toDeviceDocument(record) {
  return {
    deviceId: record.deviceId,
    name: record.name || record.deviceId,
    deviceType: record.type || 'General',
    unit: record.unit || '',
    status: record.status || 'offline',
    location: record.location || '',
    description: record.description || '',
    lastValue: record.lastValue ?? null,
    lastMetrics: record.lastMetrics || {},
    lastSeen: record.lastSeen ? new Date(record.lastSeen) : null,
    metadata: record.metadata || {},
  };
}

/**
 * Initializes database persistence layer, synchronizing in-memory registries
 * with MongoDB (coordinating with Manya's database layer).
 */
export async function initializePersistence() {
  if (mongoose.connection.readyState !== 1) {
    console.log('[Persistence] MongoDB not connected; running in in-memory mode.');
    return;
  }

  // 1. Synchronize Devices
  const savedDevices = await Device.find().lean();
  const savedDeviceIds = new Set();

  for (const doc of savedDevices) {
    const record = toDeviceRecord(doc);
    const key = record.deviceId.toUpperCase();
    deviceService.devices.set(key, record);
    savedDeviceIds.add(key);
  }

  const saveDevice = (record) => {
    scheduleWrite(() =>
      Device.findOneAndUpdate(
        { deviceId: record.deviceId },
        { $set: toDeviceDocument(record) },
        { upsert: true, runValidators: true }
      )
    );
  };

  deviceService.on('deviceCreated', saveDevice);
  deviceService.on('deviceUpdated', saveDevice);
  deviceService.on('deviceDiscovered', saveDevice);
  deviceService.on('deviceTelemetryUpdated', saveDevice);

  deviceService.on('deviceDeleted', (record) => {
    scheduleWrite(() => Device.deleteOne({ deviceId: record.deviceId }));
  });

  // Seed default demo devices in MongoDB if not already present
  for (const record of deviceService.devices.values()) {
    if (!savedDeviceIds.has(record.deviceId.toUpperCase())) {
      saveDevice(record);
    }
  }

  // 2. Synchronize Telemetry
  const savedTelemetry = await Telemetry.find()
    .sort({ timestamp: -1 })
    .limit(telemetryService.maxHistory)
    .lean();

  if (savedTelemetry.length > 0) {
    telemetryService.history = savedTelemetry.reverse().map((doc) => ({
      deviceId: doc.deviceId,
      sensorId: doc.sensorId || null,
      timestamp: new Date(doc.timestamp).toISOString(),
      metric: doc.metric || null,
      value: doc.value ?? null,
      unit: doc.unit || '',
      metrics:
        doc.metrics && Object.keys(doc.metrics).length > 0
          ? doc.metrics
          : doc.metric && doc.value !== null
            ? { [doc.metric]: doc.value }
            : {},
      receivedAt: doc.receivedAt
        ? new Date(doc.receivedAt).toISOString()
        : new Date(doc.timestamp).toISOString(),
      ingestedAt: doc.receivedAt
        ? new Date(doc.receivedAt).toISOString()
        : new Date(doc.timestamp).toISOString(),
      metadata: doc.metadata || {},
    }));

    telemetryService.latestByDevice.clear();
    for (const record of telemetryService.history) {
      telemetryService.latestByDevice.set(record.deviceId, {
        deviceId: record.deviceId,
        status: 'online',
        lastSeen: record.receivedAt || record.ingestedAt,
        lastTimestamp: record.timestamp,
        metrics: record.metrics,
        ...record.metrics,
      });
    }
    telemetryService.totalEventsReceived = telemetryService.history.length;
  }

  telemetryService.on('telemetry', (record) => {
    scheduleWrite(() =>
      Telemetry.create({
        deviceId: record.deviceId,
        sensorId: record.sensorId || null,
        timestamp: new Date(record.timestamp || Date.now()),
        metric:
          record.metric ||
          (record.metrics && Object.keys(record.metrics).length > 0
            ? Object.keys(record.metrics)[0]
            : null) ||
          null,
        value:
          record.value !== undefined
            ? record.value
            : record.metrics && Object.keys(record.metrics).length > 0
              ? record.metrics[Object.keys(record.metrics)[0]]
              : null,
        unit: record.unit || '',
        metrics: record.metrics || {},
        receivedAt: new Date(record.receivedAt || record.ingestedAt || Date.now()),
        metadata: record.metadata || {},
      })
    );
  });

  // 3. Synchronize Rules
  const savedRules = await Rule.find().lean();
  for (const doc of savedRules) {
    ruleService.rules.set(doc.ruleId.toUpperCase(), {
      ...doc,
      condition: { ...doc.condition },
      action: { ...doc.action },
    });
  }

  const saveRule = (rule) => {
    scheduleWrite(() =>
      Rule.findOneAndUpdate(
        { ruleId: rule.ruleId },
        { $set: rule },
        { upsert: true, runValidators: true }
      )
    );
  };

  ruleService.on('ruleCreated', saveRule);
  ruleService.on('ruleUpdated', saveRule);
  ruleService.on('ruleDeleted', (rule) => {
    scheduleWrite(() => Rule.deleteOne({ ruleId: rule.ruleId }));
  });

  await flushPersistence();

  console.log(
    `[Persistence] Successfully synchronized with MongoDB: ${savedDevices.length} devices, ${savedTelemetry.length} telemetry records, ${savedRules.length} rules.`
  );
}

/**
 * Saves a telemetry record to MongoDB (Manya's database service interface).
 * Fallback to in-memory telemetryService if database is not connected.
 * @param {object} telemetryData
 * @returns {Promise<object>}
 */
export async function saveTelemetry(telemetryData) {
  if (isDatabaseConnected()) {
    const doc = await Telemetry.create(telemetryData);
    const normalized = {
      deviceId: doc.deviceId,
      sensorId: doc.sensorId || null,
      timestamp: new Date(doc.timestamp).toISOString(),
      metric: doc.metric || null,
      value: doc.value ?? null,
      unit: doc.unit || '',
      metrics:
        doc.metrics && Object.keys(doc.metrics).length > 0
          ? doc.metrics
          : doc.metric && doc.value !== null
            ? { [doc.metric]: doc.value }
            : {},
      receivedAt: doc.receivedAt
        ? new Date(doc.receivedAt).toISOString()
        : new Date().toISOString(),
      metadata: doc.metadata || {},
    };
    telemetryService.ingest(normalized);
    return doc;
  }
  return telemetryService.ingest(telemetryData);
}

/**
 * Retrieves telemetry records for a device from MongoDB (Manya's database service interface).
 * Fallback to in-memory telemetryService if database is not connected.
 * @param {string} deviceId
 * @returns {Promise<Array<object>>}
 */
export async function getTelemetryByDevice(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('A valid deviceId is required');
  }

  if (isDatabaseConnected()) {
    return await Telemetry.find({ deviceId }).sort({ timestamp: -1 });
  }

  const result = telemetryService.getHistory({ deviceId, limit: 1000 });
  return result.records;
}

/**
 * Retrieves errors recorded during async persistence writes.
 * @returns {Array<Error>}
 */
export function getPersistenceErrors() {
  return [...writeErrors];
}

/**
 * Clears recorded persistence errors.
 */
export function clearPersistenceErrors() {
  writeErrors.length = 0;
}

/**
 * Checks whether MongoDB is actively connected.
 * @returns {boolean}
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
