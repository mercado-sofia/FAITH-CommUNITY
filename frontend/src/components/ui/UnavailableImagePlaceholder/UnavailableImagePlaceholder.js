import React from 'react';
import styles from './UnavailableImagePlaceholder.module.css';

/**
 * UnavailableImagePlaceholder component
 * Displays a gray placeholder with "Unavailable" text when images are not available
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.width - Width of the placeholder
 * @param {string} props.height - Height of the placeholder
 * @param {string} props.text - Custom text to display (default: "Unavailable")
 * @returns {JSX.Element} UnavailableImagePlaceholder component
 */
const UnavailableImagePlaceholder = ({ 
  className = '', 
  width = '100%', 
  height = '100%', 
  text = 'Unavailable' 
}) => {
  return (
    <div 
      className={`${styles.placeholder} ${className}`}
      style={{ width, height }}
    >
      <span className={styles.text}>{text}</span>
    </div>
  );
};

export default UnavailableImagePlaceholder;
