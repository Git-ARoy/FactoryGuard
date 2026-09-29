import React from 'react';
import { MachineStatus, IncidentSeverity } from '@/lib/domain/types';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: MachineStatus | IncidentSeverity | 'RESOLVED' | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  let Icon = HelpCircle;
  let label = status;

  switch (status) {
    case 'NORMAL':
    case 'RESOLVED':
      badgeStyle = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
      Icon = CheckCircle2;
      label = status === 'RESOLVED' ? 'RESOLVED' : 'NORMAL';
      break;
    case 'WARNING':
      badgeStyle = 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      Icon = AlertTriangle;
      label = 'WARNING';
      break;
    case 'CRITICAL':
      badgeStyle = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
      Icon = AlertOctagon;
      label = 'CRITICAL';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border font-mono tracking-wider uppercase transition-colors ${badgeStyle} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon size={iconSizes} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
}
