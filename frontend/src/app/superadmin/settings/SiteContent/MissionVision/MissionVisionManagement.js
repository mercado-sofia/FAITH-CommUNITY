'use client';

import { useState, useEffect } from 'react';
import { FiTarget, FiEye, FiEdit3 } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import styles from './MissionVisionManagement.module.css';

export default function MissionVisionManagement({ showSuccessModal }) {
  const [missionVisionData, setMissionVisionData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form state
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [tempMission, setTempMission] = useState('');
  const [tempVision, setTempVision] = useState('');

  // Load mission and vision data
  useEffect(() => {
    const loadMissionVisionData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/mission-vision`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setMissionVisionData(data);
          
          // Extract mission and vision from the data
          const missionItem = data.find(item => item.type === 'Mission');
          const visionItem = data.find(item => item.type === 'Vision');
          
          setMission(missionItem?.content || '');
          setVision(visionItem?.content || '');
          setTempMission(missionItem?.content || '');
          setTempVision(visionItem?.content || '');
        }
      } catch (error) {
        console.error('Load error:', error);
        let errorMessage = 'Failed to load mission and vision data';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
        }
        
        showAuthError(errorMessage);
      } finally {
      }
    };

    loadMissionVisionData();
  }, [showSuccessModal]);

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

  // Handle save changes - create if doesn't exist, update if exists
  const handleSaveChanges = async () => {
    try {
      setIsUpdating(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Find existing mission and vision items
      const missionItem = missionVisionData.find(item => item.type === 'Mission');
      const visionItem = missionVisionData.find(item => item.type === 'Vision');
      
      const updates = [];
      const errors = [];
      
      // Handle Mission - create or update
      const missionChanged = tempMission !== mission;
      if (missionChanged) {
        try {
          if (missionItem) {
            // Update existing mission
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/mission-vision/${missionItem.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Mission',
                  content: tempMission.trim() || null,
              status: 'ACTIVE'
            })
          },
          'superadmin'
        );
        
        if (response && response.ok) {
          updates.push('Mission');
            } else {
              let errorMessage = 'Failed to update Mission';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Update mission error response:', errorData);
              } catch (e) {
                errorMessage = response.statusText || `Server error (${response.status})`;
                console.error('Non-JSON error response:', response.status, response.statusText);
              }
              errors.push(`Mission: ${errorMessage}`);
            }
          } else {
            // Create new mission if it doesn't exist
            const response = await makeAuthenticatedRequest(
              `${baseUrl}/api/mission-vision`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'Mission',
                  content: tempMission.trim() || null
                })
              },
              'superadmin'
            );
            
            if (response && response.ok) {
              updates.push('Mission');
            } else {
              let errorMessage = 'Failed to create Mission';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Create mission error response:', errorData);
              } catch (e) {
                errorMessage = response.statusText || `Server error (${response.status})`;
                console.error('Non-JSON error response:', response.status, response.statusText);
              }
              errors.push(`Mission: ${errorMessage}`);
            }
          }
        } catch (error) {
          console.error('Mission save error:', error);
          errors.push(`Mission: ${error.message || 'Failed to save'}`);
        }
      }
      
      // Handle Vision - create or update
      const visionChanged = tempVision !== vision;
      if (visionChanged) {
        try {
          if (visionItem) {
            // Update existing vision
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/mission-vision/${visionItem.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Vision',
                  content: tempVision.trim() || null,
              status: 'ACTIVE'
            })
          },
          'superadmin'
        );
        
        if (response && response.ok) {
          updates.push('Vision');
            } else {
              let errorMessage = 'Failed to update Vision';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Update vision error response:', errorData);
              } catch (e) {
                errorMessage = response.statusText || `Server error (${response.status})`;
                console.error('Non-JSON error response:', response.status, response.statusText);
              }
              errors.push(`Vision: ${errorMessage}`);
            }
          } else {
            // Create new vision if it doesn't exist
            const response = await makeAuthenticatedRequest(
              `${baseUrl}/api/mission-vision`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'Vision',
                  content: tempVision.trim() || null
                })
              },
              'superadmin'
            );
            
            if (response && response.ok) {
              updates.push('Vision');
            } else {
              let errorMessage = 'Failed to create Vision';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Create vision error response:', errorData);
              } catch (e) {
                errorMessage = response.statusText || `Server error (${response.status})`;
                console.error('Non-JSON error response:', response.status, response.statusText);
              }
              errors.push(`Vision: ${errorMessage}`);
            }
          }
        } catch (error) {
          console.error('Vision save error:', error);
          errors.push(`Vision: ${error.message || 'Failed to save'}`);
        }
      }
      
      // Show results
      if (updates.length > 0) {
        // Update local state
        setMission(tempMission);
        setVision(tempVision);
        setIsEditing(false);
        
        // Reload data to ensure consistency
        const loadData = async () => {
          try {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/mission-vision`,
            { method: 'GET' },
            'superadmin'
          );
          if (response && response.ok) {
            const data = await response.json();
            setMissionVisionData(data);
              
              // Update form state with fresh data
              const missionItem = data.find(item => item.type === 'Mission');
              const visionItem = data.find(item => item.type === 'Vision');
              setMission(missionItem?.content || '');
              setVision(visionItem?.content || '');
            }
          } catch (error) {
            console.error('Error reloading data:', error);
          }
        };
        await loadData();
        
        if (errors.length > 0) {
          showSuccessModal(`Partially saved: ${updates.join(' and ')} updated, but ${errors.join(', ')}`);
      } else {
          showSuccessModal(`Successfully updated ${updates.join(' and ')}! The changes will be visible on the public site immediately.`);
        }
      } else if (errors.length > 0) {
        showSuccessModal(`Failed to save: ${errors.join(', ')}`);
      } else if (!missionChanged && !visionChanged) {
        // No changes made
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
                onClick={handleSaveChanges}
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
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
                {mission ? mission : <span className={styles.emptyPlaceholder}>No mission statement added yet</span>}
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
                {vision ? vision : <span className={styles.emptyPlaceholder}>No vision statement added yet</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
