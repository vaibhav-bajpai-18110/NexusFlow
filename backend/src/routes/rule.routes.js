import { Router } from 'express';
import {
  createRule,
  deleteRule,
  getRule,
  getRules,
  testRule,
  updateRule,
} from '../controllers/rule.controller.js';
import {
  validateCreateRule,
  validateUpdateRule,
} from '../middleware/validateRule.js';

const router = Router();

// Test dry-run endpoint (placed before :id route)
router.post('/test', testRule);

// Rules CRUD routes
router.get('/', getRules);
router.get('/:id', getRule);
router.post('/', validateCreateRule, createRule);
router.put('/:id', validateUpdateRule, updateRule);
router.patch('/:id', validateUpdateRule, updateRule);
router.delete('/:id', deleteRule);

// Test specific rule by ID
router.post('/:id/test', testRule);

export default router;
