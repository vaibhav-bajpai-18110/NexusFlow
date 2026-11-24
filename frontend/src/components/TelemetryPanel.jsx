import { useEffect, useMemo, useState } from 'react';
import { Activity, Droplets, Gauge, MapPin, Radio, RefreshCw, Thermometer } from 'lucide-react';
import { fetchDevices } from '../services/deviceApi.js';
import { fetchLatestTelemetry } from '../services/telemetryApi.js';
import TelemetryHistory from './TelemetryHistory.jsx';
import './TelemetryPanel.css';

function deviceIdOf(device) {
  return device?.deviceId || device?.id || '';
}

function deviceTypeOf(device) {
  return device?.type || device?.deviceType || 'Sensor';
}

function fallbackReadingOf(device) {
  const value = device?.lastValue ?? device?.latestValue ?? device?.latestTelemetry?.value ?? device?.value;
  if (value && typeof value === 'object') {
    return value.value ?? value.reading ?? value.temperature ?? value.humidity ?? '—';
  }
  return value ?? '—';
}

function unitOf(device) {
  const reading = device?.lastValue ?? device?.latestValue ?? device?.value;
  return device?.unit || device?.readingUnit || device?.latestTelemetry?.unit || (reading && typeof reading === 'object' ? reading.unit : '') || '';
}

function metricReadingsOf(device) {
  const metrics = device?.latestTelemetry?.metrics || device?.lastMetrics;
  if (metrics && typeof metrics === 'object' && !Array.isArray(metrics)) {
    const readings = Object.entries(metrics)
      .filter(([, value]) => value !== null && value !== undefined && Number.isFinite(Number(value)))
      .map(([metric, value]) => ({ metric, value }));
    if (readings.length) return readings;
  }

  const telemetry = device?.latestTelemetry;
  if (telemetry?.metric && telemetry.value !== null && telemetry.value !== undefined && Number.isFinite(Number(telemetry.value))) {
    return [{ metric: telemetry.metric, value: telemetry.value, unit: telemetry.unit || device?.unit || '' }];
  }

  const fallback = fallbackReadingOf(device);
  return fallback === '—' ? [] : [{ metric: 'Latest reading', value: fallback, unit: unitOf(device) }];
}

function metricLabel(value) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function TelemetryDeviceCard({ device, selected, onSelect }) {
  const type = deviceTypeOf(device);
  const Icon = iconFor(type);
  const deviceId = deviceIdOf(device);
  const status = String(device?.status || 'unknown');
  const readings = metricReadingsOf(device);
  const primaryReading = readings[0];
  const unit = primaryReading?.unit || (readings.length === 1 ? unitOf(device) : '');

  return (
    <button className={`telemetry-device-card${selected ? ' telemetry-device-card-selected' : ''}`} type="button" onClick={onSelect} aria-pressed={selected}>
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
        <span>{primaryReading ? metricLabel(primaryReading.metric) : 'Latest reading'}</span>
        <strong>{primaryReading?.value ?? '—'}</strong>
        {unit && <small>{unit}</small>}
      </div>
      {readings.length > 1 && (
        <div className="telemetry-extra-readings">
          {readings.slice(1).map((reading) => <span key={reading.metric}>{metricLabel(reading.metric)} <strong>{reading.value}</strong></span>)}
        </div>
      )}
      <div className="telemetry-device-footer">
        <span className="telemetry-location"><MapPin size={12} aria-hidden="true" />{locationOf(device)}</span>
        <time dateTime={device?.lastSeen || undefined}>{formatTime(device?.lastSeen)}</time>
      </div>
    </button>
  );
}

export default function TelemetryPanel({ onOpenDevices }) {
  const [devices, setDevices] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [telemetryError, setTelemetryError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const devicesWithLatest = useMemo(() => {
    const latestByDevice = new Map(latestTelemetry.map((record) => [String(record.deviceId || '').toUpperCase(), record]));
    return devices.map((device) => {
      const latest = latestByDevice.get(String(deviceIdOf(device)).toUpperCase());
      return {
        ...device,
        latestTelemetry: latest,
        lastMetrics: device.lastMetrics || latest?.metrics,
        lastValue: device.lastValue ?? latest?.lastValue,
        status: latest?.status || device.status,
        lastSeen: device.lastSeen || latest?.lastSeen || latest?.lastTimestamp || latest?.timestamp || latest?.receivedAt,
      };
    });
  }, [devices, latestTelemetry]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setTelemetryError('');

    Promise.allSettled([
      fetchDevices({ signal: controller.signal }),
      fetchLatestTelemetry({ signal: controller.signal }),
    ]).then(([deviceResult, telemetryResult]) => {
      if (controller.signal.aborted) return;
      if (deviceResult.status === 'rejected') {
        setDevices([]);
        setError(deviceResult.reason.message || 'Devices could not be loaded.');
      } else {
        setDevices(deviceResult.value);
      }
      if (telemetryResult.status === 'rejected') {
        setLatestTelemetry([]);
        setTelemetryError(telemetryResult.reason.message || 'Latest sensor values could not be loaded.');
      } else {
        setLatestTelemetry(telemetryResult.value);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
      })

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    setSelectedDeviceId((current) => (
      current && devicesWithLatest.some((device) => deviceIdOf(device) === current)
        ? current
        : deviceIdOf(devicesWithLatest[0])
    ));
  }, [devicesWithLatest]);

  const selectedDevice = devicesWithLatest.find((device) => deviceIdOf(device) === selectedDeviceId);

  return (
    <section className="panel telemetry-panel" aria-labelledby="telemetry-panel-heading" aria-busy={loading}>
      <div className="panel-heading telemetry-panel-heading">
        <div>
          <div className="panel-title-row">
            <h2 id="telemetry-panel-heading">Live telemetry</h2>
            <span className="telemetry-api-badge"><i aria-hidden="true" /> API</span>
          </div>
          <p>{loading ? 'Loading device readings…' : `${devicesWithLatest.length} ${devicesWithLatest.length === 1 ? 'device' : 'devices'} · latest reported values`}</p>
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
            {devicesWithLatest.map((device, index) => (
              <TelemetryDeviceCard
                device={device}
                key={deviceIdOf(device) || `${device.name || 'device'}-${index}`}
                selected={deviceIdOf(device) === selectedDeviceId}
                onSelect={() => setSelectedDeviceId(deviceIdOf(device))}
              />
            ))}
          </div>
          {telemetryError && <p className="telemetry-panel-warning" role="status">Latest sensor values could not be refreshed: {telemetryError}</p>}
          <TelemetryHistory
            deviceId={selectedDeviceId}
            deviceName={selectedDevice?.name || selectedDeviceId}
            unit={selectedDevice?.unit || selectedDevice?.latestTelemetry?.unit || ''}
          />
          <p className="telemetry-panel-footnote">Current values and recent history are loaded from the NexusFlow telemetry API.</p>
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
