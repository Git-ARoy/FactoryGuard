import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';
import { QuickSimulationBar } from '@/components/shell/QuickSimulationBar';

export const metadata: Metadata = {
  title: 'FactoryGuard - Intelligent Industrial Monitoring & Predictive Maintenance',
  description:
    'Industrial monitoring platform with simulated telemetry, rule-based anomaly detection, Azure Cosmos DB, Blob Storage, and Application Insights.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        <Header />
        <QuickSimulationBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60 bg-grid-pattern">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
