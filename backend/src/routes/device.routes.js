import { Router } from 'express';
import {
  createDevice,
  deleteDevice,
  getDevice,
  getDevices,
  getDeviceStats,
  updateDevice,
} from '../controllers/device.controller.js';
import {
  validateCreateDevice,
  validateDeviceIdParam,
  validateUpdateDevice,
} from '../middleware/validateDevice.js';

const router = Router();

// Stats route (must be before :id to prevent capturing 'stats' as an id)
router.get('/stats', getDeviceStats);

// Device CRUD routes
router.get('/', getDevices);
router.get('/:id', validateDeviceIdParam, getDevice);
router.post('/', validateCreateDevice, createDevice);
router.put('/:id', validateDeviceIdParam, validateUpdateDevice, updateDevice);
router.patch('/:id', validateDeviceIdParam, validateUpdateDevice, updateDevice);
router.delete('/:id', validateDeviceIdParam, deleteDevice);

export default router;
