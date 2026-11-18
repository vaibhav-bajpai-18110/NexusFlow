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

export default function NodeInformationPanel({ node }) {
  const isDevice = node?.nodeType === 'device';
  const Icon = node?.icon || Radio;

  return (
    <aside className="node-information-panel" aria-label="Node information">
      <div className="node-information-heading">
        <div className="editor-section-heading">
          <strong>Node information</strong>
          <span>{node ? 'Selected node' : 'Select a node on the canvas'}</span>
        </div>
        <Info size={15} aria-hidden="true" />
      </div>

      {node ? (
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
              <InformationField label="Connection status" value={node.connectionStatus || 'Unknown'} status={node.connectionStatus || 'Unknown'} />
              {node.reading && <InformationField label={node.readingLabel || 'Latest reading'} value={node.reading} />}
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
        <p className="node-information-empty">Choose a device or pipeline step to see its details here.</p>
      )}
    </aside>
  );
}
