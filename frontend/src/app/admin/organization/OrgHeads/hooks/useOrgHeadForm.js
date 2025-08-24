import { useState, useCallback } from 'react';

export const useOrgHeadForm = (initialHeads = []) => {
  const [localHeads, setLocalHeads] = useState(initialHeads);
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = useCallback((index, field, value) => {
    setLocalHeads(prev => {
      const updatedHeads = [...prev];
      updatedHeads[index] = { ...updatedHeads[index], [field]: value };
      return updatedHeads;
    });
    
    // Clear field error when user starts typing
    if (fieldErrors[`${index}-${field}`]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${index}-${field}`];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleAddHead = useCallback(() => {
    const newHead = {
      id: null,
      head_name: '',
      role: '',
      photo: '',
      facebook: '',
      email: '',
      display_order: localHeads.length + 1
    };
    setLocalHeads(prev => [...prev, newHead]);
  }, [localHeads.length]);

  const handleRemoveHead = useCallback((index) => {
    setLocalHeads(prev => prev.filter((_, i) => i !== index));
    // Clear errors for removed head
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${index}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  }, []);

  const validateForm = useCallback(() => {
    const newFieldErrors = {};
    let isValid = true;

    for (let i = 0; i < localHeads.length; i++) {
      const head = localHeads[i];
      
      // Validate name
      if (!head.head_name?.trim()) {
        newFieldErrors[`${i}-head_name`] = 'Name is required';
        isValid = false;
      }
      
      // Validate role
      if (!head.role?.trim()) {
        newFieldErrors[`${i}-role`] = 'Role is required';
        isValid = false;
      }
      
      // Validate email
      if (!head.email?.trim()) {
        newFieldErrors[`${i}-email`] = 'Email is required';
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(head.email)) {
        newFieldErrors[`${i}-email`] = 'Please enter a valid email address';
        isValid = false;
      }
      
      // Validate Facebook URL (optional field)
      if (head.facebook && !head.facebook.includes('facebook.com')) {
        newFieldErrors[`${i}-facebook`] = 'Please enter a valid Facebook URL';
        isValid = false;
      }
    }

    setFieldErrors(newFieldErrors);
    return isValid;
  }, [localHeads]);

  const hasChanges = useCallback((originalData) => {
    if (!originalData || !localHeads) {
      return false;
    }
    
    // Check if the number of heads has changed
    if (originalData.length !== localHeads.length) {
      return true;
    }
    
    // Check if any head data has changed
    return localHeads.some((head, index) => {
      const originalHead = originalData[index];
      if (!originalHead) {
        return true; // New head added
      }
      
      return (
        head.head_name !== originalHead.head_name ||
        head.role !== originalHead.role ||
        head.photo !== originalHead.photo ||
        head.facebook !== originalHead.facebook ||
        head.email !== originalHead.email
      );
    });
  }, [localHeads]);

  const resetForm = useCallback(() => {
    setLocalHeads([]);
    setFieldErrors({});
    setValidationErrors({});
  }, []);

  const setHeads = useCallback((heads) => {
    setLocalHeads(heads);
  }, []);

  return {
    localHeads,
    fieldErrors,
    validationErrors,
    setValidationErrors,
    handleInputChange,
    handleAddHead,
    handleRemoveHead,
    validateForm,
    hasChanges,
    resetForm,
    setHeads
  };
};
