/**
 * MainApp - Tab-based navigation shell
 * 
 * Updated tabs:
 * - Today (logging)
 * - Dashboard (insights)
 * - History (past records)
 * - Lists (movies, music, etc.)
 * - Files
 * - AI Search
 * - Profile
 */

import { useState } from 'react';
import {
  PenLine, LayoutDashboard, Clock,
  Sparkles, UserCircle, ListMusic, Bell
} from 'lucide-react';
import TodayTab from './tabs/TodayTab';
import DashboardTab from './tabs/DashboardTab';
import HistoryTab from './tabs/HistoryTab';
import ListsTab from './tabs/ListsTab';
import RemindersTab from './tabs/RemindersTab';
import SearchTab from './tabs/SearchTab';
import ProfileTab from './tabs/ProfileTab';

type TabId = 'today' | 'dashboard' | 'history' | 'lists' | 'reminders' | 'search' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const TABS: Tab[] = [
  { id: 'today', label: 'Today', icon: PenLine },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'lists', label: 'Lists', icon: ListMusic },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'search', label: 'AI', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const renderTab = () => {
    switch (activeTab) {
      case 'today': return <TodayTab />;
      case 'dashboard': return <DashboardTab />;
      case 'history': return <HistoryTab />;
      case 'lists': return <ListsTab />;
      case 'reminders': return <RemindersTab />;
      case 'search': return <SearchTab />;
      case 'profile': return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Scrollable Content Area */}
      <div className="max-w-lg mx-auto px-4 pt-2 pb-24 overflow-y-auto" style={{ minHeight: 'calc(100vh - 72px)' }}>
        {renderTab()}
      </div>

      {/* Bottom Tab Bar */}
      <div className="tab-bar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="flex flex-col items-center gap-0.5 py-1 px-1.5 min-w-0 transition-all"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-selected={isActive}
              role="tab"
            >
              <Icon
                className="w-5 h-5 transition-all"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              <span
                className="text-[9px] font-medium transition-all"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
