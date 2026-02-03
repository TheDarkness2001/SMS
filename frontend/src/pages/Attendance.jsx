import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { attendanceAPI } from '../utils/api';
import "../styles/Attendance.css"

const Attendance = () => {
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: '',
    status: 'all',
    verification: 'all'
  });

  const fetchAttendance = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const params = { ...branchFilter };
      if (filters.date) params.date = filters.date;
      if (filters.status !== 'all') params.status = filters.status;
      
      const response = await attendanceAPI.getAll(params);
      setAttendance(response.data.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, getBranchFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance, selectedBranch]);

  // Filter attendance based on verification status
  const filteredAttendance = attendance.filter(record => {
    if (filters.verification === 'all') return true;
    if (filters.verification === 'verified') {
      return record.faceVerified && record.locationVerified;
    }
    if (filters.verification === 'unverified') {
      return !record.faceVerified || !record.locationVerified;
    }
    return true;
  });

  return (
    <div className="container">
        <h1 style={{ marginBottom: '30px' }}>{t('attendance.title')}</h1>
        
        {/* Filters */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>{t('attendance.date')}</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({...filters, date: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>{t('attendance.status')}</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="all">{t('common.noData')}</option>
                <option value="present">{t('attendance.present')}</option>
                <option value="absent">{t('attendance.absent')}</option>
                <option value="late">{t('attendance.late')}</option>
                <option value="half-day">{t('attendance.halfDay')}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>{t('common.filter')}</label>
              <select
                value={filters.verification}
                onChange={(e) => setFilters({...filters, verification: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="all">{t('common.noData')}</option>
                <option value="verified">{t('attendance.fullyVerified')}</option>
                <option value="unverified">{t('attendance.needsReview')}</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : (
          <div className="card">
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>{t('common.total')}: {filteredAttendance.length} / {attendance.length}</strong>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('attendance.studentAttendance')}</th>
                  <th>{t('attendance.date')}</th>
                  <th>{t('attendance.status')}</th>
                  <th>{t('common.filter')}</th>
                  <th>{t('attendance.photos')}</th>
                  <th>{t('attendance.device')}</th>
                  <th>{t('attendance.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      {t('attendance.noRecord')}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((record) => (
                    <tr key={record._id}>
                      <td>{record.teacher?.name}</td>
                      <td>{new Date(record.date).toLocaleDateString(t('common.locale'))}</td>
                      <td>
                        <span className={`badge badge-${record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}`}>
                          {t(`attendance.${record.status === 'half-day' ? 'halfDay' : record.status}`)}
                        </span>
                      </td>
                      <td>
                        {record.faceVerified && record.locationVerified ? (
                          <span className="badge badge-success">{t('attendance.verified')}</span>
                        ) : (
                          <span className="badge badge-warning">{t('attendance.needsReview')}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {record.checkInPhoto ? (
                            <img 
                              src={`/uploads/${record.checkInPhoto}`} 
                              alt={t('attendance.checkIn')} 
                              style={{ width: '30px', height: '30px', borderRadius: '4px' }}
                            />
                          ) : (
                            <div style={{ width: '30px', height: '30px', backgroundColor: '#ddd', borderRadius: '4px' }}></div>
                          )}
                          {record.checkOutPhoto ? (
                            <img 
                              src={`/uploads/${record.checkOutPhoto}`} 
                              alt={t('attendance.checkOut')} 
                              style={{ width: '30px', height: '30px', borderRadius: '4px' }}
                            />
                          ) : (
                            <div style={{ width: '30px', height: '30px', backgroundColor: '#ddd', borderRadius: '4px' }}></div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '11px' }}>
                          {record.deviceInfo?.platform || t('common.unknown')}
                        </div>
                      </td>
                      <td>{record.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Security Information */}
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>{t('attendance.markAttendance')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '15px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-success">✓</span>
                <strong>{t('attendance.faceRecognition')}</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
                {t('attendance.faceRecognitionDesc')}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-success">✓</span>
                <strong>{t('attendance.locationTracking')}</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
                {t('attendance.locationTrackingDesc')}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-success">✓</span>
                <strong>{t('attendance.timestampPhotos')}</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
                {t('attendance.timestampPhotosDesc')}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-success">✓</span>
                <strong>{t('attendance.deviceFingerprinting')}</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
                {t('attendance.deviceFingerprintingDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Attendance;
