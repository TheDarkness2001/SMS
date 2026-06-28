import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { recycleBinAPI } from '../utils/api';
import '../styles/RecycleBin.css';

const defaultFilters = {
  search: '',
  type: 'all',
  language: 'all',
  importantOnly: false
};

const RecycleBinPage = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [pendingPurgeId, setPendingPurgeId] = useState(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const fetchItems = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (activeFilters.search.trim()) params.search = activeFilters.search.trim();
      if (activeFilters.type !== 'all') params.type = activeFilters.type;
      if (activeFilters.language !== 'all') params.language = activeFilters.language;
      if (activeFilters.importantOnly) params.importantOnly = 'true';

      const res = await recycleBinAPI.list(params);
      if (res.data.success) {
        setItems(res.data.data.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Recycle Bin');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllItems = async () => {
    try {
      const res = await recycleBinAPI.list();
      if (res.data.success) {
        setAllItems(res.data.data.items || []);
      }
    } catch (err) {
      // keep filtered list error handling in fetchItems
    }
  };

  const refreshRecycleBin = async (activeFilters = filters) => {
    await Promise.all([fetchAllItems(), fetchItems(activeFilters)]);
  };

  useEffect(() => {
    refreshRecycleBin();
  }, []);

  const typeOptions = useMemo(() => {
    const values = new Set();
    allItems.forEach((item) => {
      if (item.displayType) values.add(item.displayType);
      else if (item.collectionName) values.add(item.collectionName);
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const languageOptions = useMemo(() => {
    const values = new Set();
    allItems.forEach((item) => {
      if (item.languageName) values.add(item.languageName);
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const applyFilters = () => {
    fetchItems(filters);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    refreshRecycleBin(defaultFilters);
  };

  const handleRestore = async (id) => {
    try {
      await recycleBinAPI.restore(id);
      await refreshRecycleBin();
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    }
  };

  const handleToggleImportant = async (item) => {
    try {
      await recycleBinAPI.toggleImportant(item._id, { isImportant: !item.isImportant });
      await refreshRecycleBin();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update important mark');
    }
  };

  const handlePurge = async (id) => {
    if (purgeConfirm !== 'DELETE') {
      alert(t('recycleBin.typeDeleteConfirm') || 'Type DELETE to confirm permanent removal');
      return;
    }
    try {
      await recycleBinAPI.purge(id, { confirmText: 'DELETE' });
      setPendingPurgeId(null);
      setPurgeConfirm('');
      await refreshRecycleBin();
    } catch (err) {
      alert(err.response?.data?.message || 'Permanent delete failed');
    }
  };

  const handleDeleteAll = async () => {
    if (items.length === 0) return;
    if (deleteAllConfirm !== 'DELETE') {
      alert(t('recycleBin.typeDeleteConfirm') || 'Type DELETE to confirm permanent removal');
      return;
    }

    const payload = {
      confirmText: 'DELETE',
      type: filters.type,
      language: filters.language,
      search: filters.search.trim(),
      importantOnly: filters.importantOnly
    };

    if (items.length > 200) {
      const forceMsg = t('recycleBin.forceConfirm') || 'More than 200 records would be affected. Continue anyway?';
      if (!window.confirm(forceMsg)) return;
      payload.force = true;
    }

    try {
      setDeleteAllLoading(true);
      await recycleBinAPI.purgeAll(payload);
      setShowDeleteAll(false);
      setDeleteAllConfirm('');
      await refreshRecycleBin();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete all failed');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const hasActiveFilters =
    filters.search.trim() ||
    filters.type !== 'all' ||
    filters.language !== 'all' ||
    filters.importantOnly;

  return (
    <div className="container recycle-bin-page">
      <div className="recycle-bin-header">
        <div>
          <h1>{t('recycleBin.title') || 'Recycle Bin'}</h1>
          <p>{t('recycleBin.subtitle') || 'Deleted content is kept here and can be restored.'}</p>
        </div>
        {allItems.length > 0 && (
          <button
            type="button"
            className="btn btn-delete recycle-bin-delete-all-btn"
            onClick={() => {
              if (!window.confirm(t('recycleBin.deleteAllWarning') || 'This permanently removes matching items from the Recycle Bin view. Snapshots are still kept.')) return;
              setShowDeleteAll(true);
              setDeleteAllConfirm('');
            }}
          >
            {hasActiveFilters
              ? (t('recycleBin.deleteFiltered') || 'Delete filtered')
              : (t('recycleBin.deleteAll') || 'Delete all')}
          </button>
        )}
      </div>

      <div className="recycle-bin-toolbar">
        <input
          type="text"
          className="recycle-bin-search"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder={t('recycleBin.filterSearch') || 'Search by name...'}
        />
        <select
          className="recycle-bin-filter-select"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="all">{t('recycleBin.allTypes') || 'All types'}</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          className="recycle-bin-filter-select"
          value={filters.language}
          onChange={(e) => setFilters({ ...filters, language: e.target.value })}
        >
          <option value="all">{t('recycleBin.allLanguages') || 'All languages'}</option>
          {languageOptions.map((language) => (
            <option key={language} value={language}>{language}</option>
          ))}
        </select>
        <label className="recycle-bin-important-filter">
          <input
            type="checkbox"
            checked={filters.importantOnly}
            onChange={(e) => setFilters({ ...filters, importantOnly: e.target.checked })}
          />
          <span>{t('recycleBin.importantOnly') || 'Important only'}</span>
        </label>
        <button type="button" className="btn btn-primary btn-small" onClick={applyFilters}>
          {t('recycleBin.applyFilters') || 'Apply'}
        </button>
        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary btn-small" onClick={clearFilters}>
            {t('recycleBin.clearFilters') || 'Clear'}
          </button>
        )}
      </div>

      {showDeleteAll && (
        <div className="recycle-bin-bulk-purge">
          <p>
            {hasActiveFilters
              ? (t('recycleBin.deleteFilteredConfirm') || `Permanently delete ${items.length} filtered item(s)? Type DELETE to confirm.`)
              : (t('recycleBin.deleteAllConfirm') || `Permanently delete all ${items.length} item(s)? Type DELETE to confirm.`)}
          </p>
          <div className="recycle-bin-purge-form">
            <input
              type="text"
              value={deleteAllConfirm}
              onChange={(e) => setDeleteAllConfirm(e.target.value)}
              placeholder="DELETE"
            />
            <button
              type="button"
              className="btn btn-small btn-delete"
              disabled={deleteAllLoading}
              onClick={handleDeleteAll}
            >
              {deleteAllLoading ? (t('common.loading') || 'Loading...') : (t('recycleBin.confirmPurge') || 'Confirm')}
            </button>
            <button
              type="button"
              className="btn btn-small btn-secondary"
              onClick={() => { setShowDeleteAll(false); setDeleteAllConfirm(''); }}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>{t('common.loading')}...</p>
      ) : items.length === 0 ? (
        <div className="recycle-bin-empty">
          {hasActiveFilters
            ? (t('recycleBin.noResults') || 'No items match your filters')
            : (t('recycleBin.empty') || 'Recycle Bin is empty')}
        </div>
      ) : (
        <>
          <div className="recycle-bin-count">
            {t('recycleBin.showingCount') || 'Showing'} {items.length} {t('recycleBin.items') || 'item(s)'}
          </div>
          <div className="recycle-bin-table-wrap">
            <table className="recycle-bin-table">
              <thead>
                <tr>
                  <th className="recycle-bin-col-important" title={t('recycleBin.important') || 'Important'}>
                    ★
                  </th>
                  <th>{t('recycleBin.type') || 'Type'}</th>
                  <th>{t('recycleBin.name') || 'Name'}</th>
                  <th>{t('recycleBin.language') || 'Language'}</th>
                  <th>{t('recycleBin.deletedAt') || 'Deleted'}</th>
                  <th>{t('recycleBin.deletedBy') || 'Deleted by'}</th>
                  <th>{t('recycleBin.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className={item.isImportant ? 'recycle-bin-row-important' : ''}>
                    <td className="recycle-bin-col-important">
                      <button
                        type="button"
                        className={`recycle-bin-star-btn ${item.isImportant ? 'is-important' : ''}`}
                        title={item.isImportant
                          ? (t('recycleBin.unmarkImportant') || 'Remove important mark')
                          : (t('recycleBin.markImportant') || 'Mark as important')}
                        onClick={() => handleToggleImportant(item)}
                      >
                        {item.isImportant ? '★' : '☆'}
                      </button>
                    </td>
                    <td>{item.displayType || item.collectionName}</td>
                    <td>{item.displayName}</td>
                    <td>{item.languageName || '—'}</td>
                    <td>{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '—'}</td>
                    <td>{item.deletedBy || '—'}</td>
                    <td className="recycle-bin-actions">
                      <button type="button" className="btn btn-small btn-primary" onClick={() => handleRestore(item._id)}>
                        {t('recycleBin.restore') || 'Restore'}
                      </button>
                      {pendingPurgeId === item._id ? (
                        <div className="recycle-bin-purge-form">
                          <input
                            type="text"
                            value={purgeConfirm}
                            onChange={(e) => setPurgeConfirm(e.target.value)}
                            placeholder="DELETE"
                          />
                          <button type="button" className="btn btn-small btn-delete" onClick={() => handlePurge(item._id)}>
                            {t('recycleBin.confirmPurge') || 'Confirm'}
                          </button>
                          <button type="button" className="btn btn-small btn-secondary" onClick={() => { setPendingPurgeId(null); setPurgeConfirm(''); }}>
                            {t('common.cancel') || 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-small btn-delete"
                          onClick={() => {
                            if (!window.confirm(t('recycleBin.purgeWarning') || 'This removes the item from the Recycle Bin view. A snapshot is still kept.')) return;
                            setPendingPurgeId(item._id);
                            setPurgeConfirm('');
                          }}
                        >
                          {t('recycleBin.purge') || 'Permanently delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default RecycleBinPage;
