import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchTelemetryHistory } from '../services/telemetryApi.js';

function metricValues(record) {
  if (record?.metrics && typeof record.metrics === 'object' && !Array.isArray(record.metrics)) {
    return Object.entries(record.metrics);
  }
  if (record?.metric && record?.value !== undefined && record?.value !== null) {
    return [[record.metric, record.value]];
  }
  const reserved = new Set(['deviceid', 'timestamp', 'receivedat', 'ingestedat', 'lastseen', 'status']);
  return Object.entries(record || {}).filter(([key, value]) => !reserved.has(key.toLowerCase()) && (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))));
}

function metricTitle(value) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timeLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TelemetryHistory({ deviceId, deviceName, unit = '' }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(Boolean(deviceId));
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('');

  useEffect(() => {
    if (!deviceId) {
      setHistory([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchTelemetryHistory({ deviceId, limit: 40, signal: controller.signal })
      .then(setHistory)
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setHistory([]);
        setError(requestError.message || 'Reading history could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [deviceId, retryKey]);

  const metrics = useMemo(() => [...new Set(history.flatMap((record) => metricValues(record).map(([metric]) => metric)))], [history]);
  const activeMetric = metrics.includes(selectedMetric) ? selectedMetric : metrics[0] || '';
  const activeUnit = metrics.length === 1 ? unit : '';
  const chartData = useMemo(() => history.slice().reverse().flatMap((record, index) => {
    const value = metricValues(record).find(([metric]) => metric === activeMetric)?.[1];
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return [];
    return [{ time: timeLabel(record.timestamp || record.receivedAt), id: record.timestamp || record.receivedAt || index, value: numericValue }];
  }), [history, activeMetric]);
  const chartPoints = useMemo(() => {
    if (!chartData.length) return [];
    const values = chartData.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = min === max ? Math.max(Math.abs(max) * 0.06, 1) : (max - min) * 0.12;
    const lower = min - padding;
    const upper = max + padding;
    return chartData.map((point, index) => ({
      ...point,
      x: chartData.length === 1 ? 320 : 18 + index * (604 / (chartData.length - 1)),
      y: 18 + ((upper - point.value) / (upper - lower)) * 118,
    }));
  }, [chartData]);
  const linePath = chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const areaPath = chartPoints.length
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 146 L ${chartPoints[0].x} 146 Z`
    : '';
  const xLabels = chartPoints.length > 2
    ? [chartPoints[0], chartPoints[Math.floor((chartPoints.length - 1) / 2)], chartPoints[chartPoints.length - 1]]
    : chartPoints;

  return (
    <section className="telemetry-history" aria-labelledby="telemetry-history-heading" aria-busy={loading}>
      <div className="telemetry-history-heading">
        <div>
          <h3 id="telemetry-history-heading">Reading history</h3>
          <p>{deviceId ? `${deviceName || deviceId} · recent sensor values` : 'Select a device to view its readings.'}</p>
        </div>
        {metrics.length > 1 && (
          <label className="telemetry-metric-select">
            <span className="sr-only">History metric</span>
            <select value={activeMetric} onChange={(event) => setSelectedMetric(event.target.value)} aria-label="Choose metric to chart">
              {metrics.map((metric) => <option value={metric} key={metric}>{metricTitle(metric)}</option>)}
            </select>
          </label>
        )}
        {deviceId && <button className="telemetry-history-refresh" type="button" onClick={() => setRetryKey((current) => current + 1)} disabled={loading} aria-label="Refresh reading history"><RefreshCw size={13} /></button>}
      </div>

      {loading ? (
        <div className="telemetry-history-state" role="status"><span className="large-spinner" /><strong>Loading recent readings</strong></div>
      ) : error ? (
        <div className="telemetry-history-state telemetry-history-error" role="alert">
          <strong>Reading history is unavailable</strong><p>{error}</p>
          <button className="button button-secondary" type="button" onClick={() => setRetryKey((current) => current + 1)}>Try again</button>
        </div>
      ) : !history.length ? (
        <div className="telemetry-history-state telemetry-history-empty">
          <strong>{deviceId ? 'No readings recorded yet' : 'Select a device'}</strong>
          <p>{deviceId ? 'New telemetry will appear here after the device sends a reading.' : 'Choose a device card above to load its recent readings.'}</p>
        </div>
      ) : !chartData.length ? (
        <div className="telemetry-history-state telemetry-history-empty">
          <strong>No numeric sensor metrics</strong>
          <p>The API returned history records without a numeric metric to chart.</p>
        </div>
      ) : (
        <div className="telemetry-history-chart">
          <svg viewBox="0 0 640 180" preserveAspectRatio="none" role="img" aria-label={`Recent ${metricTitle(activeMetric)} readings for ${deviceName || deviceId}`}>
            {[18, 60, 102, 146].map((y) => <line className="telemetry-chart-gridline" x1="18" x2="622" y1={y} y2={y} key={y} />)}
            {areaPath && <path className="telemetry-chart-area" d={areaPath} />}
            {linePath && <path className="telemetry-chart-line" d={linePath} />}
            {chartPoints.map((point) => (
              <circle className="telemetry-chart-point" cx={point.x} cy={point.y} r="3" key={point.id}>
                <title>{`${point.time}: ${point.value}${activeUnit ? ` ${activeUnit}` : ''}`}</title>
              </circle>
            ))}
            {xLabels.map((point, index) => (
              <text className="telemetry-chart-label" x={point.x} y="169" textAnchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'} key={`${point.id}-label`}>{point.time}</text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
