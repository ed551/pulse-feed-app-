import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Heart, Layers, Headphones, GraduationCap, Bell, User, Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { motion } from 'motion/react';

export default function BottomNav({ onAddPost }: { onAddPost: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/dating', icon: Heart, label: t('dating') },
    { path: '/rewards', icon: Layers, label: t('rewards') },
    { path: '/education', icon: GraduationCap, label: 'Hub' },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <>
      {/* Floating FAB */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] sm:hidden">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onAddPost}
          className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(79,70,229,0.4)] border-4 border-white dark:border-gray-900 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      </div>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex items-center justify-around px-2 z-[90] sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-max sm:px-6 sm:rounded-full sm:shadow-2xl sm:border-gray-200/50 dark:sm:border-gray-700/50 backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all relative group",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "scale-110" : "group-hover:scale-110")} />
              <span className={cn("text-[8px] font-black uppercase mt-1 tracking-tighter", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabBottom"
                  className="absolute -top-1 left-3 right-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
