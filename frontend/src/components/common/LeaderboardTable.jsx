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

  const renderTableHead = () => (
    <thead>
      <tr>
        <th>{t('sentences.rank') || 'Rank'}</th>
        <th>{t('homework.studentName') || 'Student Name'}</th>
        {columns.map(col => (
          <th key={col.key}>{col.label}</th>
        ))}
      </tr>
    </thead>
  );

  const showCurrentInTop10 = currentStudent &&
    leaderboard.some(s => s.studentId === currentStudent.studentId);

  const showCurrentBelow = currentStudent && !showCurrentInTop10;

  return (
    <div className="sentence-leaderboard">
      <h3 className="practice-section-title">{title}</h3>

      {loading ? (
        <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
      ) : leaderboard.length === 0 && !currentStudent ? (
        <div className="no-data">{emptyMessage}</div>
      ) : (
        <>
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              {renderTableHead()}
              <tbody>
                {leaderboard.map((student, index) => {
                  const rank = student.rank ?? index + 1;
                  const isCurrent = currentStudent && student.studentId === currentStudent.studentId;
                  return renderRow(student, rank, isCurrent ? 'current-student-row' : '');
                })}
              </tbody>
            </table>
          </div>

          {showCurrentBelow && (
            <div className="leaderboard-your-rank-section">
              <p className="leaderboard-your-rank-label">
                {t('sentences.yourRank') || t('listening.yourRank') || 'Your rank'}
              </p>
              <div className="leaderboard-table-wrapper">
                <table className="leaderboard-table leaderboard-table-your-rank">
                  {renderTableHead()}
                  <tbody>
                    {renderRow(currentStudent, currentStudent.rank, 'current-student-row')}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardTable;
