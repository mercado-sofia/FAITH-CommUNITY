import { useState, useRef, useCallback } from 'react';
import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants/programConstants';

export const useImageUpload = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [additionalDragActive, setAdditionalDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const additionalImagesRef = useRef(null);

  // Create preview URL for image
  const createImagePreview = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }, []);

  // Validate image file
  const validateImageFile = useCallback((file, rules) => {
    if (file.size > rules.maxSize) {
      return ERROR_MESSAGES.image.maxSize;
    }
    if (!rules.allowedTypes.includes(file.type)) {
      return ERROR_MESSAGES.image.invalidType;
    }
    return null;
  }, []);

  // Handle main image change
  const handleImageChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return null;

    const error = validateImageFile(file, VALIDATION_RULES.image);
    if (error) {
      return { error };
    }

    try {
      const preview = await createImagePreview(file);
      setImagePreview(preview);
      return { file, preview };
    } catch (error) {
      console.error('Error creating image preview:', error);
      return { error: 'Failed to process image' };
    }
  }, [validateImageFile, createImagePreview]);

  // Handle additional images change
  const handleAdditionalImagesChange = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return [];

    const results = [];
    const newPreviews = [...additionalImagePreviews];

    for (const file of files) {
      const error = validateImageFile(file, VALIDATION_RULES.additionalImages);
      if (error) {
        results.push({ error });
        continue;
      }

      try {
        const preview = await createImagePreview(file);
        const previewObj = {
          id: Date.now() + Math.random(),
          url: preview,
          name: file.name
        };
        newPreviews.push(previewObj);
        results.push({ file, preview: previewObj });
      } catch (error) {
        console.error('Error creating image preview:', error);
        results.push({ error: 'Failed to process image' });
      }
    }

    setAdditionalImagePreviews(newPreviews);
    return results;
  }, [additionalImagePreviews, validateImageFile, createImagePreview]);

  // Remove main image
  const removeImage = useCallback(() => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove additional image
  const removeAdditionalImage = useCallback((index) => {
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Drag and drop handlers for main image
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) {
      setDragActive(true);
    }
  }, [dragActive]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageChange({ target: { files: [files[0]] } });
    }
  }, [handleImageChange]);

  // Drag and drop handlers for additional images
  const handleAdditionalDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!additionalDragActive) {
      setAdditionalDragActive(true);
    }
  }, [additionalDragActive]);

  const handleAdditionalDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setAdditionalDragActive(false);
    }
  }, []);

  const handleAdditionalDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAdditionalDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdditionalDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleAdditionalImagesChange({ target: { files } });
    }
  }, [handleAdditionalImagesChange]);

  return {
    // State
    imagePreview,
    additionalImagePreviews,
    dragActive,
    additionalDragActive,
    fileInputRef,
    additionalImagesRef,
    
    // Actions
    handleImageChange,
    handleAdditionalImagesChange,
    removeImage,
    removeAdditionalImage,
    
    // Drag and drop handlers
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleAdditionalDragEnter,
    handleAdditionalDragLeave,
    handleAdditionalDragOver,
    handleAdditionalDrop,
    
    // Setters
    setImagePreview,
    setAdditionalImagePreviews
  };
};
