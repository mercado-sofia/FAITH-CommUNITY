"use client";

import { forwardRef } from "react";
import styles from "./volunteerForm.module.css";

const PersonalInfoSection = forwardRef(function PersonalInfoSection(
  { formData, handleChange, errorMessage },
  ref
) {
  return (
    <div
      className={`${styles.sectionCard} ${errorMessage ? styles.highlightError : ""}`}
      ref={ref}
    >
      <h3>Personal Information</h3>

      <div className={styles.threeCol}>
        <div className={styles.inputGroup}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            autoComplete="name"
            placeholder="First Name, Middle Name and Last Name"
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="age">Age</label>
          <input
            id="age"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleChange}
            placeholder="Age"
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            placeholder="example@email.com"
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="phoneNumber">Contact No.</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            autoComplete="tel"
            placeholder="09XXXXXXXXX"
            pattern="09[0-9]{9}"
            title="Enter a valid 11-digit mobile number starting with 09"
            aria-describedby="phoneHelp"
            required
          />
        </div>
      </div>

      <div className={styles.fullRow}>
        <label htmlFor="address">Address</label>
        <input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          autoComplete="street-address"
          placeholder="Complete address (House No., Street, Purok, Barangay, City, Province)"
          required
        />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.inputGroup}>
          <label htmlFor="occupation">Occupation</label>
          <input
            id="occupation"
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            autoComplete="organization-title"
            placeholder="e.g. Student, Engineer, Unemployed"
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="citizenship">Citizenship</label>
          <input
            id="citizenship"
            name="citizenship"
            value={formData.citizenship}
            onChange={handleChange}
            autoComplete="country-name"
            placeholder="Citizenship"
            required
          />
        </div>
      </div>

      <div className={styles.fullRow}>
        <div className={styles.inputGroup}>
          <label htmlFor="reason">Why are you interested in volunteering?</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Tell us why you'd like to volunteer with our organization..."
            maxLength={800}
            autoComplete="off"
            required
          />
          <div className={styles.charCount}>
            {formData.reason.length} / 800
          </div>
        </div>
      </div>

      {errorMessage && <p className={styles.inlineError}>{errorMessage}</p>}
    </div>
  );
});

export default PersonalInfoSection;