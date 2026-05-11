import React, { useEffect, useRef, useState, useCallback } from 'react';
import { videoLessonAPI } from '../../utils/api';

const YT_API_SRC = 'https://www.youtube.com/iframe_api';
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

// Ensures the YT iframe API is loaded exactly once, resolves when window.YT is ready
let ytApiPromise = null;
const loadYouTubeApi = () => {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = YT_API_SRC;
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
};

const VideoLessonPlayer = ({ video, initialTimestamp = 0, onProgressUpdate, onCompleted, onClose, onOpenTest }) => {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const lastSaveRef = useRef(0);
  const watchAccumRef = useRef(0);
  const sessionReportedRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(initialTimestamp || 0);
  const [watchPercent, setWatchPercent] = useState(video?.progress?.watchPercent || 0);
  const [completed, setCompleted] = useState(!!video?.progress?.completed);

  const threshold = video?.requireWatchPercent || 70;

  const sendProgress = useCallback(async (opts = {}) => {
    try {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const cur = p.getCurrentTime() || 0;
      const dur = p.getDuration() || duration || 1;
      const percent = Math.min(100, Math.round((cur / dur) * 100));
      const delta = watchAccumRef.current;
      watchAccumRef.current = 0;
      const res = await videoLessonAPI.trackWatch(video._id, {
        watchPercent: percent,
        lastTimestamp: Math.floor(cur),
        delta: Math.floor(delta),
        newSession: opts.newSession || false
      });
      if (res.data.success) {
        const prog = res.data.data.progress;
        setWatchPercent(prog.watchPercent);
        if (prog.completed && !completed) {
          setCompleted(true);
          if (onCompleted) onCompleted(prog);
        }
        if (onProgressUpdate) onProgressUpdate(prog);
      }
    } catch (err) {
      // Silent - network hiccups shouldn't break playback
    }
  }, [video, duration, completed, onCompleted, onProgressUpdate]);

  // Mount player
  useEffect(() => {
    if (!video?.youtubeVideoId) return undefined;
    let destroyed = false;
    loadYouTubeApi().then((YT) => {
      if (destroyed || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: video.youtubeVideoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.floor(initialTimestamp || 0)
        },
        events: {
          onReady: (e) => {
            setDuration(e.target.getDuration() || 0);
            if (initialTimestamp && initialTimestamp > 5) {
              e.target.seekTo(initialTimestamp, true);
            }
            if (!sessionReportedRef.current) {
              sessionReportedRef.current = true;
              // Mark new session (increments rewatchCount)
              sendProgress({ newSession: true });
            }
          },
          onStateChange: (e) => {
            // 1 = playing
            setIsPlaying(e.data === 1);
          },
          onPlaybackRateChange: (e) => {
            setRate(e.data);
          }
        }
      });
    });
    return () => {
      destroyed = true;
      // Final flush on unmount
      sendProgress();
      try {
        if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      } catch (e) {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.youtubeVideoId]);

  // Ticker: accumulate watch time + periodic progress save
  useEffect(() => {
    const tick = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const cur = p.getCurrentTime() || 0;
      setCurrentTime(cur);
      if (isPlaying) watchAccumRef.current += 1;
      const now = Date.now();
      if (now - lastSaveRef.current > 5000) {
        lastSaveRef.current = now;
        sendProgress();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isPlaying, sendProgress]);

  // Flush on page hide
  useEffect(() => {
    const handler = () => sendProgress();
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('beforeunload', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, [sendProgress]);

  const handleRate = (r) => {
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      playerRef.current.setPlaybackRate(r);
      setRate(r);
    }
  };

  const handleMarkComplete = async () => {
    try {
      const res = await videoLessonAPI.markComplete(video._id);
      if (res.data.success) {
        setCompleted(true);
        setWatchPercent(100);
        if (onCompleted) onCompleted(res.data.data.progress);
      }
    } catch (err) {
      console.error('mark complete error', err);
    }
  };

  const handleFullscreen = () => {
    const el = hostRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  };

  const testUnlocked = watchPercent >= threshold;

  return (
    <div className="video-player-root">
      <div className="video-player-header">
        <div className="video-player-title">
          <h2>{video.title}</h2>
          {video.levelId?.name && <span className="video-chip">{video.levelId.name}</span>}
        </div>
        <button className="video-btn video-btn-ghost" onClick={onClose}>✕ Close</button>
      </div>

      <div className="video-player-shell">
        <div className="video-player-wrapper">
          <div ref={hostRef} className="video-player-iframe" />
        </div>
      </div>

      <div className="video-player-controls">
        <div className="video-player-progress-label">
          {Math.floor(currentTime)}s / {Math.floor(duration)}s &middot; {watchPercent}% watched
        </div>
        <div className="video-player-rate-group">
          <span className="video-player-rate-label">Speed</span>
          {PLAYBACK_RATES.map(r => (
            <button
              key={r}
              className={`video-btn-rate ${rate === r ? 'active' : ''}`}
              onClick={() => handleRate(r)}
            >
              {r}x
            </button>
          ))}
        </div>
        <div className="video-player-action-group">
          <button className="video-btn video-btn-secondary" onClick={handleFullscreen}>⛶ Fullscreen</button>
          <button
            className="video-btn video-btn-primary"
            disabled={completed}
            onClick={handleMarkComplete}
          >
            {completed ? '✓ Completed' : 'Mark as Completed'}
          </button>
          {onOpenTest && (
            <button
              className="video-btn video-btn-accent"
              disabled={!testUnlocked}
              onClick={() => onOpenTest(video)}
              title={testUnlocked ? '' : `Watch ${threshold}% to unlock`}
            >
              Take Topic Test
            </button>
          )}
        </div>
      </div>

      {video.description && (
        <div className="video-player-description">{video.description}</div>
      )}
    </div>
  );
};

export default VideoLessonPlayer;
