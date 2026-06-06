export default function ProfileTabs({ tabs, activeTab, onChange }) {
  return (
    <nav className="profile-nav" role="tablist" aria-label="Profile Sections">
      <ul className="profile-nav-list">
        {tabs.map(({ label, icon: Icon }) => (
          <li key={label} role="none">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === label}
              aria-controls={`profile-panel-${label.toLowerCase()}`}
              className={`profile-nav-item ${activeTab === label ? "active" : ""}`}
              onClick={() => onChange(label)}
              id={`profile-tab-${label.toLowerCase()}`}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
