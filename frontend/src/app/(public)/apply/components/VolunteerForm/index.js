"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./volunteerForm.module.css";
import SubmitStatus from "./SubmitStatus";
import ProgramSelect from "./ProgramSelect";
import PersonalInfoSection from "./PersonalInfoSection";
import UploadValidID from "./UploadValidID";
import TermsCheckbox from "./TermsCheckbox";
import { handleChange } from "./formUtils";
import { usePublicApprovedPrograms } from "../../../../../hooks/usePublicData";
import SuccessModal from "./SuccessModal";
import { validateForm, validateField } from "./validationUtils";
import FormErrorBoundary from "./FormErrorBoundary";
import logger from "../../../../../utils/logger";

export default function VolunteerForm({ selectedProgramId }) {
  // Fetch approved upcoming programs from the API
  const {
    programs: programOptions = [],
    isLoading: programsLoading,
    error: programsError
  } = usePublicApprovedPrograms();

  const [formData, setFormData] = useState({
    program: null,
    fullName: "",
    age: "",
    gender: "",
    email: "",
    phoneNumber: "",
    address: "",
    occupation: "",
    citizenship: "",
    reason: "",
    agreeToTerms: false,
    validId: null,
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
  const personalInfoRef = useRef(null);
  const uploadRef = useRef(null);
  const termsRef = useRef(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});
    setValidationErrors({});

    try {
      // Add 3-second loading delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Comprehensive form validation
      const validation = validateForm(formData);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        
        // Show all validation errors
        Object.keys(validation.errors).forEach(fieldName => {
          showFieldError(fieldName, validation.errors[fieldName]);
        });
        
        // Log validation errors
        logger.warn("Form validation failed", {
          errors: validation.errors,
          formData: Object.keys(formData)
        });
        
        setIsLoading(false);
        return;
      }

          // Submit form
      const form = new FormData();
      form.append("program_id", formData.program.id);
      form.append("full_name", formData.fullName);
      form.append("age", formData.age);
      form.append("gender", formData.gender);
      form.append("email", formData.email);
      form.append("phone_number", formData.phoneNumber);
      form.append("address", formData.address);
      form.append("occupation", formData.occupation);
      form.append("citizenship", formData.citizenship);
      form.append("reason", formData.reason);
      if (formData.validId) {
        form.append("valid_id", formData.validId);
      }

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
        fullName: "",
        age: "",
        gender: "",
        email: "",
        phoneNumber: "",
        address: "",
        occupation: "",
        citizenship: "",
        reason: "",
        agreeToTerms: false,
        validId: null,
      });

      // Log successful submission
      logger.info("Volunteer application submitted successfully", {
        programId: formData.program.id,
        email: formData.email
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

  return (
    <>
      <form
        aria-label="Volunteer Application Form"
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

        <FormErrorBoundary componentName="PersonalInfoSection" formSection="personal-info">
          <PersonalInfoSection
            ref={personalInfoRef}
            formData={formData}
            handleChange={handleChange(setFormData, clearFieldError)}
            fieldErrors={fieldErrors}
            validationErrors={validationErrors}
            clearFieldError={clearFieldError}
          />
        </FormErrorBoundary>

        <FormErrorBoundary componentName="UploadValidID" formSection="file-upload">
          <UploadValidID
            ref={uploadRef}
            formData={formData}
            handleChange={handleChange(setFormData, clearFieldError)}
            errorMessage={fieldErrors.validId || validationErrors.validId}
          />
        </FormErrorBoundary>

        <FormErrorBoundary componentName="TermsCheckbox" formSection="terms-agreement">
          <TermsCheckbox
            ref={termsRef}
            formData={formData}
            handleChange={handleChange(setFormData, clearFieldError)}
            errorMessage={fieldErrors.agreeToTerms || validationErrors.agreeToTerms}
            isLoading={isLoading}
          />
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