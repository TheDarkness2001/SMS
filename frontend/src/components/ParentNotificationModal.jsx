import React, { useState, useEffect } from 'react';
import { AiOutlineNotification, AiOutlineCheck } from 'react-icons/ai';
import { requestPushPermission } from '../utils/pushNotification';
import { studentsAPI } from '../utils/api';
import './ParentNotificationModal.css';

// Generate a simple device fingerprint
const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

const ParentNotificationModal = ({ studentId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if we've already asked on this device
    const deviceId = getDeviceId();
    const storageKey = `push_notif_${studentId}_${deviceId}`;
    const alreadyAsked = localStorage.getItem(storageKey);
    
    // Also check if permission is already granted (user enabled it)
    const permission = Notification.permission;
    
    if (alreadyAsked || permission === 'granted') {
      // Don't show modal - already handled on this device
      onComplete();
    } else {
      setShouldShow(true);
    }
  }, [studentId, onComplete]);

  const markAsAsked = () => {
    const deviceId = getDeviceId();
    const storageKey = `push_notif_${studentId}_${deviceId}`;
    localStorage.setItem(storageKey, 'true');
  };

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Request permission and get token
      const token = await requestPushPermission();
      
      // 2. Register token with backend
      await studentsAPI.registerPushToken(studentId, token);
      
      // 3. Enable notifications settings
      await studentsAPI.updateNotificationSettings(studentId, { enable: true });
      
      // 4. Mark as asked on this device (persistent)
      markAsAsked();
      
      onComplete();
    } catch (err) {
      console.error('Push enabling error:', err);
      
      // More specific error messages
      let errorMsg = 'Bildirishnomalarni yoqishda xatolik yuz berdi.';
      
      if (err.message === 'Push notifications are not supported in this browser') {
        errorMsg = 'Bu brauzer bildirishnomalarni qo\'llab-quvvatlamaydi. Chrome, Firefox yoki Edge ishlatib ko\'ring.';
      } else if (err.message === 'Notification permission denied') {
        errorMsg = 'Bildirishnoma ruxsati berilmadi. Brauzer sozlamalarida ruxsat bering.';
      } else if (err.message === 'VAPID public key not configured') {
        errorMsg = 'Tizim sozlanmagan. Administrator bilan bog\'laning.';
      } else if (err.message === 'Push subscription timeout') {
        errorMsg = 'Bildirishnoma xizmatiga ulanish vaqti tugadi. Internet aloqasini tekshiring.';
      } else if (err.name === 'NotSupportedError') {
        errorMsg = 'Bu brauzer Web Push xizmatini to\'liq qo\'llab-quvvatlamaydi. Chrome yoki Firefox ishlatib ko\'ring.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLater = () => {
    // Mark as asked on this device (persistent)
    markAsAsked();
    onComplete();
  };

  // Don't render if we shouldn't show
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="notification-modal-overlay">
      <div className="notification-modal-content">
        <div className="notification-modal-icon">
          <AiOutlineNotification size={48} color="#0b69ff" />
        </div>
        
        <h2 className="notification-modal-title">Xabardor bo‘ling!</h2>
        
        <p className="notification-modal-text">
          Farzandingizning o‘qishi haqidagi muhim ma’lumotlarni (darsga kelmagani, kechikkani yoki o‘qituvchi izohlari) birinchilardan bo‘lib bilishni xohlaysizmi?
        </p>
        
        <div className="notification-modal-features">
          <div className="feature-item">
            <AiOutlineCheck className="feature-check" />
            <span>Darsga kechikishlar haqida xabar</span>
          </div>
          <div className="feature-item">
            <AiOutlineCheck className="feature-check" />
            <span>Kelmagan kunlar haqida ogohlantirish</span>
          </div>
          <div className="feature-item">
            <AiOutlineCheck className="feature-check" />
            <span>O‘qituvchilarning izohlari</span>
          </div>
        </div>

        {error && <p className="notification-modal-error">{error}</p>}

        <div className="notification-modal-actions">
          <button 
            className="btn btn-primary btn-full" 
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? 'Yuklanmoqda...' : 'Ha, yuboring'}
          </button>
          <button 
            className="btn btn-text btn-full" 
            onClick={handleLater}
            disabled={loading}
          >
            Yo‘q, keyinroq
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentNotificationModal;
