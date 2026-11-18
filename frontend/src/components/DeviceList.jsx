import { Activity, Cpu, Droplets, Gauge, Radio, Thermometer } from 'lucide-react';

const deviceIcons = {
  Temperature: Thermometer,
  Vibration: Activity,
  Pressure: Gauge,
  Humidity: Droplets,
  Other: Cpu,
};

export default function DeviceList({ devices }) {
  return (
    <section className="panel data-panel device-list-panel" aria-labelledby="registered-devices-heading">
      <div className="panel-heading data-panel-heading">
        <div>
          <h2 id="registered-devices-heading">Registered devices</h2>
          <p>Review each device and its connection status.</p>
        </div>
        <span className="demo-label">{String(devices.length).padStart(2, '0')} DEVICES</span>
      </div>

      {devices.length ? (
        <div className="registered-device-list" role="list">
          {devices.map((device) => {
            const Icon = device.icon || deviceIcons[device.type] || Radio;
            const statusClass = device.status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return (
              <article className="registered-device" role="listitem" key={device.id}>
                <span className="registered-device-icon"><Icon size={16} /></span>
                <div className="registered-device-identity">
                  <div className="registered-device-name-row">
                    <h3>{device.name}</h3>
                    <span className="registered-device-type">{device.type}</span>
                  </div>
                  <code>{device.id}</code>
                </div>
                <div className="registered-device-meta">
                  <span className={`device-status status-${statusClass}`}><i aria-hidden="true" />{device.status}</span>
                  <span className="registered-device-reading">{device.value || '—'}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="device-list-empty">
          <span className="registered-device-icon"><Radio size={17} /></span>
          <strong>No devices yet</strong>
          <p>Register your first device using the form.</p>
        </div>
      )}
      <p className="panel-footnote">Demo names, IDs, statuses, and readings are illustrative sample data.</p>
    </section>
  );
}
