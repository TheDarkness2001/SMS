import React, { useState, useEffect } from 'react';
import { listeningAPI } from '../../utils/api';
import LeaderboardTable from '../common/LeaderboardTable';

const ListeningLeaderboard = ({ t }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await listeningAPI.getLeaderboard();
      if (res.data.success) {
        setLeaderboard(res.data.data.leaderboard || []);
        setCurrentStudent(res.data.data.currentStudent || null);
      }
    } catch (err) {
      console.error('Error fetching listening leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LeaderboardTable
      t={t}
      title={t('listening.top10Title') || 'Top 10 Listeners'}
      loading={loading}
      emptyMessage={t('listening.noLeaderboardData') || 'No practice data yet. Start practicing to appear on the leaderboard!'}
      leaderboard={leaderboard}
      currentStudent={currentStudent}
      columns={[
        { key: 'attempts', label: t('sentences.attempts') || 'Attempts', render: (s) => s.totalAttempts },
        { key: 'exercises', label: t('listening.exercisesDone') || 'Exercises', render: (s) => s.totalExercises },
        { key: 'accuracy', label: t('sentences.accuracy') || 'Accuracy', render: (s) => `${s.avgBestAccuracy}%` }
      ]}
    />
  );
};

export default ListeningLeaderboard;
