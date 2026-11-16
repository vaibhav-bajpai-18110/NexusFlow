import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function WorkflowNode({ data, selected }) {
  const Icon = data.icon;

  return (
    <article className={`pipeline-node workflow-node flow-node-${data.tone || 'blue'}${selected ? ' pipeline-node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <div className="pipeline-node-heading">
        <span className={`pipeline-node-icon pipeline-node-icon-${data.tone || 'blue'}`}>
          {Icon && <Icon size={14} />}
        </span>
        <span className="pipeline-node-kind">{data.category || 'STEP'}</span>
        {data.state && <span className="workflow-node-state"><i aria-hidden="true" />{data.state}</span>}
      </div>
      <h3>{data.title || 'Pipeline step'}</h3>
      {data.description && <p>{data.description}</p>}
      {data.reading && (
        <div className="pipeline-node-reading">
          <span>{data.readingLabel || 'Value'}</span>
          <strong>{data.reading}</strong>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="flow-handle" />
    </article>
  );
}

export default memo(WorkflowNode);
