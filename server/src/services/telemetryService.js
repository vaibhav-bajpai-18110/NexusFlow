
const Telemetry = require("../models/Telemetry");

// Save a new telemetry record
const saveTelemetry = async (telemetryData) => {
  const telemetry = await Telemetry.create(telemetryData);
  return telemetry;
};

// Get telemetry records for a device
const getTelemetryByDevice = async (deviceId) => {
  if (!deviceId || typeof deviceId !== "string") {
    throw new Error("A valid deviceId is required");
  }

  return Telemetry.find({ deviceId })
    .sort({ timestamp: -1 });
};

module.exports = {
  saveTelemetry,
  getTelemetryByDevice
};
