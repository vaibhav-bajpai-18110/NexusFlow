import { useEffect, useMemo, useState } from 'react';
import { Activity, Cpu, Droplets, Gauge, Radio, Search, Thermometer, X } from 'lucide-react';

const deviceIcons = {
  Temperature: Thermometer,
  Vibration: Activity,
  Pressure: Gauge,
  Humidity: Droplets,
  Other: Cpu,
};

export default function DeviceList({ devices, loading, error, selectedDeviceId, onSelect, onRetry }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredDevices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return devices.filter((device) => {
      const deviceId = device.deviceId || device.id || '';
      const deviceType = device.type || device.deviceType || 'Device';
      const location = typeof device.location === 'string'
        ? device.location
        : device.location?.label || '';
      const searchMatch = !query || [device.name, deviceId, deviceType, location]
        .some((value) => String(value || '').toLowerCase().includes(query));
      const statusMatch = statusFilter === 'all' || String(device.status || 'unknown').toLowerCase() === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [devices, searchQuery, statusFilter]);

  useEffect(() => {
    if (selectedDeviceId && !filteredDevices.some((device) => (device.deviceId || device.id) === selectedDeviceId)) {
      onSelect('');
    }
  }, [filteredDevices, onSelect, selectedDeviceId]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <section className="panel data-panel device-list-panel" aria-labelledby="registered-devices-heading" aria-busy={loading}>
      <div className="panel-heading data-panel-heading">
        <div>
          <h2 id="registered-devices-heading">Registered devices</h2>
          <p>Review each device and its connection status.</p>
        </div>
        <span className="demo-label">{loading ? 'LOADING' : `${String(devices.length).padStart(2, '0')} DEVICES`}</span>
      </div>

      {!loading && !error && devices.length > 0 && (
        <div className="device-list-toolbar">
          <label className="device-search-control">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search devices</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or device ID"
              aria-label="Search devices by name, ID, type, or location"
            />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear device search"><X size={13} /></button>}
          </label>
          <label className="device-status-filter">
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter devices by connection status">
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <span className="device-filter-count" aria-live="polite">{filteredDevices.length} shown</span>
        </div>
      )}

      {loading ? (
        <div className="device-list-loading" role="status" aria-label="Loading devices">
          {[0, 1, 2, 3].map((row) => (
            <div className="device-skeleton" key={row}>
              <span className="skeleton-icon" />
              <span className="skeleton-copy"><i /><i /></span>
              <span className="skeleton-status" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="device-api-state device-api-error" role="alert">
          <strong>Devices couldn’t be loaded</strong>
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : devices.length && filteredDevices.length ? (
        <div className="registered-device-list" role="list">
          {filteredDevices.map((device) => {
            const deviceId = device.deviceId || device.id;
            const deviceType = device.type || device.deviceType || 'Device';
            const status = String(device.status || 'unknown');
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const statusClass = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const Icon = device.icon || deviceIcons[deviceType] || Radio;
            const lastValue = device.lastValue ?? device.value;
            const reading = lastValue == null ? '—' : `${lastValue}${device.unit ? ` ${device.unit}` : ''}`;
            return (
              <div className="registered-device-item" role="listitem" key={deviceId}>
                <button
                  className={`registered-device${selectedDeviceId === deviceId ? ' registered-device-selected' : ''}`}
                  type="button"
                  onClick={() => onSelect(deviceId)}
                  aria-pressed={selectedDeviceId === deviceId}
                >
                  <span className="registered-device-icon"><Icon size={16} /></span>
                  <span className="registered-device-identity">
                    <span className="registered-device-name-row">
                      <strong>{device.name || deviceId}</strong>
                      <span className="registered-device-type">{deviceType}</span>
                    </span>
                    <code>{deviceId}</code>
                  </span>
                  <span className="registered-device-meta">
                    <span className={`device-status status-${statusClass}`}><i aria-hidden="true" />{statusLabel}</span>
                    <span className="registered-device-reading">{reading}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : devices.length ? (
        <div className="device-filter-empty" role="status">
          <strong>No devices match these filters</strong>
          <p>Try another search or choose a different connection status.</p>
          <button className="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="device-list-empty">
          <span className="registered-device-icon"><Radio size={17} /></span>
          <strong>No devices are available</strong>
          <p>The API returned an empty device list. Register a device to get started.</p>
        </div>
      )}
      {!loading && !error && devices.length > 0 && <p className="panel-footnote">Device records are loaded from the NexusFlow API.</p>}
    </section>
  );
}
