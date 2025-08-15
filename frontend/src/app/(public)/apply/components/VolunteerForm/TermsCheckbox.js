"use client";

import { useState, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";
import styles from "./volunteerForm.module.css";
import { FiX } from "react-icons/fi";

const TermsCheckbox = forwardRef(function TermsCheckbox(
  { formData, handleChange, isLoading, errorMessage },
  ref
) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // ESC key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowTermsModal(false);
        setShowPrivacyModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    const hasModal = showTermsModal || showPrivacyModal;
    document.body.style.overflow = hasModal ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showTermsModal, showPrivacyModal]);

  return (
    <>
    <div
      className={`${styles.checkboxContainer} ${
        errorMessage ? styles.highlightError : ""
      }`}
      ref={ref}
    >
    <div className={styles.checkboxRow}>
      <label htmlFor="agreeToTerms" className={styles.customCheckbox}>
        <input
          id="agreeToTerms"
          type="checkbox"
          name="agreeToTerms"
          checked={formData.agreeToTerms}
          onChange={handleChange}
          required
        />
        <span className={styles.checkmark}></span>
      </label>

      <div className={styles.labelWrapper}>
        <label htmlFor="agreeToTerms" className={styles.checkboxLabel}>
          I agree to the terms and conditions
        </label>
        <p className={styles.termsNote}>
          By checking this box, you agree to our{" "}
          <button
            type="button"
            className={styles.link}
            onClick={() => setShowTermsModal(true)}
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            className={styles.link}
            onClick={() => setShowPrivacyModal(true)}
          >
            Privacy Policy
          </button>.
        </p>
      </div>
    </div>

      {errorMessage && <p className={styles.inlineError}>{errorMessage}</p>}
    </div>

      {/* ✅ Terms Modal */}
      {showTermsModal && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="termsHeading"
          >
            <button
              onClick={() => setShowTermsModal(false)}
              className={styles.closeIcon}
              aria-label="Close Terms of Service"
            >
              <FiX size={20} />
            </button>
            <h3 className={styles.headingText} id="termsHeading">
              Terms of Service
            </h3>
            <div className={styles.modalBody}>
              <p>
                By using our volunteer application platform, you agree to the following terms and conditions:
              </p>
              <ul>
                <li>You must provide accurate and truthful information in your application.</li>
                <li>You agree to participate in volunteer activities in a safe and responsible manner.</li>
                <li>You understand that volunteer positions are unpaid and voluntary.</li>
                <li>You agree to follow all safety guidelines and instructions provided by program coordinators.</li>
                <li>You consent to the collection and use of your personal information as described in our Privacy Policy.</li>
              </ul>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of any changes.
              </p>
              <p className={styles.lastUpdated}>
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ✅ Privacy Modal */}
      {showPrivacyModal && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacyHeading"
          >
            <button
              onClick={() => setShowPrivacyModal(false)}
              className={styles.closeIcon}
              aria-label="Close Privacy Policy"
            >
              <FiX size={20} />
            </button>
            <h3 className={styles.headingText} id="privacyHeading">
              Privacy Policy
            </h3>
            <div className={styles.modalBody}>
              <p>
                We are committed to protecting your privacy and ensuring the security of your personal information.
              </p>
              <h4>Information We Collect</h4>
              <p>We collect personal information that you provide when applying for volunteer positions, including:</p>
              <ul>
                <li>Full name and contact information</li>
                <li>Age, gender, and citizenship details</li>
                <li>Address and occupation information</li>
                <li>Valid identification documents</li>
                <li>Application responses and preferences</li>
              </ul>
              <h4>How We Use Your Information</h4>
              <p>Your information is used to:</p>
              <ul>
                <li>Process your volunteer application</li>
                <li>Match you with appropriate volunteer opportunities</li>
                <li>Communicate with you about your application status</li>
                <li>Ensure safety and compliance with program requirements</li>
                <li>Improve our volunteer programs and services</li>
              </ul>
              <h4>Data Security</h4>
              <p>
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <p className={styles.lastUpdated}>
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export default TermsCheckbox;