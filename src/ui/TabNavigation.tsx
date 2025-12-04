/**
 * Tab Navigation Component
 * Sistema de pestañas para el dashboard
 */

import React from 'react';
import { Activity, Beaker, Skull } from 'lucide-react';

export type TabId = 'monitoring' | 'laboratory' | 'necropsy';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const TABS: Tab[] = [
  {
    id: 'monitoring',
    label: 'MONITORING STATION',
    icon: <Activity className="w-4 h-4" />
  },
  {
    id: 'laboratory',
    label: 'LABORATORY',
    icon: <Beaker className="w-4 h-4" />
  },
  {
    id: 'necropsy',
    label: 'NECROPSY',
    icon: <Skull className="w-4 h-4" />
  }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex gap-2 mb-4 border-b border-cyan-500/30 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm
            transition-all duration-200 relative
            ${activeTab === tab.id
              ? 'bg-cyan-500/20 text-cyan-300 border-t-2 border-x-2 border-cyan-500'
              : 'bg-gray-800/50 text-gray-400 hover:text-gray-300 hover:bg-gray-800'
            }
          `}
        >
          {tab.icon}
          <span className="font-bold">{tab.label}</span>
          
          {/* LED indicator */}
          {activeTab === tab.id && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" />
          )}
        </button>
      ))}
    </div>
  );
};
