import React from 'react';

const LeaderboardTable = ({
  t,
  title,
  loading,
  emptyMessage,
  leaderboard = [],
  currentStudent = null,
  columns = [
    { key: 'attempts', label: 'Attempts', render: (s) => s.totalAttempts },
    { key: 'score', label: 'Accuracy', render: (s) => `${s.accuracy ?? s.avgBestAccuracy ?? 0}%` }
  ]
}) => {
  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const renderRow = (student, rank, extraClass = '') => (
    <tr key={`${student.studentId}-${rank}`} className={`${rank <= 3 ? 'top-rank' : ''} ${extraClass}`.trim()}>
      <td className="rank-cell">{getRankIcon(rank)}</td>
      <td className="name-cell">
        <div className="student-name">{student.name}</div>
        {student.studentRoll && <div className="student-roll">{student.studentRoll}</div>}
      </td>
      {columns.map(col => (
        <td key={col.key}>{col.render(student)}</td>
      ))}
    </tr>
  );

  const showCurrentInTop10 = currentStudent &&
    leaderboard.some(s => s.studentId === currentStudent.studentId);

  return (
    <div className="sentence-leaderboard">
      <h3 className="practice-section-title">{title}</h3>

      {loading ? (
        <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
      ) : leaderboard.length === 0 && !currentStudent ? (
        <div className="no-data">{emptyMessage}</div>
      ) : (
        <div className="leaderboard-table-wrapper">
          {currentStudent && (
            <div className="current-student-rank-banner">
              <span className="current-rank-label">
                {t('listening.yourRank') || 'Your rank'}:
              </span>
              <span className="current-rank-value">#{currentStudent.rank}</span>
              <span className="current-rank-of">
                {t('listening.outOf') || 'of'} {currentStudent.totalStudents}{' '}
                {t('listening.students') || 'students'}
              </span>
            </div>
          )}

          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>{t('sentences.rank') || 'Rank'}</th>
                <th>{t('homework.studentName') || 'Student'}</th>
                {columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentStudent && !showCurrentInTop10 && renderRow(
                currentStudent,
                currentStudent.rank,
                'current-student-row'
              )}
              {leaderboard.map((student, index) => {
                const rank = student.rank ?? index + 1;
                const isCurrent = currentStudent && student.studentId === currentStudent.studentId;
                return renderRow(student, rank, isCurrent ? 'current-student-row' : '');
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable;
