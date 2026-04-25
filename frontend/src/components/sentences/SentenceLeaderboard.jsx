import React, { useState, useEffect } from 'react';
import { sentenceAPI } from '../../utils/api';

const SentenceLeaderboard = ({ t }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await sentenceAPI.getLeaderboard();
      if (res.data.success) {
        setLeaderboard(res.data.data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  return (
    <div className="sentence-leaderboard">
      <h3 className="practice-section-title">
        {t('sentences.top10Title') || 'Top 10 Sentence Writers'}
      </h3>

      {loading ? (
        <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
      ) : leaderboard.length === 0 ? (
        <div className="no-data">
          {t('sentences.noLeaderboardData') || 'No practice data yet. Start practicing to appear on the leaderboard!'}
        </div>
      ) : (
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>{t('sentences.rank') || 'Rank'}</th>
                <th>{t('homework.studentName') || 'Student'}</th>
                <th>{t('sentences.attempts') || 'Attempts'}</th>
                <th>{t('sentences.correct') || 'Correct'}</th>
                <th>{t('sentences.accuracy') || 'Accuracy'}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((student, index) => (
                <tr key={student.studentId} className={index < 3 ? 'top-rank' : ''}>
                  <td className="rank-cell">{getRankIcon(index)}</td>
                  <td className="name-cell">
                    <div className="student-name">{student.name}</div>
                    {student.studentRoll && (
                      <div className="student-roll">{student.studentRoll}</div>
                    )}
                  </td>
                  <td>{student.totalAttempts}</td>
                  <td>{student.totalCorrect}</td>
                  <td>
                    <div className="accuracy-cell">
                      <span className={`accuracy-badge ${student.accuracy >= 80 ? 'high' : student.accuracy >= 50 ? 'medium' : 'low'}`}>
                        {student.accuracy}%
                      </span>
                    </div>
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

export default SentenceLeaderboard;
