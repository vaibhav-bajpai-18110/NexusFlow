const controller = require("../../../backend/src/controllers/telemetry.controller.js");

exports.ingestTelemetry = controller.ingestTelemetry;
exports.getTelemetry = controller.getTelemetry;
exports.getLatestTelemetry = controller.getLatestTelemetry;
exports.getTelemetryHistory = controller.getTelemetryHistory;
exports.getTelemetryStats = controller.getTelemetryStats;
