import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata:Metadata={title:"Clube Quali Benefícios",description:"Descontos em consultas médicas, check-ups, psicologia e nutrição com o Cartão Quali Benefícios."};
export default function RootLayout({children}:{children:ReactNode}) {
 return <html lang="pt-BR"><body>{children}</body></html>;
}
