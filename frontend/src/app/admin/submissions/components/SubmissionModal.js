import styles from '../../styles/submissions.module.css';
import { useState, useEffect, useRef } from 'react';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

export default function SubmissionModal({ submission, isEditing, onClose, onSubmit, onSave }) {
  const { section, status, previous_data, proposed_data, rejection_comment } = submission;
  const [editedData, setEditedData] = useState({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [savedImages, setSavedImages] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Parse the proposed data when component mounts or when proposed_data changes
    try {
      const parsedData = typeof proposed_data === 'string' 
        ? JSON.parse(proposed_data) 
        : proposed_data;
      setEditedData(parsedData);
      setSavedData(parsedData);
      
      // Clear any existing preview URLs and uploaded files when data changes
      setImagePreviewUrls({});
      setUploadedFiles({});
      setSavedImages({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error parsing proposed data:', error);
      setEditedData({});
      setSavedData({});
    }
  }, [proposed_data]);

  const formatKey = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const handleImageEdit = (key) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-field', key);
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const field = fileInputRef.current?.getAttribute('data-field');
      if (field) {
        // Create a temporary URL for the selected image
        const imageUrl = URL.createObjectURL(file);
        setImagePreviewUrls(prev => ({
          ...prev,
          [field]: imageUrl
        }));

        // Store the file for upload
        setUploadedFiles(prev => ({
          ...prev,
          [field]: file
        }));

        // Update the editedData to mark that this field has a new file
        setEditedData(prev => {
          let newData = { ...prev };
          if (field.includes('head-')) {
            // Handle organization head photos
            const [, index, ] = field.split('-');
            const newHeads = [...(prev.heads || [])];
            newHeads[index] = { 
              ...newHeads[index], 
              photo: file.name 
            };
            newData.heads = newHeads;
          } else {
            // Handle other images (like logo)
            newData[field] = file.name;
          }
          return newData;
        });

        setHasChanges(true);
      }
    }
  };

  const renderImage = (value, key) => {
    // First check for temporary preview URL
    const tempPreviewUrl = imagePreviewUrls[key];
    // Then check if we have a saved file
    const uploadedFile = uploadedFiles[key];
    // Finally fall back to the server URL if available
    const serverUrl = value ? `http://localhost:8080/uploads/${value}` : null;
    
    // Use the most recent image URL available
    const imageUrl = tempPreviewUrl || (uploadedFile ? URL.createObjectURL(uploadedFile) : serverUrl);

    if (!imageUrl) return (
      <div className={styles.imagePreview} onClick={() => isEditing && handleImageEdit(key)}>
        <p>No image</p>
        {isEditing && (
          <div className={styles.imageOverlay}>
            <span className={styles.editImageText}>
              <FaEdit style={{ marginRight: '4px' }} /> Add Image
            </span>
          </div>
        )}
      </div>
    );

    return (
      <div className={styles.imagePreview} onClick={() => isEditing && handleImageEdit(key)}>
        <img 
          src={imageUrl}
          alt={`${key}`}
          className={styles.previewImage}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/logo/faith_community_logo.png';
          }}
        />
        {isEditing && (
          <div className={styles.imageOverlay}>
            <span className={styles.editImageText}>
              <FaEdit style={{ marginRight: '4px' }} /> Edit Image
            </span>
          </div>
        )}
        <small className={styles.imagePath}>
          {tempPreviewUrl ? 'New image selected' : 
           uploadedFile ? 'Saved image' : value}
        </small>
      </div>
    );
  };

  const handleArrayChange = (key, value, index) => {
    setEditedData(prev => {
      const newArray = [...(prev[key] || [])];
      newArray[index] = value;
      return { ...prev, [key]: newArray };
    });
  };

  const handleAddArrayItem = (key) => {
    setEditedData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), '']
    }));
  };

  const handleRemoveArrayItem = (key, index) => {
    setEditedData(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const handleHeadChange = (index, field, value) => {
    setEditedData(prev => {
      const newHeads = [...(prev.heads || [])];
      newHeads[index] = { ...newHeads[index], [field]: value };
      return { ...prev, heads: newHeads };
    });
  };

  const handleAddHead = () => {
    setEditedData(prev => ({
      ...prev,
      heads: [...(prev.heads || []), {
        name: '',
        role: '',
        email: '',
        facebook: '',
        photo: ''
      }]
    }));
  };

  const handleRemoveHead = (index) => {
    setEditedData(prev => ({
      ...prev,
      heads: prev.heads.filter((_, i) => i !== index)
    }));
  };

  const renderArrayData = (data, key, isEditable = false) => {
    if (isEditable) {
      const value = Array.isArray(data) ? data.join('\n') : '';
      return (
        <div>
          <textarea
            value={value}
            onChange={(e) => {
              const newValue = e.target.value.split('\n').filter(item => item.trim());
              setEditedData(prev => ({
                ...prev,
                [key]: newValue
              }));
            }}
            className={styles.textArea}
            placeholder={`Enter ${formatKey(key)} (one per line)`}
          />
        </div>
      );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return <p>No {key.toLowerCase()}</p>;
    }

    return (
      <div className={styles.arrayData}>
        {data.map((item, index) => (
          <span key={index} className={styles.arrayItem}>{item}</span>
        ))}
      </div>
    );
  };

  const renderHeads = (heads, isEditable = false) => {
    if (isEditable) {
      return (
        <div>
          {(heads || []).map((head, index) => (
            <div key={index} className={styles.headEditForm}>
              <div>
                {renderImage(head.photo, `head-${index}-photo`)}
              </div>
              <div>
                <label>Name:</label>
                <input
                  type="text"
                  value={head.name || ''}
                  onChange={(e) => handleHeadChange(index, 'name', e.target.value)}
                  className={styles.editInput}
                />
              </div>
              <div>
                <label>Role:</label>
                <input
                  type="text"
                  value={head.role || ''}
                  onChange={(e) => handleHeadChange(index, 'role', e.target.value)}
                  className={styles.editInput}
                />
              </div>
              <div>
                <label>Email:</label>
                <input
                  type="email"
                  value={head.email || ''}
                  onChange={(e) => handleHeadChange(index, 'email', e.target.value)}
                  className={styles.editInput}
                />
              </div>
              <div>
                <label>Facebook:</label>
                <input
                  type="text"
                  value={head.facebook || ''}
                  onChange={(e) => handleHeadChange(index, 'facebook', e.target.value)}
                  className={styles.editInput}
                />
              </div>
              <button 
                className={styles.removeButton}
                onClick={() => handleRemoveHead(index)}
              >
                <FaTrash /> Remove Head
              </button>
            </div>
          ))}
          <button 
            className={styles.addButton}
            onClick={handleAddHead}
          >
            <FaPlus /> Add Organization Head
          </button>
        </div>
      );
    }

    if (!heads || !Array.isArray(heads) || heads.length === 0) {
      return <p>No organization heads</p>;
    }

    return (
      <div className={styles.headsContainer}>
        {heads.map((head, index) => (
          <div key={index} className={styles.headCard}>
            {head.photo && renderImage(head.photo, 'Head Photo')}
            <div className={styles.headInfo}>
              <p><strong>Name:</strong> {head.name}</p>
              <p><strong>Role:</strong> {head.role}</p>
              <p><strong>Email:</strong> {head.email}</p>
              <p><strong>Facebook:</strong> {head.facebook || 'N/A'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderValue = (key, value, isEditable = false) => {
    if (key === 'advocacies' || key === 'competencies') {
      return renderArrayData(value, key, isEditable);
    }

    if (key === 'heads') {
      return renderHeads(value, isEditable);
    }

    if (key === 'logo' || key.includes('photo')) {
      return renderImage(value, key);
    }

    if (isEditable) {
      if (typeof value === 'string') {
        if (value.length > 100) {
          return (
            <textarea
              value={value || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className={styles.textArea}
            />
          );
        }
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={styles.editInput}
          />
        );
      }
    }

    if (Array.isArray(value)) {
      return <p>{value.length > 0 ? value.join(', ') : 'None'}</p>;
    }

    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([k, v]) => (
        <div key={k} className={styles.nestedField}>
          <strong>{formatKey(k)}:</strong> {renderValue(k, v, isEditable)}
        </div>
      ));
    }

    if (value === null || value === undefined) {
      return <p>N/A</p>;
    }

    if (value === '') {
      return <p>None</p>;
    }

    return <p>{String(value)}</p>;
  };

  const handleFieldChange = (key, value) => {
    setEditedData(prev => {
      const newData = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(newData) !== JSON.stringify(savedData));
      return newData;
    });
  };

  const handleSave = async () => {
    // Create a FormData object for the save operation
    const formData = new FormData();
    
    // Add the edited data
    formData.append('data', JSON.stringify(editedData));

    // Add all uploaded files
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      formData.append(key, file);
    });

    // Update the saved data state
    setSavedData(editedData);
    setHasChanges(false);

    // Notify parent component of save
    if (onSave) {
      onSave(editedData, formData);
    }
  };

  const handleSubmit = () => {
    // Create a FormData object
    const formData = new FormData();
    
    // Add the edited data
    formData.append('data', JSON.stringify(editedData));

    // Add all uploaded files
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      formData.append(key, file);
    });

    // Call the onSubmit prop with both the edited data and FormData
    onSubmit(editedData, formData);
  };

  const renderData = (data, isEditable = false) => {
    if (!data) return <p>None</p>;
    
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      return (
        <div className={styles.dataContainer}>
          {Object.entries(parsedData).map(([key, value]) => (
            <div key={key} className={styles.fieldGroup}>
              <strong>{formatKey(key)}:</strong>
              {renderValue(key, value, isEditable)}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      console.error('Error parsing data:', error);
      return <p>Error displaying data</p>;
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        <h2>{isEditing ? 'Edit Submission' : 'Submission Details'}</h2>
        <p><strong>Section:</strong> {formatKey(section)}</p>
        {!isEditing && (
          <p><strong>Status:</strong> <span className={styles[status.toLowerCase()]}>{status}</span></p>
        )}

        {status === 'rejected' && rejection_comment && !isEditing && (
          <div className={styles.rejectionComment}>
            <strong>Rejection Comment:</strong>
            <p>{rejection_comment}</p>
          </div>
        )}

        <div className={styles.changeBlock}>
          {!isEditing && (
            <div className={styles.changeSection}>
              <h3>Previous Version</h3>
              <div className={styles.changeBox}>
                {renderData(previous_data)}
              </div>
            </div>
          )}
          <div className={styles.changeSection}>
            <h3>{isEditing ? 'Edit Changes' : 'Proposed Changes'}</h3>
            <div className={styles.changeBox}>
              {renderData(isEditing ? editedData : proposed_data, isEditing)}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className={styles.modalActions}>
            <button 
              className={`${styles.saveBtn} ${!hasChanges ? styles.disabled : ''}`} 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save
            </button>
            <button 
              className={styles.submitBtn} 
              onClick={handleSubmit}
            >
              Submit
            </button>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}



