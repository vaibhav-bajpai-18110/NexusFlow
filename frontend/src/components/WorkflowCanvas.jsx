import { memo, useCallback, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from '@xyflow/react';
import { Activity, Bell, GitBranch, Radio } from 'lucide-react';

function FlowNode({ data, selected }) {
  const Icon = data.icon;
  return (
    <div className={'flow-node flow-node-' + data.tone + (selected ? ' flow-node-selected' : '')}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <div className="flow-node-top">
        <span className={'flow-node-icon flow-node-icon-' + data.tone}><Icon size={14} /></span>
        <span className="flow-node-category">{data.category}</span>
        <span className="flow-node-state"><i /> {data.state}</span>
      </div>
      <h3>{data.title}</h3>
      <p>{data.description}</p>
      {data.reading && <div className="flow-reading"><span>{data.readingLabel || 'Sample'}</span><strong>{data.reading}</strong></div>}
      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}

const nodeTypes = { custom: memo(FlowNode) };
const edgeStyle = { stroke: '#7888bd', strokeWidth: 1.5 };
const markerEnd = { type: MarkerType.ArrowClosed, color: '#7888bd' };

const initialNodes = [
  {
    id: 'sensor',
    type: 'custom',
    position: { x: 8, y: 74 },
    data: {
      icon: Radio,
      tone: 'cyan',
      category: 'SENSOR',
      state: 'Sample',
      title: 'Turbine 01',
      description: 'Device · TURBINE_001',
      readingLabel: 'Reading',
      reading: '85°C',
    },
  },
  {
    id: 'filter',
    type: 'custom',
    position: { x: 196, y: 74 },
    data: {
      icon: Activity,
      tone: 'blue',
      category: 'FILTER',
      state: 'Ready',
      title: 'Average values',
      description: 'Smooth recent readings',
      readingLabel: 'Window',
      reading: 'Last 5 readings',
    },
  },
  {
    id: 'threshold',
    type: 'custom',
    position: { x: 384, y: 74 },
    data: {
      icon: GitBranch,
      tone: 'violet',
      category: 'RULE',
      state: 'Configured',
      title: 'Temperature limit',
      description: 'Compare average value',
      readingLabel: 'Condition',
      reading: '> 80°C',
    },
  },
  {
    id: 'alert',
    type: 'custom',
    position: { x: 572, y: 74 },
    data: {
      icon: Bell,
      tone: 'amber',
      category: 'ALERT',
      state: 'On match',
      title: 'Critical event',
      description: 'Show in Alert Center',
      readingLabel: 'Action',
      reading: 'Create alert',
    },
  },
];

const initialEdges = [
  { id: 'sensor-filter', source: 'sensor', target: 'filter', type: 'smoothstep', animated: true, label: 'telemetry', markerEnd, style: edgeStyle },
  { id: 'filter-threshold', source: 'filter', target: 'threshold', type: 'smoothstep', animated: true, label: 'average', markerEnd, style: edgeStyle },
  { id: 'threshold-alert', source: 'threshold', target: 'alert', type: 'smoothstep', animated: true, label: 'if > 80°C', markerEnd, style: edgeStyle },
];

const libraryData = {
  sensor: { icon: Radio, tone: 'cyan', category: 'SENSOR', state: 'New', title: 'New sensor', description: 'Read device telemetry', readingLabel: 'Source', reading: 'Select device' },
  filter: { icon: Activity, tone: 'blue', category: 'FILTER', state: 'New', title: 'Average values', description: 'Process recent readings', readingLabel: 'Window', reading: '5 readings' },
  threshold: { icon: GitBranch, tone: 'violet', category: 'RULE', state: 'New', title: 'Threshold rule', description: 'Compare against a limit', readingLabel: 'Condition', reading: '> 80°C' },
  alert: { icon: Bell, tone: 'amber', category: 'ALERT', state: 'New', title: 'Create alert', description: 'Record a pipeline event', readingLabel: 'Action', reading: 'Critical' },
};

export default function WorkflowCanvas({ onNodeSelect }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [flow, setFlow] = useState(null);

  const onNodesChange = useCallback((changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  }, []);

  const onConnect = useCallback((connection) => {
    setEdges((currentEdges) => addEdge({
      ...connection,
      type: 'smoothstep',
      animated: true,
      markerEnd,
      style: edgeStyle,
    }, currentEdges));
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (!flow) return;
    const type = event.dataTransfer.getData('application/reactflow');
    const data = libraryData[type];
    if (!data) return;
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodes((currentNodes) => currentNodes.concat({
      id: 'node-' + Date.now(),
      type: 'custom',
      position,
      data,
    }));
  }, [flow]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="workflow-canvas" aria-label="Interactive sensor, filter, threshold, and alert pipeline" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setFlow}
        onSelectionChange={({ nodes: selectedNodes }) => onNodeSelect?.(selectedNodes[0]?.data || null)}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.45, maxZoom: 1.1 }}
        minZoom={0.4}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} color="#263249" gap={19} size={1.1} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
