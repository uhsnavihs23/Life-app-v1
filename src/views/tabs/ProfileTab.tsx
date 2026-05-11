/**
 * ProfileTab - User profile and settings
 * 
 * Features:
 * - Profile image upload
 * - API key status
 * - Settings
 */

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { setGeminiApiKey, hasGeminiApiKey, isApiKeyFromEnv } from '../../services/GeminiService';
import { isSupabaseConfigured, getSupabaseClient } from '../../services/SupabaseService';
import {
  Moon, Sun, Bell, Key, LogOut,
  ChevronRight, Shield, Info, Trash2, Check, ExternalLink, Sparkles, Database, Camera, Download
} from 'lucide-react';
import { formatINR, formatDate } from '../../models/types';

export default function ProfileTab() {
  const { state, dispatch } = useApp();
  const user = state.user;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyFromEnv, setApiKeyFromEnv] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    setHasApiKey(hasGeminiApiKey());
    setApiKeyFromEnv(isApiKeyFromEnv());
    setSupabaseConfigured(isSupabaseConfigured());
    
    // Load saved profile image
    const savedImage = localStorage.getItem('lifelog_profile_image');
    if (savedImage) setProfileImage(savedImage);
  }, []);

  const handleSaveProfile = () => {
    dispatch({ type: 'UPDATE_PROFILE', displayName: editName, email: editEmail });
    setEditMode(false);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setGeminiApiKey(apiKey.trim());
      setHasApiKey(true);
      setApiKeySaved(true);
      setShowApiKeyInput(false);
      setApiKey('');
      setTimeout(() => setApiKeySaved(false), 3000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setProfileImage(imageData);
        localStorage.setItem('lifelog_profile_image', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const [isClearingData, setIsClearingData] = useState(false);

  const handleClearData = async () => {
    if (!confirm('This will permanently delete ALL your data. Are you sure?')) return;
    if (!confirm('This CANNOT be undone. Really delete everything?')) return;
    
    setIsClearingData(true);
    
    // 1. Clear Supabase tables first (while we still have user id)
    if (isSupabaseConfigured() && user?.id) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const tables = ['daily_logs', 'expenses', 'food_entries', 'sleep_entries', 'activities', 'reminders', 'list_items', 'health_metrics', 'activity_timeline'];
          // Use neq to match all rows for this user (supabase needs a filter)
          await Promise.allSettled(
            tables.map(table => client.from(table).delete().eq('user_id', user!.id))
          );
        }
      } catch (e) {
        console.error('Error clearing cloud data:', e);
      }
    }
    
    // 2. Clear ALL localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // 3. Clear chat messages too
    localStorage.removeItem('lifelog_chat_messages');
    localStorage.removeItem('lifelog_profile_image');
    
    setIsClearingData(false);
    
    // 4. Dispatch logout AFTER clearing
    dispatch({ type: 'LOGOUT' });
    
    // 5. Force reload to clear all in-memory state
    window.location.reload();
  };

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Profile</h1>
      </div>

      {/* User Card with Profile Image */}
      <div className="card p-6 mb-6 text-center">
        {/* Profile Image */}
        <div className="relative inline-block mb-3">
          <div 
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl overflow-hidden"
            style={{ background: profileImage ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold">
                {(user?.displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--color-primary)' }}
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
        
        {editMode ? (
          <div className="space-y-3 mt-4 max-w-xs mx-auto">
            <input className="ios-input text-center" placeholder="Display Name" value={editName}
              onChange={e => setEditName(e.target.value)} />
            <input className="ios-input text-center" placeholder="Email" value={editEmail}
              onChange={e => setEditEmail(e.target.value)} />
            <div className="flex gap-2">
              <button className="ios-btn ios-btn-secondary flex-1" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="ios-btn ios-btn-primary flex-1" onClick={handleSaveProfile}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {user?.displayName || 'User'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {user?.email || 'user@example.com'}
            </p>
            <button
              className="text-sm font-medium mt-2"
              style={{ color: 'var(--color-primary)' }}
              onClick={() => { setEditMode(true); setEditName(user?.displayName || ''); setEditEmail(user?.email || ''); }}
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Export Data */}
      <ExportSection state={state} />

      {/* API Key config — only show if not from env */}
      {!apiKeyFromEnv && !hasApiKey && (
        <div className="card p-4 mb-4" style={{ background: 'rgba(99,102,241,0.05)' }}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Enable AI Features</h3>
              {!showApiKeyInput ? (
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button className="ios-btn ios-btn-primary text-sm py-2" onClick={() => setShowApiKeyInput(true)}>
                    <Key className="w-4 h-4" /> Add API Key
                  </button>
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                    className="ios-btn ios-btn-secondary text-sm py-2">
                    Get Free Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <input type="password" className="ios-input text-sm" placeholder="Paste Gemini API key..."
                    value={apiKey} onChange={e => setApiKey(e.target.value)} autoFocus />
                  <div className="flex gap-2">
                    <button className="ios-btn ios-btn-secondary text-sm py-2 flex-1" onClick={() => { setShowApiKeyInput(false); setApiKey(''); }}>Cancel</button>
                    <button className="ios-btn ios-btn-primary text-sm py-2 flex-1" onClick={handleSaveApiKey} disabled={!apiKey.trim()}>Save</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {apiKeySaved && (
        <div className="card p-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <Check className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-emerald-600">API Key saved!</p>
        </div>
      )}

      {/* Settings */}
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Settings</h2>
      <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {/* Dark Mode */}
        <SettingRow
          icon={state.darkMode ? Moon : Sun}
          label="Dark Mode"
          subtitle={state.darkMode ? 'On' : 'Off'}
          color="#6366f1"
          action={
            <button
              className="w-12 h-7 rounded-full relative transition-all"
              style={{
                background: state.darkMode ? 'var(--color-primary)' : 'var(--color-border)',
              }}
              onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
            >
              <div className="absolute w-5 h-5 rounded-full bg-white top-1 transition-all"
                style={{ left: state.darkMode ? 26 : 4 }} />
            </button>
          }
        />

        {/* Notifications */}
        <SettingRow
          icon={Bell}
          label="Notifications"
          subtitle="For reminders"
          color="#f59e0b"
          action={
            <button onClick={() => Notification.requestPermission()}>
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          }
        />

        {/* Data Storage */}
        <SettingRow
          icon={Database}
          label="Data Storage"
          subtitle={supabaseConfigured ? 'Cloud sync enabled' : 'Local storage'}
          color="#06b6d4"
          action={
            supabaseConfigured 
              ? <Check className="w-5 h-5 text-emerald-500" />
              : <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Local</span>
          }
        />

        {/* Privacy */}
        <SettingRow
          icon={Shield}
          label="Privacy"
          subtitle="Your data stays private"
          color="#10b981"
          action={
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
          }
        />
      </div>

      {/* Danger Zone */}
      <div className="mt-6 space-y-3">
        <button
          className="ios-btn ios-btn-secondary w-full"
          style={{ color: '#ef4444' }}
          onClick={handleClearData}
        >
          <Trash2 className="w-4 h-4" /> {isClearingData ? 'Clearing...' : 'Clear All Data'}
        </button>
        <button
          className="ios-btn ios-btn-secondary w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

      {/* App Info */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
          <Info className="w-3 h-3" />
          <span className="text-xs">LifeLog AI v1.0</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Made with ❤️ • Free Forever
        </p>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, subtitle, color, action }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; subtitle: string; color: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function ExportSection({ state }: { state: any }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    setFromDate(weekAgo);
    setToDate(today);
  }, []);

  const handleExport = (format: 'csv' | 'txt') => {
    setExporting(true);
    try {
      const from = new Date(fromDate + 'T00:00:00');
      const to = new Date(toDate + 'T23:59:59');
      const inRange = (d: string) => { const dt = new Date(d); return dt >= from && dt <= to; };

      const logs = state.dailyLogs.filter((l: any) => inRange(l.createdAt));
      const expenses = state.expenses.filter((e: any) => inRange(e.createdAt));
      const food = state.foodEntries.filter((f: any) => inRange(f.createdAt));
      const sleep = state.sleepEntries.filter((s: any) => inRange(s.createdAt));
      const activities = state.activities.filter((a: any) => inRange(a.createdAt));

      let content = '';
      if (format === 'csv') {
        content = 'Type,Date,Details,Amount/Value\n';
        logs.forEach((l: any) => content += `Log,${formatDate(l.createdAt)},"${l.text.replace(/"/g, '""')}",${l.tag}\n`);
        expenses.forEach((e: any) => content += `Expense,${formatDate(e.createdAt)},"${e.category}: ${e.note}",${e.amount}\n`);
        food.forEach((f: any) => content += `Food,${formatDate(f.createdAt)},"${f.name} (${f.portionSize})",${f.calories || ''}\n`);
        sleep.forEach((s: any) => content += `Sleep,${formatDate(s.createdAt)},"${s.hours}h - ${s.quality}",${s.hours}\n`);
        activities.forEach((a: any) => content += `Activity,${formatDate(a.createdAt)},"${a.steps} steps",${a.distanceKm || ''}\n`);
      } else {
        content = `LifeLog AI Export (${fromDate} to ${toDate})\n${'='.repeat(50)}\n\n`;
        if (logs.length) { content += '📋 LOGS\n' + '-'.repeat(30) + '\n'; logs.forEach((l: any) => content += `${formatDate(l.createdAt)} [${l.tag}] ${l.text}\n`); content += '\n'; }
        if (expenses.length) { const total = expenses.reduce((s: number, e: any) => s + e.amount, 0); content += `💰 EXPENSES (Total: ${formatINR(total)})\n` + '-'.repeat(30) + '\n'; expenses.forEach((e: any) => content += `${formatDate(e.createdAt)} ${formatINR(e.amount)} - ${e.category}${e.note ? ': ' + e.note : ''}\n`); content += '\n'; }
        if (food.length) { content += '🍽️ FOOD\n' + '-'.repeat(30) + '\n'; food.forEach((f: any) => content += `${formatDate(f.createdAt)} ${f.name} (${f.portionSize})${f.calories ? ' ' + f.calories + ' cal' : ''}\n`); content += '\n'; }
        if (sleep.length) { content += '😴 SLEEP\n' + '-'.repeat(30) + '\n'; sleep.forEach((s: any) => content += `${formatDate(s.createdAt)} ${s.hours}h - ${s.quality}\n`); content += '\n'; }
        if (activities.length) { content += '🏃 ACTIVITY\n' + '-'.repeat(30) + '\n'; activities.forEach((a: any) => content += `${formatDate(a.createdAt)} ${a.steps} steps${a.distanceKm ? ' · ' + a.distanceKm + ' km' : ''}\n`); content += '\n'; }
      }

      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifelog_${fromDate}_to_${toDate}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
    setExporting(false);
  };

  return (
    <div className="card p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <Download className="w-4 h-4 text-indigo-500" /> Export Data
      </h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-tertiary)' }}>From</label>
          <input type="date" className="ios-input text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-tertiary)' }}>To</label>
          <input type="date" className="ios-input text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="ios-btn ios-btn-secondary flex-1 text-sm" onClick={() => handleExport('csv')} disabled={exporting}>
          📄 CSV
        </button>
        <button className="ios-btn ios-btn-secondary flex-1 text-sm" onClick={() => handleExport('txt')} disabled={exporting}>
          📝 Text Report
        </button>
      </div>
    </div>
  );
}
