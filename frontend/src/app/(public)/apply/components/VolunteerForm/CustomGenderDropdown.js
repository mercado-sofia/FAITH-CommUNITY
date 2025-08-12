"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./volunteerForm.module.css";

const CustomGenderDropdown = ({ value, onChange, name, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const options = [
    { value: "", label: "Select Gender", disabled: true },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" }
  ];

  const selectedOption = options.find(option => option.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    if (!option.disabled) {
      onChange({ target: { name, value: option.value } });
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.customGenderDropdown} ref={dropdownRef}>
      <div
        className={`${styles.dropdownTrigger} ${isOpen ? styles.open : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select gender"
      >
        <span className={selectedOption.disabled ? styles.placeholder : styles.selectedValue}>
          {selectedOption.label}
        </span>
        <svg
          className={`${styles.dropdownArrow} ${isOpen ? styles.rotated : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </div>
      
      {isOpen && (
        <div className={styles.dropdownOptionsContainer}>
          <ul className={styles.dropdownOptionsList} role="listbox">
            {options.map((option, index) => (
              <li
                key={option.value}
                className={`${styles.dropdownOption} ${
                  option.value === value ? styles.selected : ""
                } ${option.disabled ? styles.disabled : ""}`}
                onClick={() => handleSelect(option)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(option);
                  }
                }}
                tabIndex={option.disabled ? -1 : 0}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
      />
    </div>
  );
};

export default CustomGenderDropdown;
