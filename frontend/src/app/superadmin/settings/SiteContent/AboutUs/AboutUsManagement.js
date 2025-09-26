'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiEdit3, FiXCircle, FiPlus, FiTrash2, FiUpload, FiImage } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { SkeletonLoader } from '../../../components';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import styles from './AboutUsManagement.module.css';

export default function AboutUsManagement({ showSuccessModal }) {
  const { preserveScrollPositionAsync } = useScrollPosition();
  const [aboutUsData, setAboutUsData] = useState(null);
  const [isUpdatingAboutUs, setIsUpdatingAboutUs] = useState(false);
  const [showAboutUsModal, setShowAboutUsModal] = useState(false);
  
  // Edit mode state
  const [isEditingAboutUs, setIsEditingAboutUs] = useState(false);
  const [tempAboutUs, setTempAboutUs] = useState({
    heading: '',
    description: '',
    extension_categories: [],
    image_url: ''
  });

  // Image upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Image deletion state
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  // Extension category management
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: 'green' });
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(-1);
  const [editingCategory, setEditingCategory] = useState({ name: '', color: 'green' });
  
  // Custom dropdown states for full control over styling
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showEditColorDropdown, setShowEditColorDropdown] = useState(false);

  const colorOptions = [
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'orange', label: 'Orange' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'pink', label: 'Pink' },
    { value: 'teal', label: 'Teal' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'gray', label: 'Gray' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'rose', label: 'Rose' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'lime', label: 'Lime' },
    { value: 'amber', label: 'Amber' }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(`.${styles.customDropdown}`)) {
        setShowColorDropdown(false);
        setShowEditColorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load about us data
  useEffect(() => {
    const loadAboutUsData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/about-us`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setAboutUsData(data.data);
          setTempAboutUs({
            heading: data.data.heading || '',
            description: data.data.description || '',
            extension_categories: data.data.extension_categories || [],
            image_url: data.data.image_url || ''
          });
        }
      } catch (error) {
        console.error('Error loading about us data:', error);
        showAuthError('Failed to load about us data. Please try again.');
      } finally {
      }
    };

    loadAboutUsData();
  }, [showSuccessModal]);

  // Edit toggle function
  const handleEditToggle = () => {
    setIsEditingAboutUs(!isEditingAboutUs);
    if (!isEditingAboutUs) {
      setTempAboutUs({
        heading: aboutUsData?.heading || '',
        description: aboutUsData?.description || '',
        extension_categories: aboutUsData?.extension_categories || [],
        image_url: aboutUsData?.image_url || ''
      });
    }
  };

  // Cancel edit function
  const handleCancelEdit = () => {
    setIsEditingAboutUs(false);
    setTempAboutUs({
      heading: aboutUsData?.heading || '',
      description: aboutUsData?.description || '',
      extension_categories: aboutUsData?.extension_categories || [],
      image_url: aboutUsData?.image_url || ''
    });
    setSelectedFile(null); // Clear any selected file
  };

  // About us update handler
  const handleAboutUsUpdate = () => {
    if (!tempAboutUs.heading.trim()) {
      showSuccessModal('Heading cannot be empty');
      return;
    }
    if (!tempAboutUs.description.trim()) {
      showSuccessModal('Description cannot be empty');
      return;
    }
    if (!tempAboutUs.extension_categories.length) {
      showSuccessModal('At least one extension category is required');
      return;
    }
    setShowAboutUsModal(true);
  };

  // Confirm about us update
  const handleAboutUsConfirm = async () => {
    await preserveScrollPositionAsync(async () => {
      try {
        setIsUpdatingAboutUs(true);
        
        let finalImageUrl = tempAboutUs.image_url;
        
        // Upload image if a new file is selected
        if (selectedFile) {
          try {
            finalImageUrl = await handleImageUpload(selectedFile);
            setSelectedFile(null); // Clear selected file after successful upload
          } catch (error) {
            showSuccessModal('Failed to upload image. Please try again.');
            return;
          }
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/about-us`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              heading: tempAboutUs.heading.trim(),
              description: tempAboutUs.description.trim(),
              extension_categories: tempAboutUs.extension_categories,
              image_url: finalImageUrl
            }),
          },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setAboutUsData(data.data);
          setIsEditingAboutUs(false);
          showSuccessModal('About us content updated successfully! The changes will be visible on the public site immediately.');
        } else {
          const errorData = await response.json();
          showSuccessModal(errorData.message || 'Failed to update about us content');
        }
      } catch (error) {
        console.error('Error updating about us content:', error);
        showSuccessModal('Failed to update about us content. Please try again.');
      } finally {
        setIsUpdatingAboutUs(false);
        setShowAboutUsModal(false);
      }
    });
  };

  // Cancel about us update
  const handleAboutUsCancel = () => {
    setShowAboutUsModal(false);
  };

  // Add extension category
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      showSuccessModal('Category name cannot be empty');
      return;
    }

    preserveScrollPositionAsync(async () => {
      const updatedCategories = [...tempAboutUs.extension_categories, { ...newCategory }];
      setTempAboutUs(prev => ({
        ...prev,
        extension_categories: updatedCategories
      }));
      setNewCategory({ name: '', color: 'green' });
      setShowAddCategoryModal(false);
    });
  };

  // Edit extension category
  const handleEditCategory = (index) => {
    setEditingCategoryIndex(index);
    setEditingCategory({ ...tempAboutUs.extension_categories[index] });
  };

  // Update extension category
  const handleUpdateCategory = () => {
    if (!editingCategory.name.trim()) {
      showSuccessModal('Category name cannot be empty');
      return;
    }

    preserveScrollPositionAsync(async () => {
      const updatedCategories = [...tempAboutUs.extension_categories];
      updatedCategories[editingCategoryIndex] = { ...editingCategory };
      setTempAboutUs(prev => ({
        ...prev,
        extension_categories: updatedCategories
      }));
      setEditingCategoryIndex(-1);
      setEditingCategory({ name: '', color: 'green' });
    });
  };

  // Delete extension category
  const handleDeleteCategory = (index) => {
    if (tempAboutUs.extension_categories.length <= 1) {
      showSuccessModal('Cannot delete the last extension category');
      return;
    }

    preserveScrollPositionAsync(async () => {
      const updatedCategories = tempAboutUs.extension_categories.filter((_, i) => i !== index);
      setTempAboutUs(prev => ({
        ...prev,
        extension_categories: updatedCategories
      }));
    });
  };

  // File upload handlers
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showSuccessModal('Please select an image file');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showSuccessModal('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      
      
      const formData = new FormData();
      formData.append('image', file);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Get the token for manual request
      const token = localStorage.getItem('superAdminToken');
      if (!token) {
        showSuccessModal('Authentication required. Please log in again.');
        return null;
      }


      const response = await fetch(`${baseUrl}/api/superadmin/about-us/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });


      if (response.ok) {
        const data = await response.json();
        return data.imageUrl; // Return the Cloudinary URL from the response
      } else {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image upload (now part of the main save flow)
  const handleImageUpload = async (file) => {
    try {
      const imageUrl = await uploadImage(file);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle image deletion
  const handleDeleteImage = () => {
    setShowDeleteImageModal(true);
  };

  const handleDeleteImageConfirm = async () => {
    await preserveScrollPositionAsync(async () => {
      try {
        setIsDeletingImage(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/about-us/image`,
          { method: 'DELETE' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setAboutUsData(data.data);
          setTempAboutUs(prev => ({
            ...prev,
            image_url: ''
          }));
          setSelectedFile(null); // Clear any selected file
          showSuccessModal('Image deleted successfully!');
        } else {
          const errorData = await response.json();
          showSuccessModal(errorData.message || 'Failed to delete image');
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        showSuccessModal('Failed to delete image. Please try again.');
      } finally {
        setIsDeletingImage(false);
        setShowDeleteImageModal(false);
      }
    });
  };

  const handleDeleteImageCancel = () => {
    setShowDeleteImageModal(false);
  };


  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>About Us</h2>
          <p>Manage the About Us section content for your website</p>
        </div>
        <div className={styles.headerActions}>
          {isEditingAboutUs ? (
            <>
              <button
                onClick={handleCancelEdit}
                className={styles.cancelBtn}
                disabled={isUpdatingAboutUs}
              >
                Cancel
              </button>
              <button
                onClick={handleAboutUsUpdate}
                disabled={isUpdatingAboutUs}
                className={styles.saveBtn}
              >
                {isUpdatingAboutUs ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className={styles.editToggleBtn}
              disabled={isUpdatingAboutUs}
            >
              <FiEdit3 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.aboutUsSection}>
          {/* Heading Field */}
          <div className={styles.inputGroup}>
            <label htmlFor="heading" className={styles.inputLabel}>
              Heading
            </label>
            <input
              type="text"
              id="heading"
              value={isEditingAboutUs ? tempAboutUs.heading : (aboutUsData?.heading || '')}
              onChange={(e) => isEditingAboutUs ? 
                setTempAboutUs(prev => ({ ...prev, heading: e.target.value })) :
                null
              }
              className={styles.textInput}
              placeholder="Enter heading"
              maxLength={500}
              disabled={!isEditingAboutUs}
            />
          </div>

          {/* Description Field */}
          <div className={styles.inputGroup}>
            <label htmlFor="description" className={styles.inputLabel}>
              Description
            </label>
            <textarea
              id="description"
              value={isEditingAboutUs ? tempAboutUs.description : (aboutUsData?.description || '')}
              onChange={(e) => isEditingAboutUs ? 
                setTempAboutUs(prev => ({ ...prev, description: e.target.value })) :
                null
              }
              className={styles.textArea}
              placeholder="Enter description"
              rows={4}
              disabled={!isEditingAboutUs}
            />
          </div>

          {/* Image Upload Section */}
          <div className={styles.inputGroup}>
            <div className={styles.imageSectionHeader}>
              <label className={styles.inputLabel}>
                About Us Image
              </label>
              {isEditingAboutUs && (isEditingAboutUs ? tempAboutUs.image_url : (aboutUsData?.image_url || '')) && (
                <div className={styles.imageActions}>
                  <button
                    onClick={handleDeleteImage}
                    className={styles.removeBtn}
                    title="Remove image"
                  >
                    <FiTrash2 color="#dc2626" />
                  </button>
                </div>
              )}
            </div>
            <div className={styles.imageUploadSection}>
              {/* Current Image Display */}
              {(isEditingAboutUs ? tempAboutUs.image_url : (aboutUsData?.image_url || '')) ? (
                <div className={styles.currentImageContainer}>
                  <Image
                    src={isEditingAboutUs ? tempAboutUs.image_url : (aboutUsData?.image_url || '')}
                    alt="Current About Us Image"
                    className={styles.currentImage}
                    width={400}
                    height={300}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : selectedFile ? (
                <div className={styles.currentImageContainer}>
                  <Image
                    src={URL.createObjectURL(selectedFile)}
                    alt="Selected Image Preview"
                    className={styles.currentImage}
                    width={400}
                    height={300}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div className={styles.emptyImageState}>
                  No image uploaded
                </div>
              )}
              
              {/* Image Upload Controls - Only show when no image exists and in edit mode */}
              {isEditingAboutUs && !(isEditingAboutUs ? tempAboutUs.image_url : (aboutUsData?.image_url || '')) && (
                <div className={styles.imageUploadControls}>
                  {!selectedFile ? (
                    <div className={styles.fileInputContainer}>
                      <input
                        type="file"
                        id="imageUpload"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                        disabled={uploadingImage}
                      />
                      <label htmlFor="imageUpload" className={styles.fileInputLabel}>
                        <FiUpload size={16} />
                        Choose Image
                      </label>
                    </div>
                  ) : (
                    <div className={styles.uploadActions}>
                      <div className={styles.selectedFileInfo}>
                        <span className={styles.fileName}>{selectedFile.name}</span>
                        <span className={styles.fileSize}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <span className={styles.uploadNote}>
                          Image will be uploaded when you save changes
                        </span>
                      </div>
                      <div className={styles.uploadButtons}>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className={styles.cancelBtn}
                        >
                          Remove Selection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Extension Categories */}
          <div className={styles.inputGroup}>
            <div className={styles.categoriesHeader}>
              <label className={styles.inputLabel}>
                Extension Categories
              </label>
              {isEditingAboutUs && (
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className={styles.addCategoryBtn}
                >
                  <FiPlus size={16} />
                  Add Category
                </button>
              )}
            </div>
            
            <div className={styles.categoriesList}>
              {(isEditingAboutUs ? tempAboutUs.extension_categories : (aboutUsData?.extension_categories || [])).map((category, index) => (
                <div key={index} className={styles.categoryItem}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryName}>{category.name}</span>
                     <span className={styles.categoryMeta}>
                       Color: {category.color}
                     </span>
                  </div>
                  {isEditingAboutUs && (
                    <div className={styles.categoryActions}>
                      <button
                        onClick={() => handleEditCategory(index)}
                        className={styles.editCategoryBtn}
                      >
                        <FiEdit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(index)}
                        className={styles.deleteCategoryBtn}
                        disabled={tempAboutUs.extension_categories.length <= 1}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* About Us Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={showAboutUsModal}
        itemName="About Us Content"
        itemType="about us content"
        actionType="update"
        onConfirm={handleAboutUsConfirm}
        onCancel={handleAboutUsCancel}
        isDeleting={isUpdatingAboutUs}
        customMessage="This will update the About Us section across the entire public website. The changes will be visible immediately."
      />

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Extension Category</h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className={styles.closeModalBtn}
              >
                <FiXCircle size={20} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Category Name</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter category name"
                />
              </div>
               <div className={styles.inputGroup}>
                 <label className={styles.inputLabel}>Icon Color</label>
                 <div className={styles.customDropdown}>
                   <button
                     type="button"
                     className={styles.dropdownButton}
                     onClick={() => setShowColorDropdown(!showColorDropdown)}
                   >
                     {colorOptions.find(option => option.value === newCategory.color)?.label || 'Select Color'}
                     <span className={styles.dropdownArrow}>▼</span>
                   </button>
                   {showColorDropdown && (
                     <div className={styles.dropdownMenu}>
                       {colorOptions.map((option) => (
                         <button
                           key={option.value}
                           type="button"
                           className={`${styles.dropdownOption} ${newCategory.color === option.value ? styles.selected : ''}`}
                           onClick={() => {
                             setNewCategory(prev => ({ ...prev, color: option.value }));
                             setShowColorDropdown(false);
                           }}
                         >
                           {option.label}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className={styles.saveBtn}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategoryIndex >= 0 && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Extension Category</h3>
              <button
                onClick={() => setEditingCategoryIndex(-1)}
                className={styles.closeModalBtn}
              >
                <FiXCircle size={20} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Category Name</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter category name"
                />
              </div>
               <div className={styles.inputGroup}>
                 <label className={styles.inputLabel}>Icon Color</label>
                 <div className={styles.customDropdown}>
                   <button
                     type="button"
                     className={styles.dropdownButton}
                     onClick={() => setShowEditColorDropdown(!showEditColorDropdown)}
                   >
                     {colorOptions.find(option => option.value === editingCategory.color)?.label || 'Select Color'}
                     <span className={styles.dropdownArrow}>▼</span>
                   </button>
                   {showEditColorDropdown && (
                     <div className={styles.dropdownMenu}>
                       {colorOptions.map((option) => (
                         <button
                           key={option.value}
                           type="button"
                           className={`${styles.dropdownOption} ${editingCategory.color === option.value ? styles.selected : ''}`}
                           onClick={() => {
                             setEditingCategory(prev => ({ ...prev, color: option.value }));
                             setShowEditColorDropdown(false);
                           }}
                         >
                           {option.label}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setEditingCategoryIndex(-1)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCategory}
                className={styles.saveBtn}
              >
                Update Category
              </button>
        </div>
      </div>
        </div>
      )}

      {/* Delete Image Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteImageModal}
        itemName="About Us Image"
        itemType="image"
        actionType="delete"
        onConfirm={handleDeleteImageConfirm}
        onCancel={handleDeleteImageCancel}
        isDeleting={isDeletingImage}
        customMessage="This will permanently delete the About Us image from both the Home page and About Us page. This action cannot be undone."
      />
    </div>
  );
}
