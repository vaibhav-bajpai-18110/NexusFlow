import { ruleService } from '../services/rule.service.js';
import { ruleEvaluationService } from '../services/ruleEvaluation.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * Create a new rule.
 * POST /api/rules
 */
export function createRule(req, res, next) {
  try {
    const rule = ruleService.create(req.body);
    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'Rule created successfully',
      data: rule,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieve all rules with optional filtering.
 * GET /api/rules
 * Query: ?deviceId=...&status=active|disabled&metric=...&severity=...&enabled=true
 */
export function getRules(req, res) {
  const { deviceId, status, metric, severity, enabled, search, q } = req.query;
  const rules = ruleService.getAll({
    deviceId,
    status,
    metric,
    severity,
    enabled,
    search: search || q,
  });

  return res.status(200).json({
    success: true,
    status: 'ok',
    count: rules.length,
    data: rules,
  });
}

/**
 * Retrieve single rule by ID.
 * GET /api/rules/:id
 */
export function getRule(req, res, next) {
  const { id } = req.params;
  const rule = ruleService.getById(id);

  if (!rule) {
    return next(new AppError(`Rule with ID "${id}" not found`, 404));
  }

  return res.status(200).json({
    success: true,
    status: 'ok',
    data: rule,
  });
}

/**
 * Update an existing rule.
 * PUT /api/rules/:id or PATCH /api/rules/:id
 */
export function updateRule(req, res, next) {
  const { id } = req.params;
  const updated = ruleService.update(id, req.body);

  if (!updated) {
    return next(new AppError(`Rule with ID "${id}" not found`, 404));
  }

  return res.status(200).json({
    success: true,
    status: 'success',
    message: 'Rule updated successfully',
    data: updated,
  });
}

/**
 * Delete a rule.
 * DELETE /api/rules/:id
 */
export function deleteRule(req, res, next) {
  const { id } = req.params;
  const deleted = ruleService.delete(id);

  if (!deleted) {
    return next(new AppError(`Rule with ID "${id}" not found`, 404));
  }

  return res.status(200).json({
    success: true,
    status: 'success',
    message: `Rule "${id}" deleted successfully`,
    data: deleted,
  });
}

/**
 * Test / Dry-run a rule evaluation against telemetry sample data.
 * POST /api/rules/test or POST /api/rules/:id/test
 */
export function testRule(req, res, next) {
  const { id } = req.params;
  let rule;

  if (id) {
    rule = ruleService.getById(id);
    if (!rule) {
      return next(new AppError(`Rule with ID "${id}" not found`, 404));
    }
  } else if (req.body.rule) {
    rule = req.body.rule;
  } else {
    return next(
      new AppError('Rule definition or rule ID is required for testing', 400, [
        { field: 'rule', message: 'Provide rule object or pass rule ID in path' },
      ])
    );
  }

  const telemetryData = req.body.telemetry || req.body.data || req.body;
  const result = ruleService.evaluateRule(rule, telemetryData);

  return res.status(200).json({
    success: true,
    status: 'ok',
    message: result.triggered
      ? `Condition met: rule action "${result.action?.type}" triggered`
      : 'Condition not met',
    data: result,
  });
}

/**
 * Retrieve recent alerts emitted by the rule evaluation engine.
 * GET /api/rules/alerts
 */
export function getRuleAlerts(req, res) {
  const { deviceId, ruleId, severity, limit } = req.query;
  const alerts = ruleEvaluationService.getAlerts({
    deviceId,
    ruleId,
    severity,
    limit,
  });

  return res.status(200).json({
    success: true,
    status: 'ok',
    count: alerts.length,
    data: alerts,
    stats: ruleEvaluationService.getStats(),
  });
}

/**
 * Evaluates telemetry payload against saved rules or provided rules.
 * POST /api/rules/evaluate
 */
export function evaluateTelemetryRules(req, res, next) {
  const telemetryData = req.body.telemetry || req.body.data || req.body;
  if (!telemetryData || !telemetryData.deviceId) {
    return next(
      new AppError('Telemetry object with deviceId is required for evaluation', 400, [
        { field: 'deviceId', message: 'telemetry payload must contain a valid deviceId' },
      ])
    );
  }

  const results = ruleEvaluationService.evaluateTelemetry(
    telemetryData,
    req.body.rules
  );

  const matched = results.filter((r) => r.matched);
  const unmatched = results.filter((r) => !r.matched);

  return res.status(200).json({
    success: true,
    status: 'ok',
    totalRulesEvaluated: results.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    data: {
      matched,
      unmatched,
      all: results,
    },
  });
}
