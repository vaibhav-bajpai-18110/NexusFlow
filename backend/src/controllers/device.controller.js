import { deviceService } from '../services/device.service.js';
import { flushPersistence } from '../services/persistence.service.js';
import { AppError } from '../utils/AppError.js';

export function getDevices(req, res) {
  const { status, type, search, q } = req.query;
  const devices = deviceService.getAll({ status, type, search: search || q });

  return res.status(200).json({
    success: true,
    status: 'ok',
    count: devices.length,
    data: devices,
  });
}

export function getDevice(req, res, next) {
  const device = deviceService.getById(req.params.id);

  if (!device) {
    return next(new AppError(`Device with ID "${req.params.id}" not found`, 404));
  }

  return res.status(200).json({ success: true, status: 'ok', data: device });
}

export async function createDevice(req, res, next) {
  try {
    const device = deviceService.create(req.body);
    await flushPersistence();

    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'Device registered successfully',
      data: device,
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return next(new AppError(err.message, 409));
    }
    return next(err);
  }
}

export async function updateDevice(req, res, next) {
  try {
    const updated = deviceService.update(req.params.id, req.body);

    if (!updated) {
      return next(new AppError(`Device with ID "${req.params.id}" not found`, 404));
    }

    await flushPersistence();

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

export async function deleteDevice(req, res, next) {
  try {
    const deleted = deviceService.delete(req.params.id);

    if (!deleted) {
      return next(new AppError(`Device with ID "${req.params.id}" not found`, 404));
    }

    await flushPersistence();

    return res.status(200).json({
      success: true,
      status: 'success',
      message: `Device "${req.params.id}" deleted successfully`,
    });
  } catch (err) {
    return next(err);
  }
}

export function getDeviceStats(_req, res) {
  return res.status(200).json({
    success: true,
    status: 'ok',
    data: deviceService.getStats(),
  });
}
