'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { FaUser } from 'react-icons/fa';

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
        className={`${className} flex items-center justify-center bg-gray-200 rounded-full`}
        style={{ width, height }}
      >
        <FallbackIcon className="text-gray-400" size={Math.min(width, height) * 0.4} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-full">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
