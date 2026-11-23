import { useMemo, useState } from 'react';
import { AlertCircle, Check, ListFilter, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import './RuleManagement.css';

const metrics = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'humidity', label: 'Humidity' },
  { value: 'pressure', label: 'Pressure' },
  { value: 'vibration', label: 'Vibration' },
  { value: 'reading', label: 'Device reading' },
];

const conditions = [
  { value: 'greater_than', label: 'Greater than (>)' },
  { value: 'greater_than_or_equal', label: 'Greater than or equal (≥)' },
  { value: 'less_than', label: 'Less than (<)' },
  { value: 'less_than_or_equal', label: 'Less than or equal (≤)' },
  { value: 'equal_to', label: 'Equal to (=)' },
];

const initialForm = { name: '', deviceId: '', metric: '', condition: 'greater_than', threshold: '' };

function idOf(device) {
  return device?.deviceId || device?.id || '';
}

function deviceIdFromRule(rule) {
  return rule?.deviceId || rule?.device?.deviceId || rule?.device?.id || '';
}

function readableCondition(condition) {
  return conditions.find((item) => item.value === condition)?.label || condition || '—';
}

function RuleCard({ rule, device }) {
  const name = rule.name || rule.ruleName || 'Unnamed rule';
  const deviceId = deviceIdFromRule(rule);
  const condition = rule.condition || rule.operator;
  const threshold = rule.threshold ?? rule.value ?? '—';
  const active = rule.enabled ?? rule.isActive ?? rule.active;

  return (
    <article className="rule-card">
      <span className="rule-card-icon"><SlidersHorizontal size={16} aria-hidden="true" /></span>
      <div className="rule-card-main">
        <div className="rule-card-title-row">
          <h3>{name}</h3>
          <span className={`rule-state${active === false ? ' rule-state-disabled' : ''}`}>
            <i aria-hidden="true" />{active === false ? 'Disabled' : active === true ? 'Active' : 'Saved'}
          </span>
        </div>
        <p>{device?.name || rule.deviceName || deviceId || 'Device'} <span>·</span> {rule.metric || 'Metric'}</p>
        <div className="rule-expression">
          <span>{readableCondition(condition)}</span>
          <strong>{threshold}{rule.unit ? ` ${rule.unit}` : ''}</strong>
        </div>
      </div>
    </article>
  );
}

export default function RuleManagement({
  devices = [],
  devicesLoading = false,
  devicesError = '',
  rules = [],
  rulesLoading = false,
  rulesError = '',
  rulesApiAvailable = false,
  onRetryRules,
  onRetryDevices,
  onCreateRule,
}) {
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const devicesById = useMemo(() => new Map(devices.map((device) => [idOf(device), device])), [devices]);

  const changeField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => current[name] ? { ...current, [name]: '' } : current);
    setSubmitError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Enter a rule name.';
    if (!form.deviceId) nextErrors.deviceId = 'Select a device.';
    if (!form.metric) nextErrors.metric = 'Select a metric.';
    if (!form.condition) nextErrors.condition = 'Select a condition.';
    if (form.threshold === '' || !Number.isFinite(Number(form.threshold))) nextErrors.threshold = 'Enter a valid threshold.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!rulesApiAvailable || !onCreateRule) {
      setSubmitError('Rule creation will be available when the backend API is connected.');
      return;
    }

    setCreating(true);
    setSubmitError('');
    setSuccessMessage('');
    try {
      await onCreateRule({ ...form, name: form.name.trim(), threshold: Number(form.threshold) });
      setForm(initialForm);
      setFieldErrors({});
      setSuccessMessage('Rule created successfully.');
    } catch (error) {
      setSubmitError(error.message || 'The rule could not be created.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="rules-management-grid" aria-label="Rules management">
      <form className="panel rule-form-panel" onSubmit={handleSubmit} noValidate aria-busy={creating}>
        <div className="rule-form-heading">
          <span className="rule-form-icon"><Plus size={17} aria-hidden="true" /></span>
          <div>
            <h2>Create a rule</h2>
            <p>Set a threshold condition for a device metric.</p>
          </div>
        </div>

        <div className={`rule-field${fieldErrors.name ? ' rule-field-invalid' : ''}`}>
          <label htmlFor="rule-name">Rule name</label>
          <input id="rule-name" name="name" value={form.name} onChange={changeField} maxLength={100} placeholder="e.g. High temperature alert" aria-invalid={Boolean(fieldErrors.name)} />
          {fieldErrors.name && <span className="rule-field-error" role="alert">{fieldErrors.name}</span>}
        </div>

        <div className={`rule-field${fieldErrors.deviceId ? ' rule-field-invalid' : ''}`}>
          <label htmlFor="rule-device">Device</label>
          <select id="rule-device" name="deviceId" value={form.deviceId} onChange={changeField} disabled={devicesLoading || devices.length === 0} aria-invalid={Boolean(fieldErrors.deviceId)}>
            <option value="">{devicesLoading ? 'Loading devices…' : devices.length ? 'Choose a device' : 'No devices available'}</option>
            {devices.map((device) => {
              const deviceId = idOf(device);
              return <option value={deviceId} key={deviceId}>{device.name || deviceId}</option>;
            })}
          </select>
          {fieldErrors.deviceId && <span className="rule-field-error" role="alert">{fieldErrors.deviceId}</span>}
          {devicesError && (
            <span className="rule-field-note rule-field-note-error">
              Device options could not be loaded: {devicesError}
              {onRetryDevices && <button className="rule-inline-retry" type="button" onClick={onRetryDevices}>Retry</button>}
            </span>
          )}
          {!devicesLoading && !devicesError && devices.length === 0 && <span className="rule-field-note">Add a device before creating a rule.</span>}
        </div>

        <div className="rule-form-row">
          <div className={`rule-field${fieldErrors.metric ? ' rule-field-invalid' : ''}`}>
            <label htmlFor="rule-metric">Metric</label>
            <select id="rule-metric" name="metric" value={form.metric} onChange={changeField} aria-invalid={Boolean(fieldErrors.metric)}>
              <option value="">Choose a metric</option>
              {metrics.map((metric) => <option value={metric.value} key={metric.value}>{metric.label}</option>)}
            </select>
            {fieldErrors.metric && <span className="rule-field-error" role="alert">{fieldErrors.metric}</span>}
          </div>
          <div className={`rule-field${fieldErrors.condition ? ' rule-field-invalid' : ''}`}>
            <label htmlFor="rule-condition">Condition</label>
            <select id="rule-condition" name="condition" value={form.condition} onChange={changeField} aria-invalid={Boolean(fieldErrors.condition)}>
              {conditions.map((condition) => <option value={condition.value} key={condition.value}>{condition.label}</option>)}
            </select>
            {fieldErrors.condition && <span className="rule-field-error" role="alert">{fieldErrors.condition}</span>}
          </div>
        </div>

        <div className={`rule-field${fieldErrors.threshold ? ' rule-field-invalid' : ''}`}>
          <label htmlFor="rule-threshold">Threshold</label>
          <input id="rule-threshold" name="threshold" type="number" step="any" value={form.threshold} onChange={changeField} placeholder="Enter a value" aria-invalid={Boolean(fieldErrors.threshold)} />
          {fieldErrors.threshold && <span className="rule-field-error" role="alert">{fieldErrors.threshold}</span>}
        </div>

        <button className="button button-primary rule-submit" type="submit" disabled={!rulesApiAvailable || creating || devicesLoading || devices.length === 0}>
          {creating ? <span className="mini-spinner" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          {creating ? 'Creating rule…' : 'Create rule'}
        </button>
        {!rulesApiAvailable && <p className="rule-api-note" role="status">Rule saving will be enabled when the backend API and credentials are available.</p>}
        {submitError && <p className="rule-submit-message rule-submit-error" role="alert"><AlertCircle size={14} />{submitError}</p>}
        {successMessage && <p className="rule-submit-message rule-submit-success" role="status"><Check size={14} />{successMessage}</p>}
      </form>

      <section className="panel rule-list-panel" aria-labelledby="rules-list-heading" aria-busy={rulesLoading}>
        <div className="panel-heading rule-list-heading">
          <div>
            <h2 id="rules-list-heading">Configured rules</h2>
            <p>{rulesLoading ? 'Fetching saved rules…' : `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'} from the API`}</p>
          </div>
          {onRetryRules && <button className="rule-refresh" type="button" onClick={onRetryRules} disabled={rulesLoading} aria-label="Refresh rules"><RefreshCw size={15} /></button>}
        </div>

        {rulesLoading ? (
          <div className="rule-list-state" role="status"><span className="large-spinner" /><strong>Loading rules</strong><p>Fetching your saved rules from NexusFlow.</p></div>
        ) : rulesError ? (
          <div className="rule-list-state rule-list-error" role="alert"><strong>Rules could not be loaded</strong><p>{rulesError}</p><button className="button button-secondary" type="button" onClick={onRetryRules}>Try again</button></div>
        ) : !rulesApiAvailable ? (
          <div className="rule-list-state rule-api-pending" role="status">
            <span className="rule-empty-icon"><ListFilter size={18} aria-hidden="true" /></span>
            <strong>Rules API connection pending</strong>
            <p>The Rules screen is ready. Saved rules will appear after the backend endpoint and credentials are connected.</p>
          </div>
        ) : rules.length ? (
          <div className="rule-list">
            {rules.map((rule, index) => {
              const ruleId = rule.ruleId || rule.id || rule._id || `${rule.name || rule.ruleName || 'rule'}-${index}`;
              return <RuleCard key={ruleId} rule={rule} device={devicesById.get(deviceIdFromRule(rule))} />;
            })}
          </div>
        ) : (
          <div className="rule-list-state rule-list-empty">
            <span className="rule-empty-icon"><ListFilter size={18} aria-hidden="true" /></span>
            <strong>No rules configured</strong>
            <p>Create your first rule to monitor a device metric against a threshold.</p>
          </div>
        )}
      </section>
    </section>
  );
}
