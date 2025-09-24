'use client';

import { useState, useEffect } from 'react';
import { FiEdit3, FiXCircle, FiPlus, FiTrash2, FiUpload, FiSave, FiMenu } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';
import styles from './HeadsOfFacesManagement.module.css';

export default function HeadsOfFacesManagement({ showSuccessModal }) {
  const [headsData, setHeadsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [deletingHead, setDeletingHead] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirmationModal, setShowSaveConfirmationModal] = useState(false);
  const [tempHeadsData, setTempHeadsData] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    image_url: '',
    position: 'Head of FACES',
    display_order: 0
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Load heads data
  useEffect(() => {
    const loadHeadsData = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/heads-faces`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setHeadsData(data.data || []);
        }
      } catch (error) {
        console.error('Error loading heads data:', error);
        showAuthError('Failed to load heads data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadHeadsData();
  }, [showSuccessModal]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      email: '',
      phone: '',
      image_url: '',
      position: 'Head of FACES',
      display_order: 0
    });
    setSelectedFile(null);
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAuthError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAuthError('Image size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        image_url: previewUrl
      }));
    }
  };

  // Upload image to Cloudinary (using same pattern as banner images)
  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      
      console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, fileType: file.type });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'heads-faces');

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Get the token for manual request
      const token = localStorage.getItem('superAdminToken');
      if (!token) {
        console.log('No token found');
        showSuccessModal('Authentication required. Please log in again.');
        return null;
      }

      console.log('Making request to:', `${baseUrl}/api/upload`);

      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response received:', { status: response.status, statusText: response.statusText });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        return data.url; // Return the Cloudinary URL
      } else {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle add new head
  const handleAddHead = async () => {
    try {
      setIsUpdating(true);
      
      let imageUrl = formData.image_url;
      
      // Upload image if a file is selected
      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile);
      }
      
      const submitData = {
        ...formData,
        image_url: imageUrl
      };
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/heads-faces`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setHeadsData(prev => [...prev, data.data]);
        setShowAddModal(false);
        resetForm();
        showSuccessModal('Head of FACES added successfully!');
      } else {
        const errorData = await response.json();
        showAuthError(errorData.error || 'Failed to add head of FACES');
      }
    } catch (error) {
      console.error('Error adding head:', error);
      showAuthError('Failed to add head of FACES. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle edit head
  const handleEditHead = async () => {
    try {
      setIsUpdating(true);
      
      let imageUrl = formData.image_url;
      
      // Upload image if a new file is selected
      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile);
      }
      
      const submitData = {
        ...formData,
        image_url: imageUrl
      };
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/heads-faces/${editingHead.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setHeadsData(prev => prev.map(head => 
          head.id === editingHead.id ? data.data : head
        ));
        setShowEditModal(false);
        setEditingHead(null);
        resetForm();
        showSuccessModal('Head of FACES updated successfully!');
      } else {
        const errorData = await response.json();
        showAuthError(errorData.error || 'Failed to update head of FACES');
      }
    } catch (error) {
      console.error('Error updating head:', error);
      showAuthError('Failed to update head of FACES. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete head
  const handleDeleteHead = async () => {
    try {
      setIsUpdating(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/heads-faces/${deletingHead.id}`,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        setHeadsData(prev => prev.filter(head => head.id !== deletingHead.id));
        setShowDeleteModal(false);
        setDeletingHead(null);
        showSuccessModal('Head of FACES deleted successfully!');
      } else {
        const errorData = await response.json();
        showAuthError(errorData.error || 'Failed to delete head of FACES');
      }
    } catch (error) {
      console.error('Error deleting head:', error);
      showAuthError('Failed to delete head of FACES. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, headId) => {
    setDraggedItem(headId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, headId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(headId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e, targetHeadId) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetHeadId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedIndex = tempHeadsData.findIndex(head => head.id === draggedItem);
    const targetIndex = tempHeadsData.findIndex(head => head.id === targetHeadId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Create new array with reordered items using temp data
    const newHeadsData = [...tempHeadsData];
    const draggedHead = newHeadsData[draggedIndex];
    
    // Remove dragged item
    newHeadsData.splice(draggedIndex, 1);
    
    // Insert at new position
    newHeadsData.splice(targetIndex, 0, draggedHead);

    // Update display_order in temp data
    const updatedTempData = newHeadsData.map((head, index) => ({
      ...head,
      display_order: index + 1
    }));

    // Update temp data (changes won't be saved until Save Changes is clicked)
    setTempHeadsData(updatedTempData);
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Open edit modal
  const openEditModal = (head) => {
    setEditingHead(head);
    setFormData({
      name: head.name || '',
      description: head.description || '',
      email: head.email || '',
      phone: head.phone || '',
      image_url: head.image_url || '',
      position: head.position || 'Head of FACES',
      display_order: head.display_order || 0
    });
    setSelectedFile(null); // Reset selected file
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (head) => {
    setDeletingHead(head);
    setShowDeleteModal(true);
  };

  // Handle edit toggle
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // Initialize temp data when entering edit mode
      setTempHeadsData([...headsData]);
    }
  };

  // Handle save changes (for consistency with other cards)
  const handleSaveChanges = () => {
    // Check if there are any changes to save
    const hasChanges = JSON.stringify(tempHeadsData) !== JSON.stringify(headsData);
    
    if (hasChanges) {
      setShowSaveConfirmationModal(true);
    } else {
      // No changes, just exit edit mode
      setIsEditing(false);
      showSuccessModal('No changes to save.');
    }
  };

  // Confirm save changes
  const handleSaveConfirm = async () => {
    try {
      setIsUpdating(true);
      
      // Update display_order in backend
      const reorderData = tempHeadsData.map((head, index) => ({
        id: head.id,
        display_order: index + 1
      }));

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/heads-faces/reorder/order`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ heads: reorderData })
        },
        'superadmin'
      );

      if (response && response.ok) {
        // Update the actual data with temp data
        setHeadsData([...tempHeadsData]);
        
        // Exit edit mode
        setIsEditing(false);
        setShowSaveConfirmationModal(false);
        
        showSuccessModal('Heads of FACES updated successfully!');
      } else {
        showAuthError('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      showAuthError('Failed to save changes. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel save changes
  const handleSaveCancel = () => {
    setShowSaveConfirmationModal(false);
    // Reset temp data to original
    setTempHeadsData([...headsData]);
  };

  if (loading) {
    return (
      <div className={styles.settingsPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <h2>Heads Of FACES</h2>
            <p>Manage the heads of FACES displayed on the public interface</p>
          </div>
        </div>
        <div className={styles.panelContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading heads data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Heads Of FACES</h2>
          <p>Manage the heads of FACES displayed on the public interface</p>
        </div>
        <div className={styles.headerActions}>
          {isEditing ? (
            <>
                <button
                  onClick={() => {
                    handleEditToggle();
                    setTempHeadsData([...headsData]); // Reset temp data
                  }}
                  className={styles.cancelBtn}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
              <button
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className={styles.saveBtn}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className={styles.editToggleBtn}
              disabled={isUpdating}
            >
              <FiEdit3 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        {headsData.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <h3>No Heads of FACES</h3>
            <p>Add heads of FACES to display on the public interface</p>
            <button
              className={styles.addButton}
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <FiPlus />
              Add First Head
            </button>
          </div>
        ) : (
          <div>
            {isEditing && (
              <div className={styles.addHeadSection}>
                <button
                  className={styles.addButton}
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  disabled={isUpdating}
                >
                  <FiPlus />
                  Add Head
                </button>
                <div className={styles.dragInstructions}>
                  <p>💡 <strong>Tip:</strong> Drag and drop cards to reorder them</p>
                </div>
              </div>
            )}
            <div className={styles.headsGrid}>
            {/* Debug: Show count of heads */}
            <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>
              Showing {(isEditing ? tempHeadsData : headsData).length} head(s) of FACES
            </div>
            {(isEditing ? tempHeadsData : headsData).map((head, index) => (
              <div 
                key={head.id} 
                className={`${styles.headCard} ${draggedItem === head.id ? styles.dragging : ''} ${dragOverItem === head.id ? styles.dragOver : ''}`}
                draggable={isEditing}
                onDragStart={(e) => handleDragStart(e, head.id)}
                onDragOver={(e) => handleDragOver(e, head.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, head.id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.headImage}>
                    {head.image_url ? (
                      <img src={head.image_url} alt={head.name} />
                    ) : (
                      <div className={styles.placeholderImage}>
                        <span>{head.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div className={styles.cardActions}>
                      <div className={styles.dragHandle}>
                        <FiMenu />
                      </div>
                      
                      <button
                        onClick={() => openEditModal(head)}
                        className={styles.editButton}
                        disabled={isUpdating}
                        title="Edit head"
                      >
                        <FiEdit3 />
                      </button>
                      
                      <button
                        onClick={() => openDeleteModal(head)}
                        className={styles.deleteButton}
                        disabled={isUpdating}
                        title="Delete head"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className={styles.headInfo}>
                  <h3 className={styles.headName}>{head.name}</h3>
                  <p className={styles.position}>{head.position}</p>
                  {head.description && (
                    <p className={styles.description}>{head.description}</p>
                  )}
                  <div className={styles.contactInfo}>
                    {head.email && (
                      <div className={styles.contactItem}>
                        <strong>Email:</strong> {head.email}
                      </div>
                    )}
                    {head.phone && (
                      <div className={styles.contactItem}>
                        <strong>Phone:</strong> {head.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add New Head of FACES</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className={styles.closeButton}
              >
                <FiXCircle />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Enter position"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Profile Image</label>
                <div className={styles.fileUploadContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                    id="image-upload-add"
                  />
                  <label htmlFor="image-upload-add" className={styles.fileUploadLabel}>
                    <FiUpload />
                    {selectedFile ? 'Change Image' : 'Choose Image'}
                  </label>
                  {selectedFile && (
                    <div className={styles.filePreview}>
                      <img src={formData.image_url} alt="Preview" />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                </div>
                <p className={styles.fileUploadHint}>
                  Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowAddModal(false)}
                className={styles.cancelButton}
                disabled={isUpdating || uploadingImage}
              >
                Cancel
              </button>
              <button
                onClick={handleAddHead}
                className={styles.saveButton}
                disabled={isUpdating || uploadingImage || !formData.name.trim()}
              >
                {isUpdating ? (uploadingImage ? 'Uploading...' : 'Adding...') : 'Add Head'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Head of FACES</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className={styles.closeButton}
              >
                <FiXCircle />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Enter position"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Profile Image</label>
                <div className={styles.fileUploadContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                    id="image-upload-edit"
                  />
                  <label htmlFor="image-upload-edit" className={styles.fileUploadLabel}>
                    <FiUpload />
                    {selectedFile ? 'Change Image' : 'Choose New Image'}
                  </label>
                  {(selectedFile || formData.image_url) && (
                    <div className={styles.filePreview}>
                      <img src={formData.image_url} alt="Preview" />
                      {selectedFile && <span>{selectedFile.name}</span>}
                    </div>
                  )}
                </div>
                <p className={styles.fileUploadHint}>
                  Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowEditModal(false)}
                className={styles.cancelButton}
                disabled={isUpdating || uploadingImage}
              >
                Cancel
              </button>
              <button
                onClick={handleEditHead}
                className={styles.saveButton}
                disabled={isUpdating || uploadingImage || !formData.name.trim()}
              >
                {isUpdating ? (uploadingImage ? 'Uploading...' : 'Updating...') : 'Update Head'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSaveConfirmationModal}
        itemName="Heads of FACES"
        itemType="heads of FACES"
        actionType="update"
        onConfirm={handleSaveConfirm}
        onCancel={handleSaveCancel}
        isDeleting={isUpdating}
        customMessage="This will update the order of Heads of FACES displayed on the public website. The changes will be visible immediately."
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteHead}
        title="Delete Head of FACES"
        message={`Are you sure you want to delete "${deletingHead?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isUpdating}
        isDestructive={true}
      />
    </div>
  );
}
