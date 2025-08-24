import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const usePhotoUpload = () => {
  const [uploading, setUploading] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  const uploadPhoto = useCallback(async (file, index, onSuccess) => {
    if (!file) return;

    try {
      setUploading(prev => ({ ...prev, [index]: true }));
      setUploadProgress(prev => ({ ...prev, [index]: 10 }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'organization-head');

      setUploadProgress(prev => ({ ...prev, [index]: 30 }));

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      setUploadProgress(prev => ({ ...prev, [index]: 80 }));
      const result = await response.json();

      if (result.success) {
        const photoPath = result.url || (result.filePath ? `/uploads/organizations/heads/${result.filePath}` : null);
        
        setUploadProgress(prev => ({ ...prev, [index]: 100 }));
        
        // Call success callback with the photo path
        if (onSuccess) {
          onSuccess(photoPath);
        }
        
        // Show success state briefly
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [index]: null }));
        }, 1000);

        return photoPath;
      } else {
        throw new Error(result.message || result.error || 'Upload failed');
      }
    } catch (error) {
      // Reset photo on error
      if (onSuccess) {
        onSuccess('');
      }
      throw error;
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
      if (uploadProgress[index] !== 100) {
        setUploadProgress(prev => ({ ...prev, [index]: null }));
      }
    }
  }, [uploadProgress]);

  const resetUploadState = useCallback((index) => {
    setUploading(prev => ({ ...prev, [index]: false }));
    setUploadProgress(prev => ({ ...prev, [index]: null }));
  }, []);

  return {
    uploading,
    uploadProgress,
    uploadPhoto,
    resetUploadState
  };
};
