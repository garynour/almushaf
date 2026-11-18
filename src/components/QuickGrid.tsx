import React from 'react';
import {
  Compass,
  BookOpen,
  Layers,
  Sparkles,
  CheckSquare,
  ScrollText,
  BookMarked,
  LayoutGrid,
} from 'lucide-react';
import { ViewType } from '../types';

interface QuickGridProps {
  onNavigate: (view: ViewType) => void;
  onOpenModal: (modal: 'qibla' | 'tracker' | 'khatma' | 'settings' | 'more') => void;
}

export const QuickGrid: React.FC<QuickGridProps> = ({ onNavigate, onOpenModal }) => {
  const sections = [
    {
      title: 'القبلة',
      icon: Compass,
      gradient: 'from-[#2DD4BF] to-[#0D9488]',
      glow: 'rgba(45, 212, 191, 0.38)',
      action: () => onOpenModal('qibla'),
    },
    {
      title: 'المصحف',
      icon: BookOpen,
      gradient: 'from-[#34D399] to-[#059669]',
      glow: 'rgba(52, 211, 153, 0.35)',
      action: () => onNavigate('quran'),
    },
    {
      title: 'التجويد',
      icon: Layers,
      gradient: 'from-[#A78BFA] to-[#7C3AED]',
      glow: 'rgba(167, 139, 250, 0.35)',
      action: () => onNavigate('tajweed'),
    },
    {
      title: 'الأذكار',
      icon: Sparkles,
      gradient: 'from-[#FB7185] to-[#E11D48]',
      glow: 'rgba(251, 113, 133, 0.35)',
      action: () => onNavigate('adhkar'),
    },
    {
      title: 'المتتبع',
      icon: CheckSquare,
      gradient: 'from-[#38BDF8] to-[#0284C7]',
      glow: 'rgba(56, 189, 248, 0.35)',
      action: () => onOpenModal('tracker'),
    },
    {
      title: 'الأحاديث',
      icon: ScrollText,
      gradient: 'from-[#FBBF24] to-[#D97706]',
      glow: 'rgba(251, 191, 36, 0.38)',
      action: () => onNavigate('hadith'),
    },
    {
      title: 'الختمة',
      icon: BookMarked,
      gradient: 'from-[#22D3EE] to-[#0891B2]',
      glow: 'rgba(34, 211, 238, 0.35)',
      action: () => onOpenModal('khatma'),
    },
    {
      title: 'المزيد',
      icon: LayoutGrid,
      gradient: 'from-[#F472B6] to-[#9333EA]',
      glow: 'rgba(244, 114, 182, 0.32)',
      action: () => onOpenModal('more'),
    },
  ];

  return (
    <section className="px-3 pt-3.5">
      <div className="grid grid-cols-4 gap-2.5">
        {sections.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.title}
              onClick={item.action}
              className="group fluid-card rounded-[24px] py-3 px-1.5 flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[86px]"
            >
              <div
                className={`w-11 h-11 rounded-[16px] bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105`}
                style={{ boxShadow: `0 6px 16px -4px ${item.glow}` }}
              >
                <IconComp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight text-center leading-tight">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
