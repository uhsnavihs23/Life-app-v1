/**
 * RemindersTab - Create and manage reminders with local notifications
 * 
 * Users can:
 * - Create reminders with title, description, date & time
 * - Toggle recurring or one-time
 * - See upcoming reminders
 * - Notifications are scheduled via the browser Notification API
 *   (in a real iOS app, this would use UNUserNotificationCenter)
 */

import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { NotificationService } from '../../services/NotificationService';
import { format, isFuture, isPast } from 'date-fns';
import {
  Bell, Plus, Trash2, Check, Clock, Repeat, X, BellRing
} from 'lucide-react';
import type { Reminder } from '../../models/types';

export default function RemindersTab() {
  const { state, addReminder, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [notifPermission, setNotifPermission] = useState(NotificationService.getPermissionStatus());

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recInterval, setRecInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    // Set default dateTime to now + 1 hour
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    setDateTime(format(d, "yyyy-MM-dd'T'HH:mm"));
  }, [showForm]);

  const handleRequestPermission = async () => {
    const granted = await NotificationService.requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleCreateReminder = () => {
    if (!title.trim() || !dateTime) return;
    addReminder(title.trim(), description.trim(), dateTime, isRecurring, isRecurring ? recInterval : undefined);
    
    // Schedule notification
    if (notifPermission === 'granted') {
      NotificationService.scheduleNotification(
        `⏰ ${title.trim()}`,
        description.trim() || 'Time for your reminder!',
        new Date(dateTime)
      );
    }

    setTitle(''); setDescription(''); setIsRecurring(false);
    setShowForm(false);
  };

  const upcoming = state.reminders
    .filter(r => !r.isCompleted && isFuture(new Date(r.dateTime)))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  const past = state.reminders
    .filter(r => r.isCompleted || isPast(new Date(r.dateTime)))
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Reminders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Stay on top of your tasks
          </p>
        </div>
        <button
          className="ios-btn ios-btn-primary"
          style={{ padding: '10px 16px' }}
          onClick={() => setShowForm(true)}
          aria-label="Add reminder"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Notification Permission Banner */}
      {notifPermission !== 'granted' && NotificationService.isSupported() && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <BellRing className="w-8 h-8 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Enable Notifications</p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Get alerted when your reminders are due</p>
          </div>
          <button
            className="ios-btn ios-btn-primary text-sm py-2 px-3"
            onClick={handleRequestPermission}
          >
            Allow
          </button>
        </div>
      )}

      {/* New Reminder Form */}
      {showForm && (
        <div className="card p-4 mb-4 slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>New Reminder</h3>
            <button onClick={() => setShowForm(false)} aria-label="Close form">
              <X className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>
          <div className="space-y-3">
            <input className="ios-input" placeholder="Title" value={title}
              onChange={e => setTitle(e.target.value)} autoFocus />
            <textarea className="ios-input resize-none" placeholder="Description (optional)"
              value={description} onChange={e => setDescription(e.target.value)}
              style={{ minHeight: 60 }} />
            <input className="ios-input" type="datetime-local" value={dateTime}
              onChange={e => setDateTime(e.target.value)} />
            
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                style={{
                  background: isRecurring ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-alt)',
                  color: isRecurring ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
                onClick={() => setIsRecurring(!isRecurring)}
              >
                <Repeat className="w-4 h-4" />
                <span className="text-sm font-medium">Recurring</span>
              </button>
              {isRecurring && (
                <select className="ios-input flex-1" value={recInterval}
                  onChange={e => setRecInterval(e.target.value as 'daily' | 'weekly' | 'monthly')}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>

            <button className="ios-btn ios-btn-primary w-full" onClick={handleCreateReminder}
              disabled={!title.trim()}>
              <Bell className="w-4 h-4" /> Set Reminder
            </button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <Clock className="w-4 h-4" /> Upcoming ({upcoming.length})
      </h2>
      {upcoming.length === 0 ? (
        <div className="card p-6 text-center mb-6">
          <Bell className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No upcoming reminders</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {upcoming.map(r => (
            <ReminderCard key={r.id} reminder={r} dispatch={dispatch} />
          ))}
        </div>
      )}

      {/* Past / Completed */}
      {past.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <Check className="w-4 h-4" /> Past ({past.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map(r => (
              <ReminderCard key={r.id} reminder={r} dispatch={dispatch} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReminderCard({ reminder: r, dispatch }: { reminder: Reminder; dispatch: React.Dispatch<any> }) {
  return (
    <div className="card p-3 flex items-start gap-3">
      <button
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
        style={{
          borderColor: r.isCompleted ? 'var(--color-success)' : 'var(--color-border)',
          background: r.isCompleted ? 'var(--color-success)' : 'transparent',
        }}
        onClick={() => dispatch({ type: 'TOGGLE_REMINDER', id: r.id })}
        aria-label={r.isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {r.isCompleted && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${r.isCompleted ? 'line-through' : ''}`}
          style={{ color: 'var(--color-text)' }}>
          {r.title}
        </p>
        {r.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {r.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock className="w-3 h-3" />
            {format(new Date(r.dateTime), 'MMM d, h:mm a')}
          </span>
          {r.isRecurring && (
            <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}>
              <Repeat className="w-3 h-3" /> {r.recurrenceInterval}
            </span>
          )}
        </div>
      </div>
      <button
        className="p-1.5 rounded-lg transition-all"
        style={{ color: 'var(--color-text-tertiary)' }}
        onClick={() => dispatch({ type: 'DELETE_REMINDER', id: r.id })}
        aria-label="Delete reminder"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
