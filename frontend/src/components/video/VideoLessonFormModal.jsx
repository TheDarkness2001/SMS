import React, { useEffect, useState } from 'react';
import { languageAPI, levelAPI, lessonAPI, videoLessonAPI } from '../../utils/api';

const extractYouTubeId = (url) => {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return '';
};

const emptyForm = {
  title: '',
  description: '',
  youtubeUrl: '',
  thumbnail: '',
  duration: 0,
  languageId: '',
  levelId: '',
  lessonId: '',
  difficulty: 'beginner',
  topic: '',
  requireWatchPercent: 70
};

const VideoLessonFormModal = ({ editVideo, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editVideo) {
      setForm({
        title: editVideo.title || '',
        description: editVideo.description || '',
        youtubeUrl: editVideo.youtubeUrl || '',
        thumbnail: editVideo.thumbnail || '',
        duration: editVideo.duration || 0,
        languageId: editVideo.languageId?._id || editVideo.languageId || '',
        levelId: editVideo.levelId?._id || editVideo.levelId || '',
        lessonId: editVideo.lessonId?._id || editVideo.lessonId || '',
        difficulty: editVideo.difficulty || 'beginner',
        topic: editVideo.topic || '',
        requireWatchPercent: editVideo.requireWatchPercent || 70
      });
    } else {
      setForm(emptyForm);
    }
  }, [editVideo]);

  useEffect(() => {
    languageAPI.getAll().then(res => {
      if (res.data.success) setLanguages(res.data.data.languages || []);
    });
  }, []);

  useEffect(() => {
    if (!form.languageId) {
      setLevels([]);
      return;
    }
    levelAPI.getByLanguage(form.languageId).then(res => {
      if (res.data.success) setLevels(res.data.data.levels || []);
    });
  }, [form.languageId]);

  useEffect(() => {
    if (!form.levelId) {
      setLessons([]);
      return;
    }
    lessonAPI.getAllLessons(form.levelId).then(res => {
      if (res.data.success) setLessons(res.data.data.lessons || []);
    });
  }, [form.levelId]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const previewId = extractYouTubeId(form.youtubeUrl);

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) return setError('Title is required');
    if (!form.youtubeUrl.trim()) return setError('YouTube URL is required');
    if (!extractYouTubeId(form.youtubeUrl)) return setError('Invalid YouTube URL');
    if (!form.languageId) return setError('Select a language');
    if (!form.levelId) return setError('Select a level');
    setSaving(true);
    try {
      const payload = {
        ...form,
        lessonId: form.lessonId || null
      };
      const res = editVideo
        ? await videoLessonAPI.update(editVideo._id, payload)
        : await videoLessonAPI.create(payload);
      if (res.data.success) {
        onSaved && onSaved(res.data.data.videoLesson);
        onClose && onClose();
      } else {
        setError(res.data.message || 'Save failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div className="video-modal" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <h3>{editVideo ? 'Edit Video Lesson' : 'Add Video Lesson'}</h3>
          <button className="video-btn video-btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="video-modal-body">
          {error && <div className="video-modal-error">{error}</div>}

          <label className="video-field">
            <span>Title *</span>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </label>

          <label className="video-field">
            <span>Description</span>
            <textarea rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>

          <div className="video-field-row">
            <label className="video-field">
              <span>Language *</span>
              <select value={form.languageId} onChange={(e) => { set('languageId', e.target.value); set('levelId', ''); set('lessonId', ''); }}>
                <option value="">-- Select --</option>
                {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </label>
            <label className="video-field">
              <span>Level *</span>
              <select value={form.levelId} onChange={(e) => { set('levelId', e.target.value); set('lessonId', ''); }} disabled={!form.languageId}>
                <option value="">-- Select --</option>
                {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </label>
            <label className="video-field">
              <span>Lesson (optional)</span>
              <select value={form.lessonId} onChange={(e) => set('lessonId', e.target.value)} disabled={!form.levelId}>
                <option value="">-- None --</option>
                {lessons.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </label>
          </div>

          <label className="video-field">
            <span>YouTube URL *</span>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.youtubeUrl}
              onChange={(e) => set('youtubeUrl', e.target.value)}
            />
          </label>

          {previewId && (
            <div className="video-preview-wrapper">
              <iframe
                title="preview"
                src={`https://www.youtube.com/embed/${previewId}`}
                frameBorder="0"
                allowFullScreen
              />
            </div>
          )}

          <div className="video-field-row">
            <label className="video-field">
              <span>Difficulty</span>
              <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="video-field">
              <span>Topic</span>
              <input type="text" value={form.topic} onChange={(e) => set('topic', e.target.value)} />
            </label>
            <label className="video-field">
              <span>Duration (sec)</span>
              <input
                type="number"
                min="0"
                value={form.duration}
                onChange={(e) => set('duration', Number(e.target.value) || 0)}
              />
            </label>
            <label className="video-field">
              <span>Unlock Test At %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.requireWatchPercent}
                onChange={(e) => set('requireWatchPercent', Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <label className="video-field">
            <span>Custom Thumbnail URL (optional)</span>
            <input type="text" value={form.thumbnail} onChange={(e) => set('thumbnail', e.target.value)} />
          </label>
        </div>
        <div className="video-modal-footer">
          <button className="video-btn video-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="video-btn video-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editVideo ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoLessonFormModal;
