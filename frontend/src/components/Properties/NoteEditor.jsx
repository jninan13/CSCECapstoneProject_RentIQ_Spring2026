import React, { useState, useEffect, useCallback } from 'react';
import { notesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const NoteEditor = ({ propertyId, compact = false, initialNote = null }) => {
  const { isAuthenticated } = useAuth();
  const [body, setBody] = useState('');
  const [savedBody, setSavedBody] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty = body !== savedBody;

  useEffect(() => {
    if (!isAuthenticated || !propertyId) return;

    if (initialNote !== null) {
      setBody(initialNote.body ?? '');
      setSavedBody(initialNote.body ?? '');
      setSavedAt(initialNote.updated_at || initialNote.created_at || null);
      return;
    }

    notesAPI.get(propertyId).then((res) => {
      setBody(res.data.body);
      setSavedBody(res.data.body);
      setSavedAt(res.data.updated_at || res.data.created_at);
    }).catch((err) => {
      if (err.response?.status !== 404) setError('Failed to load note.');
    });
  }, [propertyId, isAuthenticated, initialNote]);

  const handleSave = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setError('');
    try {
      const res = await notesAPI.upsert(propertyId, body);
      setSavedBody(res.data.body);
      setSavedAt(res.data.updated_at || res.data.created_at);
    } catch {
      setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [propertyId, body, dirty]);

  const handleClear = useCallback(async () => {
    if (!savedBody && !body) return;
    if (!window.confirm('Clear this note? This cannot be undone.')) return;
    setSaving(true);
    setError('');
    try {
      await notesAPI.remove(propertyId);
      setBody('');
      setSavedBody('');
      setSavedAt(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setBody('');
        setSavedBody('');
        setSavedAt(null);
      } else {
        setError('Failed to clear note. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }, [propertyId, body, savedBody]);

  if (!isAuthenticated) {
    return (
      <div className="text-xs text-gray-400 italic">
        <a href="/login" className="text-blue-500 hover:underline">Log in</a> to add personal notes.
      </div>
    );
  }

  const formattedDate = savedAt
    ? new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  if (compact) {
    return (
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">My Notes</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          maxLength={5000}
          className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-300"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        <div className="flex items-center justify-between mt-1">
          {formattedDate ? (
            <span className="text-gray-300 text-xs">Saved {formattedDate}</span>
          ) : <span />}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">My Notes</h3>
        {formattedDate && (
          <span className="text-xs text-gray-400">Last saved {formattedDate}</span>
        )}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add personal notes about this property..."
        rows={5}
        maxLength={5000}
        className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400"
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-300">{body.length}/5000</span>
        <div className="flex gap-2">
          {savedBody && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
};

export default NoteEditor;
