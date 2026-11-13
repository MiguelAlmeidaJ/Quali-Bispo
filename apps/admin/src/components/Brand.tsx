export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
 return <span className={`admin-brand ${light?"light":""} ${compact?"compact":""}`} aria-label="Quali Benefícios">
  <span className="admin-brand-image" role="img" aria-label="Logotipo Quali Benefícios" />
  <span className="admin-brand-fallback"><strong>Quali</strong><small>Benefícios</small></span>
 </span>;
}
