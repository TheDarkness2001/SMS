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
    if (user?.permissions?.canManageVideoLessons === true) return true;
    if (user?.permissions?.canManageHomework === true) return true;
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      const storedRole = (stored.role || '').toLowerCase().trim();
      if (storedRole === 'founder') return true;
      if (stored.permissions?.canManageVideoLessons === true) return true;
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
  const [presetVideo, setPresetVideo] = useState(null); // { languageId, levelId } pre-fill for create
  const [testBuilderVideo, setTestBuilderVideo] = useState(null);

  // Student Progress (admin tab)
  const [groupProgress, setGroupProgress] = useState([]);
  const [groupProgressLoading, setGroupProgressLoading] = useState(false);

  // ===== Manage tab state (hierarchical: Subjects → Levels → Videos) =====
  const [manageView, setManageView] = useState('languages'); // languages | levels | videos
  const [manageLanguages, setManageLanguages] = useState([]);
  const [manageLevels, setManageLevels] = useState([]);
  const [manageVideos, setManageVideos] = useState([]);
  const [manageLanguage, setManageLanguage] = useState(null); // selected language obj
  const [manageLevel, setManageLevel] = useState(null); // selected level obj
  const [manageLoading, setManageLoading] = useState(false);

  // Inline create-form state
  const [newLangName, setNewLangName] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [editingLangId, setEditingLangId] = useState(null);
  const [editingLangName, setEditingLangName] = useState('');
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [editingLevelName, setEditingLevelName] = useState('');

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
  const [allVideos, setAllVideos] = useState([]); // kept for legacy handleDeleteFromManage sync
    // eslint-disable-next-line no-unused-vars
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
      setManageVideos(prev => prev.filter(v => v._id !== video._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  // ===== Manage tab: Subject (Language) CRUD =====
  const loadManageLanguages = async () => {
    setManageLoading(true);
    try {
      const res = await languageAPI.getAll();
      if (res.data.success) setManageLanguages(res.data.data.languages || []);
    } catch (e) {} finally { setManageLoading(false); }
  };
  useEffect(() => {
    if (activeTab === 'manage' && isAdmin && manageView === 'languages') loadManageLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin, manageView]);

  const handleCreateLanguage = async () => {
    const name = newLangName.trim();
    if (!name) return;
    try {
      await languageAPI.create({ name });
      setNewLangName('');
      loadManageLanguages();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };
  const handleUpdateLanguage = async (id) => {
    const name = editingLangName.trim();
    if (!name) return;
    try {
      await languageAPI.update(id, { name });
      setEditingLangId(null);
      setEditingLangName('');
      loadManageLanguages();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };
  const handleDeleteLanguage = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"? This may affect all levels and video lessons inside.`)) return;
    try {
      await languageAPI.delete(id);
      loadManageLanguages();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  // ===== Manage tab: Level CRUD =====
  const loadManageLevels = async (langId) => {
    setManageLoading(true);
    try {
      const res = await levelAPI.getByLanguage(langId);
      if (res.data.success) {
        const sorted = (res.data.data.levels || []).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setManageLevels(sorted);
      }
    } catch (e) {} finally { setManageLoading(false); }
  };
  const handleOpenLanguageLevels = async (lang) => {
    setManageLanguage(lang);
    setManageView('levels');
    await loadManageLevels(lang._id);
  };
  const handleCreateLevel = async () => {
    if (!manageLanguage) return;
    const name = newLevelName.trim();
    if (!name) return;
    try {
      await levelAPI.create({ name, languageId: manageLanguage._id });
      setNewLevelName('');
      loadManageLevels(manageLanguage._id);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };
  const handleUpdateLevel = async (id) => {
    const name = editingLevelName.trim();
    if (!name) return;
    try {
      await levelAPI.update(id, { name });
      setEditingLevelId(null);
      setEditingLevelName('');
      if (manageLanguage) loadManageLevels(manageLanguage._id);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };
  const handleDeleteLevel = async (id, name) => {
    if (!window.confirm(`Delete level "${name}"? This may affect all video lessons inside.`)) return;
    try {
      await levelAPI.delete(id);
      if (manageLanguage) loadManageLevels(manageLanguage._id);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  // ===== Manage tab: Videos under selected Level =====
  const loadManageVideos = async (levelId) => {
    setManageLoading(true);
    try {
      const res = await videoLessonAPI.getAll({ levelId });
      if (res.data.success) setManageVideos((res.data.data.videoLessons || []).sort(sortByLevel));
    } catch (e) {} finally { setManageLoading(false); }
  };
  const handleOpenLevelVideos = async (level) => {
    setManageLevel(level);
    setManageView('videos');
    await loadManageVideos(level._id);
  };
  const handleCreateVideoInLevel = () => {
    setEditVideo(null);
    setPresetVideo({
      languageId: manageLanguage?._id || '',
      levelId: manageLevel?._id || ''
    });
    setFormOpen(true);
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
          <div className="manage-hierarchy">
            {/* Breadcrumb */}
            <div className="manage-breadcrumb">
              <button
                className={`crumb-btn ${manageView === 'languages' ? 'crumb-active' : ''}`}
                onClick={() => { setManageView('languages'); setManageLanguage(null); setManageLevel(null); }}
              >
                📚 Subjects
              </button>
              {manageLanguage && (
                <>
                  <span className="crumb-sep">›</span>
                  <button
                    className={`crumb-btn ${manageView === 'levels' ? 'crumb-active' : ''}`}
                    onClick={() => { setManageView('levels'); setManageLevel(null); }}
                  >
                    {manageLanguage.name}
                  </button>
                </>
              )}
              {manageLevel && (
                <>
                  <span className="crumb-sep">›</span>
                  <button className={`crumb-btn ${manageView === 'videos' ? 'crumb-active' : ''}`}>
                    {manageLevel.name}
                  </button>
                </>
              )}
            </div>

            {/* LEVEL 1: SUBJECTS (Languages) */}
            {manageView === 'languages' && (
              <>
                <div className="video-toolbar">
                  <h3 className="practice-section-title" style={{ margin: 0 }}>Subjects ({manageLanguages.length})</h3>
                  <button className="video-btn video-btn-ghost" onClick={loadManageLanguages}>🔄 Refresh</button>
                </div>
                <div className="manage-add-form">
                  <input
                    type="text"
                    className="manage-input"
                    placeholder="New subject name (e.g. English, History, Math)"
                    value={newLangName}
                    onChange={(e) => setNewLangName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLanguage()}
                  />
                  <button className="video-btn video-btn-primary" onClick={handleCreateLanguage}>+ Add Subject</button>
                </div>
                {manageLoading ? (
                  <div className="video-empty">Loading...</div>
                ) : manageLanguages.length === 0 ? (
                  <div className="video-empty">No subjects yet. Create one above to get started.</div>
                ) : (
                  <div className="manage-grid">
                    {manageLanguages.map(lang => (
                      <div key={lang._id} className="manage-card">
                        {editingLangId === lang._id ? (
                          <>
                            <input
                              type="text"
                              className="manage-input"
                              value={editingLangName}
                              onChange={(e) => setEditingLangName(e.target.value)}
                              autoFocus
                            />
                            <div className="manage-card-actions">
                              <button className="video-btn video-btn-primary" onClick={() => handleUpdateLanguage(lang._id)}>Save</button>
                              <button className="video-btn video-btn-ghost" onClick={() => { setEditingLangId(null); setEditingLangName(''); }}>Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="manage-card-title" onClick={() => handleOpenLanguageLevels(lang)} style={{ cursor: 'pointer' }}>
                              📚 {lang.name}
                            </div>
                            <div className="manage-card-actions">
                              <button className="video-btn video-btn-primary" onClick={() => handleOpenLanguageLevels(lang)}>Open ›</button>
                              <button className="video-btn video-btn-secondary" onClick={() => { setEditingLangId(lang._id); setEditingLangName(lang.name); }}>Edit</button>
                              <button className="video-btn video-btn-danger" onClick={() => handleDeleteLanguage(lang._id, lang.name)}>Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* LEVEL 2: LEVELS inside a Subject */}
            {manageView === 'levels' && manageLanguage && (
              <>
                <div className="video-toolbar">
                  <h3 className="practice-section-title" style={{ margin: 0 }}>Levels in {manageLanguage.name} ({manageLevels.length})</h3>
                  <button className="video-btn video-btn-ghost" onClick={() => loadManageLevels(manageLanguage._id)}>🔄 Refresh</button>
                </div>
                <div className="manage-add-form">
                  <input
                    type="text"
                    className="manage-input"
                    placeholder="New level name (e.g. Blackhole 1, Beginner, Unit 1)"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLevel()}
                  />
                  <button className="video-btn video-btn-primary" onClick={handleCreateLevel}>+ Add Level</button>
                </div>
                {manageLoading ? (
                  <div className="video-empty">Loading...</div>
                ) : manageLevels.length === 0 ? (
                  <div className="video-empty">No levels yet. Create the first level above.</div>
                ) : (
                  <div className="manage-grid">
                    {manageLevels.map(lvl => (
                      <div key={lvl._id} className="manage-card">
                        {editingLevelId === lvl._id ? (
                          <>
                            <input
                              type="text"
                              className="manage-input"
                              value={editingLevelName}
                              onChange={(e) => setEditingLevelName(e.target.value)}
                              autoFocus
                            />
                            <div className="manage-card-actions">
                              <button className="video-btn video-btn-primary" onClick={() => handleUpdateLevel(lvl._id)}>Save</button>
                              <button className="video-btn video-btn-ghost" onClick={() => { setEditingLevelId(null); setEditingLevelName(''); }}>Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="manage-card-title" onClick={() => handleOpenLevelVideos(lvl)} style={{ cursor: 'pointer' }}>
                              🎯 {lvl.name}
                            </div>
                            <div className="manage-card-actions">
                              <button className="video-btn video-btn-primary" onClick={() => handleOpenLevelVideos(lvl)}>Open ›</button>
                              <button className="video-btn video-btn-secondary" onClick={() => { setEditingLevelId(lvl._id); setEditingLevelName(lvl.name); }}>Edit</button>
                              <button className="video-btn video-btn-danger" onClick={() => handleDeleteLevel(lvl._id, lvl.name)}>Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* LEVEL 3: VIDEOS inside a Level */}
            {manageView === 'videos' && manageLevel && (
              <>
                <div className="video-toolbar">
                  <h3 className="practice-section-title" style={{ margin: 0 }}>Videos in {manageLevel.name} ({manageVideos.length})</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="video-btn video-btn-ghost" onClick={() => loadManageVideos(manageLevel._id)}>🔄 Refresh</button>
                    <button className="video-btn video-btn-primary" onClick={handleCreateVideoInLevel}>+ Add Video Lesson</button>
                  </div>
                </div>
                {manageLoading ? (
                  <div className="video-empty">Loading...</div>
                ) : manageVideos.length === 0 ? (
                  <div className="video-empty">No video lessons yet. Click "+ Add Video Lesson" to create one.</div>
                ) : (
                  <div className="manage-videos-table-wrap">
                    <table className="manage-videos-table">
                      <thead>
                        <tr>
                          <th>Thumbnail</th>
                          <th>Title</th>
                          <th>Topic</th>
                          <th>Difficulty</th>
                          <th>Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manageVideos.map(v => (
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
              </>
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
          preset={presetVideo}
          onClose={() => { setFormOpen(false); setPresetVideo(null); }}
          onSaved={() => {
            setFormOpen(false);
            setPresetVideo(null);
            if (view === 'videos') fetchVideos();
            if (activeTab === 'manage' && manageView === 'videos' && manageLevel) loadManageVideos(manageLevel._id);
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
