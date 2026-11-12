import { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Cpu,
  Menu,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Workflow,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Sidebar from './components/Sidebar.jsx';
import MetricCard from './components/MetricCard.jsx';
import WorkflowCanvas from './components/WorkflowCanvas.jsx';

const pageCopy = {
  Devices: {
    eyebrow: 'Connected fleet',
    title: 'Device Registry',
    description: 'Check device health, type, and most recent sample reading.',
    icon: Cpu,
  },
  Pipelines: {
    eyebrow: 'Visual editor',
    title: 'Pipelines',
    description: 'Connect sensors, processing steps, rules, and actions on a visual canvas.',
    icon: Workflow,
  },
  Alerts: {
    eyebrow: 'Rule engine output',
    title: 'Alert Center',
    description: 'Review critical, warning, and resolved events from the demo workflow.',
    icon: Bell,
  },
  Activity: {
    eyebrow: 'Execution history',
    title: 'Activity',
    description: 'Follow device and pipeline events as they move through NexusFlow.',
    icon: Activity,
  },
  Settings: {
    eyebrow: 'Workspace',
    title: 'Settings',
    description: 'Workspace settings will connect to the project services in a later step.',
    icon: ShieldCheck,
  },
};

const metrics = [
  { label: 'Devices online', value: '24', note: 'Connected devices', icon: Cpu, tone: 'violet' },
  { label: 'Active pipelines', value: '08', note: 'Running now', icon: Workflow, tone: 'cyan' },
  { label: 'Open alerts', value: '03', note: 'Review alert center', icon: Bell, tone: 'amber' },
  { label: 'Events today', value: '1.2k', note: 'Simulator sample', icon: Activity, tone: 'green' },
];

const events = [
  {
    icon: Thermometer,
    tone: 'amber',
    title: 'Turbine 01 · High temp',
    detail: 'Temperature above 80°C · Critical',
    value: '85°C',
  },
  {
    icon: Radio,
    tone: 'green',
    title: 'Motor 02 · Online',
    detail: 'Vibration reading · 2.1 mm/s',
    value: 'Online',
  },
  {
    icon: Workflow,
    tone: 'blue',
    title: 'Pipeline · Deployed',
    detail: 'Temperature Safety',
    value: 'Ready',
  },
  {
    icon: Bell,
    tone: 'violet',
    title: 'Sensor 03 · Warning',
    detail: 'Reading approaching its configured limit',
    value: 'Review',
  },
];

const telemetry = [
  { time: '09:00', temperature: 71 },
  { time: '09:20', temperature: 73 },
  { time: '09:40', temperature: 72 },
  { time: '10:00', temperature: 75 },
  { time: '10:20', temperature: 76 },
  { time: '10:40', temperature: 74 },
  { time: '11:00', temperature: 77 },
  { time: '11:20', temperature: 79 },
  { time: '11:40', temperature: 82 },
  { time: '12:00', temperature: 85 },
];

const devices = [
  { name: 'Turbine 01', type: 'Temperature', status: 'Online', value: '78°C', icon: Thermometer },
  { name: 'Motor 02', type: 'Vibration', status: 'Online', value: '2.1 mm/s', icon: Activity },
  { name: 'Pump 03', type: 'Pressure', status: 'Offline', value: '—', icon: Radio },
  { name: 'Boiler 04', type: 'Temperature', status: 'Online', value: '71°C', icon: Thermometer },
];

const alerts = [
  { level: 'Critical', device: 'Turbine 01', message: 'Temperature above threshold', value: '85°C', tone: 'critical' },
  { level: 'Warning', device: 'Motor 02', message: 'Vibration approaching limit', value: '2.1 mm/s', tone: 'warning' },
  { level: 'Resolved', device: 'Pump 03', message: 'Device connection restored', value: 'Recovered', tone: 'resolved' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>{payload[0].value}°C</strong>
    </div>
  );
}

function EventList({ compact = false }) {
  return (
    <div className={compact ? 'event-list event-list-compact' : 'event-list'}>
      {events.map((event) => {
        const Icon = event.icon;
        return (
          <article className="event-item" key={event.title}>
            <div className={'event-icon event-icon-' + event.tone}><Icon size={15} strokeWidth={2.1} /></div>
            <div className="event-copy">
              <h3>{event.title}</h3>
              <p>{event.detail}</p>
            </div>
            <span className="event-value">{event.value}</span>
          </article>
        );
      })}
    </div>
  );
}

function Overview({ onOpenPipelines, onOpenActivity }) {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">NexusFlow · Overview</p>
          <h1>Operations Overview</h1>
          <p className="page-description">Monitor device health, temperature telemetry, and active pipelines.</p>
        </div>
        <div className="heading-actions">
          <div className="system-pill"><span className="system-pulse" /> Simulator sample data</div>
          <button className="button button-primary" onClick={onOpenPipelines}>
            <Plus size={16} strokeWidth={2.4} /> New pipeline
          </button>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Operations metrics">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-title-row">
                <h2>Temperature telemetry</h2>
                <span className="live-tag"><span /> Simulator</span>
              </div>
              <p>Turbine 01 · illustrative readings</p>
            </div>
            <div className="chart-current"><span>Current sample</span><strong>85°C</strong></div>
          </div>
          <div className="chart-key">
            <span className="threshold-key"><i /> Threshold · 80°C</span>
            <span>Average window · 5 readings</span>
          </div>
          <div className="telemetry-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 15, right: 18, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="temperature-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8da2ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8da2ff" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#263247" strokeDasharray="4 5" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#77869b', fontSize: 9 }} dy={8} />
                <YAxis domain={[65, 90]} ticks={[70, 80, 90]} tickFormatter={(value) => value + '°'} axisLine={false} tickLine={false} tick={{ fill: '#77869b', fontSize: 9 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#607196', strokeDasharray: '3 4' }} />
                <ReferenceLine y={80} stroke="#e8b86b" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="temperature" stroke="#91a4ff" strokeWidth={2} fill="url(#temperature-fill)" activeDot={{ r: 4, fill: '#c6d0ff', stroke: '#5368bb', strokeWidth: 2 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote"><span className="demo-dot" /> Demo values only · actual readings and thresholds are configurable.</div>
        </div>

        <div className="panel activity-panel">
          <div className="panel-heading activity-heading">
            <div>
              <h2>Recent events</h2>
              <p>Signals and actions from the demo workspace</p>
            </div>
            <button className="icon-button panel-more" aria-label="Event options"><ChevronDown size={17} /></button>
          </div>
          <EventList compact />
          <button className="activity-link" onClick={onOpenActivity}>
            View all activity <ArrowUpRight size={14} />
          </button>
        </div>
      </section>

      <section className="bottom-strip">
        <div className="bottom-strip-icon"><Sparkles size={16} /></div>
        <div>
          <strong>Demo runs without physical hardware</strong>
          <span>The telemetry simulator provides repeatable sample readings for the pipeline.</span>
        </div>
        <button className="subtle-button" onClick={onOpenPipelines}>Open pipeline <ArrowUpRight size={14} /></button>
      </section>
    </>
  );
}

function DevicesPage() {
  return (
    <section className="panel data-panel">
      <div className="panel-heading data-panel-heading">
        <div><h2>Device Registry</h2><p>Sample devices from the project overview</p></div>
        <span className="demo-label">SIMULATOR DATA</span>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Device</th><th>Type</th><th>Status</th><th>Last value</th></tr></thead>
          <tbody>{devices.map((device) => {
            const Icon = device.icon;
            return (
              <tr key={device.name}>
                <td><span className="table-device"><span className="table-device-icon"><Icon size={14} /></span>{device.name}</span></td>
                <td>{device.type}</td>
                <td><span className={'device-status status-' + device.status.toLowerCase()}><i />{device.status}</span></td>
                <td className="table-value">{device.value}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="panel-footnote">Readings are illustrative and do not come from physical sensors.</p>
    </section>
  );
}

function AlertsPage() {
  return (
    <section className="panel data-panel">
      <div className="panel-heading data-panel-heading">
        <div><h2>Alert Center</h2><p>Rule results and device events</p></div>
        <span className="demo-label">SIMULATOR DATA</span>
      </div>
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className="alert-row" key={alert.device}>
            <span className={'alert-level alert-level-' + alert.tone}>{alert.level}</span>
            <div className="alert-copy"><strong>{alert.device}</strong><span>{alert.message}</span></div>
            <span className="alert-reading">{alert.value}</span>
            <ArrowUpRight size={15} className="alert-open-icon" />
          </article>
        ))}
      </div>
      <p className="panel-footnote">Critical demo event: Turbine 01 sample is 85°C against an 80°C threshold.</p>
    </section>
  );
}

const nodeLibrary = [
  { type: 'sensor', icon: Radio, label: 'Sensor', detail: 'Read device data' },
  { type: 'filter', icon: Activity, label: 'Filter', detail: 'Average last 5 values' },
  { type: 'threshold', icon: Workflow, label: 'Threshold', detail: 'Compare with a limit' },
  { type: 'alert', icon: Bell, label: 'Alert', detail: 'Create an event' },
];

function PipelineWorkspace({ setNotice }) {
  const [selectedNode, setSelectedNode] = useState({
    category: 'SENSOR',
    title: 'Turbine 01',
    description: 'Device: TURBINE_001',
    reading: '85°C',
  });

  return (
    <>
      <div className="pipeline-toolbar">
        <div className="pipeline-name"><span className="pipeline-state-dot" /><div><strong>Temperature Safety</strong><small>Sample pipeline · simulator source</small></div></div>
        <div className="pipeline-actions">
          <button className="button button-secondary" onClick={() => setNotice('This frontend demo does not save pipelines to a backend yet.')}>Save</button>
          <button className="button button-secondary" onClick={() => setNotice('Demo test: 85°C is above the configured 80°C threshold.')}>Test</button>
          <button className="button button-primary" onClick={() => setNotice('The UI is ready; deployment will connect when the backend is available.')}>Deploy</button>
        </div>
      </div>
      <section className="pipeline-editor">
        <aside className="node-library">
          <div className="editor-section-heading"><strong>Node library</strong><span>Drag to canvas</span></div>
          {nodeLibrary.map(({ type, icon: Icon, label, detail }) => (
            <button
              className="library-node"
              key={type}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/reactflow', type);
                event.dataTransfer.effectAllowed = 'move';
              }}
            >
              <span className={'library-icon library-icon-' + type}><Icon size={15} /></span>
              <span><strong>{label}</strong><small>{detail}</small></span>
            </button>
          ))}
          <div className="library-hint">Drag a node onto the canvas to add it to this sample flow.</div>
        </aside>

        <div className="pipeline-canvas-column">
          <div className="canvas-toolbar"><span><span className="canvas-dot" />Temperature Safety</span><span>Drag nodes · connect ports · zoom canvas</span></div>
          <WorkflowCanvas onNodeSelect={setSelectedNode} />
          <div className="canvas-footer"><span>4 steps · 3 connections</span><span>Illustrative sample pipeline</span></div>
        </div>

        <aside className="properties-panel">
          <div className="editor-section-heading"><strong>Properties</strong><span>Selected node</span></div>
          <span className="property-category">{selectedNode?.category || 'NODE'}</span>
          <h3>{selectedNode?.title || 'Select a node'}</h3>
          <p>{selectedNode?.description || 'Choose a node on the canvas to inspect it.'}</p>
          <div className="property-divider" />
          <div className="property-field"><span>Average window</span><strong>5 readings</strong></div>
          <div className="property-field"><span>Threshold</span><strong>&gt; 80°C</strong></div>
          <div className="property-field"><span>On match</span><strong>Critical alert</strong></div>
          <div className="property-note"><Zap size={13} /> This sample produces an alert when temperature exceeds 80°C.</div>
        </aside>
      </section>
    </>
  );
}

function ActivityPage() {
  return (
    <section className="panel data-panel">
      <div className="panel-heading data-panel-heading">
        <div><h2>Execution history</h2><p>Recent sample telemetry and pipeline events</p></div>
        <span className="demo-label">SIMULATOR DATA</span>
      </div>
      <EventList />
      <p className="panel-footnote">Full execution history will be persisted by the backend service.</p>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="placeholder-panel">
      <div className="placeholder-icon"><ShieldCheck size={24} /></div>
      <p className="eyebrow">Workspace</p>
      <h2>Settings will connect to the project services later</h2>
      <p>The current frontend uses sample workspace data while the backend and database are built.</p>
    </section>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('Overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const handleNavigate = (view) => {
    setActiveView(view);
    setMobileNavOpen(false);
  };

  const currentPage = activeView === 'Overview' ? null : pageCopy[activeView];

  return (
    <div className="app-shell">
      <Sidebar activeItem={activeView} onNavigate={handleNavigate} mobileOpen={mobileNavOpen} />
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>NexusFlow</span><span className="crumb-slash">/</span><strong>{activeView}</strong></div>
          <div className="topbar-actions">
            <button className="help-button" aria-label="Help"><CircleHelp size={17} /></button>
            <button className="notification-button icon-button" aria-label="Notifications" onClick={() => setNotice('This demo has no unseen notifications.')}>
              <Bell size={17} /><span className="notification-dot" />
            </button>
            <div className="topbar-divider" />
            <button className="profile-button" aria-label="Open profile menu">
              <span className="avatar">HV</span><ChevronDown size={14} />
            </button>
          </div>
        </header>

        <main className="page-content">
          {activeView === 'Overview' ? (
            <Overview onOpenPipelines={() => handleNavigate('Pipelines')} onOpenActivity={() => handleNavigate('Activity')} />
          ) : (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">{currentPage.eyebrow}</p><h1>{currentPage.title}</h1><p className="page-description">{currentPage.description}</p></div>
                <div className="heading-actions"><div className="system-pill"><span className="system-pulse" /> Simulator sample data</div></div>
              </section>
              {activeView === 'Devices' && <DevicesPage />}
              {activeView === 'Pipelines' && <PipelineWorkspace setNotice={setNotice} />}
              {activeView === 'Alerts' && <AlertsPage />}
              {activeView === 'Activity' && <ActivityPage />}
              {activeView === 'Settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <span><Check size={15} /></span>{notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button>
        </div>
      )}
    </div>
  );
}
