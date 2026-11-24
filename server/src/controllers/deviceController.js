
const deviceService = require("../services/deviceService");

async function createDevice(req, res) {
  try {
    const device = await deviceService.createDevice(req.body);

    return res.status(201).json({
      success: true,
      message: "Device created successfully",
      data: device
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
}

async function getAllDevices(req, res) {
  try {
    const devices = await deviceService.getAllDevices();

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function getDeviceById(req, res) {
  try {
    const device = await deviceService.getDeviceById(req.params.deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function getDevicesByType(req, res) {
  try {
    const devices = await deviceService.findDevicesByType(req.params.deviceType);

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  createDevice,
  getAllDevices,
  getDevices: getAllDevices,
  getDeviceById,
  getDevicesByType
};
