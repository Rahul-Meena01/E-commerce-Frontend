export default function ProfileTabs({ tabs, activeTab, onChange }) {
  return (
    <nav className="profile-nav">
      <ul className="profile-nav-list">
        {tabs.map(({ label, icon: Icon }) => (
          <li
            key={label}
            className={`profile-nav-item ${activeTab === label ? "active" : ""}`}
            onClick={() => onChange(label)}
            id={`profile-tab-${label.toLowerCase()}`}
          >
            <Icon />
            {label}
          </li>
        ))}
      </ul>
    </nav>
  );
}
