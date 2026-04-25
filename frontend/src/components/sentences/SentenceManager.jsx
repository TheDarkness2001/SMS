import React, { useState, useEffect } from 'react';
import { sentenceAPI } from '../../utils/api';

const SentenceManager = ({ t }) => {
  const [sentences, setSentences] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [_categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ english: '', uzbek: '', category: 'General', difficulty: 'medium' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchSentences();
    fetchCategories();
  }, []);

  const fetchSentences = async () => {
    setLoading(true);
    try {
      const res = await sentenceAPI.getAll();
      if (res.data.success) setSentences(res.data.data.sentences || []);
    } catch (err) {
      console.error('Error fetching sentences:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await sentenceAPI.getCategories();
      if (res.data.success) setCategories(res.data.data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.english.trim() || !form.uzbek.trim()) return;
    try {
      if (editingId) {
        await sentenceAPI.update(editingId, form);
      } else {
        await sentenceAPI.create(form);
      }
      setForm({ english: '', uzbek: '', category: 'General', difficulty: 'medium' });
      setEditingId(null);
      fetchSentences();
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving sentence');
    }
  };

  const handleEdit = (sentence) => {
    setEditingId(sentence._id);
    setForm({
      english: sentence.english,
      uzbek: sentence.uzbek,
      category: sentence.category || 'General',
      difficulty: sentence.difficulty || 'medium'
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await sentenceAPI.delete(id);
      fetchSentences();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting sentence');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ english: '', uzbek: '', category: 'General', difficulty: 'medium' });
  };

  return (
    <div className="sentence-manager">
      <form onSubmit={handleSubmit} className="word-form">
        <h3>{editingId ? (t('sentences.editSentence') || 'Edit Sentence') : (t('sentences.addSentence') || 'Add New Sentence')}</h3>
        <div className="form-row lesson-form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label className="form-label">{t('sentences.english') || 'English Sentence'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('sentences.englishPlaceholder') || 'e.g., Hello, how are you?'}
              value={form.english}
              onChange={(e) => setForm({ ...form, english: e.target.value })}
              required
            />
          </div>
          <div className="form-field" style={{ flex: 2 }}>
            <label className="form-label">{t('sentences.uzbek') || 'Uzbek Translation'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('sentences.uzbekPlaceholder') || 'e.g., Salom, yaxshimisiz?'}
              value={form.uzbek}
              onChange={(e) => setForm({ ...form, uzbek: e.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">{t('sentences.category') || 'Category'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="General"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">{t('sentences.difficulty') || 'Difficulty'}</label>
            <select
              className="form-input"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="easy">{t('sentences.easy') || 'Easy'}</option>
              <option value="medium">{t('sentences.medium') || 'Medium'}</option>
              <option value="hard">{t('sentences.hard') || 'Hard'}</option>
            </select>
          </div>
          <div className="form-field form-field-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? (t('homework.update') || 'Update') : (t('homework.add') || 'Add')}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                {t('homework.cancel') || 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </form>

      {loading ? (
        <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
      ) : sentences.length === 0 ? (
        <div className="no-data">{t('sentences.noSentences') || 'No sentences yet.'}</div>
      ) : (
        <div className="sentences-list">
          {sentences.map(sentence => (
            <div key={sentence._id} className="sentence-item">
              <div className="sentence-content">
                <div className="sentence-english">{sentence.english}</div>
                <div className="sentence-uzbek">{sentence.uzbek}</div>
                <div className="sentence-meta">
                  <span className="sentence-category">{sentence.category}</span>
                  <span className={`sentence-difficulty ${sentence.difficulty}`}>{sentence.difficulty}</span>
                </div>
              </div>
              <div className="sentence-actions">
                <button className="btn btn-small btn-edit" onClick={() => handleEdit(sentence)}>
                  {t('homework.edit') || 'Edit'}
                </button>
                <button className="btn btn-small btn-delete" onClick={() => handleDelete(sentence._id)}>
                  {t('homework.delete') || 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SentenceManager;
