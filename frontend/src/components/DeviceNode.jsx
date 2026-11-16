import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Radio } from 'lucide-react';

function DeviceNode({ data, selected }) {
  const Icon = data.icon || Radio;
  const status = data.connectionStatus || 'Unknown';
  const statusClass = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <article className={`pipeline-node device-node${selected ? ' pipeline-node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <div className="pipeline-node-heading">
        <span className="pipeline-node-icon pipeline-node-icon-device"><Icon size={14} /></span>
        <span className="pipeline-node-kind">{data.category || 'DEVICE'}</span>
        <span className={`connection-status connection-status-${statusClass}`}>
          <i aria-hidden="true" />{status}
        </span>
      </div>
      <div className="device-node-identity">
        <span className="node-field-label">Device name</span>
        <h3>{data.deviceName || data.title || 'Unnamed device'}</h3>
        <span className="node-field-label">Device ID</span>
        <p className="device-node-id">{data.deviceId || 'Not assigned'}</p>
      </div>
      {data.reading && (
        <div className="pipeline-node-reading">
          <span>{data.readingLabel || 'Latest reading'}</span>
          <strong>{data.reading}</strong>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="flow-handle" />
    </article>
  );
}

export default memo(DeviceNode);
