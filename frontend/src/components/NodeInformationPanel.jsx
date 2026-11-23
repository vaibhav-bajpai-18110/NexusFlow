import { Info, Radio } from 'lucide-react';

function InformationField({ label, value, status }) {
  return (
    <div className="node-information-field">
      <span>{label}</span>
      {status ? (
        <strong className={`connection-status connection-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
          <i aria-hidden="true" />{value}
        </strong>
      ) : <strong>{value || '—'}</strong>}
    </div>
  );
}

function formatLastSeen(value) {
  if (!value) return 'No telemetry received';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatLocation(value) {
  if (typeof value === 'string') return value || 'Not specified';
  if (value?.label) return value.label;
  if (Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude)) {
    return `${value.latitude}, ${value.longitude}`;
  }
  return 'Not specified';
}

export default function NodeInformationPanel({
  node,
  loading = false,
  error = '',
  onRetry,
  heading = 'Node information',
  emptyHint = 'Choose a device or pipeline step to see its details here.',
  extendedDeviceDetails = false,
}) {
  const isDevice = node?.nodeType === 'device';
  const Icon = node?.icon || Radio;
  const deviceType = node?.deviceType || node?.type;
  const latestValue = node?.reading ?? node?.lastValue;

  return (
    <aside className="node-information-panel" aria-label="Node information">
      <div className="node-information-heading">
        <div className="editor-section-heading">
          <strong>{heading}</strong>
          <span>{loading ? 'Loading details' : error ? 'Details unavailable' : node ? 'Selected item' : 'Nothing selected'}</span>
        </div>
        <Info size={15} aria-hidden="true" />
      </div>

      {loading ? (
        <div className="node-information-state" role="status">
          <span className="large-spinner" aria-hidden="true" />
          <strong>Loading device details</strong>
          <p>Fetching the latest information from NexusFlow.</p>
        </div>
      ) : error ? (
        <div className="node-information-state node-information-error" role="alert">
          <strong>Device details couldn’t be loaded</strong>
          <p>{error}</p>
          {onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Try again</button>}
        </div>
      ) : node ? (
        <>
          <div className="node-information-summary">
            <span className={`pipeline-node-icon pipeline-node-icon-${node.tone || (isDevice ? 'device' : 'blue')}`}>
              <Icon size={15} />
            </span>
            <div>
              <span className="pipeline-node-kind">{node.category || (isDevice ? 'DEVICE' : 'NODE')}</span>
              <h3>{node.deviceName || node.title || 'Unnamed node'}</h3>
              {node.description && <p>{node.description}</p>}
            </div>
          </div>

          {isDevice ? (
            <div className="node-information-fields">
              <InformationField label="Device name" value={node.deviceName || node.title} />
              <InformationField label="Device ID" value={node.deviceId} />
              {deviceType && <InformationField label="Device type" value={deviceType} />}
              <InformationField label="Connection status" value={node.connectionStatus || 'Unknown'} status={node.connectionStatus || 'Unknown'} />
              {latestValue !== undefined && latestValue !== null && <InformationField label={node.readingLabel || 'Latest reading'} value={`${latestValue}${node.unit ? ` ${node.unit}` : ''}`} />}
              {(node.location || (isDevice && extendedDeviceDetails)) && <InformationField label="Location" value={formatLocation(node.location)} />}
              {(node.lastSeen !== undefined || (isDevice && extendedDeviceDetails)) && <InformationField label="Last seen" value={formatLastSeen(node.lastSeen)} />}
            </div>
          ) : (
            <div className="node-information-fields">
              {(node.fields || []).map((field) => (
                <InformationField key={field.label} label={field.label} value={field.value} />
              ))}
              {!node.fields?.length && <p className="node-information-empty">No additional settings for this node.</p>}
            </div>
          )}
        </>
      ) : (
        <p className="node-information-empty">{emptyHint}</p>
      )}
    </aside>
  );
}
