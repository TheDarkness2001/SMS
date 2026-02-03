import React, { useState } from 'react';
import '../styles/ConsentModal.css';
import { useLanguage } from '../context/LanguageContext';
import { AiOutlineClose, AiOutlineCheckCircle } from 'react-icons/ai';

const ConsentModal = ({ isOpen, onConsent, onCancel, title }) => {
  const { t } = useLanguage();
  const displayTitle = title || t('modals.privacyConsent');
  const [consents, setConsents] = useState({
    cameraAccess: false,
    locationAccess: false,
    dataStorage: false
  });
  const [agreeToAll, setAgreeToAll] = useState(false);

  const handleConsentChange = (key) => {
    const updated = { ...consents, [key]: !consents[key] };
    setConsents(updated);
    // Check if all are selected
    const allChecked = updated.cameraAccess && updated.locationAccess && updated.dataStorage;
    setAgreeToAll(allChecked);
  };

  const handleAgreeToAll = () => {
    const newState = !agreeToAll;
    setConsents({
      cameraAccess: newState,
      locationAccess: newState,
      dataStorage: newState
    });
    setAgreeToAll(newState);
  };

  const handleSubmit = () => {
    if (consents.cameraAccess && consents.locationAccess && consents.dataStorage) {
      console.log('ConsentModal handleSubmit - Passing consents:', consents);
      onConsent(consents);
    }
  };

  const allConsented = consents.cameraAccess && consents.locationAccess && consents.dataStorage;

  if (!isOpen) return null;

  return (
    <div className="consent-modal-overlay">
      <div className="consent-modal">
        <div className="consent-header">
          <h2>{displayTitle}</h2>
          <button className="consent-close-btn" onClick={onCancel}>
            <AiOutlineClose size={24} />
          </button>
        </div>

        <div className="consent-body">
          <div className="consent-intro">
            <p>
              {t('modals.consentIntro')}
            </p>
          </div>

          <div className="consent-items">
            {/* Camera Access */}
            <div className="consent-item">
              <label className="consent-checkbox-label">
                <input
                  type="checkbox"
                  checked={consents.cameraAccess}
                  onChange={() => handleConsentChange('cameraAccess')}
                  className="consent-checkbox"
                />
                <div className="consent-item-content">
                  <div className="consent-item-title">
                    📷 {t('modals.cameraAccess')}
                  </div>
                  <div className="consent-item-description">
                    {t('modals.cameraAccessDesc')}
                  </div>
                </div>
              </label>
            </div>

            {/* Location Access */}
            <div className="consent-item">
              <label className="consent-checkbox-label">
                <input
                  type="checkbox"
                  checked={consents.locationAccess}
                  onChange={() => handleConsentChange('locationAccess')}
                  className="consent-checkbox"
                />
                <div className="consent-item-content">
                  <div className="consent-item-title">
                    📍 {t('modals.locationAccess')}
                  </div>
                  <div className="consent-item-description">
                    {t('modals.locationAccessDesc')}
                  </div>
                </div>
              </label>
            </div>

            {/* Data Storage */}
            <div className="consent-item">
              <label className="consent-checkbox-label">
                <input
                  type="checkbox"
                  checked={consents.dataStorage}
                  onChange={() => handleConsentChange('dataStorage')}
                  className="consent-checkbox"
                />
                <div className="consent-item-content">
                  <div className="consent-item-title">
                    💾 {t('modals.dataStorage')}
                  </div>
                  <div className="consent-item-description">
                    {t('modals.dataStorageDesc')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Agree to All */}
          <div className="consent-agree-all">
            <label className="consent-checkbox-label">
              <input
                type="checkbox"
                checked={agreeToAll}
                onChange={handleAgreeToAll}
                className="consent-checkbox consent-checkbox-large"
              />
              <div className="consent-agree-text">
                <AiOutlineCheckCircle size={20} className="consent-check-icon" />
                <span>{t('modals.agreeToAll')}</span>
              </div>
            </label>
          </div>

          {/* Terms & Conditions */}
          <div className="consent-terms">
            <p>
              {t('modals.termsNotice')}
            </p>
          </div>
        </div>

        <div className="consent-footer">
          <button 
            className="consent-btn consent-btn-cancel" 
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button 
            className={`consent-btn consent-btn-submit ${!allConsented ? 'disabled' : ''}`}
            onClick={handleSubmit}
            disabled={!allConsented}
          >
            {t('modals.acceptAndContinue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
