import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) {
  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: [
      'bg-gradient-to-r from-cyan-500 to-blue-600 text-white',
      'hover:from-cyan-400 hover:to-blue-500',
      'dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500',
      'shadow-lg shadow-cyan-500/50 dark:shadow-cyan-500/30',
      'hover:shadow-xl hover:shadow-cyan-500/60 dark:hover:shadow-cyan-500/40',
      'focus:ring-cyan-500',
      'hover:scale-105',
    ].join(' '),
    outline: [
      'border border-gray-300/50 dark:border-cyan-500/30 bg-white/90 dark:glass',
      'text-gray-700 dark:text-cyan-300 hover:bg-gray-50/90 dark:hover:border-cyan-500/50',
      'hover:shadow-lg dark:hover:shadow-cyan-500/20',
      'focus:ring-cyan-500',
    ].join(' '),
    ghost: [
      'text-gray-700 dark:text-gray-300 hover:bg-gray-100/90 dark:hover:bg-white/5',
      'focus:ring-gray-500',
    ].join(' '),
  };

  const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-all duration-300 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "transform active:scale-95",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

