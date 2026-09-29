import React from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 rounded-lg shadow-sm backdrop-blur-sm overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-slate-100 text-sm tracking-wide">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ElementType;
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-cyan-600 hover:bg-cyan-500 text-white focus:ring-cyan-500 border border-cyan-500/50 shadow-sm',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-200 focus:ring-slate-500 border border-slate-700',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 border border-rose-500/50 shadow-sm',
    warning:
      'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500 border border-amber-500/50 shadow-sm',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 border border-emerald-500/50 shadow-sm',
    ghost:
      'bg-transparent hover:bg-slate-800 text-slate-300 focus:ring-slate-500',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
}

export function Skeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-slate-800/80 rounded ${className}`}
    />
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-rose-400 font-mono text-sm font-bold">[ERROR]</span>
        <span className="text-sm">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-mono uppercase bg-rose-900/60 hover:bg-rose-900 px-3 py-1.5 rounded border border-rose-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
