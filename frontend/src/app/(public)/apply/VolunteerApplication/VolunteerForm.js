"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./volunteerForm.module.css";
import ProgramSelect from "./ProgramSelect";
import SuccessModal from "../components/SuccessModal";
import { usePublicApprovedPrograms } from "@/hooks/(public)/usePublicData";
import FormErrorBoundary from "../components/FormErrorBoundary";
import { useApplyFormPersistence } from "@/hooks/(public)/useApplyFormPersistence";
import { storeRedirectUrl, isReturningFromLogin, clearReturningFromLogin } from "@/utils/(public)/redirectUtils";
import logger from "@/utils/shared/logger";

function SubmitStatus({ status }) {
  if (!status.submitted) return null;

  return (
    <div
      className={`${styles.statusMessage} ${
        status.success ? styles.success : styles.error
      }`}
    >
      {status.message}
    </div>
  );
}

export default function SimplifiedVolunteerForm({ selectedProgramId, onProgramSelect, onFormReset, isLoggedIn = false }) {
  // Fetch all approved upcoming programs from the API (including already applied ones)
  const {
    programs: programOptions = [],
    isLoading: programsLoading,
    error: programsError
  } = usePublicApprovedPrograms();

  // State for user applications
  const [userApplications, setUserApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  // Initial form data
  const initialFormData = {
    program: null,
    reason: "",
  };

  // Form persistence key
  const FORM_PERSISTENCE_KEY = 'volunteer_application_form_data';

  // Use custom hook for form persistence
  const [formData, setFormData, clearFormData] = useApplyFormPersistence(
    FORM_PERSISTENCE_KEY, 
    initialFormData
  );

  // Fetch user applications
  const fetchUserApplications = async () => {
    try {
      setApplicationsLoading(true);
      // No need to check token - cookies handle authentication
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/users/applications`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserApplications(data.applications || []);
      } else {
        setUserApplications([]);
      }
    } catch (error) {
      setUserApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  // Fetch user applications on component mount
  useEffect(() => {
    fetchUserApplications();
  }, []);

  // Clear form data and reset program preview when returning from login
  useEffect(() => {
    if (typeof window !== 'undefined' && isReturningFromLogin()) {
      // User is returning from login - clear form data and reset preview
      clearFormData();
      if (onFormReset) {
        onFormReset();
      }
      // Clear the flag
      clearReturningFromLogin();
    }
  }, [onFormReset, clearFormData]);

  // Validate and update restored program when programOptions are loaded
  // This ensures the program object matches the latest data from the API
  useEffect(() => {
    if (programOptions.length > 0 && formData.program && formData.program.id) {
      // Check if the restored program still exists in the available options
      const matchingProgram = programOptions.find(
        program => program.id === formData.program.id
      );
      
      if (!matchingProgram) {
        // Program no longer exists or is no longer available, clear it
        setFormData(prev => ({
          ...prev,
          program: null
        }));
      } else if (matchingProgram.id === formData.program.id) {
        // Only update if the program data has actually changed
        // Compare by stringifying to avoid unnecessary updates
        const currentProgramStr = JSON.stringify(formData.program);
        const matchingProgramStr = JSON.stringify(matchingProgram);
        
        if (currentProgramStr !== matchingProgramStr) {
          // Program exists - update to use the latest version from API
          // This ensures any program data updates are reflected
          setFormData(prev => ({
            ...prev,
            program: matchingProgram
          }));
          // Notify parent component about program selection
          if (onProgramSelect) {
            onProgramSelect(matchingProgram);
          }
        }
      }
    }
  }, [programOptions, formData.program, onProgramSelect, setFormData]);

  // Auto-select program if selectedProgramId is provided
  useEffect(() => {
    if (selectedProgramId && programOptions.length > 0 && !formData.program) {
      const selectedProgram = programOptions.find(program => program.id === parseInt(selectedProgramId));
      if (selectedProgram) {
        setFormData(prev => ({
          ...prev,
          program: selectedProgram
        }));
        // Notify parent component about program selection
        if (onProgramSelect) {
          onProgramSelect(selectedProgram);
        }
      }
    }
  }, [selectedProgramId, programOptions, formData.program, onProgramSelect, setFormData]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    submitted: false,
    success: false,
    message: "",
  });

  // Memoize the close function to prevent unnecessary re-renders
  const handleCloseModal = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  // ESC key to close success modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowSuccessModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Prevent background scroll when success modal is open
  useEffect(() => {
    document.body.style.overflow = showSuccessModal ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showSuccessModal]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  const showFieldError = (fieldName, message) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: message
    }));

    // Scroll to the first error field
    const firstErrorField = document.querySelector(`[name="${fieldName}"]`);
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstErrorField.focus();
    }
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    // Also clear validation errors for the same field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.program) {
      errors.program = "Please select a program";
    }
    
    const reason = formData.reason.trim();
    
    if (!reason) {
      errors.reason = "Please tell us why you want to volunteer for this program. This helps us understand your motivation and match you with the right opportunity.";
    } else if (reason.length < 10) {
      errors.reason = `Your reason is too short (${reason.length} characters). Please provide at least 10 characters to explain why you want to volunteer.`;
    } else if (reason.length > 1000) {
      errors.reason = `Your reason is too long (${reason.length} characters). Please keep it under 1000 characters to ensure it's concise and clear.`;
    } else if (reason.split(' ').length < 3) {
      errors.reason = "Please provide a more detailed reason using at least 3 words. For example: 'I want to help children learn' or 'I'm passionate about environmental conservation'.";
    } else if (reason === reason.toUpperCase()) {
      errors.reason = "Please avoid writing in all capital letters. Use normal sentence case to make your message easier to read.";
    } else if (reason === reason.toLowerCase() && reason.length > 50) {
      errors.reason = "Please use proper capitalization (capitalize the first letter of sentences and proper nouns) to make your response more professional.";
    } else if (reason.includes('http://') || reason.includes('https://')) {
      errors.reason = "Please do not include website links in your reason. Focus on explaining your personal motivation for volunteering instead.";
    } else if (reason.includes('@') && reason.split('@').length > 2) {
      errors.reason = "Please do not include email addresses in your reason. We already have your contact information from your account.";
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});
    setValidationErrors({});

    try {
      // Check authentication status before proceeding with submission
      // This ensures non-logged in users see the login modal instead of submitting
      const { getCurrentUser } = await import('@/utils/shared/authService');
      const userData = await getCurrentUser();
      
      if (!userData || userData.role !== 'user') {
        // User is not authenticated - show login modal
        // Store current URL for redirect after login
        setIsLoading(false);
        if (typeof window !== 'undefined') {
          const currentUrl = window.location.pathname + window.location.search;
          storeRedirectUrl(currentUrl);
          window.dispatchEvent(new CustomEvent('showLoginModal', { 
            detail: { redirectUrl: currentUrl } 
          }));
        }
        return;
      }

      // Form validation
      const errors = validateForm();
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        
        // Show all validation errors
        Object.keys(errors).forEach(fieldName => {
          showFieldError(fieldName, errors[fieldName]);
        });
        
        
        setIsLoading(false);
        return;
      }

      // Get user data from localStorage (should exist if authenticated)
      const storedUserData = JSON.parse(localStorage.getItem('userData'));
      if (!storedUserData) {
        // If localStorage doesn't have user data but we're authenticated, 
        // store it for consistency
        localStorage.setItem('userData', JSON.stringify(userData));
      }

      // Submit form with new structure (user_id will be extracted from JWT token)
      const requestData = {
        program_id: formData.program.id,
        reason: formData.reason.trim()
      };

      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/apply`, {
        method: "POST",
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const status = response.status;
        
        // Handle different HTTP status codes appropriately
        if (status === 409) {
          // User already applied - this is actually a success case
          setShowSuccessModal(true);
          setAlreadyApplied(true);
          
          // Clear form data using the hook's clear function
          clearFormData();
          
          // Reset dropdown state
          setDropdownOpen(false);
          
          // Clear any field errors
          setFieldErrors({});
          setValidationErrors({});
          
          // Refresh user applications to update the dropdown
          fetchUserApplications();
          
          // Reset program preview if callback is provided
          if (onFormReset) {
            onFormReset();
          }
          
          
          return; // Exit early, don't treat as error
        } else if (status === 400) {
          // Bad request - validation error
          const errorMessage = errorData?.error || errorData?.message;
          if (errorMessage?.includes('program')) {
            throw new Error("The selected program is no longer accepting applications. Please choose a different program.");
          } else if (errorMessage?.includes('reason')) {
            throw new Error("Your reason for applying needs to be more detailed. Please provide at least 10 characters explaining why you want to volunteer.");
          } else if (errorMessage?.includes('user')) {
            throw new Error("There's an issue with your account. Please log out and log back in, then try again.");
          } else {
            throw new Error("Please check your form and make sure all fields are filled correctly before submitting.");
          }
        } else if (status === 401) {
          // Unauthorized - authentication error
          throw new Error("Your session has expired. Please log in again to submit your application.");
        } else if (status === 403) {
          // Forbidden - user not eligible
          throw new Error("You're not eligible to apply for this program. Please check the program requirements or contact support.");
        } else if (status === 404) {
          // Not found - program not available
          throw new Error("This program is no longer available for applications. Please select a different program from the dropdown.");
        } else if (status === 429) {
          // Too many requests
          throw new Error("You've submitted too many applications recently. Please wait a few minutes before trying again.");
        } else if (status >= 500) {
          // Server errors
          throw new Error("Our servers are experiencing issues. Please try again in a few minutes. If the problem persists, contact support.");
        } else {
          // Other errors
          const errorMessage = errorData?.error || errorData?.message;
          if (errorMessage) {
            throw new Error(`Application failed: ${errorMessage}. Please check your information and try again.`);
          } else {
            throw new Error("Something went wrong while submitting your application. Please check your internet connection and try again.");
          }
        }
      }

      setShowSuccessModal(true);

      // Clear form data using the hook's clear function
      clearFormData();

      // Reset dropdown state
      setDropdownOpen(false);
      
      // Clear any field errors
      setFieldErrors({});
      setValidationErrors({});

      // Refresh user applications to update the dropdown
      fetchUserApplications();

      // Reset program preview if callback is provided
      if (onFormReset) {
        onFormReset();
      }


    } catch (error) {
      // Log submission error
      logger.error("Volunteer application submission failed", error, {
        formData: Object.keys(formData)
      });

      // Provide more specific error messages based on error type
      let errorMessage = error.message || "Something went wrong. Please try again.";
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = "Unable to connect to our servers. Please check your internet connection and try again.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Network connection failed. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "The request is taking too long. Please try again in a moment.";
      } else if (error.message.includes('User not authenticated')) {
        errorMessage = "Your login session has expired. Please log in again and try submitting your application.";
      }

      setSubmitStatus({
        submitted: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>
          Volunteer Application
        </h2>
        <p className={styles.formSubtitle}>
          Join our community of volunteers and make a difference today!
        </p>
      </div>
      
      <form
        aria-label="Simplified Volunteer Application Form"
        className={styles.formContainer}
        onSubmit={handleSubmit}
        noValidate
      >
        <FormErrorBoundary componentName="ProgramSelect" formSection="program-selection">
          <ProgramSelect
            programOptions={programOptions}
            userApplications={userApplications}
            formData={formData}
            setFormData={setFormData}
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
            errorMessage={fieldErrors.program || validationErrors.program}
            isLoading={programsLoading}
            error={programsError}
            clearFieldError={clearFieldError}
            onProgramSelect={onProgramSelect}
          />
        </FormErrorBoundary>

        <FormErrorBoundary componentName="ReasonSection" formSection="reason">
          <div className={styles.reasonSection}>
            <h3 className={styles.reasonHeading}>Please provide a reason for applying</h3>
            <textarea
              id="reason"
              name="reason"
              rows={4}
              placeholder="Please tell us why you want to join this program"
              value={formData.reason}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, reason: e.target.value }));
                clearFieldError("reason");
              }}
              required
              className={`${styles.reasonTextarea} ${fieldErrors.reason || validationErrors.reason ? styles.inputError : ""}`}
            />
            <div className={styles.characterCounter}>
              <span>Minimum 10 characters</span>
              <span className={`${styles.characterCount} ${
                formData.reason.length === 0 ? styles.error :
                formData.reason.length < 10 ? styles.error :
                formData.reason.length > 900 ? styles.warning :
                formData.reason.length >= 10 && formData.reason.length <= 1000 ? styles.success : ''
              }`}>
                {formData.reason.length}/1000
              </span>
            </div>
            {(fieldErrors.reason || validationErrors.reason) && (
              <div className={styles.errorMessage} role="alert">
                {fieldErrors.reason || validationErrors.reason}
              </div>
            )}
          </div>
        </FormErrorBoundary>

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className={styles.submitBtn}
        >
          Submit Application
          {isLoading && (
            <span className={styles.loader} aria-hidden="true"></span>
          )}
        </button>
        
        <SubmitStatus status={submitStatus} />
        
        <SuccessModal 
          isOpen={showSuccessModal}
          onClose={handleCloseModal}
          message={alreadyApplied ? "You have already applied for this program. You can only apply once per program." : "Application submitted successfully!"}
          type={alreadyApplied ? "already_applied" : "success"}
        />
      </form>
    </>
  );
}
