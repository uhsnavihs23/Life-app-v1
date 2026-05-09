/**
 * ProfileTab - User profile and settings
 * 
 * Shows:
 * - User profile info
 * - Gemini API key configuration
 * - Dark mode toggle
 * - App info
 * - Logout
 */

import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { setGeminiApiKey, hasGeminiApiKey } from '../../services/GeminiService';
import {
  Moon, Sun, Bell, Key, Cloud, LogOut,
  ChevronRight, Shield, Info, Trash2, Check, ExternalLink, Sparkles
} from 'lucide-react';

export default function ProfileTab() {
  const { state, dispatch } = useApp();
  const user = state.user;
  
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    setHasApiKey(hasGeminiApiKey());
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

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const handleClearData = () => {
    if (confirm('This will delete ALL your data. Are you sure?')) {
      localStorage.clear();
      dispatch({ type: 'LOGOUT' });
    }
  };

  return (
    <div className="pb-4 fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Profile</h1>
      </div>

      {/* User Card */}
      <div className="card p-6 mb-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <span className="text-white font-bold">
            {(user?.displayName || 'U').charAt(0).toUpperCase()}
          </span>
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

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {state.dailyLogs.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Entries</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-red-500">
            {state.expenses.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Expenses</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-500">
            {state.files.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Files</p>
        </div>
      </div>

      {/* API Key Success Banner */}
      {apiKeySaved && (
        <div className="card p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.1)', borderColor: '#10b981' }}>
          <Check className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600">API Key saved! AI features are now enabled.</p>
        </div>
      )}

      {/* Gemini API Key Setup - Important! */}
      <div className="card p-4 mb-6" style={{ background: hasApiKey ? 'rgba(16,185,129,0.05)' : 'rgba(99,102,241,0.05)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
            style={{ background: hasApiKey ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)' }}>
            {hasApiKey ? <Check className="w-5 h-5 text-emerald-500" /> : <Sparkles className="w-5 h-5 text-indigo-500" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {hasApiKey ? 'AI Features Enabled ✨' : 'Enable AI Features'}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {hasApiKey 
                ? 'Gemini API is connected. Enjoy smart log classification, OCR, and AI search!' 
                : 'Add your free Gemini API key to unlock AI-powered features.'}
            </p>
            
            {!hasApiKey && !showApiKeyInput && (
              <div className="mt-3 flex gap-2">
                <button 
                  className="ios-btn ios-btn-primary text-sm py-2"
                  onClick={() => setShowApiKeyInput(true)}
                >
                  <Key className="w-4 h-4" /> Add API Key
                </button>
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ios-btn ios-btn-secondary text-sm py-2"
                >
                  Get Free Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {showApiKeyInput && (
              <div className="mt-3 space-y-2">
                <input
                  type="password"
                  className="ios-input text-sm"
                  placeholder="Paste your Gemini API key here..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button className="ios-btn ios-btn-secondary text-sm py-2 flex-1" onClick={() => { setShowApiKeyInput(false); setApiKey(''); }}>
                    Cancel
                  </button>
                  <button className="ios-btn ios-btn-primary text-sm py-2 flex-1" onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                    Save Key
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Your key is stored locally on your device only. Never shared.
                </p>
              </div>
            )}

            {hasApiKey && (
              <button 
                className="text-sm mt-2"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => { setShowApiKeyInput(true); setHasApiKey(false); }}
              >
                Update API Key
              </button>
            )}
          </div>
        </div>
      </div>

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
              aria-label="Toggle dark mode"
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

        {/* Cloud Sync */}
        <SettingRow
          icon={Cloud}
          label="Data Backup"
          subtitle="Stored locally on device"
          color="#06b6d4"
          action={
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
          }
        />

        {/* Privacy */}
        <SettingRow
          icon={Shield}
          label="Privacy"
          subtitle="Your data stays on your device"
          color="#10b981"
          action={
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
          }
        />
      </div>

      {/* Install PWA Banner */}
      <div className="card p-4 mt-6">
        <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>📱 Install as App</h3>
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          On iPhone: Tap the Share button in Safari, then "Add to Home Screen" for an app-like experience.
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Works offline • No App Store needed • Always free
        </p>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 space-y-3">
        <button
          className="ios-btn ios-btn-secondary w-full"
          style={{ color: '#ef4444' }}
          onClick={handleClearData}
        >
          <Trash2 className="w-4 h-4" /> Clear All Data
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
          <span className="text-xs">LifeLog AI v1.0 (PWA)</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Built with ❤️ • Free Forever
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
