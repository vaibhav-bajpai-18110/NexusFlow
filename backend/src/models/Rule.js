import mongoose from 'mongoose';
import { RuleSchemaDefinition } from './rule.model.js';

/**
 * Mongoose Rule Model Schema.
 * Coordinates with Rule schema specification for MongoDB persistence.
 */
const ruleSchema = new mongoose.Schema(RuleSchemaDefinition, {
  timestamps: true,
  collection: 'rules',
});

ruleSchema.index({ deviceId: 1, status: 1 });

const Rule = mongoose.models.Rule || mongoose.model('Rule', ruleSchema);

export default Rule;
