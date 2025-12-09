import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}

export function Card({ children, className, title, action }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        "bg-white/90 dark:glass",
        "border border-gray-200/50 dark:border-white/10",
        "shadow-lg dark:shadow-xl dark:shadow-black/20",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-cyan-500/10",
        "hover:-translate-y-1",
        "backdrop-blur-sm",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 dark:border-white/10">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:neon-cyan">
              {title}
            </h3>
          )}
          {action && <div className="transition-transform hover:scale-110 duration-200">{action}</div>}
        </div>
      )}
      <div className={cn(
        title || action ? "p-4 sm:p-6" : "p-6 sm:p-8"
      )}>{children}</div>
    </div>
  );
}

