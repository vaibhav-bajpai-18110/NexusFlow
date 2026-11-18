
const express = require("express");
const router = express.Router();

const {
  createDevice,
  getAllDevices,
  getDeviceById,
  getDevicesByType
} = require("../controllers/deviceController");

router.post("/", createDevice);
router.get("/", getAllDevices);
router.get("/type/:deviceType", getDevicesByType);
router.get("/:deviceId", getDeviceById);

module.exports = router;