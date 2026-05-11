import React from 'react';

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const VideoLessonCard = ({ video, onPlay, onEdit, onDelete, isAdmin }) => {
  const progress = video.progress || {};
  const watchPercent = progress.watchPercent || 0;
  const completed = progress.completed;
  const threshold = video.requireWatchPercent || 70;
  const testUnlocked = watchPercent >= threshold;

  const thumb =
    video.thumbnail ||
    (video.youtubeVideoId
      ? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`
      : '');

  return (
    <div className="video-card">
      <div className="video-card-thumb-wrap" onClick={() => onPlay && onPlay(video)}>
        {thumb ? (
          <img src={thumb} alt={video.title} className="video-card-thumb" />
        ) : (
          <div className="video-card-thumb video-card-thumb-placeholder">
            <span>▶</span>
          </div>
        )}
        {video.duration ? (
          <span className="video-card-duration-badge">{formatDuration(video.duration)}</span>
        ) : null}
        {completed && <span className="video-card-badge video-card-badge-done">✓ Completed</span>}
        {!completed && testUnlocked && (
          <span className="video-card-badge video-card-badge-test">Test Ready</span>
        )}
        <div className="video-card-play-overlay">
          <span>▶</span>
        </div>
      </div>
      <div className="video-card-body">
        <div className="video-card-title" title={video.title}>
          {video.title}
        </div>
        <div className="video-card-meta">
          {video.levelId?.name && <span className="video-card-chip">{video.levelId.name}</span>}
          {video.difficulty && (
            <span className={`video-card-chip video-card-chip-${video.difficulty}`}>
              {video.difficulty}
            </span>
          )}
        </div>
        {watchPercent > 0 && (
          <div className="video-card-progress-wrap">
            <div className="video-card-progress-bar">
              <div
                className={`video-card-progress-fill ${completed ? 'done' : ''}`}
                style={{ width: `${watchPercent}%` }}
              />
            </div>
            <span className="video-card-progress-label">{watchPercent}%</span>
          </div>
        )}
        <div className="video-card-actions">
          <button className="video-btn video-btn-primary" onClick={() => onPlay && onPlay(video)}>
            {watchPercent > 0 && !completed ? 'Resume' : completed ? 'Rewatch' : 'Watch'}
          </button>
          {isAdmin && (
            <>
              <button className="video-btn video-btn-secondary" onClick={() => onEdit && onEdit(video)}>
                Edit
              </button>
              <button className="video-btn video-btn-danger" onClick={() => onDelete && onDelete(video)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoLessonCard;
