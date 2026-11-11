import Image from "next/image";
export function Brand() {
 return <span className="brand" role="img" aria-label="Quali Benefícios">
  <Image unoptimized className="brand-image" src="/v1/branding/assets/logo" width={140} height={55} alt="Quali Benefícios" />
  <span className="brand-fallback"><span className="brand-word">Quali</span><span className="brand-sub">Benefícios</span></span>
 </span>;
}
