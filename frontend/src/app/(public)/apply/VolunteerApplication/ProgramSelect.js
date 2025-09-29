"use client";

import { useEffect, useRef, forwardRef } from "react";
import styles from "./ProgramSelect.module.css";
import { FaChevronDown } from "react-icons/fa";

const ProgramSelect = forwardRef(function ProgramSelect(
  {
    programOptions,
    userApplications = [],
    formData,
    setFormData,
    dropdownOpen,
    setDropdownOpen,
    errorMessage,
    isLoading,
    error,
    clearFieldError,
    onProgramSelect,
  },
  ref
) {
  const wrapperRef = useRef(null);
  const dropdownListRef = useRef(null);

  // Helper function to check if a program is already applied
  const isProgramAlreadyApplied = (programId) => {
    return userApplications.some(application => application.programId === programId);
  };

  // Helper function to get application status for a program
  const getApplicationStatus = (programId) => {
    const application = userApplications.find(app => app.programId === programId);
    return application ? application.status : null;
  };

  // Helper function to get status display text
  const getStatusDisplayText = (status) => {
    // Show "Already Applied" for any existing application regardless of status
    return status ? ' (Already Applied)' : '';
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setDropdownOpen]);

  // Prevent scroll when reaching top/bottom of dropdown
  useEffect(() => {
    const handleWheel = (e) => {
      if (
        dropdownOpen &&
        dropdownListRef.current &&
        dropdownListRef.current.contains(e.target)
      ) {
        const el = dropdownListRef.current;
        const { scrollTop, scrollHeight, clientHeight } = el;

        const atTop = scrollTop === 0;
        const atBottom = scrollTop + clientHeight === scrollHeight;
        const scrollingDown = e.deltaY > 0;

        if ((scrollingDown && atBottom) || (!scrollingDown && atTop)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, [dropdownOpen]);

  return (
    <div className={styles.programSelectContainer} ref={ref}>
      <div className={styles.topTwoCol}>
        <div className={styles.programLabelBox}>
          <label htmlFor="program-dropdown">Choose Program</label>
        </div>

        <div className={styles.dropdownWrapper} ref={wrapperRef}>
          <div
            id="program-dropdown"
            className={`${styles.customDropdown} ${
              formData.program ? styles.filled : ""
            } ${isLoading ? styles.loading : ""} ${errorMessage ? styles.inputError : ""}`}
            role="combobox"
            tabIndex={0}
            aria-expanded={dropdownOpen}
            aria-controls="program-dropdown-list"
            aria-haspopup="listbox"
            onClick={() => !isLoading && setDropdownOpen(!dropdownOpen)}
            onKeyDown={(e) => {
              if (!isLoading && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setDropdownOpen((prev) => !prev);
              }
            }}
          >
            {isLoading ? "Loading programs..." : error ? "Error loading programs" : formData.program ? (
              <>
                {formData.program.title}
                {(formData.program.orgAcronym || formData.program.orgName) && (
                  <span className={styles.orgName}> ({formData.program.orgAcronym || formData.program.orgName})</span>
                )}
              </>
            ) : (
              <span className={errorMessage ? styles.placeholderError : ""}>Select Program</span>
            )}
            <FaChevronDown className={`${styles.dropdownIcon} ${dropdownOpen ? styles.arrowDown : styles.arrowRight} ${errorMessage ? styles.iconError : ""}`} />
          </div>

          {dropdownOpen && !isLoading && !error && (
            <ul
              className={styles.dropdownList}
              id="program-dropdown-list"
              ref={dropdownListRef}
              role="listbox"
            >
              {programOptions.length > 0 ? (
                programOptions.map((option) => {
                  const isAlreadyApplied = isProgramAlreadyApplied(option.id);
                  const applicationStatus = getApplicationStatus(option.id);
                  const statusText = getStatusDisplayText(applicationStatus);
                  
                  return (
                    <li
                      key={option.id}
                      className={`${styles.dropdownItem} ${isAlreadyApplied ? styles.disabledItem : ''}`}
                      onClick={() => {
                        if (isAlreadyApplied) return; // Prevent selection of already applied programs
                        
                        setFormData((prev) => ({
                          ...prev,
                          program: option,
                        }));
                        setDropdownOpen(false);
                        // Clear program error when a program is selected
                        if (clearFieldError) {
                          clearFieldError('program');
                        }
                        // Notify parent component about program selection
                        if (onProgramSelect) {
                          onProgramSelect(option);
                        }
                      }}
                    >
                      <div>
                        <strong>{option.title}</strong>
                        {(option.orgAcronym || option.orgName) && (
                          <span className={styles.orgName}> ({option.orgAcronym || option.orgName})</span>
                        )}
                        {statusText && (
                          <span className={styles.alreadyAppliedText}>{statusText}</span>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className={styles.noPrograms}>
                  No volunteer programs are currently accepting applications. Please check back later or contact us to learn about upcoming opportunities.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {error && <p className={styles.errorMessage} role="alert">Unable to load available programs. Please refresh the page or try again in a few minutes. If the problem persists, contact support.</p>}
    </div>
  );
});

export default ProgramSelect;