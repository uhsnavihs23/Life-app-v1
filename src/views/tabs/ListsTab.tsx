/**
 * ListsTab - Track movies, music, books, podcasts, etc.
 * 
 * Users can:
 * - Add items to different lists
 * - Rate items (1-5 stars)
 * - Mark status (watched, want to watch, etc.)
 * - See all their lists organized
 */

import { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { LIST_TYPES, formatDate, type ListItem } from '../../models/types';
import {
  Plus, Star, X, Film, Music, BookOpen, Mic, Tv, Gamepad2, FileText,
  Check, Clock, Heart
} from 'lucide-react';

type ListType = ListItem['listType'];

export default function ListsTab() {
  const { state, addListItem, dispatch } = useApp();
  const [selectedList, setSelectedList] = useState<ListType>('movie');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newRating, setNewRating] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<ListItem['status']>('completed');

  const filteredItems = useMemo(() => {
    return state.listItems
      .filter(item => item.listType === selectedList)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.listItems, selectedList]);

  const getListIcon = (type: ListType) => {
    switch (type) {
      case 'movie': return Film;
      case 'music': return Music;
      case 'book': return BookOpen;
      case 'podcast': return Mic;
      case 'show': return Tv;
      case 'game': return Gamepad2;
      default: return FileText;
    }
  };

  const getStatusLabel = (status: ListItem['status']) => {
    switch (status) {
      case 'watched': return 'Watched';
      case 'listening': return 'Listening';
      case 'reading': return 'Reading';
      case 'playing': return 'Playing';
      case 'completed': return 'Completed';
      case 'want_to': return 'Want to';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addListItem(selectedList, newTitle.trim(), newNote.trim() || undefined, newRating || undefined, newStatus);
    setNewTitle('');
    setNewNote('');
    setNewRating(0);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      dispatch({ type: 'DELETE_LIST_ITEM', id });
    }
  };

  const currentListConfig = LIST_TYPES.find(l => l.id === selectedList);
  const Icon = getListIcon(selectedList);

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>My Lists</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Movies, music, books & more
          </p>
        </div>
        <button
          className="ios-btn ios-btn-primary"
          style={{ padding: '10px 16px' }}
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* List Type Tabs */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {LIST_TYPES.map(list => {
            const ListIcon = getListIcon(list.id as ListType);
            const count = state.listItems.filter(i => i.listType === list.id).length;
            return (
              <button
                key={list.id}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  selectedList === list.id ? 'bg-indigo-500 text-white' : ''
                }`}
                style={selectedList !== list.id ? { background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' } : {}}
                onClick={() => setSelectedList(list.id as ListType)}
              >
                <ListIcon className="w-4 h-4" />
                {list.label}
                {count > 0 && (
                  <span className="text-xs opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card p-4 mb-4 slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              {currentListConfig?.emoji} Add to {currentListConfig?.label}
            </h3>
            <button onClick={() => setShowAddForm(false)}>
              <X className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>
          
          <div className="space-y-3">
            <input
              className="ios-input"
              placeholder={`${currentListConfig?.label.slice(0, -1)} title...`}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
            
            <input
              className="ios-input"
              placeholder="Notes (optional)"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />

            {/* Rating */}
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setNewRating(star === newRating ? 0 : star)}
                    className="p-1"
                  >
                    <Star
                      className="w-6 h-6 transition-all"
                      fill={star <= newRating ? '#f59e0b' : 'none'}
                      color={star <= newRating ? '#f59e0b' : '#94a3b8'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Status</p>
              <div className="flex gap-2 flex-wrap">
                {(['completed', 'in_progress', 'want_to'] as const).map(status => (
                  <button
                    key={status}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      newStatus === status ? 'bg-indigo-500 text-white' : ''
                    }`}
                    style={newStatus !== status ? { background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' } : {}}
                    onClick={() => setNewStatus(status)}
                  >
                    {status === 'completed' && <Check className="w-3 h-3 inline mr-1" />}
                    {status === 'in_progress' && <Clock className="w-3 h-3 inline mr-1" />}
                    {status === 'want_to' && <Heart className="w-3 h-3 inline mr-1" />}
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="ios-btn ios-btn-primary w-full"
              onClick={handleAdd}
              disabled={!newTitle.trim()}
            >
              <Plus className="w-4 h-4" /> Add {currentListConfig?.label.slice(0, -1)}
            </button>
          </div>
        </div>
      )}

      {/* List Items */}
      {filteredItems.length === 0 ? (
        <div className="card p-8 text-center">
          <Icon className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            No {currentListConfig?.label.toLowerCase()} yet
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Tap + to add your first one!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <div key={item.id} className="card p-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Icon className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                {item.note && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.note}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.rating && item.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className="w-3 h-3"
                          fill={star <= item.rating! ? '#f59e0b' : 'none'}
                          color={star <= item.rating! ? '#f59e0b' : '#d1d5db'}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: item.status === 'completed' ? 'rgba(16,185,129,0.1)' : 
                                  item.status === 'in_progress' ? 'rgba(59,130,246,0.1)' : 'rgba(244,63,94,0.1)',
                      color: item.status === 'completed' ? '#10b981' : 
                             item.status === 'in_progress' ? '#3b82f6' : '#f43f5e',
                    }}>
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {filteredItems.length > 0 && (
        <div className="card p-4 mt-4">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            {currentListConfig?.emoji} {currentListConfig?.label} Stats
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-lg font-bold text-indigo-500">{filteredItems.length}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Total</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-lg font-bold text-green-500">
                {filteredItems.filter(i => i.status === 'completed').length}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Completed</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-lg font-bold text-amber-500">
                {filteredItems.filter(i => i.rating && i.rating >= 4).length}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Favorites</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
