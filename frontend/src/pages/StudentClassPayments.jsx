import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useClassSchedule } from '../hooks/useClassSchedule';
import { getStudentAttendanceByStudent } from '../api/studentAttendance';
import { getWalletSummary } from '../api/wallet';
import { PaymentCards } from '../components/PaymentCards';
import { PaymentFilters } from '../components/PaymentFilters';
import { PaymentModal } from '../components/PaymentModal';
import { PaymentTopUpModal } from '../components/PaymentTopUpModal';
import { StudentAttendanceTable } from '../components/StudentAttendanceTable';
import { formatCurrency } from '../utils/formatters';
import { Modal } from '../components/Modal';
import '../styles/Modal.css';
import '../styles/PaymentFilters.css';
import '../styles/PaymentCards.css';
import '../styles/StudentAttendanceTable.css';

export const StudentClassPayments = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { classes, loading, fetchStudentClasses } = useClassSchedule();
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });

  const loadWalletSummary = useCallback(async () => {
    try {
      const response = await getWalletSummary(user._id, 'student');
      setWallet(response.data.data);
    } catch (error) {
      console.error('Error loading wallet summary:', error);
    }
  }, [user]);

  const loadAttendance = useCallback(async () => {
    try {
      const response = await getStudentAttendanceByStudent(user._id);
      setStudentAttendance(response.data.data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
      setStudentAttendance([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStudentClasses(user._id);
      loadWalletSummary();
      loadAttendance();
    }
  }, [user, fetchStudentClasses, loadWalletSummary, loadAttendance]);

  const getAttendanceStatus = (classRecord, studentId) => {
    const studentClass = classRecord.students?.find(s => 
      s.studentId?.toString() === studentId
    );
    return studentClass ? studentClass.attendanceStatus : 'pending';
  };

  const getPenaltyAmount = (classRecord) => {
    // Assuming per-class price is available in classRecord or can be calculated
    const perClassPrice = classRecord.subjectId?.pricePerClass || 0;
    return perClassPrice * 2; // 2x penalty for student absence
  };

  const isClassCanceled = (classRecord) => {
    // Check if class was canceled based on attendance records
    return classRecord.status === 'canceled' || classRecord.isCanceled;
  };

  const formatClassDate = (date) => {
    return new Date(date).toLocaleDateString(t('common.locale') || 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="student-class-payments__container">
      <div className="student-class-payments__header">
        <h1 className="student-class-payments__title">{t('studentClassPayments.title')}</h1>
        <div className="student-class-payments__balance">
          <span className="student-class-payments__balance-label">{t('studentClassPayments.walletBalance')} </span>
          <span className="student-class-payments__balance-amount">${wallet.balance?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      <div className="student-class-payments__schedule">
        <h2 className="student-class-payments__section-title">{t('studentClassPayments.upcomingClasses')}</h2>
        
        {loading ? (
          <div className="student-class-payments__loading">
            <p>{t('studentClassPayments.loadingSchedule')}</p>
          </div>
        ) : (
          <div className="student-class-payments__classes-grid">
            {classes.map((classRecord) => {
              const attendanceStatus = getAttendanceStatus(classRecord, user._id);
              const isCanceled = isClassCanceled(classRecord);
              
              return (
                <div 
                  key={classRecord._id} 
                  className={`student-class-payments__class-card ${
                    attendanceStatus === 'absent' ? 'student-class-payments__class-card--absent' :
                    attendanceStatus === 'present' ? 'student-class-payments__class-card--present' :
                    isCanceled ? 'student-class-payments__class-card--canceled' : ''
                  }`}
                >
                  <div className="student-class-payments__class-header">
                    <h3 className="student-class-payments__class-subject">
                      {classRecord.subjectId?.name || 'N/A'}
                    </h3>
                    <span className={`student-class-payments__status student-class-payments__status--${attendanceStatus}`}>
                      {t(`attendance.${attendanceStatus}`)}
                    </span>
                  </div>
                  
                  <div className="student-class-payments__class-details">
                    <p className="student-class-payments__class-date">
                      <strong>{t('studentClassPayments.date')}</strong> {formatClassDate(classRecord.date)}
                    </p>
                    <p className="student-class-payments__class-time">
                      <strong>{t('studentClassPayments.time')}</strong> {classRecord.startTime} - {classRecord.endTime}
                    </p>
                    <p className="student-class-payments__class-teacher">
                      <strong>{t('studentClassPayments.teacher')}</strong> {classRecord.teacherId?.name || 'N/A'}
                    </p>
                    <p className="student-class-payments__class-room">
                      <strong>{t('studentClassPayments.room')}</strong> {classRecord.roomNumber || 'N/A'}
                    </p>
                  </div>

                  {!isCanceled && (
                    <div className="student-class-payments__payment-details">
                      {attendanceStatus === 'absent' ? (
                        <div className="student-class-payments__penalty">
                          <strong>{t('studentClassPayments.penaltyApplied')}</strong> 
                          <span className="student-class-payments__penalty-amount">
                            -${getPenaltyAmount(classRecord).toFixed(2)}
                          </span>
                        </div>
                      ) : attendanceStatus === 'present' ? (
                        <div className="student-class-payments__deduction">
                          <strong>{t('studentClassPayments.classDeduction')}</strong> 
                          <span className="student-class-payments__deduction-amount">
                            -${(classRecord.subjectId?.pricePerClass || 0).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="student-class-payments__pending">
                          <strong>{t('studentClassPayments.expectedDeduction')}</strong> 
                          <span className="student-class-payments__expected-amount">
                            -${(classRecord.subjectId?.pricePerClass || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isCanceled && (
                    <div className="student-class-payments__canceled">
                      <strong>{t('studentClassPayments.classCanceled')}</strong>
                      <span className="student-class-payments__cancellation-reason">
                        {classRecord.cancellationReason || t('studentClassPayments.noReasonProvided')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="student-class-payments__attendance-history">
        <h2 className="student-class-payments__section-title">{t('studentClassPayments.attendanceHistory')}</h2>
        <div className="student-class-payments__history-list">
          {studentAttendance.slice(0, 10).map((attendance) => (
            <div key={attendance._id} className="student-class-payments__history-item">
              <div className="student-class-payments__history-date">
                {formatClassDate(attendance.date)}
              </div>
              <div className="student-class-payments__history-status">
                <span className={`student-class-payments__status student-class-payments__status--${attendance.status}`}>
                  {t(`attendance.${attendance.status}`)}
                </span>
              </div>
              <div className="student-class-payments__history-subject">
                {attendance.subject}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
