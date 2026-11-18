import { useCallback, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
} from '@xyflow/react';
import { Activity, Bell, GitBranch, Radio } from 'lucide-react';
import DeviceNode from './DeviceNode.jsx';
import WorkflowNode from './WorkflowNode.jsx';

const nodeTypes = { device: DeviceNode, workflow: WorkflowNode };
const edgeStyle = { stroke: '#7888bd', strokeWidth: 1.5 };
const markerEnd = { type: MarkerType.ArrowClosed, color: '#7888bd' };

const initialNodes = [
  {
    id: 'sensor-turbine-01',
    type: 'device',
    position: { x: 8, y: 74 },
    selected: true,
    data: {
      nodeType: 'device',
      icon: Radio,
      tone: 'device',
      category: 'SENSOR DEVICE',
      deviceName: 'Turbine 01',
      deviceId: 'TURBINE_001',
      connectionStatus: 'Online',
      description: 'Temperature sensor',
      readingLabel: 'Latest sample',
      reading: '85°C',
    },
  },
  {
    id: 'average-last-five',
    type: 'workflow',
    position: { x: 196, y: 74 },
    data: {
      nodeType: 'workflow',
      icon: Activity,
      tone: 'blue',
      category: 'FILTER',
      state: 'Ready',
      title: 'Average values',
      description: 'Smooth recent readings',
      readingLabel: 'Window',
      reading: 'Last 5 readings',
      fields: [{ label: 'Average window', value: '5 readings' }],
    },
  },
  {
    id: 'temperature-threshold',
    type: 'workflow',
    position: { x: 384, y: 74 },
    data: {
      nodeType: 'workflow',
      icon: GitBranch,
      tone: 'violet',
      category: 'RULE',
      state: 'Configured',
      title: 'Temperature limit',
      description: 'Compare average value',
      readingLabel: 'Condition',
      reading: '> 80°C',
      fields: [{ label: 'Condition', value: 'Average > 80°C' }],
    },
  },
  {
    id: 'critical-alert',
    type: 'workflow',
    position: { x: 572, y: 74 },
    data: {
      nodeType: 'workflow',
      icon: Bell,
      tone: 'amber',
      category: 'ALERT',
      state: 'On match',
      title: 'Critical event',
      description: 'Show in Alert Center',
      readingLabel: 'Action',
      reading: 'Create alert',
      fields: [{ label: 'Action', value: 'Create critical alert' }],
    },
  },
];

const initialEdges = [
  { id: 'sensor-to-average', source: 'sensor-turbine-01', target: 'average-last-five', type: 'smoothstep', animated: true, label: 'telemetry', markerEnd, style: edgeStyle },
  { id: 'average-to-threshold', source: 'average-last-five', target: 'temperature-threshold', type: 'smoothstep', animated: true, label: 'average', markerEnd, style: edgeStyle },
  { id: 'threshold-to-alert', source: 'temperature-threshold', target: 'critical-alert', type: 'smoothstep', animated: true, label: 'if > 80°C', markerEnd, style: edgeStyle },
];

const libraryData = {
  sensor: {
    nodeType: 'device', icon: Radio, tone: 'device', category: 'SENSOR DEVICE',
    deviceName: 'New sensor', deviceId: 'Not assigned', connectionStatus: 'Not connected',
    description: 'Configure a device source',
  },
  filter: {
    nodeType: 'workflow', icon: Activity, tone: 'blue', category: 'FILTER', state: 'New',
    title: 'Average values', description: 'Process recent readings', readingLabel: 'Window', reading: '5 readings',
    fields: [{ label: 'Average window', value: '5 readings' }],
  },
  threshold: {
    nodeType: 'workflow', icon: GitBranch, tone: 'violet', category: 'RULE', state: 'New',
    title: 'Threshold rule', description: 'Compare against a limit', readingLabel: 'Condition', reading: '> 80°C',
    fields: [{ label: 'Condition', value: 'Average > 80°C' }],
  },
  alert: {
    nodeType: 'workflow', icon: Bell, tone: 'amber', category: 'ALERT', state: 'New',
    title: 'Create alert', description: 'Record a pipeline event', readingLabel: 'Action', reading: 'Critical',
    fields: [{ label: 'Action', value: 'Create critical alert' }],
  },
};

function createNodeId() {
  return globalThis.crypto?.randomUUID?.() || `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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
    const template = libraryData[event.dataTransfer.getData('application/reactflow')];
    if (!template) return;
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodes((currentNodes) => currentNodes.concat({
      id: createNodeId(),
      type: template.nodeType,
      position,
      data: { ...template },
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
