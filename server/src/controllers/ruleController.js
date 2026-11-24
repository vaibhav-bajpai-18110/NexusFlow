const controller = require("../../../backend/src/controllers/rule.controller.js");

exports.createRule = controller.createRule;
exports.getRules = controller.getRules;
exports.getRule = controller.getRule;
exports.updateRule = controller.updateRule;
exports.deleteRule = controller.deleteRule;
exports.testRule = controller.testRule;
exports.getRuleAlerts = controller.getRuleAlerts;
exports.evaluateTelemetryRules = controller.evaluateTelemetryRules;
