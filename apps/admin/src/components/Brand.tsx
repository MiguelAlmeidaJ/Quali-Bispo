export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={`admin-brand ${light ? "light" : ""} ${compact ? "compact" : ""}`} aria-label="Quali Benefícios">
      <strong>Quali</strong><small>Benefícios</small>
    </span>
  );
}
