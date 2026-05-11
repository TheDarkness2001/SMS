import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { videoLessonAPI, languageAPI, levelAPI, examGroupsAPI } from '../utils/api';
import VideoLessonCard from '../components/video/VideoLessonCard';
import VideoLessonPlayer from '../components/video/VideoLessonPlayer';
import VideoLessonFormModal from '../components/video/VideoLessonFormModal';
import TopicTestBuilder from '../components/video/TopicTestBuilder';
import '../styles/Homework.css';
import '../styles/VideoLessons.css';

const sortByLevel = (a, b) => {
  const ln = (a.levelId?.name || '').localeCompare(b.levelId?.name || '', undefined, { numeric: true, sensitivity: 'base' });
  if (ln !== 0) return ln;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

// Safe translation: return fallback if key is missing (t() returns the key itself on miss)
const tt = (t, key, fallback) => {
  const v = t(key);
  return !v || v === key ? fallback : v;
};

const VideoLessons = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isStudent = user?.userType === 'student';
  const isAdmin = (() => {
    const role = (user?.role || '').toLowerCase().trim();
    if (role === 'founder') return true;
    if (user?.permissions?.canManageHomework === true) return true;
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      const storedRole = (stored.role || '').toLowerCase().trim();
      if (storedRole === 'founder') return true;
      if (stored.permissions?.canManageHomework === true) return true;
    } catch (e) {}
    return false;
  })();

  const [activeTab, setActiveTab] = useState('browse');
  const [view, setView] = useState('languages'); // languages | levels | videos | player

  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editVideo, setEditVideo] = useState(null);
  const [testBuilderVideo, setTestBuilderVideo] = useState(null);

  // Student Progress (admin tab)
  const [groupProgress, setGroupProgress] = useState([]);
  const [groupProgressLoading, setGroupProgressLoading] = useState(false);

  // Fetch languages
  useEffect(() => {
    const run = async () => {
      try {
        const res = await languageAPI.getAll();
        if (res.data.success) {
          let langs = res.data.data.languages || [];
          if (isStudent) {
            try {
              const gr = await examGroupsAPI.getAll();
              if (gr.data.success) {
                const names = (gr.data.data || [])
                  .map(g => (g.subjectName || g.subject?.name || '').toLowerCase().trim())
                  .filter(Boolean);
                if (names.length) {
                  langs = langs.filter(l => names.includes((l.name || '').toLowerCase().trim()));
                }
              }
            } catch (e) {}
          }
          setLanguages(langs);
        }
      } catch (e) {
        setError('Failed to load languages');
      }
    };
    run();
  }, [isStudent]);

  // Fetch levels when language picked
  useEffect(() => {
    if (!selectedLanguageId) {
      setLevels([]);
      return;
    }
    levelAPI.getByLanguage(selectedLanguageId).then(res => {
      if (res.data.success) setLevels(res.data.data.levels || []);
    }).catch(() => setLevels([]));
  }, [selectedLanguageId]);

  // Fetch videos when level picked
  const fetchVideos = async () => {
    if (!selectedLevelId) return;
    setLoading(true);
    setError('');
    try {
      const res = await videoLessonAPI.getAll({ levelId: selectedLevelId });
      if (res.data.success) {
        setVideos((res.data.data.videoLessons || []).sort(sortByLevel));
      } else {
        setError(res.data.message || 'Failed to load videos');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'videos' && selectedLevelId) fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedLevelId]);

  // Continue Watching feed (all videos with progress > 0 not completed)
  const [continueWatching, setContinueWatching] = useState([]);
  useEffect(() => {
    if (activeTab !== 'continue') return;
    videoLessonAPI.getAll().then(res => {
      if (res.data.success) {
        const list = (res.data.data.videoLessons || [])
          .filter(v => v.progress && v.progress.watchPercent > 0 && !v.progress.completed)
          .sort((a, b) => new Date(b.progress.lastAccessAt || 0) - new Date(a.progress.lastAccessAt || 0));
        setContinueWatching(list);
      }
    }).catch(() => {});
  }, [activeTab]);

  // Admin progress tab
  useEffect(() => {
    if (activeTab !== 'progress' || !isAdmin) return;
    setGroupProgressLoading(true);
    videoLessonAPI.getGroupProgress().then(res => {
      if (res.data.success) setGroupProgress(res.data.data.groups || []);
    }).catch(() => {}).finally(() => setGroupProgressLoading(false));
  }, [activeTab, isAdmin]);

  const handleSelectLanguage = (langId) => {
    setSelectedLanguageId(langId);
    setSelectedLevelId('');
    setView('levels');
  };
  const handleSelectLevel = (levelId) => {
    setSelectedLevelId(levelId);
    setView('videos');
  };
  const goBack = () => {
    if (view === 'player') setView('videos');
    else if (view === 'videos') setView('levels');
    else if (view === 'levels') setView('languages');
  };

  const handlePlay = (video) => {
    setCurrentVideo(video);
    setView('player');
  };

  const handleCreate = () => {
    setEditVideo(null);
    setFormOpen(true);
  };
  const handleEdit = (video) => {
    setEditVideo(video);
    setFormOpen(true);
  };
  const handleDelete = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This removes all student progress and the topic test.`)) return;
    try {
      await videoLessonAPI.remove(video._id);
      setVideos(prev => prev.filter(v => v._id !== video._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };
  const handleOpenTest = (video) => {
    navigate(`/video-lessons/${video._id}/test`);
  };

  const tabs = useMemo(() => {
    const base = [{ id: 'browse', label: 'Browse' }];
    if (!isAdmin) base.push({ id: 'continue', label: 'Continue Watching' });
    if (isAdmin) base.push({ id: 'manage', label: 'Manage All' });
    if (isAdmin) base.push({ id: 'progress', label: 'Student Progress' });
    return base;
  }, [isAdmin]);

  // Fetch all videos for Manage tab
  const [allVideos, setAllVideos] = useState([]);
  const [allVideosLoading, setAllVideosLoading] = useState(false);
  const loadAllVideos = async () => {
    setAllVideosLoading(true);
    try {
      const res = await videoLessonAPI.getAll();
      if (res.data.success) {
        setAllVideos((res.data.data.videoLessons || []).sort(sortByLevel));
      }
    } catch (e) {
      // ignore
    } finally {
      setAllVideosLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'manage' && isAdmin) loadAllVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  const handleDeleteFromManage = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This removes all student progress and the topic test.`)) return;
    try {
      await videoLessonAPI.remove(video._id);
      setAllVideos(prev => prev.filter(v => v._id !== video._id));
      setVideos(prev => prev.filter(v => v._id !== video._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  return (
    <div className="homework-page video-lessons-page">
      <div className="page-header">
        <h1>{tt(t, 'sidebar.videoLessons', 'Video Lessons')}</h1>
        <p className="page-subtitle">Watch topic explanation videos and test your understanding.</p>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setView('languages');
              setCurrentVideo(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'browse' && (
          <>
            {isAdmin && (
              <div className="video-admin-bar">
                <span className="video-admin-bar-label">👑 Admin Controls</span>
                <button className="video-btn video-btn-primary" onClick={handleCreate}>
                  + Add Video Lesson
                </button>
                <button className="video-btn video-btn-secondary" onClick={() => setActiveTab('manage')}>
                  📂 Manage All Videos
                </button>
              </div>
            )}
            {view !== 'languages' && (
              <div className="video-breadcrumb">
                <button className="video-btn video-btn-ghost" onClick={goBack}>← Back</button>
                <span className="video-crumb-text">
                  {languages.find(l => l._id === selectedLanguageId)?.name || ''}
                  {selectedLevelId && ' / '}
                  {levels.find(l => l._id === selectedLevelId)?.name || ''}
                </span>
              </div>
            )}

            {view === 'languages' && (
              <>
                <h3 className="practice-section-title">Select a Language</h3>
                <div className="practice-levels-grid">
                  {languages.map(lang => (
                    <div key={lang._id} className="practice-level-card" onClick={() => handleSelectLanguage(lang._id)}>
                      <div className="practice-level-name">{lang.name}</div>
                    </div>
                  ))}
                  {!languages.length && <div className="video-empty">No languages available.</div>}
                </div>
              </>
            )}

            {view === 'levels' && (
              <>
                <h3 className="practice-section-title">Select a Level</h3>
                <div className="practice-levels-grid">
                  {levels.map(lv => (
                    <div key={lv._id} className="practice-level-card" onClick={() => handleSelectLevel(lv._id)}>
                      <div className="practice-level-name">{lv.name}</div>
                    </div>
                  ))}
                  {!levels.length && <div className="video-empty">No levels available.</div>}
                </div>
              </>
            )}

            {view === 'videos' && (
              <>
                <div className="video-toolbar">
                  <h3 className="practice-section-title" style={{ margin: 0 }}>Video Lessons</h3>
                  {isAdmin && (
                    <button className="video-btn video-btn-primary" onClick={handleCreate}>+ Add Video Lesson</button>
                  )}
                </div>
                {error && <div className="video-modal-error">{error}</div>}
                {loading ? (
                  <div className="video-empty">Loading...</div>
                ) : videos.length === 0 ? (
                  <div className="video-empty">No video lessons yet.</div>
                ) : (
                  <div className="video-grid">
                    {videos.map(v => (
                      <VideoLessonCard
                        key={v._id}
                        video={v}
                        isAdmin={isAdmin}
                        onPlay={handlePlay}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
                {isAdmin && videos.length > 0 && (
                  <div className="video-admin-tips">
                    Tip: click "Edit" on a card, then open Topic Test to build/update test questions.
                  </div>
                )}
              </>
            )}

            {view === 'player' && currentVideo && (
              <>
                <VideoLessonPlayer
                  video={currentVideo}
                  initialTimestamp={currentVideo.progress?.lastTimestamp || 0}
                  onClose={() => setView('videos')}
                  onCompleted={() => fetchVideos()}
                  onProgressUpdate={(p) => {
                    setCurrentVideo(prev => prev ? { ...prev, progress: p } : prev);
                    setVideos(prev => prev.map(v => v._id === currentVideo._id ? { ...v, progress: p } : v));
                  }}
                  onOpenTest={handleOpenTest}
                />
                {isAdmin && (
                  <div className="video-admin-actions">
                    <button className="video-btn video-btn-accent" onClick={() => setTestBuilderVideo(currentVideo)}>
                      Build / Edit Topic Test
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'continue' && (
          <div>
            <h3 className="practice-section-title">Continue Watching</h3>
            {continueWatching.length === 0 ? (
              <div className="video-empty">Nothing in progress yet. Start a video from the Browse tab.</div>
            ) : (
              <div className="video-grid">
                {continueWatching.map(v => (
                  <VideoLessonCard
                    key={v._id}
                    video={v}
                    isAdmin={false}
                    onPlay={(vid) => {
                      setCurrentVideo(vid);
                      setActiveTab('browse');
                      setView('player');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && isAdmin && (
          <div>
            <div className="video-toolbar">
              <h3 className="practice-section-title" style={{ margin: 0 }}>All Video Lessons ({allVideos.length})</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="video-btn video-btn-ghost" onClick={loadAllVideos}>🔄 Refresh</button>
                <button className="video-btn video-btn-primary" onClick={handleCreate}>+ Add Video Lesson</button>
              </div>
            </div>
            {allVideosLoading ? (
              <div className="video-empty">Loading...</div>
            ) : allVideos.length === 0 ? (
              <div className="video-empty">No video lessons yet. Click "+ Add Video Lesson" to create one.</div>
            ) : (
              <div className="manage-videos-table-wrap">
                <table className="manage-videos-table">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Title</th>
                      <th>Language</th>
                      <th>Level</th>
                      <th>Topic</th>
                      <th>Difficulty</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVideos.map(v => (
                      <tr key={v._id}>
                        <td>
                          {v.thumbnail || v.youtubeVideoId ? (
                            <img
                              src={v.thumbnail || `https://img.youtube.com/vi/${v.youtubeVideoId}/default.jpg`}
                              alt={v.title}
                              className="manage-video-thumb"
                            />
                          ) : (
                            <div className="manage-video-thumb manage-video-thumb-placeholder">▶</div>
                          )}
                        </td>
                        <td className="manage-video-title">{v.title}</td>
                        <td>{v.languageId?.name || '-'}</td>
                        <td>{v.levelId?.name || '-'}</td>
                        <td>{v.topic || '-'}</td>
                        <td><span className={`video-card-chip video-card-chip-${v.difficulty || 'easy'}`}>{v.difficulty || 'easy'}</span></td>
                        <td>{v.isActive ? '✅' : '❌'}</td>
                        <td className="manage-video-actions">
                          <button className="video-btn video-btn-ghost" onClick={() => { setCurrentVideo(v); setActiveTab('browse'); setView('player'); }} title="Preview">▶</button>
                          <button className="video-btn video-btn-secondary" onClick={() => handleEdit(v)}>Edit</button>
                          <button className="video-btn video-btn-accent" onClick={() => setTestBuilderVideo(v)}>Test</button>
                          <button className="video-btn video-btn-danger" onClick={() => handleDeleteFromManage(v)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && isAdmin && (
          <div>
            <h3 className="practice-section-title">Student Video Progress by Group</h3>
            {groupProgressLoading ? (
              <div className="video-empty">Loading...</div>
            ) : groupProgress.length === 0 ? (
              <div className="video-empty">No groups with students found.</div>
            ) : (
              <div className="progress-groups-list">
                {groupProgress.filter(g => g.students.length > 0).map(g => (
                  <div key={g.groupId} className="progress-group-card">
                    <div className="progress-group-header-static">
                      <div className="progress-group-title">
                        <span className="progress-group-icon">🎥</span>
                        <div>
                          <div className="progress-group-name">{g.groupName}</div>
                          <div className="progress-group-subject">{g.subjectName} &middot; {g.videos.length} videos</div>
                        </div>
                      </div>
                      <div className="progress-group-stats">
                        <span>{g.students.length} students</span>
                      </div>
                    </div>
                    <div className="progress-group-body">
                      <table className="progress-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Completed</th>
                            <th>Completion %</th>
                            <th>Avg Watch %</th>
                            <th>Exams Taken</th>
                            <th>Avg Best Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.students.map(s => (
                            <tr key={s._id}>
                              <td>{s.name}</td>
                              <td>{s.completed} / {s.totalVideos}</td>
                              <td>{s.completionPercent}%</td>
                              <td>{s.avgWatch}%</td>
                              <td>{s.examsTaken}</td>
                              <td>{s.avgScore}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <VideoLessonFormModal
          editVideo={editVideo}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            if (view === 'videos') fetchVideos();
          }}
        />
      )}

      {testBuilderVideo && (
        <TopicTestBuilder
          video={testBuilderVideo}
          onClose={() => setTestBuilderVideo(null)}
        />
      )}
    </div>
  );
};

export default VideoLessons;
