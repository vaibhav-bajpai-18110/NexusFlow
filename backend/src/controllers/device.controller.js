import { deviceService } from '../services/device.service.js';
import {
  deleteDeviceFromDB,
  getAllDevices,
  getDeviceById,
  saveDevice,
  updateDeviceInDB,
} from '../services/persistence.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * List all devices with optional query filters.
 * GET /api/devices?status=online&type=Temperature&search=Turbine
 */
export async function getDevices(req, res, next) {
  try {
    const { status, type, search, q } = req.query;
    const devices = await getAllDevices({
      status,
      type,
      search: search || q,
    });

    return res.status(200).json({
      success: true,
      status: 'ok',
      count: devices.length,
      data: devices,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get single device by ID.
 * GET /api/devices/:id
 */
export async function getDevice(req, res, next) {
  try {
    const { id } = req.params;
    const device = await getDeviceById(id);

    if (!device) {
      return next(new AppError(`Device with ID "${id}" not found`, 404));
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      data: device,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Register a new device.
 * POST /api/devices
 */
export async function createDevice(req, res, next) {
  try {
    const device = await saveDevice(req.body);
    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'Device registered successfully',
      data: device,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update an existing device.
 * PUT /api/devices/:id or PATCH /api/devices/:id
 */
export async function updateDevice(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await updateDeviceInDB(id, req.body);

    if (!updated) {
      return next(new AppError(`Device with ID "${id}" not found`, 404));
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      message: 'Device updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Delete a device.
 * DELETE /api/devices/:id
 */
export async function deleteDevice(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await deleteDeviceFromDB(id);

    if (!deleted) {
      return next(new AppError(`Device with ID "${id}" not found`, 404));
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      message: `Device "${id}" deleted successfully`,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get device registry statistics (online, offline, total, by type).
 * GET /api/devices/stats
 */
export function getDeviceStats(_req, res) {
  const stats = deviceService.getStats();

  return res.status(200).json({
    success: true,
    status: 'ok',
    data: stats,
  });
}
