export function Tabs({ activeValue, children, onChange, tabs }) {
  return (
    <div className="ds-tabs">
      <div className="ds-tabs__list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className="ds-tabs__trigger"
            role="tab"
            aria-selected={activeValue === tab.value}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{children}</div>
    </div>
  );
}
