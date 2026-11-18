import Device from '../models/Device.js';
import Telemetry from '../models/Telemetry.js';
import { deviceService } from './device.service.js';
import { telemetryService } from './telemetry.service.js';

const pendingWrites = new Set();
const writeErrors = [];

function scheduleWrite(operation) {
  const task = Promise.resolve().then(operation);
  pendingWrites.add(task);

  task.catch((error) => {
    writeErrors.push(error);
  }).finally(() => {
    pendingWrites.delete(task);
  });
}

export async function flushPersistence() {
  while (pendingWrites.size > 0) {
    await Promise.allSettled([...pendingWrites]);
  }

  if (writeErrors.length > 0) {
    const error = writeErrors.shift();
    throw error;
  }
}

function toDeviceRecord(doc) {
  return {
    deviceId: doc.deviceId,
    name: doc.name,
    type: doc.deviceType || 'Unknown',
    unit: doc.unit || '',
    status: doc.status || 'unknown',
    location: doc.location?.label || '',
    description: doc.description || '',
    metadata: doc.metadata || {},
    lastValue: doc.lastValue ?? null,
    lastMetrics: doc.lastMetrics || {},
    lastSeen: doc.lastSeen ? new Date(doc.lastSeen).toISOString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toDeviceDocument(record) {
  return {
    deviceId: record.deviceId,
    name: record.name || record.deviceId,
    deviceType: record.type || 'Unknown',
    unit: record.unit || '',
    status: record.status || 'unknown',
    location: {
      label: typeof record.location === 'string'
        ? record.location
        : record.location?.label || '',
    },
    description: record.description || '',
    lastValue: record.lastValue ?? null,
    lastMetrics: record.lastMetrics || {},
    lastSeen: record.lastSeen ? new Date(record.lastSeen) : null,
    metadata: record.metadata || {},
  };
}

export async function initializePersistence() {
  const savedDevices = await Device.find().lean();
  const savedIds = new Set();

  for (const doc of savedDevices) {
    const record = toDeviceRecord(doc);
    const key = record.deviceId.toUpperCase();

    deviceService.devices.set(key, record);
    savedIds.add(key);
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

  // Save default demo devices only when they are not already in MongoDB.
  for (const record of deviceService.devices.values()) {
    if (!savedIds.has(record.deviceId.toUpperCase())) {
      saveDevice(record);
    }
  }

  const savedTelemetry = await Telemetry.find()
    .sort({ timestamp: -1 })
    .limit(telemetryService.maxHistory)
    .lean();

  telemetryService.history = savedTelemetry.reverse().map((doc) => ({
    deviceId: doc.deviceId,
    timestamp: new Date(doc.timestamp).toISOString(),
    metrics: doc.metrics || {},
    receivedAt: doc.receivedAt
      ? new Date(doc.receivedAt).toISOString()
      : null,
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

  telemetryService.on('telemetry', (record) => {
    scheduleWrite(() =>
      Telemetry.create({
        deviceId: record.deviceId,
        timestamp: new Date(record.timestamp),
        metrics: record.metrics || {},
        receivedAt: new Date(record.receivedAt || record.ingestedAt),
        metadata: record.metadata || {},
      })
    );
  });

  await flushPersistence();

  console.log(
    `[Persistence] Restored ${savedDevices.length} devices and ${savedTelemetry.length} telemetry records`
  );
}
