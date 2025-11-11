import { useState, useCallback } from 'react';

export const useFormValidation = () => {
  const [fieldErrors, setFieldErrors] = useState({});
  const [requiredFieldErrors, setRequiredFieldErrors] = useState({});

  const validateRequiredField = useCallback((fieldName, value) => {
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'address'];
    
    if (requiredFields.includes(fieldName)) {
      setRequiredFieldErrors(prev => ({
        ...prev,
        [fieldName]: value.trim() === '' ? 'This field is required' : ''
      }));
    }
  }, []);

  const validateEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validateBirthDate = useCallback((dateValue) => {
    if (!dateValue) return '';

    const selectedDate = new Date(dateValue);
    const today = new Date();
    
    if (selectedDate > today) {
      return 'Please enter a valid birth date';
    }
    return '';
  }, []);

  const validatePassword = useCallback((password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
    
    return errors;
  }, []);

  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setRequiredFieldErrors({});
  }, []);

  const setFieldError = useCallback((fieldName, error) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, []);

  return {
    fieldErrors,
    requiredFieldErrors,
    validateRequiredField,
    validateEmail,
    validateBirthDate,
    validatePassword,
    clearFieldError,
    clearAllErrors,
    setFieldError
  };
};
