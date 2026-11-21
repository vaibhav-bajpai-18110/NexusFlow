import { useEffect, useState } from 'react';
import { Activity, Droplets, Gauge, MapPin, Radio, RefreshCw, Thermometer } from 'lucide-react';
import { fetchDevices } from '../services/deviceApi.js';
import './TelemetryPanel.css';

function deviceIdOf(device) {
  return device?.deviceId || device?.id || '';
}

function deviceTypeOf(device) {
  return device?.type || device?.deviceType || 'Sensor';
}

function readingOf(device) {
  const value = device?.lastValue ?? device?.latestValue ?? device?.value;
  if (value && typeof value === 'object') {
    return value.value ?? value.reading ?? value.temperature ?? value.humidity ?? '—';
  }
  return value ?? '—';
}

function unitOf(device) {
  const reading = device?.lastValue ?? device?.latestValue ?? device?.value;
  return device?.unit || device?.readingUnit || (reading && typeof reading === 'object' ? reading.unit : '') || '';
}

function locationOf(device) {
  const location = device?.location;
  if (typeof location === 'string' && location.trim()) return location;
  if (location?.label) return location.label;
  if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
    return `${location.latitude}, ${location.longitude}`;
  }
  return 'Location not set';
}

function iconFor(type) {
  const normalized = type.toLowerCase();
  if (normalized.includes('temp')) return Thermometer;
  if (normalized.includes('vibr')) return Activity;
  if (normalized.includes('press')) return Gauge;
  if (normalized.includes('humid')) return Droplets;
  return Radio;
}

function statusClassFor(status) {
  return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function formatTime(value) {
  if (!value) return 'No recent update';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function TelemetrySkeleton() {
  return (
    <div className="telemetry-reading-grid" role="status" aria-label="Loading telemetry">
      {[0, 1, 2, 3].map((item) => (
        <div className="telemetry-skeleton-card" key={item}>
          <span className="telemetry-skeleton-line telemetry-skeleton-short" />
          <span className="telemetry-skeleton-line telemetry-skeleton-title" />
          <span className="telemetry-skeleton-line telemetry-skeleton-reading" />
          <span className="telemetry-skeleton-line telemetry-skeleton-footer" />
        </div>
      ))}
    </div>
  );
}

function TelemetryDeviceCard({ device }) {
  const type = deviceTypeOf(device);
  const Icon = iconFor(type);
  const deviceId = deviceIdOf(device);
  const status = String(device?.status || 'unknown');
  const latestReading = readingOf(device);
  const unit = unitOf(device);

  return (
    <article className="telemetry-device-card">
      <div className="telemetry-device-topline">
        <span className="telemetry-device-icon"><Icon size={16} aria-hidden="true" /></span>
        <span className="telemetry-device-type">{type}</span>
        <span className={`telemetry-status telemetry-status-${statusClassFor(status)}`}>
          <i aria-hidden="true" />{status}
        </span>
      </div>
      <div className="telemetry-device-identity">
        <h3>{device?.name || deviceId || 'Unnamed device'}</h3>
        <code>{deviceId || 'No device ID'}</code>
      </div>
      <div className="telemetry-reading-value">
        <span>Latest reading</span>
        <strong>{latestReading}</strong>
        {unit && <small>{unit}</small>}
      </div>
      <div className="telemetry-device-footer">
        <span className="telemetry-location"><MapPin size={12} aria-hidden="true" />{locationOf(device)}</span>
        <time dateTime={device?.lastSeen || undefined}>{formatTime(device?.lastSeen)}</time>
      </div>
    </article>
  );
}

export default function TelemetryPanel({ onOpenDevices }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchDevices({ signal: controller.signal })
      .then(setDevices)
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setDevices([]);
        setError(requestError.message || 'Telemetry could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  return (
    <section className="panel telemetry-panel" aria-labelledby="telemetry-panel-heading" aria-busy={loading}>
      <div className="panel-heading telemetry-panel-heading">
        <div>
          <div className="panel-title-row">
            <h2 id="telemetry-panel-heading">Live telemetry</h2>
            <span className="telemetry-api-badge"><i aria-hidden="true" /> API</span>
          </div>
          <p>{loading ? 'Loading device readings…' : `${devices.length} ${devices.length === 1 ? 'device' : 'devices'} · latest reported values`}</p>
        </div>
        <button
          className="telemetry-refresh"
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={loading}
          aria-label="Refresh telemetry"
          title="Refresh telemetry"
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>

      {loading ? <TelemetrySkeleton /> : error ? (
        <div className="telemetry-state telemetry-error" role="alert">
          <strong>Telemetry is unavailable</strong>
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={() => setReloadKey((current) => current + 1)}>
            Try again
          </button>
        </div>
      ) : devices.length ? (
        <>
          <div className="telemetry-reading-grid">
            {devices.map((device, index) => (
              <TelemetryDeviceCard device={device} key={deviceIdOf(device) || `${device.name || 'device'}-${index}`} />
            ))}
          </div>
          <p className="telemetry-panel-footnote">Current snapshot from the device API. Historical readings are not included in this response.</p>
        </>
      ) : (
        <div className="telemetry-state telemetry-empty">
          <span className="telemetry-empty-icon"><Radio size={19} aria-hidden="true" /></span>
          <strong>No device readings yet</strong>
          <p>Register a device to see its latest sensor reading here.</p>
          {onOpenDevices && <button className="button button-secondary" type="button" onClick={onOpenDevices}>Open devices</button>}
        </div>
      )}
    </section>
  );
}
