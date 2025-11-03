"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./FloatingMessage.module.css";
import { FiMessageCircle } from "react-icons/fi";
import { FaChevronRight, FaSpinner } from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import { useGetAllOrganizationsQuery } from "../../../../rtk/(public)/organizationsApi";
import { useSubmitMessageMutation } from "../../../../rtk/(public)/messagesApi";

export default function FloatingMessage() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [clickLocked, setClickLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  const boxRef = useRef(null);
  const dropdownRef = useRef(null);

  // Check user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      
      if (token && storedUserData) {
        try {
          const user = JSON.parse(storedUserData);
          setUserData(user);
          setIsLoggedIn(true);
          setEmail(user.email); // Pre-fill email for logged-in users
        } catch (error) {
          // Clear corrupted data using centralized cleanup
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
        }
      }
    };
    
    checkAuth();
  }, []);

  // Fetch organizations from API
  const { 
    data: organizations = [], 
    isLoading: orgsLoading, 
    error: orgsError 
  } = useGetAllOrganizationsQuery();

  // Submit message mutation
  const [submitMessage] = useSubmitMessageMutation();

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  // Handle outside click, ESC press
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        closeMessageBox();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMessageBox();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Handle dropdown outside click
  useEffect(() => {
    const handleDropdownClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleDropdownClickOutside);
      document.addEventListener("touchstart", handleDropdownClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleDropdownClickOutside);
      document.removeEventListener("touchstart", handleDropdownClickOutside);
    };
  }, [dropdownOpen]);

  const closeMessageBox = (resetAll = true) => {
    setIsOpen(false);
    setDropdownOpen(false);
    
    if (resetAll) {
      setOrg("");
      setEmail("");
      setMessage("");
      setEmailError("");
    }

    setClickLocked(true);
    setTimeout(() => setClickLocked(false), 300);
  };

  const handleToggleChat = () => {
    if (clickLocked) return;

    if (isOpen) {
      closeMessageBox();
    } else {
      setIsOpen(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email before submission
    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Validate organization selection
    if (!org) {
      setEmailError("Please select an organization");
      return;
    }

    // Validate message
    if (!message.trim()) {
      setEmailError("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected organization by acronym
      const selectedOrg = organizations.find(organization => organization.acronym === org);
      
      if (!selectedOrg) {
        throw new Error("Selected organization not found");
      }

      // Submit message with the numeric organization ID
      const result = await submitMessage({
        organization_id: selectedOrg.id, // This should be the numeric ID
        sender_email: email,
        sender_name: null, // Optional field
        message: message.trim(),
        user_id: isLoggedIn && userData ? userData.id : null // Include user_id if authenticated
      }).unwrap();

      // Show success message
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast("Message sent successfully!", "success", 4000);
      } else {
        // Message sent successfully - handled by success state
      }

      // Clear message field and organization selection after successful submission
      setMessage("");
      setOrg("");
      setEmailError("");
      
      // Clear email field for non-logged-in users
      if (!isLoggedIn) {
        setEmail("");
      }
    } catch (error) {
      // Show error message
      const errorMessage = error?.data?.message || "Failed to send message. Please try again.";
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMessage, "error", 4000);
      } else {
        setEmailError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.floatingWrapper}>
      {isOpen && (
        <div className={isLoggedIn ? styles.messageBoxAuthenticated : styles.messageBox} ref={boxRef}>
          <h2>Good to see you!</h2>
          <p className={styles.subtext}>Tell us how we can help.</p>
          <form onSubmit={handleSubmit}>
            <label className={styles.label}>Select an Organization</label>

            <div className={styles.customDropdown} ref={dropdownRef}>
              <div
                id="org-select"
                className={`${styles.selected} ${org ? styles.selectedFilled : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                role="button"
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
              >
                {org || "Select an Organization"}
                <FaChevronRight className={`${styles.dropdownIcon} ${dropdownOpen ? styles.rotated : ''}`} />
              </div>

              {dropdownOpen && (
                <ul className={styles.dropdownList} role="listbox">
                  {orgsLoading ? (
                    <li className={styles.dropdownItem} style={{ textAlign: 'center', color: '#666' }}>
                      Loading organizations...
                    </li>
                  ) : orgsError ? (
                    <li className={styles.dropdownItem} style={{ textAlign: 'center', color: '#dc3545' }}>
                      Error loading organizations
                    </li>
                  ) : organizations.length === 0 ? (
                    <li className={styles.dropdownItem} style={{ textAlign: 'center', color: '#666' }}>
                      No organizations available
                    </li>
                  ) : (
                    organizations.map((organization) => (
                      <li
                        key={organization.id}
                        className={styles.dropdownItem}
                        onClick={() => {
                          setOrg(organization.acronym); // Use the 'org' field from DB
                          setDropdownOpen(false);
                        }}
                        role="option"
                        aria-selected={org === organization.acronym}
                      >
                        <span className={styles.orgAcronym}>{organization.acronym}</span>
                        <span> - </span>
                        <span className={styles.orgName}>{organization.name}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <input type="hidden" name="organization" value={org} />

            {!isLoggedIn && (
              <>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  id="user-email"
                  name="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={handleEmailChange}
                  className={`${styles.emailInput} ${emailError ? styles.emailError : ""}`}
                  required
                  autoComplete="email"
                />
                {emailError && <span className={styles.errorMessage}>{emailError}</span>}
              </>
            )}

            <textarea
              id="user-message"
              name="message"
              rows={4}
              placeholder="Write your message here"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              autoComplete="off"
            />

            <button
              className={styles.sendBtn}
              type="submit"
              disabled={!org || (!isLoggedIn && !email) || !message.trim() || emailError || isSubmitting}
            >
              Send
              {isSubmitting && <FaSpinner className={styles.spinner} />}
            </button>
          </form>
        </div>
      )}

      <button
        className={styles.chatBtn}
        onClick={handleToggleChat}
        aria-label="Chat"
      >
        {isOpen ? <IoChevronDown /> : <FiMessageCircle />}
      </button>
    </div>
  );
}