'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiX, FiCalendar, FiImage, FiVideo, FiFile } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import styles from './ViewDetailsModal.module.css';

export default function ViewDetailsModal({ highlight, onClose }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (highlight?.media) {
      setSelectedImageIndex(0);
    }
  }, [highlight]);

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const getMediaItems = () => {
    if (!highlight?.media || highlight.media.length === 0) return [];
    return highlight.media;
  };

  const getImageItems = () => {
    return getMediaItems().filter(item => 
      item.type === 'image' || 
      item.mimetype?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url)
    );
  };

  const getVideoItems = () => {
    return getMediaItems().filter(item => 
      item.type === 'video' || 
      item.mimetype?.startsWith('video/') ||
      /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(item.filename || item.url)
    );
  };

  const getFileIcon = (item) => {
    if (item.type === 'video' || item.mimetype?.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(item.filename || item.url)) {
      return <FiVideo />;
    } else if (item.type === 'image' || item.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url)) {
      return <FiImage />;
    } else {
      return <FiFile />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const imageItems = getImageItems();
  const videoItems = getVideoItems();
  const allMedia = getMediaItems();

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {highlight?.title || 'Untitled Highlight'}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {/* Description */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Description</h3>
            <p className={styles.description}>
              {highlight?.description || 'No description provided.'}
            </p>
          </div>

          {/* Media Gallery */}
          {allMedia.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Media ({allMedia.length} {allMedia.length === 1 ? 'file' : 'files'})
              </h3>
              
              {/* Image Gallery */}
              {imageItems.length > 0 && (
                <div className={styles.imageGallery}>
                  <div className={styles.mainImage}>
                    {imageItems[selectedImageIndex] && (
                      <Image
                        src={imageItems[selectedImageIndex].url || imageItems[selectedImageIndex].filename}
                        alt={`Highlight image ${selectedImageIndex + 1}`}
                        className={styles.mainImageContent}
                        width={600}
                        height={400}
                        style={{ objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  
                  {imageItems.length > 1 && (
                    <div className={styles.imageThumbnails}>
                      {imageItems.map((item, index) => (
                        <button
                          key={index}
                          className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.activeThumbnail : ''}`}
                          onClick={() => setSelectedImageIndex(index)}
                        >
                          <Image
                            src={item.url || item.filename}
                            alt={`Thumbnail ${index + 1}`}
                            className={styles.thumbnailImage}
                            width={80}
                            height={60}
                            style={{ objectFit: 'cover' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Video Gallery */}
              {videoItems.length > 0 && (
                <div className={styles.videoGallery}>
                  {videoItems.map((item, index) => (
                    <div key={index} className={styles.videoItem}>
                      <video
                        controls
                        className={styles.video}
                        preload="metadata"
                      >
                        <source src={item.url || item.filename} type={item.mimetype || 'video/mp4'} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ))}
                </div>
              )}

              {/* File List */}
              <div className={styles.fileList}>
                {allMedia.map((item, index) => (
                  <div key={index} className={styles.fileItem}>
                    <div className={styles.fileIcon}>
                      {getFileIcon(item)}
                    </div>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>
                        {item.filename || item.originalName || `File ${index + 1}`}
                      </div>
                      <div className={styles.fileDetails}>
                        {item.mimetype && (
                          <span className={styles.fileType}>{item.mimetype}</span>
                        )}
                        {item.size && (
                          <span className={styles.fileSize}>{formatFileSize(item.size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Details</h3>
            <div className={styles.metadata}>
              <div className={styles.metaItem}>
                <FiCalendar className={styles.metaIcon} />
                <span className={styles.metaLabel}>Created:</span>
                <span className={styles.metaValue}>
                  {formatDate(highlight?.created_at || highlight?.createdAt)}
                </span>
              </div>
              {highlight?.updated_at && highlight.updated_at !== highlight?.created_at && (
                <div className={styles.metaItem}>
                  <FiCalendar className={styles.metaIcon} />
                  <span className={styles.metaLabel}>Updated:</span>
                  <span className={styles.metaValue}>
                    {formatDate(highlight.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
