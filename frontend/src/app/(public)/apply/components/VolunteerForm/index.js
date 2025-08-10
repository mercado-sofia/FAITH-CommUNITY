"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./volunteerForm.module.css";
import SubmitStatus from "./SubmitStatus";
import ProgramSelect from "./ProgramSelect";
import PersonalInfoSection from "./PersonalInfoSection";
import UploadValidID from "./UploadValidID";
import TermsCheckbox from "./TermsCheckbox";
import { handleChange } from "./formUtils";
import { useGetApprovedUpcomingProgramsQuery } from "../../../../../rtk/(public)/programsApi";

export default function VolunteerForm() {
  // Fetch approved upcoming programs from the API
  const {
    data: programOptions = [],
    isLoading: programsLoading,
    error: programsError
  } = useGetApprovedUpcomingProgramsQuery();

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

  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    submitted: false,
    success: false,
    message: "",
  });

  useEffect(() => {
    if (submitStatus.submitted) {
      const timer = setTimeout(() => {
        setSubmitStatus({
          submitted: false,
          success: false,
          message: "",
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [errorTarget, setErrorTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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

  const showError = (ref, message, targetKey) => {
    setErrorMessage(message);
    setErrorTarget(targetKey);

    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.current.classList.add(styles.highlightError);
    }

    setTimeout(() => {
      ref?.current?.classList.remove(styles.highlightError);
      setErrorMessage("");
      setErrorTarget(null);
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setErrorTarget(null);

    // Validation – Program
    if (!formData.program?.id) {
      showError(programRef, "Please select a valid program.", "program");
      setIsLoading(false);
      return;
    }

    // Validation – All personal info fields
    const personalFields = [
      "fullName",
      "age",
      "gender",
      "email",
      "phoneNumber",
      "address",
      "occupation",
      "citizenship",
      "reason",
    ];

    const missingField = personalFields.find((field) => {
      const value = formData[field];
      return value === null || value === undefined || value.toString().trim() === "";
    });

    if (missingField) {
      showError(
        personalInfoRef,
        "Please fill out all required personal information.",
        "personalInfo"
      );
      setIsLoading(false);
      return;
    }

    // Validation – Valid ID
    if (!formData.validId) {
      showError(uploadRef, "Please upload your valid ID.", "upload");
      setIsLoading(false);
      return;
    }

    // Validation – Agree to terms
    if (!formData.agreeToTerms) {
      showError(termsRef, "You must agree to the terms and conditions.", "terms");
      setIsLoading(false);
      return;
    }

    // Submit form
    try {
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

      const response = await fetch("http://localhost:8080/api/volunteers", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to submit application. Please try again.");
      }

      setSubmitStatus({
        submitted: true,
        success: true,
        message: "Application submitted successfully!",
      });

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
    } catch (error) {
      setSubmitStatus({
        submitted: true,
        success: false,
        message: error.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      aria-label="Volunteer Application Form"
      className={styles.formContainer}
      onSubmit={handleSubmit}
      noValidate
    >

      <ProgramSelect
        ref={programRef}
        programOptions={programOptions}
        formData={formData}
        setFormData={setFormData}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        errorMessage={errorTarget === "program" ? errorMessage : ""}
        isLoading={programsLoading}
        error={programsError}
      />

      <PersonalInfoSection
        ref={personalInfoRef}
        formData={formData}
        handleChange={handleChange(setFormData)}
        errorMessage={errorTarget === "personalInfo" ? errorMessage : ""}
      />

      <UploadValidID
        ref={uploadRef}
        formData={formData}
        handleChange={handleChange(setFormData)}
        errorMessage={errorTarget === "upload" ? errorMessage : ""}
      />

      <TermsCheckbox
        ref={termsRef}
        formData={formData}
        handleChange={handleChange(setFormData)}
        isLoading={isLoading}
        errorMessage={errorTarget === "terms" ? errorMessage : ""}
      />
      
      <SubmitStatus status={submitStatus} />
    </form>
  );
}