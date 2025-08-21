"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./volunteerForm.module.css";
import SubmitStatus from "./SubmitStatus";
import ProgramSelect from "./ProgramSelect";
import SuccessModal from "./SuccessModal";
import { usePublicApprovedPrograms } from "../../../../hooks/usePublicData";
import FormErrorBoundary from "./FormErrorBoundary";
import logger from "../../../../utils/logger";

export default function SimplifiedVolunteerForm({ selectedProgramId }) {
  // Fetch approved upcoming programs from the API
  const {
    programs: programOptions = [],
    isLoading: programsLoading,
    error: programsError
  } = usePublicApprovedPrograms();

  const [formData, setFormData] = useState({
    program: null,
    reason: "",
  });

  // Auto-select program if selectedProgramId is provided
  useEffect(() => {
    if (selectedProgramId && programOptions.length > 0 && !formData.program) {
      const selectedProgram = programOptions.find(program => program.id === parseInt(selectedProgramId));
      if (selectedProgram) {
        setFormData(prev => ({
          ...prev,
          program: selectedProgram
        }));
      }
    }
  }, [selectedProgramId, programOptions, formData.program]);

  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    submitted: false,
    success: false,
    message: "",
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const programRef = useRef(null);
  const reasonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    
    if (!formData.reason.trim()) {
      errors.reason = "Please provide a reason for applying";
    } else if (formData.reason.trim().length < 10) {
      errors.reason = "Reason must be at least 10 characters long";
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});
    setValidationErrors({});

    try {
      // Add 3-second loading delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Form validation
      const errors = validateForm();
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        
        // Show all validation errors
        Object.keys(errors).forEach(fieldName => {
          showFieldError(fieldName, errors[fieldName]);
        });
        
        // Log validation errors
        logger.warn("Form validation failed", {
          errors: errors,
          formData: Object.keys(formData)
        });
        
        setIsLoading(false);
        return;
      }

      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('userData'));
      if (!userData) {
        throw new Error("User not authenticated");
      }

      // Submit form
      const form = new FormData();
      form.append("program_id", formData.program.id);
      form.append("full_name", `${userData.firstName} ${userData.lastName}`);
      form.append("age", calculateAge(userData.birthDate));
      form.append("gender", userData.gender);
      form.append("email", userData.email);
      form.append("phone_number", userData.contactNumber);
      form.append("address", userData.address);
      form.append("occupation", userData.occupation || "");
      form.append("citizenship", userData.citizenship || "");
      form.append("reason", formData.reason.trim());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/volunteers`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to submit application. Please try again.");
      }

      setShowSuccessModal(true);

      setFormData({
        program: null,
        reason: "",
      });

      // Log successful submission
      logger.info("Volunteer application submitted successfully", {
        programId: formData.program.id,
        email: userData.email
      });

    } catch (error) {
      // Log submission error
      logger.error("Volunteer application submission failed", error, {
        formData: Object.keys(formData)
      });

      setSubmitStatus({
        submitted: true,
        success: false,
        message: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return "";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  return (
    <>
      <form
        aria-label="Simplified Volunteer Application Form"
        className={styles.formContainer}
        onSubmit={handleSubmit}
        noValidate
      >
        <FormErrorBoundary componentName="ProgramSelect" formSection="program-selection">
          <ProgramSelect
            ref={programRef}
            programOptions={programOptions}
            formData={formData}
            setFormData={setFormData}
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
            errorMessage={fieldErrors.program || validationErrors.program}
            isLoading={programsLoading}
            error={programsError}
            clearFieldError={clearFieldError}
          />
        </FormErrorBoundary>

        <FormErrorBoundary componentName="ReasonSection" formSection="reason">
          <div className={styles.sectionCard} ref={reasonRef}>
            <h3>Reason for Applying</h3>
            <div className={styles.fullRow}>
              <div className={styles.inputGroup}>
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
                  className={fieldErrors.reason || validationErrors.reason ? styles.inputError : ""}
                />
                {(fieldErrors.reason || validationErrors.reason) && (
                  <div className={styles.errorMessage} role="alert">
                    {fieldErrors.reason || validationErrors.reason}
                  </div>
                )}
              </div>
            </div>
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
          message="Application submitted successfully!"
        />
      </form>
    </>
  );
}
