'use client';

import { useState, useEffect } from 'react';
import { FiTarget, FiEye, FiEdit3 } from 'react-icons/fi';
import { mutate } from 'swr';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/shared/portalAuth';
import { ConfirmationModal } from '@/components';
import styles from './MissionVisionManagement.module.css';

export default function MissionVisionManagement({ showSuccessModal }) {
  const [missionVisionData, setMissionVisionData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMissionVisionModal, setShowMissionVisionModal] = useState(false);
  
  // Form state
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [tempMission, setTempMission] = useState('');
  const [tempVision, setTempVision] = useState('');

  // Load mission and vision data - only on mount to prevent race conditions
  useEffect(() => {
    let isMounted = true;
    
    const loadMissionVisionData = async () => {
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/mission-vision`,
          { method: 'GET' },
          'superadmin'
        );

        if (!isMounted) return;

        if (response && response.ok) {
          const data = await response.json();
          
          // Populate form fields with current data from database
          // This ensures superadmin sees what's currently displayed on the public site
          const missionItem = data.find(item => 
            item.type === 'Mission' || item.type?.toLowerCase() === 'mission'
          );
          const visionItem = data.find(item => 
            item.type === 'Vision' || item.type?.toLowerCase() === 'vision'
          );
          
          const currentMission = missionItem?.content || '';
          const currentVision = visionItem?.content || '';
          
          if (isMounted) {
            setMissionVisionData(data);
            // Set the state so it displays what's currently on the public site
            setMission(currentMission);
            setVision(currentVision);
            setTempMission(currentMission);
            setTempVision(currentVision);
          }
        } else {
          if (isMounted) {
            console.error('Failed to load mission/vision: response not ok', response);
            if (response) {
              console.error('Response status:', response.status);
              try {
                const errorData = await response.json();
                console.error('Error data:', errorData);
              } catch (e) {
                console.error('Could not parse error response');
              }
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Load error:', error);
          let errorMessage = 'Failed to load mission and vision data';
          
          if (error.message) {
            errorMessage = error.message;
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
          }
          
          showAuthError(errorMessage);
        }
      }
    };

    loadMissionVisionData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Load on mount only

  // Handle edit toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original values
      setTempMission(mission);
      setTempVision(vision);
    } else {
      // Start editing - set temp values
      setTempMission(mission);
      setTempVision(vision);
    }
    setIsEditing(!isEditing);
  };

  // Handle save click - show confirmation modal
  const handleSaveClick = () => {
    // Normalize values for comparison (handle null/empty string)
    const normalizeValue = (val) => (val || '').trim();
    const normalizedTempMission = normalizeValue(tempMission);
    const normalizedTempVision = normalizeValue(tempVision);
    const normalizedMission = normalizeValue(mission);
    const normalizedVision = normalizeValue(vision);
    
    // Check if there are any changes
    const missionChanged = normalizedTempMission !== normalizedMission;
    const visionChanged = normalizedTempVision !== normalizedVision;
    
    if (!missionChanged && !visionChanged) {
      // No changes made
      setIsEditing(false);
      return;
    }
    
    // Show confirmation modal
    setShowMissionVisionModal(true);
  };

  // Handle cancel confirmation modal
  const handleMissionVisionCancel = () => {
    setShowMissionVisionModal(false);
  };

  // Handle save changes - use UPSERT to ensure only one Mission and one Vision
  const handleMissionVisionConfirm = async () => {
    try {
      setIsUpdating(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      
      // Normalize values for comparison (handle null/empty string)
      const normalizeValue = (val) => (val || '').trim();
      const normalizedTempMission = normalizeValue(tempMission);
      const normalizedTempVision = normalizeValue(tempVision);
      const normalizedMission = normalizeValue(mission);
      const normalizedVision = normalizeValue(vision);
      
      const updates = [];
      const errors = [];
      const savedData = { mission: null, vision: null };
      
      // Handle Mission - use UPSERT (always update/create the single Mission entry)
      const missionChanged = normalizedTempMission !== normalizedMission;
      if (missionChanged) {
        try {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/mission-vision`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'Mission',
                content: normalizedTempMission === '' ? null : normalizedTempMission
              })
            },
            'superadmin'
          );
          
          if (response && response.ok) {
            // Verify the response body to ensure the operation was successful
            try {
              const responseData = await response.json();
              if (responseData.success === true) {
                updates.push('Mission');
                // Store the saved data from response
                if (responseData.data) {
                  savedData.mission = responseData.data.content || '';
                }
              } else {
                const errorMessage = responseData.error || responseData.message || 'Failed to save Mission';
                errors.push(`Mission: ${errorMessage}`);
                console.error('Save mission error response:', responseData);
              }
            } catch (parseError) {
              // If response is OK but can't parse JSON, assume success
              updates.push('Mission');
            }
          } else {
            // Handle 401 responses
            if (response.status === 401) {
              showSuccessModal('Authentication expired. Please log in again.');
              return;
            }
            
            // Handle CORS errors (status 0)
            if (response.status === 0) {
              console.error('CORS or network error detected');
              showSuccessModal(`CORS error: Unable to connect to backend. Please check:\n1. Backend URL is correct (${baseUrl})\n2. CORS is configured on backend\n3. Backend is running`);
              return;
            }
            
            let errorMessage = 'Failed to save Mission';
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error('Save mission error response:', errorData);
            } catch (e) {
              errorMessage = response.statusText || `Server error (${response.status})`;
              console.error('Non-JSON error response:', response.status, response.statusText);
            }
            errors.push(`Mission: ${errorMessage}`);
          }
        } catch (error) {
          console.error('Mission save error:', error);
          let errorMessage = 'Failed to save Mission';
          if (error.message) {
            errorMessage = error.message;
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
          }
          errors.push(`Mission: ${errorMessage}`);
        }
      }
      
      // Handle Vision - use UPSERT (always update/create the single Vision entry)
      const visionChanged = normalizedTempVision !== normalizedVision;
      if (visionChanged) {
        try {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/mission-vision`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'Vision',
                content: normalizedTempVision === '' ? null : normalizedTempVision
              })
            },
            'superadmin'
          );
          
          if (response && response.ok) {
            // Verify the response body to ensure the operation was successful
            try {
              const responseData = await response.json();
              if (responseData.success === true) {
                updates.push('Vision');
                // Store the saved data from response
                if (responseData.data) {
                  savedData.vision = responseData.data.content || '';
                }
              } else {
                const errorMessage = responseData.error || responseData.message || 'Failed to save Vision';
                errors.push(`Vision: ${errorMessage}`);
                console.error('Save vision error response:', responseData);
              }
            } catch (parseError) {
              // If response is OK but can't parse JSON, assume success
              updates.push('Vision');
            }
          } else {
            // Handle 401 responses
            if (response.status === 401) {
              showSuccessModal('Authentication expired. Please log in again.');
              return;
            }
            
            // Handle CORS errors (status 0)
            if (response.status === 0) {
              console.error('CORS or network error detected');
              showSuccessModal(`CORS error: Unable to connect to backend. Please check:\n1. Backend URL is correct (${baseUrl})\n2. CORS is configured on backend\n3. Backend is running`);
              return;
            }
            
            let errorMessage = 'Failed to save Vision';
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error('Save vision error response:', errorData);
            } catch (e) {
              errorMessage = response.statusText || `Server error (${response.status})`;
              console.error('Non-JSON error response:', response.status, response.statusText);
            }
            errors.push(`Vision: ${errorMessage}`);
          }
        } catch (error) {
          console.error('Vision save error:', error);
          let errorMessage = 'Failed to save Vision';
          if (error.message) {
            errorMessage = error.message;
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
          }
          errors.push(`Vision: ${errorMessage}`);
        }
      }
      
      // Show results and update state
      if (updates.length > 0 || errors.length > 0) {
        // First, update state with saved data immediately (optimistic update)
        if (savedData.mission !== null) {
          setMission(savedData.mission);
          setTempMission(savedData.mission);
        }
        if (savedData.vision !== null) {
          setVision(savedData.vision);
          setTempVision(savedData.vision);
        }
        
        // Invalidate SWR cache for public site to force refresh
        try {
          await mutate(`${baseUrl}/api/mission-vision`);
        } catch (cacheError) {
          console.warn('Failed to invalidate cache:', cacheError);
        }
        
        // Update state with saved data (no need to reload - we already have the response data)
        // Use savedData from responses, or fallback to temp values if response parsing failed
        if (savedData.mission !== null) {
          setMission(savedData.mission);
          setTempMission(savedData.mission);
        }
        if (savedData.vision !== null) {
          setVision(savedData.vision);
          setTempVision(savedData.vision);
        }
        
        // Update missionVisionData with saved values for consistency
        setMissionVisionData(prev => {
          const updated = [...(prev || [])];
          const missionIndex = updated.findIndex(item => 
            item.type === 'Mission' || item.type?.toLowerCase() === 'mission'
          );
          const visionIndex = updated.findIndex(item => 
            item.type === 'Vision' || item.type?.toLowerCase() === 'vision'
          );
          
          if (savedData.mission !== null) {
            if (missionIndex >= 0) {
              updated[missionIndex] = { ...updated[missionIndex], content: savedData.mission };
            } else {
              updated.push({ type: 'Mission', content: savedData.mission });
            }
          }
          
          if (savedData.vision !== null) {
            if (visionIndex >= 0) {
              updated[visionIndex] = { ...updated[visionIndex], content: savedData.vision };
            } else {
              updated.push({ type: 'Vision', content: savedData.vision });
            }
          }
          
          return updated;
        });
        
        setIsEditing(false);
        
        if (errors.length > 0) {
          showSuccessModal(`Partially saved: ${updates.join(' and ')} updated, but ${errors.join(', ')}`);
        } else {
          showSuccessModal(`Successfully updated ${updates.join(' and ')}! The changes will be visible on the public site immediately.`);
        }
      } else {
        // No changes were made
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Update error:', error);
      let errorMessage = 'Failed to update mission and vision';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdating(false);
      setShowMissionVisionModal(false);
    }
  };


  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Mission & Vision</h2>
          <p>Manage your organization&apos;s mission and vision statements</p>
        </div>
        <div className={styles.headerActions}>
          {!isEditing ? (
            <button 
              className={styles.editToggleBtn}
              onClick={handleEditToggle}
            >
              <FiEdit3 size={16} />
              Edit
            </button>
          ) : (
            <>
              <button 
                className={styles.cancelBtn}
                onClick={handleEditToggle}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                className={styles.saveBtn}
                onClick={handleSaveClick}
                disabled={isUpdating}
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.missionVisionSection}>
          {/* Mission Section */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              <FiTarget className={styles.labelIcon} />
              Mission Statement
            </label>
            {isEditing ? (
              <textarea
                className={styles.textInput}
                value={tempMission}
                onChange={(e) => setTempMission(e.target.value)}
                placeholder="Enter your organization's mission statement..."
                rows={4}
              />
            ) : (
              <div className={styles.displayValue}>
                {mission && mission.trim() ? mission : <span className={styles.emptyPlaceholder}>No mission statement added yet</span>}
              </div>
            )}
          </div>

          {/* Vision Section */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              <FiEye className={styles.labelIcon} />
              Vision Statement
            </label>
            {isEditing ? (
              <textarea
                className={styles.textInput}
                value={tempVision}
                onChange={(e) => setTempVision(e.target.value)}
                placeholder="Enter your organization's vision statement..."
                rows={4}
              />
            ) : (
              <div className={styles.displayValue}>
                {vision && vision.trim() ? vision : <span className={styles.emptyPlaceholder}>No vision statement added yet</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mission & Vision Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={showMissionVisionModal}
        itemName="Mission & Vision"
        itemType="mission and vision content"
        actionType="update"
        onConfirm={handleMissionVisionConfirm}
        onCancel={handleMissionVisionCancel}
        isDeleting={isUpdating}
        customMessage="This will update the Mission & Vision section across the entire public website. The changes will be visible immediately."
      />
    </div>
  );
}
