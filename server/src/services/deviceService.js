const Device = require("../models/Device");
async function createDevice(deviceData) {
  try {
    return await Device.create(deviceData);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error("Device ID already exists");
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  }
}
async function getDeviceById(deviceId) {
  return Device.findOne({ deviceId: deviceId.trim() });
}
async function getAllDevices() {
  return Device.find({}).sort({ createdAt: -1 });
}
async function findDevicesByType(deviceType) {
  return Device.find({
    deviceType: new RegExp(`^${deviceType.trim()}$`, "i")
  });
}
module.exports = {
  createDevice,
  getDeviceById,
  getAllDevices,
  findDevicesByType
};
