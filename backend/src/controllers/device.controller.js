import { deviceService } from '../services/device.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * List all devices with optional query filters.
 * GET /api/devices?status=online&type=Temperature&search=Turbine
 */
export function getDevices(req, res) {
  const { status, type, search, q } = req.query;
  const devices = deviceService.getAll({
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
}

/**
 * Get single device by ID.
 * GET /api/devices/:id
 */
export function getDevice(req, res, next) {
  const { id } = req.params;
  const device = deviceService.getById(id);

  if (!device) {
    return next(new AppError(`Device with ID "${id}" not found`, 404));
  }

  return res.status(200).json({
    success: true,
    status: 'ok',
    data: device,
  });
}

/**
 * Register a new device.
 * POST /api/devices
 */
export function createDevice(req, res, next) {
  try {
    const device = deviceService.create(req.body);
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
export function updateDevice(req, res, next) {
  const { id } = req.params;
  const updated = deviceService.update(id, req.body);

  if (!updated) {
    return next(new AppError(`Device with ID "${id}" not found`, 404));
  }

  return res.status(200).json({
    success: true,
    status: 'success',
    message: 'Device updated successfully',
    data: updated,
  });
}

/**
 * Delete a device.
 * DELETE /api/devices/:id
 */
export function deleteDevice(req, res, next) {
  const { id } = req.params;
  const deleted = deviceService.delete(id);

  if (!deleted) {
    return next(new AppError(`Device with ID "${id}" not found`, 404));
  }

  return res.status(200).json({
    success: true,
    status: 'success',
    message: `Device "${id}" deleted successfully`,
  });
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
