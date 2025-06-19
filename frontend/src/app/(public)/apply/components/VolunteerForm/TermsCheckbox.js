import { useState, useEffect } from "react";
import styles from "./volunteerForm.module.css";
import { FiX } from "react-icons/fi";

export default function TermsCheckbox({ formData, handleChange, isLoading }) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // ✅ ESC key closes modal
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

  // ✅ Prevent scroll when modals are open
  useEffect(() => {
    const hasModal = showTermsModal || showPrivacyModal;
    document.body.style.overflow = hasModal ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showTermsModal, showPrivacyModal]);

  return (
    <>
      <div className={styles.checkboxContainer}>
        <div className={styles.checkboxRow}>
          <label className={styles.customCheckbox}>
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
      </div>

      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? "Submitting..." : "Submit Application"}
      </button>

      {/* ✅ Terms Modal */}
      {showTermsModal && (
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
            <h3 id="termsHeading">Terms of Service</h3>
            <p className={styles.placeholderText}>
              Terms of Service content goes here (to be updated later).
            </p>
          </div>
        </div>
      )}

      {/* ✅ Privacy Modal */}
      {showPrivacyModal && (
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
            <h3 id="privacyHeading">Privacy Policy</h3>
            <p className={styles.placeholderText}>
              Privacy Policy content goes here (to be updated later).
            </p>
          </div>
        </div>
      )}
    </>
  );
}