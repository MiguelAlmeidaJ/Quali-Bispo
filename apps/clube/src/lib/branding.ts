import type { CSSProperties } from "react";
export type Branding = {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
};
export const defaultBranding: Branding = {
  appName: "Quali Benefícios", primaryColor: "#0a65a8",
  secondaryColor: "#1f8546", logoUrl: "", faviconUrl: "",
};
export async function getBranding(): Promise<Branding> {
  try {
    const endpoint = process.env.INTERNAL_API_URL || "http://127.0.0.1:4002/v1";
    const response = await fetch(`${endpoint}/branding`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) return defaultBranding;
    const value = await response.json() as Partial<Branding>;
    const isHex = (color: unknown): color is string => typeof color === "string" && /^#[a-fA-F0-9]{6}$/.test(color);
    return {
      appName: typeof value.appName === "string" ? value.appName : defaultBranding.appName,
      primaryColor: isHex(value.primaryColor) ? value.primaryColor : defaultBranding.primaryColor,
      secondaryColor: isHex(value.secondaryColor) ? value.secondaryColor : defaultBranding.secondaryColor,
      logoUrl: value.logoUrl === "/v1/branding/assets/logo" ? value.logoUrl : "",
      faviconUrl: value.faviconUrl === "/v1/branding/assets/favicon" ? value.faviconUrl : "",
    };
  } catch { return defaultBranding; }
}
export function themeStyle(brand: Branding): CSSProperties {
  return {
    "--azul": brand.primaryColor, "--verde": brand.secondaryColor, "--verde2": brand.secondaryColor,
    "--grad": `linear-gradient(120deg, ${brand.primaryColor} 0%, #0c6f8f 50%, ${brand.secondaryColor} 100%)`,
  } as CSSProperties;
}
