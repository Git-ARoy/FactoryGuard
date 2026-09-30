'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Factory,
  AlertTriangle,
  PlayCircle,
  FileText,
  Layers,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    {
      href: '/',
      label: 'Plant Overview',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      href: '/machines',
      label: 'Machinery Fleet',
      icon: Factory,
      active: pathname.startsWith('/machines'),
    },
    {
      href: '/incidents',
      label: 'Incident Center',
      icon: AlertTriangle,
      active: pathname.startsWith('/incidents'),
    },
    {
      href: '/simulation',
      label: 'Simulation Studio',
      icon: PlayCircle,
      active: pathname === '/simulation',
      badge: 'Workshop',
    },
    {
      href: '/documents',
      label: 'Machine Docs',
      icon: FileText,
      active: pathname.startsWith('/documents'),
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/70 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-2">
          Operations Navigation
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-mono font-medium transition-all group ${
                link.active
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={16}
                  className={`transition-colors ${
                    link.active
                      ? 'text-cyan-400'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-semibold tracking-wider">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Workshop Context Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/90 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300 mb-1">
          <Layers size={14} className="text-cyan-400" />
          <span className="font-semibold">Azure LaunchPad</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Demo Target Unit:{' '}
          <Link
            href="/machines/CNC-02"
            className="text-cyan-400 hover:underline font-bold"
          >
            CNC-02
          </Link>
        </p>
      </div>
    </aside>
  );
}
