export default function MetricCard({ label, value, note, icon: Icon, tone }) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className={`metric-icon metric-icon-${tone}`}><Icon size={17} strokeWidth={2} /></span>
        <span className="metric-scope">DEMO</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-bottomline">
        <span>{note}</span>
      </div>
    </article>
  );
}
