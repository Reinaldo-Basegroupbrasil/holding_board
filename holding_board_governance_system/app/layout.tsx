import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MaintenanceGuard } from "@/components/maintenance-guard";
import { MainLayout } from "@/components/main-layout"; // <--- NOVO IMPORT

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Holding Board Governance",
  description: "Sistema de Governança Multi-Jurisdicional",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950`}>
        
        {/* 1. SEGURANÇA (Manutenção) */}
        <MaintenanceGuard>
            
            {/* 2. LAYOUT INTELIGENTE (Esconde Sidebar no Login) */}
            <MainLayout>
                {children}
            </MainLayout>

        </MaintenanceGuard>

      </body>
    </html>
  );
}