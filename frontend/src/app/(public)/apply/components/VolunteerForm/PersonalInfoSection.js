"use client";

import { forwardRef } from "react";
import styles from "./volunteerForm.module.css";
import CustomGenderDropdown from "./CustomGenderDropdown";
import FormField from "./FormField";

const PersonalInfoSection = forwardRef(function PersonalInfoSection(
  { formData, handleChange, fieldErrors, validationErrors, clearFieldError },
  ref
) {
  return (
    <div
      className={styles.sectionCard}
      ref={ref}
    >
      <h3>Personal Information</h3>

      <div className={styles.threeCol}>
        <FormField
          type="text"
          name="fullName"
          label="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          error={fieldErrors.fullName || validationErrors.fullName}
          required
          autoComplete="name"
        />
        <FormField
          type="number"
          name="age"
          label="Age"
          value={formData.age}
          onChange={handleChange}
          error={fieldErrors.age || validationErrors.age}
          required
          min="16"
          max="100"
        />
        <div className={styles.inputGroup}>
          <label htmlFor="gender-dropdown">Gender</label>
          <CustomGenderDropdown
            id="gender-dropdown"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          />
          {(fieldErrors.gender || validationErrors.gender) && (
            <div className={styles.errorMessage} role="alert">
              {fieldErrors.gender || validationErrors.gender}
            </div>
          )}
        </div>
      </div>

      <div className={styles.twoCol}>
        <FormField
          type="email"
          name="email"
          label="Email Address"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email || validationErrors.email}
          required
          autoComplete="email"
        />
        <FormField
          type="tel"
          name="phoneNumber"
          label="Contact No."
          value={formData.phoneNumber}
          onChange={handleChange}
          error={fieldErrors.phoneNumber || validationErrors.phoneNumber}
          required
          autoComplete="tel"
          pattern="09[0-9]{9}"
          title="Enter a valid 11-digit mobile number starting with 09"
        />
      </div>

      <div className={styles.fullRow}>
        <FormField
          type="text"
          name="address"
          label="Address"
          value={formData.address}
          onChange={handleChange}
          error={fieldErrors.address || validationErrors.address}
          required
          autoComplete="street-address"
        />
      </div>

      <div className={styles.twoCol}>
        <FormField
          type="text"
          name="occupation"
          label="Occupation"
          value={formData.occupation}
          onChange={handleChange}
          error={fieldErrors.occupation || validationErrors.occupation}
          required
          autoComplete="organization-title"
        />
        <FormField
          type="text"
          name="citizenship"
          label="Citizenship"
          value={formData.citizenship}
          onChange={handleChange}
          error={fieldErrors.citizenship || validationErrors.citizenship}
          required
          autoComplete="country-name"
        />
      </div>

      <div className={styles.fullRow}>
        <FormField
          type="textarea"
          name="reason"
          label="Why are you interested in volunteering?"
          value={formData.reason}
          onChange={handleChange}
          error={fieldErrors.reason || validationErrors.reason}
          required
          maxLength={800}
          autoComplete="off"
        />
        <div className={styles.charCount}>
          {formData.reason.length} / 800
        </div>
      </div>
    </div>
  );
});

export default PersonalInfoSection;