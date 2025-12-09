import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string | ReactNode;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        "bg-white/90 dark:glass",
        "border border-gray-200/50 dark:border-white/10",
        "p-6 shadow-lg dark:shadow-xl dark:shadow-black/20",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl dark:hover:shadow-2xl",
        "hover:-translate-y-1 hover:scale-[1.02]",
        "group relative overflow-hidden",
        "backdrop-blur-sm",
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-500 pointer-events-none" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-cyan-100/80">
            {title}
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100 dark:neon-cyan">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-2 text-sm font-medium transition-all",
                trend.isPositive
                  ? "text-green-600 dark:text-green-400 dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : "text-red-600 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              )}
            >
              <span className="inline-block transition-transform group-hover:scale-110">
                {trend.isPositive ? '↑' : '↓'}
              </span>{' '}
              {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-4 text-gray-400 dark:text-cyan-400/60 transition-all duration-300 group-hover:text-cyan-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(0,217,255,0.8)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

