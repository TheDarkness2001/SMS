import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { recycleBinAPI } from '../utils/api';
import '../styles/RecycleBin.css';

const RecycleBinPage = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [pendingPurgeId, setPendingPurgeId] = useState(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await recycleBinAPI.list();
      if (res.data.success) {
        setItems(res.data.data.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Recycle Bin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleRestore = async (id) => {
    try {
      await recycleBinAPI.restore(id);
      await fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
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
      await fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Permanent delete failed');
    }
  };

  return (
    <div className="container recycle-bin-page">
      <div className="recycle-bin-header">
        <h1>{t('recycleBin.title') || 'Recycle Bin'}</h1>
        <p>{t('recycleBin.subtitle') || 'Deleted content is kept here and can be restored.'}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>{t('common.loading')}...</p>
      ) : items.length === 0 ? (
        <div className="recycle-bin-empty">
          {t('recycleBin.empty') || 'Recycle Bin is empty'}
        </div>
      ) : (
        <div className="recycle-bin-table-wrap">
          <table className="recycle-bin-table">
            <thead>
              <tr>
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
                <tr key={item._id}>
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
      )}
    </div>
  );
};

export default RecycleBinPage;
