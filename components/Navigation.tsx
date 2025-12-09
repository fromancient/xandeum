'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Network, GitCompare, Map, Share2, TrendingUp, Bell, BarChart3 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/nodes', label: 'Nodes', icon: Network },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/alerts', label: 'Alerts', icon: Bell },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/50 dark:border-white/10 bg-white/80 dark:glass backdrop-blur-md shadow-lg dark:shadow-black/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:neon-cyan transition-all duration-300 hover:scale-105"
            >
              XPIC
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                      "transition-all duration-300 ease-out",
                      "relative group",
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 dark:from-cyan-500/30 dark:to-blue-500/30 text-cyan-700 dark:text-cyan-300 dark:drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-cyan-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 transition-all duration-300",
                      isActive && "dark:drop-shadow-[0_0_6px_rgba(0,217,255,0.8)]",
                      !isActive && "group-hover:scale-110 group-hover:text-cyan-400 dark:group-hover:drop-shadow-[0_0_6px_rgba(0,217,255,0.6)]"
                    )} />
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 dark:shadow-[0_0_8px_rgba(0,217,255,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

