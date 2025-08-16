// Photo handling utilities for organization heads
export class PhotoUtils {
  /**
   * Compress and resize image file
   * @param {File} file - Original image file
   * @param {Object} options - Compression options
   * @returns {Promise<File>} Compressed image file
   */
  static async compressImage(file, options = {}) {
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
    return URL.createObjectURL(file);
  }

  /**
   * Cleanup preview URL
   * @param {string} url - Preview URL to cleanup
   */
  static cleanupPreviewUrl(url) {
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

/**
 * Image cache for lazy loading
 */
export class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
  }

  /**
   * Get cached image or load it
   * @param {string} src - Image source URL
   * @returns {Promise<string>} Image URL or cached version
   */
  async get(src) {
    // Validate input
    if (!src || src === '' || src === null || src === undefined) {
      return '/default.png';
    }

    // If it's already a placeholder, return it
    if (src === '/default.png' || src === '/default-profile.png') {
      return src;
    }

    if (this.cache.has(src)) {
      return this.cache.get(src);
    }

    if (this.loading.has(src)) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.cache.has(src)) {
            resolve(this.cache.get(src));
          } else {
            setTimeout(checkCache, 50);
          }
        };
        checkCache();
      });
    }

    this.loading.add(src);

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, 10000); // 10 second timeout

        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Image failed to load'));
        };
        img.src = src;
      });

      this.cache.set(src, src);
      this.loading.delete(src);
      return src;
    } catch (error) {
      this.loading.delete(src);
      // Return placeholder on error
      const placeholder = '/default.png';
      this.cache.set(src, placeholder);
      return placeholder;
    }
  }

  /**
   * Preload images
   * @param {Array<string>} urls - Image URLs to preload
   */
  async preload(urls) {
    const promises = urls.map(url => this.get(url));
    await Promise.allSettled(promises);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.loading.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

// Global image cache instance
export const imageCache = new ImageCache();
