import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBranding, themeStyle } from "../src/lib/branding";
import "./globals.css";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
 const brand = await getBranding();
 return {
  title: `Clube ${brand.appName}`,
  description: "Descontos em consultas médicas, check-ups, psicologia e nutrição com o Cartão Quali Benefícios.",
  ...(brand.faviconUrl ? { icons: { icon: brand.faviconUrl } } : {}),
 };
}
export default async function RootLayout({children}:{children:ReactNode}) {
 const brand = await getBranding();
 return <html lang="pt-BR" className={brand.logoUrl ? "has-brand-logo" : ""} style={themeStyle(brand)}><body>{children}</body></html>;
}
