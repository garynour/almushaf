import React from 'react';
import { Home, BookOpen, Clock, Sparkles, Menu } from 'lucide-react';
import { ViewType } from '../types';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenMore,
}) => {
  const tabs = [
    { id: 'home' as ViewType, label: 'الرئيسية', icon: Home },
    { id: 'quran' as ViewType, label: 'المصحف', icon: BookOpen },
    { id: 'prayer' as ViewType, label: 'الصلاة', icon: Clock },
    { id: 'adhkar' as ViewType, label: 'الأذكار', icon: Sparkles },
    { id: 'more' as ViewType, label: 'المزيد', icon: Menu },
  ];

  return (
    <nav
      className="shrink-0 bg-white/95 dark:bg-[#0B152B]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 grid grid-cols-5 py-1 px-1 z-40 shadow-[0_-6px_20px_rgba(0,0,0,0.18)]"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))' }}
      aria-label="شريط التنقل السفلي"
    >
      {tabs.map((tab) => {
        const isMatch =
          currentView === tab.id ||
          (tab.id === 'quran' && currentView === 'mushaf');
        const IconComp = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'more') {
                onOpenMore();
              } else {
                onNavigate(tab.id);
              }
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl transition cursor-pointer active:scale-95 relative ${
              isMatch
                ? 'text-[#0D9488] dark:text-[#2DD4BF] font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <div
              className={`px-3 py-1 rounded-full transition-all ${
                isMatch
                  ? 'bg-teal-50 dark:bg-[#2DD4BF]/15 shadow-[0_0_12px_rgba(45,212,191,0.2)]'
                  : ''
              }`}
            >
              <IconComp className="w-5 h-5" />
            </div>
            <span className="text-[10.5px] leading-none tracking-tight whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
