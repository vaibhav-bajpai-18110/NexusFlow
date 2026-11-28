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
export function toDeviceRecord(doc) {
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

export function toDeviceDocument(record) {
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

/**
 * Saves/registers a device record to MongoDB and syncs in-memory registry.
 * Fallback to in-memory deviceService if database is not connected.
 * @param {object} deviceData
 * @returns {Promise<object>}
 */
export async function saveDevice(deviceData) {
  const rawId = deviceData.deviceId ?? deviceData.device_id ?? deviceData.id;
  const normalizedId = rawId ? rawId.toString().toUpperCase().trim() : '';

  if (!normalizedId) {
    throw new Error('deviceId is required');
  }

  if (isDatabaseConnected()) {
    const existing = await Device.findOne({ deviceId: normalizedId }).lean();
    if (existing) {
      const err = new Error(`Device with ID "${normalizedId}" already exists`);
      err.statusCode = 409;
      throw err;
    }

    const docData = toDeviceDocument({
      ...deviceData,
      deviceId: normalizedId,
    });

    const created = await Device.create(docData);
    const record = toDeviceRecord(created);
    deviceService.devices.set(normalizedId, record);
    deviceService.emit('deviceCreated', record);
    return record;
  }

  return deviceService.create(deviceData);
}

/**
 * Retrieves a device by its deviceId from MongoDB or in-memory registry.
 * @param {string} deviceId
 * @returns {Promise<object|null>}
 */
export async function getDeviceById(deviceId) {
  if (!deviceId) return null;
  const normalizedId = deviceId.toString().toUpperCase().trim();

  if (isDatabaseConnected()) {
    const doc = await Device.findOne({ deviceId: normalizedId }).lean();
    if (doc) {
      const record = toDeviceRecord(doc);
      deviceService.devices.set(normalizedId, record);
      return record;
    }
    return null;
  }

  return deviceService.getById(normalizedId);
}

/**
 * Retrieves all devices matching optional filters from MongoDB or in-memory registry.
 * @param {object} [filter]
 * @returns {Promise<Array<object>>}
 */
export async function getAllDevices(filter = {}) {
  if (isDatabaseConnected()) {
    const query = {};
    if (filter.status) {
      query.status = filter.status.toLowerCase().trim();
    }
    if (filter.type) {
      query.deviceType = new RegExp(`^${filter.type.trim()}$`, 'i');
    }
    if (filter.search) {
      const q = filter.search.trim();
      query.$or = [
        { deviceId: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
        { location: new RegExp(q, 'i') },
      ];
    }

    const docs = await Device.find(query).sort({ deviceId: 1 }).lean();
    const records = docs.map(toDeviceRecord);
    for (const r of records) {
      deviceService.devices.set(r.deviceId.toUpperCase(), r);
    }
    return records;
  }

  return deviceService.getAll(filter);
}

/**
 * Updates a device in MongoDB and syncs in-memory registry.
 * @param {string} deviceId
 * @param {object} updateData
 * @returns {Promise<object|null>}
 */
export async function updateDeviceInDB(deviceId, updateData) {
  if (!deviceId) return null;
  const normalizedId = deviceId.toString().toUpperCase().trim();

  if (isDatabaseConnected()) {
    const updatePayload = {};
    if (updateData.name !== undefined) updatePayload.name = updateData.name.trim();
    if (updateData.type !== undefined) updatePayload.deviceType = updateData.type.trim();
    if (updateData.unit !== undefined) updatePayload.unit = updateData.unit.trim();
    if (updateData.status !== undefined) updatePayload.status = updateData.status.toLowerCase().trim();
    if (updateData.location !== undefined) updatePayload.location = updateData.location;
    if (updateData.description !== undefined) updatePayload.description = updateData.description.trim();
    if (updateData.metadata !== undefined) updatePayload.metadata = updateData.metadata;

    const doc = await Device.findOneAndUpdate(
      { deviceId: normalizedId },
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      return null;
    }

    const record = toDeviceRecord(doc);
    deviceService.devices.set(normalizedId, record);
    deviceService.emit('deviceUpdated', record);
    return record;
  }

  return deviceService.update(deviceId, updateData);
}

/**
 * Deletes a device from MongoDB and syncs in-memory registry.
 * @param {string} deviceId
 * @returns {Promise<boolean>}
 */
export async function deleteDeviceFromDB(deviceId) {
  if (!deviceId) return false;
  const normalizedId = deviceId.toString().toUpperCase().trim();

  if (isDatabaseConnected()) {
    const result = await Device.deleteOne({ deviceId: normalizedId });
    if (result.deletedCount > 0) {
      const existing = deviceService.devices.get(normalizedId);
      deviceService.devices.delete(normalizedId);
      if (existing) {
        deviceService.emit('deviceDeleted', existing);
      }
      return true;
    }
    return false;
  }

  return deviceService.delete(deviceId);
}
