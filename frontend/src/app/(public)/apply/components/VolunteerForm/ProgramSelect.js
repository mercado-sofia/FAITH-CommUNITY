"use client";

import { useEffect, useRef, forwardRef } from "react";
import styles from "./volunteerForm.module.css";
import { FaChevronDown } from "react-icons/fa";

const ProgramSelect = forwardRef(function ProgramSelect(
  {
    programOptions,
    formData,
    setFormData,
    dropdownOpen,
    setDropdownOpen,
    errorMessage,
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
      className={`${styles.topTwoCol} ${errorMessage ? styles.highlightError : ""}`}
      ref={ref}
    >
    <div className={styles.programLabelBox}>
      <label htmlFor="program">What program are you interested in joining?</label>
      <input
        type="text"
        id="program"
        name="program"
        value={formData.program?.name || ""}
        readOnly
        hidden
      />
    </div>

      <div className={styles.dropdownWrapper} ref={wrapperRef}>
        <div
          className={`${styles.customDropdown} ${
            formData.program ? styles.filled : ""
          }`}
          id="program"
          role="button"
          tabIndex={0}
          aria-expanded={dropdownOpen}
          aria-controls="program-dropdown"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDropdownOpen((prev) => !prev);
            }
          }}
        >
          {formData.program?.name || "Choose Program"}
          <FaChevronDown className={styles.dropdownIcon} />
        </div>

        {dropdownOpen && (
          <ul
            className={styles.dropdownList}
            id="program-dropdown"
            ref={dropdownListRef}
          >
            {programOptions.map((option) => (
              <li
                key={option.id}
                className={styles.dropdownItem}
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    program: option,
                  }));
                  setDropdownOpen(false);
                }}
              >
                {option.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {errorMessage && <p className={styles.inlineError}>{errorMessage}</p>}
    </div>
  );
});

export default ProgramSelect;