'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { FaUser } from 'react-icons/fa';
import styles from './OptimizedImage.module.css';

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  fallbackIcon: FallbackIcon = FaUser,
  priority = false,
  ...props 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Validate src URL
  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      // Check if it's a relative path
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  };

  if (hasError || !isValidUrl(src)) {
    return (
      <div 
        className={`${className} ${styles.fallback}`}
        style={{ width, height }}
      >
        <FallbackIcon className={styles.fallbackIcon} size={Math.min(width, height) * 0.4} />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${styles.image} ${isLoading ? styles.imageLoading : styles.imageLoaded}`}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
