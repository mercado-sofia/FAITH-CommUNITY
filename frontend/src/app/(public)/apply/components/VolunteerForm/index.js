"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./volunteerForm.module.css";
import SubmitStatus from "./SubmitStatus";
import ProgramSelect from "./ProgramSelect";
import PersonalInfoSection from "./PersonalInfoSection";
import UploadValidID from "./UploadValidID";
import TermsCheckbox from "./TermsCheckbox";
import { handleChange } from "./formUtils";

const mockProgramOptions = [
  { id: "prog1", name: "CLIQUE", org: "FACTS" },
  { id: "prog2", name: "LinkUp", org: "JPIA" },
  { id: "prog3", name: "RiseUp", org: "FAHSS" },
  { id: "prog4", name: "FaithSteps", org: "FABCOMMS" },
  { id: "prog5", name: "ScholarSync", org: "FAIPS" },
  { id: "prog6", name: "LinkUp", org: "JPIA" },
];

export default function VolunteerForm() {
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

  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.agreeToTerms) {
      setSubmitStatus({
        submitted: true,
        success: false,
        message: "Please agree to the terms and conditions to proceed.",
      });
      document.getElementById("termsBox")?.scrollIntoView({ behavior: "smooth" });
      setIsLoading(false);
      return;
    }

    if (!formData.program?.id) {
      setSubmitStatus({
        submitted: true,
        success: false,
        message: "Please select a valid program before submitting.",
      });
      setIsLoading(false);
      return;
    }

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
      <SubmitStatus status={submitStatus} />

      <ProgramSelect
        programOptions={mockProgramOptions}
        formData={formData}
        setFormData={setFormData}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
      />

      <PersonalInfoSection
        formData={formData}
        handleChange={handleChange(setFormData)}
      />

      <UploadValidID
        formData={formData}
        handleChange={handleChange(setFormData)}
      />

      <TermsCheckbox
        formData={formData}
        handleChange={handleChange(setFormData)}
        isLoading={isLoading}
      />
    </form>
  );
}