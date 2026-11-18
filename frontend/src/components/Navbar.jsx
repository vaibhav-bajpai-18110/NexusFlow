import { Bell, ChevronDown, CircleHelp, Menu, Moon, Sun } from 'lucide-react';

export default function Navbar({ activeView, theme, onOpenMobileMenu, onNotificationClick, onToggleTheme }) {
  return (
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={onOpenMobileMenu}>
        <Menu size={19} />
      </button>
      <div className="breadcrumbs" aria-label="Current location">
        <span>NexusFlow</span><span className="crumb-slash">/</span><strong>{activeView}</strong>
      </div>
      <div className="topbar-actions">
        <button
          className="theme-toggle icon-button"
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="help-button" aria-label="Help">
          <CircleHelp size={17} />
        </button>
        <button className="notification-button icon-button" aria-label="Notifications" onClick={onNotificationClick}>
          <Bell size={17} /><span className="notification-dot" />
        </button>
        <div className="topbar-divider" />
        <button className="profile-button" aria-label="Open profile menu">
          <span className="avatar">HV</span><ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}
