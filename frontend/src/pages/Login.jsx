import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineDownload } from 'react-icons/ai';
import AnimatedGridBackground from '../components/AnimatedGridBackground';
import '../styles/auth-layout.css';

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth(); // Get the setUser function to update the context directly
  const { language, changeLanguage, t } = useLanguage();
  const [userType, setUserType] = useState('teacher'); // 'student' or 'teacher'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Listen for install prompt
  useEffect(() => {
    // First check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true  // iOS
      || document.referrer.includes('android-app://');  // Android Trusted Web Activity
    
    if (isStandalone) {
      console.log('[Login] App is already installed (standalone mode)');
      setIsInstallable(false);
      return;  // Don't listen for install prompt if already installed
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
      setIsInstallable(true);
      console.log('[Login] Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // If no prompt available, show instructions
      alert('To install: Tap the menu (⋮) in your browser and select "Add to Home Screen" or "Install App"');
      return;
    }
    
    // Show the install prompt
    installPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
      setIsInstallable(false);
    } else {
      console.log('User dismissed install');
    }
    
    // Clear the prompt
    setInstallPrompt(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use specific endpoint based on user type selection
      const endpoint = userType === 'teacher' ? '/auth/teacher/login' : '/auth/student/login';
      console.log('Logging in as:', userType, 'to endpoint:', endpoint);
      
      const response = await authAPI.request('POST', endpoint, formData);
      console.log('Login response:', response.data);
      
      const { token, user } = response.data;
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      // Set the user in the auth context to update the state
      setUser(user);
      
      // Dispatch custom event to notify BranchContext (for same-tab changes)
      window.dispatchEvent(new Event('auth-change'));
      
      console.log('Stored token:', sessionStorage.getItem('token'));
      console.log('Stored user:', sessionStorage.getItem('user'));
      console.log('Dispatched auth-change event');
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <AnimatedGridBackground cellSize={25} trailLength={1} fadeSpeed={0.02} />
      <div className="auth-layout__main">
        <div className="auth-layout__content">
          <div className="auth-layout__header">
            <h2 className="auth-layout__title">
              {t('login.title')}
            </h2>
          </div>

          {/* Student/Teacher Selector */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${userType === 'student' ? 'active' : ''}`}
              onClick={() => {
                setUserType('student');
                setError('');
              }}
            >
              <span className="tab-icon">📚</span> {t('login.student')}
            </button>
            <button
              type="button"
              className={`login-tab ${userType === 'teacher' ? 'active' : ''}`}
              onClick={() => {
                setUserType('teacher');
                setError('');
              }}
            >
              <span className="tab-icon">✎</span> {t('login.teacher')}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-layout__form">
            <div className="auth-layout__form-group">
              <label className="auth-layout__form-label">{t('login.email')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('login.email')}
                className="auth-layout__form-control"
              />
            </div>

            <div className="auth-layout__form-group">
              <label className="auth-layout__form-label">{t('login.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder={t('login.password')}
                  className="auth-layout__form-control"
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '20px'
                  }}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-layout__btn"
              disabled={loading}
            >
              {loading ? t('login.loggingIn') : t('login.button')}
            </button>
          </form>
        
          {/* Install App Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={handleInstallClick}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '15px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <AiOutlineDownload size={18} />
              {t('login.installApp') || 'Install App'}
            </button>
          )}

          {/* Language Selector - Bottom Centered */}
          <div className="auth-layout__footer">
            <div className="language-selector-bottom">
              <button
                onClick={() => changeLanguage('en')}
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              >
                English
              </button>
              <button
                onClick={() => changeLanguage('ru')}
                className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
              >
                Русский
              </button>
              <button
                onClick={() => changeLanguage('uz')}
                className={`lang-btn ${language === 'uz' ? 'active' : ''}`}
              >
                O'zbek
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;