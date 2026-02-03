import React from 'react';
import '../styles/UserAvatar.css';

const UserAvatar = ({ 
  src, 
  alt = 'User', 
  size = 'medium',
  className = '' 
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState(null);
  
  // Update image source when src prop changes
  React.useEffect(() => {
    setImageError(false);
    setImageSrc(src);
  }, [src]);
  
  const sizeMap = {
    small: 40,
    medium: 60,
    large: 80,
    xlarge: 120
  };
  
  const avatarSize = sizeMap[size] || sizeMap.medium;
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Check if we should show the image or icon
  const showImage = imageSrc && !imageError;
  
  // Default person icon SVG (monochrome as per user preference)
  const PersonIcon = () => (
    <svg 
      width={avatarSize} 
      height={avatarSize} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="person-icon"
    >
      <circle cx="12" cy="12" r="11" fill="#f0f0f0" stroke="#333" strokeWidth="1"/>
      <circle cx="12" cy="9" r="3.5" fill="#333"/>
      <path 
        d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" 
        stroke="#333" 
        strokeWidth="2" 
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
  
  return (
    <div className={`user-avatar ${className}`} style={{ width: avatarSize, height: avatarSize }}>
      {showImage ? (
        <img 
          src={imageSrc}
          alt={alt}
          className="avatar-image"
          onError={handleImageError}
        />
      ) : (
        <PersonIcon />
      )}
    </div>
  );
};

export default UserAvatar;
