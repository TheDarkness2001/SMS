import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

import SentencePractice from '../components/sentences/SentencePractice';
import SentenceLeaderboard from '../components/sentences/SentenceLeaderboard';
import SentenceManager from '../components/sentences/SentenceManager';

const SentencesPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('practice');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      const role = (stored.role || '').toLowerCase().trim();
      setIsAdmin(role === 'founder' || stored.permissions?.canManageHomework === true);
    } catch (e) {
      setIsAdmin(false);
    }
  }, []);

  const tabs = [
    { id: 'practice', label: t('sentences.practice') || 'Practice' },
    { id: 'leaderboard', label: t('sentences.leaderboard') || 'Leaderboard' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'manage', label: t('sentences.manage') || 'Manage Sentences' });
  }

  return (
    <div className="homework-page">
      <div className="homework-header">
        <h1>{t('sentences.title') || 'Sentences'}</h1>
        <p>{t('sentences.subtitle') || 'Practice sentence writing and see the leaderboard'}</p>
      </div>

      <div className="homework-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="homework-content">
        {activeTab === 'practice' && <SentencePractice t={t} />}
        {activeTab === 'leaderboard' && <SentenceLeaderboard t={t} />}
        {activeTab === 'manage' && isAdmin && <SentenceManager t={t} />}
      </div>
    </div>
  );
};

export default SentencesPage;
