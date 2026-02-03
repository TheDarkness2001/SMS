import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { teacherAttendanceAPI } from '../utils/api';
import '../styles/AttendanceStatistics.css';
import { AiOutlineBarChart, AiOutlinePieChart, AiOutlineLineChart, AiOutlineCalendar } from 'react-icons/ai';

const AttendanceStatistics = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('month'); // month, week, all
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};

      if (timeRange === 'month') {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        params.startDate = firstDay.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      } else if (timeRange === 'week') {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.startDate = weekAgo.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      }

      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await teacherAttendanceAPI.getAdminStats(params);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [timeRange, dateRange, t]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const getPercentage = (value, total) => {
    return total === 0 ? 0 : ((value / total) * 100).toFixed(1);
  };

  if (loading) {
    return <div className="loading-container">{t('common.loading')}</div>;
  }

  if (!stats) {
    return <div className="error-container">{t('common.noData')}</div>;
  }

  const overview = stats.overview || {};
  const verificationBreakdown = stats.verificationBreakdown || {};
  const modeBreakdown = stats.modeBreakdown || {};

  return (
    <div className="statistics-container">
      <div className="stats-header">
        <h1>
          <AiOutlineBarChart size={32} /> {t('attendanceStats.title')}
        </h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <div className="range-buttons">
          <button
            className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            {t('attendanceStats.last7Days')}
          </button>
          <button
            className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            {t('attendanceStats.thisMonth')}
          </button>
          <button
            className={`range-btn ${timeRange === 'all' ? 'active' : ''}`}
            onClick={() => setTimeRange('all')}
          >
            {t('attendanceStats.allTime')}
          </button>
        </div>

        <div className="custom-date-range">
          <label>
            <AiOutlineCalendar size={16} />
            {t('attendanceStats.from')}
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </label>
          <label>
            <AiOutlineCalendar size={16} />
            {t('attendanceStats.to')}
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="stat-card total">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>{t('attendanceStats.totalRecords')}</h3>
            <p className="card-value">{overview.totalRecords || 0}</p>
          </div>
        </div>

        <div className="stat-card verified">
          <div className="card-icon">✓</div>
          <div className="card-content">
            <h3>{t('attendanceStats.verified')}</h3>
            <p className="card-value">{overview.verified || 0}</p>
            <p className="card-percentage">
              {getPercentage(overview.verified, overview.totalRecords)}%
            </p>
          </div>
        </div>

        <div className="stat-card review">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>{t('attendanceStats.needsReview')}</h3>
            <p className="card-value">{overview.needsReview || 0}</p>
            <p className="card-percentage">
              {getPercentage(overview.needsReview, overview.totalRecords)}%
            </p>
          </div>
        </div>

        <div className="stat-card rejected">
          <div className="card-icon">✗</div>
          <div className="card-content">
            <h3>{t('attendanceStats.rejected')}</h3>
            <p className="card-value">{overview.rejected || 0}</p>
            <p className="card-percentage">
              {getPercentage(overview.rejected, overview.totalRecords)}%
            </p>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="charts-grid">
        <div className="chart-card">
          <h2>
            <AiOutlinePieChart size={20} /> {t('attendanceStats.statusDistribution')}
          </h2>
          <div className="chart-content">
            <div className="status-grid">
              <div className="status-item present">
                <div className="status-label">{t('attendance.present')}</div>
                <div className="status-bar">
                  <div
                    className="status-fill"
                    style={{
                      width: `${getPercentage(overview.present, overview.totalRecords)}%`
                    }}
                  />
                </div>
                <div className="status-stats">
                  <span>{overview.present || 0}</span>
                  <span>{getPercentage(overview.present, overview.totalRecords)}%</span>
                </div>
              </div>

              <div className="status-item late">
                <div className="status-label">{t('attendance.late')}</div>
                <div className="status-bar">
                  <div
                    className="status-fill"
                    style={{
                      width: `${getPercentage(overview.late, overview.totalRecords)}%`
                    }}
                  />
                </div>
                <div className="status-stats">
                  <span>{overview.late || 0}</span>
                  <span>{getPercentage(overview.late, overview.totalRecords)}%</span>
                </div>
              </div>

              <div className="status-item absent">
                <div className="status-label">{t('attendance.absent')}</div>
                <div className="status-bar">
                  <div
                    className="status-fill"
                    style={{
                      width: `${getPercentage(overview.absent, overview.totalRecords)}%`
                    }}
                  />
                </div>
                <div className="status-stats">
                  <span>{overview.absent || 0}</span>
                  <span>{getPercentage(overview.absent, overview.totalRecords)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Breakdown */}
        <div className="chart-card">
          <h2>
            <AiOutlineLineChart size={20} /> {t('attendanceStats.verificationStatus')}
          </h2>
          <div className="chart-content">
            <div className="verification-grid">
              <div className="verification-item verified">
                <div className="verification-icon">✓</div>
                <div className="verification-data">
                  <div className="verification-label">{t('attendance.verified')}</div>
                  <div className="verification-value">{verificationBreakdown['verified'] || 0}</div>
                </div>
              </div>

              <div className="verification-item pending">
                <div className="verification-icon">⏳</div>
                <div className="verification-data">
                  <div className="verification-label">{t('attendance.pending')}</div>
                  <div className="verification-value">{verificationBreakdown['pending'] || 0}</div>
                </div>
              </div>

              <div className="verification-item review">
                <div className="verification-icon">⚠️</div>
                <div className="verification-data">
                  <div className="verification-label">{t('attendance.needsReview')}</div>
                  <div className="verification-value">{verificationBreakdown['needs-review'] || 0}</div>
                </div>
              </div>

              <div className="verification-item rejected">
                <div className="verification-icon">✗</div>
                <div className="verification-data">
                  <div className="verification-label">{t('attendance.rejected')}</div>
                  <div className="verification-value">{verificationBreakdown['rejected'] || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Comparison */}
      <div className="mode-comparison">
        <h2>{t('attendanceStats.modeComparison')}</h2>
        <div className="mode-grid">
          <div className="mode-card test">
            <div className="mode-badge">🧪 {t('attendanceStats.testMode')}</div>
            <div className="mode-value">{modeBreakdown['test'] || 0}</div>
            <div className="mode-label">{t('attendanceStats.records')}</div>
            <div className="mode-percentage">
              {getPercentage(modeBreakdown['test'], 
                (modeBreakdown['test'] || 0) + (modeBreakdown['production'] || 0))}%
            </div>
          </div>

          <div className="mode-divider" />

          <div className="mode-card production">
            <div className="mode-badge">🚀 {t('attendanceStats.production')}</div>
            <div className="mode-value">{modeBreakdown['production'] || 0}</div>
            <div className="mode-label">{t('attendanceStats.records')}</div>
            <div className="mode-percentage">
              {getPercentage(modeBreakdown['production'], 
                (modeBreakdown['test'] || 0) + (modeBreakdown['production'] || 0))}%
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <h2>{t('attendanceStats.keyKPIs')}</h2>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">{t('attendanceStats.verificationRate')}</div>
            <div className="metric-value">
              {getPercentage(overview.verified, overview.totalRecords)}%
            </div>
            <div className="metric-description">
              {t('attendanceStats.verificationDesc', { verified: overview.verified, total: overview.totalRecords })}
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-label">{t('attendanceStats.attendanceRate')}</div>
            <div className="metric-value">
              {getPercentage(overview.present, overview.totalRecords)}%
            </div>
            <div className="metric-description">
              {t('attendanceStats.attendanceRateDesc', { count: overview.present })}
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-label">{t('attendanceStats.actionRequired')}</div>
            <div className="metric-value">
              {(overview.needsReview || 0) + (overview.rejected || 0)}
            </div>
            <div className="metric-description">
              {t('attendanceStats.actionRequiredDesc')}
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-label">{t('attendanceStats.recordsInReview')}</div>
            <div className="metric-value">
              {getPercentage(overview.needsReview, overview.totalRecords)}%
            </div>
            <div className="metric-description">
              {t('attendanceStats.recordsInReviewDesc', { count: overview.needsReview })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-card">
        <h3>📊 {t('attendanceStats.summary')}</h3>
        <ul>
          <li>
            ✓ <strong>{t('attendanceStats.summaryVerified', { count: overview.verified || 0 })}</strong>
          </li>
          <li>
            ⚠️ <strong>{t('attendanceStats.summaryNeedsReview', { count: overview.needsReview || 0 })}</strong>
          </li>
          <li>
            ✗ <strong>{t('attendanceStats.summaryRejected', { count: overview.rejected || 0 })}</strong>
          </li>
          <li>
            📱 <strong>{t('attendanceStats.summaryMode', { test: modeBreakdown['test'] || 0, prod: modeBreakdown['production'] || 0 })}</strong>
          </li>
          <li>
            📈 {t('attendanceStats.summarySuccessRate', { rate: getPercentage(overview.verified, overview.totalRecords) })}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AttendanceStatistics;
