/**
 * ProfileTab - User profile and settings
 * 
 * Ported refinements:
 * - Comprehensive "Clear All Data" (Local + Cloud)
 * - Cleaned up redundant AI sections
 * - Professional Settings UI
 */

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { setGeminiApiKey, hasGeminiApiKey, isApiKeyFromEnv } from '../../services/GeminiService';
import { isSupabaseConfigured, getSupabaseClient } from '../../services/SupabaseService';
import {
  Moon, Sun, Bell, Key, LogOut,
  ChevronRight, Shield, Info, Trash2, Check, ExternalLink, Sparkles, Database, Camera, X
} from 'lucide-react';

export default function ProfileTab() {
  const { state, dispatch, updateProfile } = useApp();
  const user = state.user;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyFromEnv, setApiKeyFromEnv] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    setHasApiKey(hasGeminiApiKey());
    setApiKeyFromEnv(isApiKeyFromEnv());
  }, []);

  const handleSaveProfile = async () => {
    await updateProfile(editName, editEmail);
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
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        await updateProfile(user?.displayName || '', user?.email || '', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const handleClearData = async () => {
    if (!confirm('This will PERMANENTLY DELETE all your data from this device AND the cloud. This cannot be undone. Proceed?')) return;
    if (!confirm('FINAL WARNING: Everything will be erased. Proceed?')) return;
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear Cloud Data
    if (isSupabaseConfigured() && user?.id) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const tables = ['daily_logs', 'expenses', 'food_entries', 'sleep_entries', 'activities', 'reminders', 'list_items', 'health_metrics', 'activity_timeline'];
          await Promise.allSettled(tables.map(t => client.from(t).delete().eq('user_id', user.id)));
          await client.from('profiles').delete().eq('id', user.id);
        }
      } catch (err) { console.error('Cloud wipe error:', err); }
    }
    
    dispatch({ type: 'LOGOUT' });
    alert('All data has been erased successfully.');
  };

  const profileImage = user?.avatarUrl;

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Profile</h1>
      </div>

      {/* User Card */}
      <div className="card p-6 mb-6 text-center shadow-sm">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-md"
            style={{ background: profileImage ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold">{(user?.displayName || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-indigo-500 text-white border-2 border-white dark:border-gray-900">
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>
        
        {editMode ? (
          <div className="space-y-3 mt-4 max-w-xs mx-auto">
            <input className="ios-input text-center" placeholder="Display Name" value={editName} onChange={e => setEditName(e.target.value)} />
            <input className="ios-input text-center" placeholder="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            <div className="flex gap-2">
              <button className="ios-btn ios-btn-secondary flex-1" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="ios-btn ios-btn-primary flex-1" onClick={handleSaveProfile}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{user?.displayName || 'User'}</h2>
            <p className="text-sm opacity-50">{user?.email || 'user@example.com'}</p>
            <button className="text-xs font-bold uppercase tracking-wider text-indigo-500 mt-4" onClick={() => { setEditMode(true); setEditName(user?.displayName || ''); setEditEmail(user?.email || ''); }}>
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* AI Key Management (Simplified) */}
      {!apiKeyFromEnv && !hasApiKey && (
        <div className="card p-4 mb-6" style={{ background: 'rgba(99,102,241,0.05)' }}>
           <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
             <Sparkles className="w-4 h-4 text-indigo-500" /> Enable AI Assistant
           </h3>
           <p className="text-xs opacity-50 mb-3">Add a Gemini API key to unlock natural language logging and smart search.</p>
           {!showApiKeyInput ? (
             <button className="ios-btn ios-btn-primary text-xs py-2 h-auto rounded-lg" onClick={() => setShowApiKeyInput(true)}>Add Key</button>
           ) : (
             <div className="space-y-2">
                <input type="password" className="ios-input text-sm" placeholder="Paste key..." value={apiKey} onChange={e => setApiKey(e.target.value)} autoFocus />
                <div className="flex gap-2">
                  <button className="ios-btn ios-btn-secondary text-xs py-2 flex-1" onClick={() => setShowApiKeyInput(false)}>Cancel</button>
                  <button className="ios-btn ios-btn-primary text-xs py-2 flex-1" onClick={handleSaveApiKey}>Save</button>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Settings List */}
      <h2 className="text-lg font-bold mb-3 px-1">Settings</h2>
      <div className="card divide-y overflow-hidden shadow-sm">
        <SettingRow icon={Moon} label="Dark Mode" subtitle={state.darkMode ? 'On' : 'Off'} color="#6366f1" 
          action={<button className={`w-11 h-6 rounded-full relative transition-all ${state.darkMode ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}>
            <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all ${state.darkMode ? 'left-5.5' : 'left-0.5'}`} />
          </button>} />
        
        <SettingRow icon={Database} label="Cloud Sync" subtitle={isSupabaseConfigured() ? 'Active' : 'Local Only'} color="#10b981" 
          action={isSupabaseConfigured() ? <Check className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-red-400" />} />
      </div>

      {/* Danger Zone */}
      <div className="mt-8 space-y-3">
        <button className="ios-btn bg-red-50 text-red-500 dark:bg-red-950/20 w-full font-bold" onClick={handleClearData}>
          <Trash2 className="w-4 h-4" /> Erase All Data
        </button>
        <button className="ios-btn ios-btn-secondary w-full font-bold" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

      <p className="text-center text-[10px] opacity-30 mt-8 font-bold uppercase tracking-widest">LifeLog AI v1.5 · 2026</p>
    </div>
  );
}

function SettingRow({ icon: Icon, label, subtitle, color, action }: any) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs opacity-50">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
