import Image from "next/image";
export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
 return <span className={`admin-brand ${light?"light":""} ${compact?"compact":""}`} aria-label="Quali Benefícios">
  <Image unoptimized className="admin-brand-image" src="/v1/branding/assets/logo" width={160} height={65} alt="Quali Benefícios" />
  <span className="admin-brand-fallback"><strong>Quali</strong><small>Benefícios</small></span>
 </span>;
}
