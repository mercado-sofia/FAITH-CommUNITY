// Photo handling utilities for organization heads
export class PhotoUtils {
  /**
   * Compress and resize image file
   * @param {File} file - Original image file
   * @param {Object} options - Compression options
   * @returns {Promise<File>} Compressed image file
   */
  static async compressImage(file, options = {}) {
    // Check for document and window to avoid SSR errors
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      throw new Error('Image compression requires browser environment');
    }

    const {
      maxWidth = 400,
      maxHeight = 500,
      quality = 0.8,
      format = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: format,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          format,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate image file
   * @param {File} file - Image file to validate
   * @returns {Object} Validation result
   */
  static validateImage(file) {
    const errors = [];
    const warnings = [];

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Please select a valid image file (JPEG, PNG, or WebP)');
    }

    // Check file size (10MB max for original, will be compressed)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('Image file size must be less than 10MB');
    }

    // Warn about large files
    const warnSize = 2 * 1024 * 1024; // 2MB
    if (file.size > warnSize) {
      warnings.push('Large image will be compressed for better performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create image preview URL
   * @param {File} file - Image file
   * @returns {string} Preview URL
   */
  static createPreviewUrl(file) {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined' || typeof URL === 'undefined') {
      throw new Error('Preview URL creation requires browser environment');
    }
    return URL.createObjectURL(file);
  }

  /**
   * Cleanup preview URL
   * @param {string} url - Preview URL to cleanup
   */
  static cleanupPreviewUrl(url) {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined' || typeof URL === 'undefined') {
      return;
    }
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Get image dimensions
   * @param {File} file - Image file
   * @returns {Promise<Object>} Image dimensions
   */
  static async getImageDimensions(file) {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined' || typeof URL === 'undefined') {
      throw new Error('Image dimension detection requires browser environment');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail from image
   * @param {File} file - Original image file
   * @returns {Promise<string>} Base64 thumbnail
   */
  static async generateThumbnail(file) {
    // Check for document and window to avoid SSR errors
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      throw new Error('Thumbnail generation requires browser environment');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Create small thumbnail (80x100 to match display size)
        canvas.width = 80;
        canvas.height = 100;
        
        // Calculate crop area to maintain aspect ratio
        const sourceAspect = img.width / img.height;
        const targetAspect = 80 / 100;
        
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        
        if (sourceAspect > targetAspect) {
          // Source is wider, crop width
          sw = img.height * targetAspect;
          sx = (img.width - sw) / 2;
        } else {
          // Source is taller, crop height
          sh = img.width / targetAspect;
          sy = (img.height - sh) / 2;
        }
        
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 80, 100);
        
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };
      
      img.onerror = () => reject(new Error('Failed to generate thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }
}

