import React, { useEffect, useState } from 'react';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineInfoCircle, AiOutlineWarning } from 'react-icons/ai';
import './Toast.css';

const Toast = ({ message, type = 'info', duration = 3000, onClose, actionLabel, onAction }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(progressInterval);
          return 0;
        }
        return prev - (100 / (duration / 100));
      });
    }, 100);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <AiOutlineCheckCircle size={22} />,
    error: <AiOutlineCloseCircle size={22} />,
    warning: <AiOutlineWarning size={22} />,
    info: <AiOutlineInfoCircle size={22} />
  };

  return (
    <div className={`toast toast-${type} ${isVisible ? 'toast-enter' : 'toast-exit'}`}>
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
        {actionLabel && onAction && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              onAction();
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <button
        className="toast-close"
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
      >
        ×
      </button>
      <div
        className="toast-progress"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default Toast;
