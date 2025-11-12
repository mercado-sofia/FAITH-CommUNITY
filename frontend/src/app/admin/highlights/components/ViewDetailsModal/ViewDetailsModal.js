'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiX, FiCalendar, FiImage, FiVideo, FiFile } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import styles from './ViewDetailsModal.module.css';

export default function ViewDetailsModal({ highlight, onClose }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [programTitle, setProgramTitle] = useState(null);
  const [loadingProgram, setLoadingProgram] = useState(false);

  useEffect(() => {
    if (highlight?.media) {
      setSelectedImageIndex(0);
    }
  }, [highlight]);

  // Fetch program title when program_id is available but program_title is not
  useEffect(() => {
    const fetchProgramTitle = async () => {
      // If already have title, use it
      if (highlight?.program_title) {
        setProgramTitle(highlight.program_title);
        return;
      }

      // If no program_id, try to fetch from submission record
      if (!highlight?.program_id || highlight.program_id === null || highlight.program_id === undefined || highlight.program_id === '') {
        // Try to get program_id from submission if highlight doesn't have it
        setLoadingProgram(true);
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
          if (!token) {
            setLoadingProgram(false);
            return;
          }

          // Get organization acronym from admin data
          let orgAcronym = null;
          try {
            const adminData = typeof window !== 'undefined' ? localStorage.getItem('adminData') : null;
            if (adminData) {
              const parsed = JSON.parse(adminData);
              orgAcronym = parsed.org || parsed.organization_acronym || parsed.acronym;
            }
          } catch (e) {
            console.error('Error parsing admin data:', e);
          }

          if (!orgAcronym) {
            setLoadingProgram(false);
            return;
          }

          // Try to find submission for this highlight using the correct endpoint
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/submissions/${orgAcronym}`;
          const response = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            // Response structure: { success: true, data: [submissions] }
            const submissions = result.success ? result.data : (result.submissions || []);
            
            // Find submission for this highlight
            const highlightSubmission = submissions.find(sub => {
              if (sub.section !== 'highlights' || sub.status !== 'approved') {
                return false;
              }
              
              try {
                const proposedData = typeof sub.proposed_data === 'string' 
                  ? JSON.parse(sub.proposed_data) 
                  : sub.proposed_data;
                
                // Match by title (most reliable)
                return proposedData?.title === highlight?.title;
              } catch {
                return false;
              }
            });

            if (highlightSubmission) {
              try {
                const proposedData = typeof highlightSubmission.proposed_data === 'string' 
                  ? JSON.parse(highlightSubmission.proposed_data) 
                  : highlightSubmission.proposed_data;
                
                if (proposedData?.program_id) {
                  // Found program_id in submission, now fetch the program title
                  const programResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/programs/single/${proposedData.program_id}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  if (programResponse.ok) {
                    const programResult = await programResponse.json();
                    if (programResult.data?.title) {
                      setProgramTitle(programResult.data.title);
                    } else if (programResult.title) {
                      setProgramTitle(programResult.title);
                    }
                  }
                }
              } catch (e) {
                console.error('Error parsing submission data:', e);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching program from submission:', error);
        } finally {
          setLoadingProgram(false);
        }
        return;
      }

      // Fetch program title from API using program_id
      setLoadingProgram(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
        if (!token) {
          setLoadingProgram(false);
          return;
        }

        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/programs/single/${highlight.program_id}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data?.title) {
            setProgramTitle(result.data.title);
          } else if (result.title) {
            setProgramTitle(result.title);
          }
        }
      } catch (error) {
        console.error('Error fetching program title:', error);
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchProgramTitle();
  }, [highlight?.program_id, highlight?.program_title, highlight?.title]);

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
                <FiFile className={styles.metaIcon} />
                <span className={styles.metaLabel}>Associated Program:</span>
                <span className={styles.metaValue}>
                  {loadingProgram ? (
                    'Loading...'
                  ) : highlight?.program_title || programTitle || (highlight?.program_id ? `Program #${highlight.program_id}` : 'No program associated')}
                </span>
              </div>
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
