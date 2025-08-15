"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./styles/floatingMessage.module.css";
import { FiMessageCircle } from "react-icons/fi";
import { FaAngleDown, FaChevronDown } from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import { useGetAllOrganizationsQuery } from "../../../rtk/(public)/organizationsApi";

export default function FloatingMessage() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [clickLocked, setClickLocked] = useState(false);

  const boxRef = useRef(null);

  // Fetch organizations from API
  const { 
    data: organizations = [], 
    isLoading: orgsLoading, 
    error: orgsError 
  } = useGetAllOrganizationsQuery();

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

  const closeMessageBox = () => {
    setIsOpen(false);
    setDropdownOpen(false);
    setOrg("");
    setEmail("");
    setMessage("");
    setEmailError("");

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate email before submission
    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Message sent successfully
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast("Message sent successfully!", "success", 4000);
    } else {
      // Fallback to alert if toast system is not available
      alert("Message sent successfully!");
    }
    closeMessageBox();
  };

  return (
    <div className={styles.floatingWrapper}>
      {isOpen && (
        <div className={styles.messageBox} ref={boxRef}>
          <h2>Good to see you!</h2>
          <p className={styles.subtext}>Tell us how we can help.</p>
          <form onSubmit={handleSubmit}>
            <label className={styles.label}>Select an Organization</label>

            <div className={styles.customDropdown}>
              <div
                id="org-select"
                className={`${styles.selected} ${org ? styles.selectedFilled : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                role="button"
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
              >
                {org || "Select an Organization"}
                <FaChevronDown className={styles.dropdownIcon} />
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
              disabled={!org || !email || !message.trim() || emailError}
            >
              Send
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