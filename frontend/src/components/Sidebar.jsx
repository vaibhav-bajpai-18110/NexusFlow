import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  Cpu,
  Hexagon,
  LayoutDashboard,
  Settings2,
  Workflow,
} from 'lucide-react';

const primaryLinks = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Devices', icon: Cpu, count: '24' },
  { label: 'Pipelines', icon: Workflow, count: '08' },
  { label: 'Alerts', icon: Bell, count: '03' },
  { label: 'Activity', icon: Activity },
];

export default function Sidebar({ activeItem, onNavigate, mobileOpen }) {
  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark"><Hexagon size={20} strokeWidth={2.6} /><span /></div>
        <span className="brand-name">nexus<span>flow</span></span>
        <button className="sidebar-collapse icon-button" aria-label="Collapse sidebar"><ChevronDown size={15} /></button>
      </div>

      <button className="workspace-switcher">
        <span className="workspace-avatar">N</span>
        <span className="workspace-copy"><strong>NexusFlow</strong><small>Demo workspace</small></span>
        <ChevronDown size={15} />
      </button>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Workspace navigation">
        {primaryLinks.map(({ label, icon: Icon, count }) => (
          <button
            className={`nav-link${activeItem === label ? ' nav-link-active' : ''}`}
            key={label}
            onClick={() => onNavigate(label)}
            aria-current={activeItem === label ? 'page' : undefined}
          >
            <Icon size={17} strokeWidth={activeItem === label ? 2.1 : 1.8} />
            <span>{label}</span>
            {count && <span className="nav-count">{count}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-health-card">
        <div className="health-card-heading"><span><span className="health-dot" /> Demo pipeline</span><span>Ready</span></div>
        <div className="health-meter"><span /></div>
        <p>Sample flow · local UI preview.</p>
      </div>
      <div className="sidebar-bottom-nav">
        <button className={`nav-link${activeItem === 'Settings' ? ' nav-link-active' : ''}`} onClick={() => onNavigate('Settings')}><Settings2 size={17} /><span>Settings</span></button>
        <button className="nav-link"><CircleHelp size={17} /><span>Help center</span><span className="help-shortcut">?</span></button>
      </div>
      <div className="sidebar-profile">
        <div className="avatar profile-avatar">HV</div>
        <div className="profile-copy"><strong>Harshavardhan</strong><small>Frontend developer</small></div>
        <button className="icon-button profile-more" aria-label="Profile options"><ChevronDown size={15} /></button>
      </div>
    </aside>
  );
}
