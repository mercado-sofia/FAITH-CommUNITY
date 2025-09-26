'use client';

import { useState, useEffect } from 'react';
import { FiTarget, FiEye, FiEdit3 } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import { SkeletonLoader } from '../../../components';
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
        console.error('Error loading mission and vision data:', error);
        showAuthError('Failed to load mission and vision data. Please try again.');
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

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setIsUpdating(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Find existing mission and vision items
      const missionItem = missionVisionData.find(item => item.type === 'Mission');
      const visionItem = missionVisionData.find(item => item.type === 'Vision');
      
      const updates = [];
      
      // Update mission if changed
      if (missionItem && tempMission !== mission) {
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/mission-vision/${missionItem.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Mission',
              content: tempMission,
              status: 'ACTIVE'
            })
          },
          'superadmin'
        );
        
        if (response && response.ok) {
          updates.push('Mission');
        }
      }
      
      // Update vision if changed
      if (visionItem && tempVision !== vision) {
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/mission-vision/${visionItem.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Vision',
              content: tempVision,
              status: 'ACTIVE'
            })
          },
          'superadmin'
        );
        
        if (response && response.ok) {
          updates.push('Vision');
        }
      }
      
      if (updates.length > 0) {
        // Update local state
        setMission(tempMission);
        setVision(tempVision);
        setIsEditing(false);
        showSuccessModal(`Successfully updated ${updates.join(' and ')}! The changes will be visible on the public site immediately.`);
        
        // Reload data to ensure consistency
        const loadData = async () => {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/mission-vision`,
            { method: 'GET' },
            'superadmin'
          );
          if (response && response.ok) {
            const data = await response.json();
            setMissionVisionData(data);
          }
        };
        loadData();
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating mission and vision:', error);
      showAuthError('Failed to update mission and vision. Please try again.');
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
                {mission || 'No mission statement set'}
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
                {vision || 'No vision statement set'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
