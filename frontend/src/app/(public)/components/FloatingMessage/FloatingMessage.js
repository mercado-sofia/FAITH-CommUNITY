"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const clickLockTimeoutRef = useRef(null);

  // Check user authentication status
  // Only consider users with role 'user' as logged in for the public portal
  // Admin and superadmin should see the email field even if they're logged in
  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') return;
    
    const checkAuth = async () => {
      // Check authentication using the auth service instead of localStorage
      try {
        const { getCurrentUser } = await import('@/utils/authService');
        const user = await getCurrentUser();
        if (user && user.role) {
          // Only treat as logged in if the user has role 'user' (public user)
          // Admin and superadmin viewing the public portal should see the email field
          const userRole = user.role?.toLowerCase();
          if (userRole === 'user') {
            setUserData(user);
            setIsLoggedIn(true);
            // Pre-fill email for logged-in public users (only if email exists)
            if (user.email) {
              setEmail(user.email);
            }
          } else {
            // Admin or superadmin - treat as not logged in for public portal
            setIsLoggedIn(false);
            setUserData(null);
            // Clear email for admin/superadmin since they should enter it manually
            setEmail("");
          }
        } else {
          // User is not authenticated or role is missing
          setIsLoggedIn(false);
          setUserData(null);
          // Don't clear email here - let user keep what they typed
        }
      } catch (error) {
        // User is not authenticated
        setIsLoggedIn(false);
        setUserData(null);
        // Don't clear email on error - preserve user input
      }
    };
    
    checkAuth();
    
    // Listen for logout events to update auth state
    const handleLogout = () => {
      setIsLoggedIn(false);
      setUserData(null);
      setEmail(""); // Clear email on logout
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('user:logout', handleLogout);
      return () => {
        window.removeEventListener('user:logout', handleLogout);
      };
    }
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

  // Close message box function
  const closeMessageBox = useCallback((resetAll = true) => {
    setIsOpen(false);
    setDropdownOpen(false);
    
    if (resetAll) {
      setOrg("");
      // Only clear email for non-logged-in users
      // For logged-in users (role 'user'), preserve the email since it's pre-filled
      if (!isLoggedIn) {
        setEmail("");
      }
      setMessage("");
      setEmailError("");
    }

    // Clear any existing timeout
    if (clickLockTimeoutRef.current) {
      clearTimeout(clickLockTimeoutRef.current);
    }

    setClickLocked(true);
    // Only run on client side
    if (typeof window !== 'undefined') {
      clickLockTimeoutRef.current = setTimeout(() => {
        setClickLocked(false);
        clickLockTimeoutRef.current = null;
      }, 300);
    }
  }, [isLoggedIn]);

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

    // Only add listeners on client side
    if (typeof document === 'undefined') return;

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [isOpen, closeMessageBox]);

  // Handle dropdown outside click
  useEffect(() => {
    const handleDropdownClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    // Only add listeners on client side
    if (typeof document === 'undefined') return;

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleDropdownClickOutside);
      document.addEventListener("touchstart", handleDropdownClickOutside);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener("mousedown", handleDropdownClickOutside);
        document.removeEventListener("touchstart", handleDropdownClickOutside);
      }
    };
  }, [dropdownOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickLockTimeoutRef.current) {
        clearTimeout(clickLockTimeoutRef.current);
      }
    };
  }, []);

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
    
    // Validate email before submission (only for non-logged-in users)
    if (!isLoggedIn && (!email || !validateEmail(email))) {
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

    // Validate organizations are loaded
    if (!organizations || organizations.length === 0) {
      setEmailError("Organizations are still loading. Please wait a moment and try again.");
      return;
    }

    setIsSubmitting(true);
    setEmailError(""); // Clear previous errors

    try {
      // Find the selected organization by acronym
      const selectedOrg = organizations.find(organization => organization.acronym === org);
      
      if (!selectedOrg) {
        throw new Error("Selected organization not found");
      }

      // Prepare message data
      const messageData = {
        organization_id: selectedOrg.id,
        sender_email: email || (isLoggedIn && userData ? userData.email : ''),
        sender_name: null,
        message: message.trim(),
        user_id: isLoggedIn && userData ? userData.id : null
      };

      // Submit message
      await submitMessage(messageData).unwrap();

      // Show success message
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast("Message sent successfully!", "success", 4000);
      } else {
        // Fallback alert if toast is not available
        alert("Message sent successfully!");
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
      // Log error for debugging
      console.error('[FloatingMessage] Error sending message:', error);
      
      // Show error message
      const errorMessage = error?.data?.message || error?.data?.error || error?.message || "Failed to send message. Please try again.";
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
                          setOrg(organization.acronym);
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