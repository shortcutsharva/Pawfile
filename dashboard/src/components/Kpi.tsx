export function Kpi({
  label,
  value,
  hint,
  tone = 'pine',
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'pine' | 'ochre' | 'brick' | 'moss' | 'ink';
}) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint ? <span className="kpi-hint">{hint}</span> : null}
    </article>
  );
}
