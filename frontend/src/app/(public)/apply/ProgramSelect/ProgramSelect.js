"use client";

import { useEffect, useRef, forwardRef } from "react";
import styles from "./ProgramSelect.module.css";
import { FaChevronDown } from "react-icons/fa";

const ProgramSelect = forwardRef(function ProgramSelect(
  {
    programOptions,
    formData,
    setFormData,
    dropdownOpen,
    setDropdownOpen,
    errorMessage,
    isLoading,
    error,
    clearFieldError,
  },
  ref
) {
  const wrapperRef = useRef(null);
  const dropdownListRef = useRef(null);

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
    <div
      className={styles.topTwoCol}
      ref={ref}
    >
      <div className={styles.programLabelBox}>
        <label htmlFor="program-dropdown">What program are you interested in joining?</label>
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
          {isLoading ? "Loading programs..." : error ? "Error loading programs" : formData.program?.name || "Choose Program"}
          <FaChevronDown className={styles.dropdownIcon} />
        </div>

        {dropdownOpen && !isLoading && !error && (
          <ul
            className={styles.dropdownList}
            id="program-dropdown-list"
            ref={dropdownListRef}
            role="listbox"
          >
            {programOptions.length > 0 ? (
              programOptions.map((option) => (
                <li
                  key={option.id}
                  className={styles.dropdownItem}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      program: option,
                    }));
                    setDropdownOpen(false);
                    // Clear program error when a program is selected
                    if (clearFieldError) {
                      clearFieldError('program');
                    }
                  }}
                >
                  <div>
                    <strong>{option.name}</strong>
                    <small className={styles.orgName}> - {option.org}</small>
                  </div>
                </li>
              ))
            ) : (
              <li className={styles.noPrograms}>
                No upcoming programs available
              </li>
            )}
          </ul>
        )}
      </div>

      {errorMessage && <p className={styles.errorMessage} role="alert">{errorMessage}</p>}
      {error && <p className={styles.errorMessage} role="alert">Failed to load programs. Please try again later.</p>}
    </div>
  );
});

export default ProgramSelect;