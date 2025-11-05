'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import styles from '../ProgramForm.module.css';

const CustomDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option",
  className = '',
  error = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value) || null;

  // Define handleSelect before it's used in useEffect
  const handleSelect = useCallback((option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && highlightedIndex >= 0 && options[highlightedIndex]) {
        e.preventDefault();
        handleSelect(options[highlightedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, handleSelect]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setHighlightedIndex(-1);
  };

  const handleMouseEnter = (index) => {
    setHighlightedIndex(index);
  };

  return (
    <div 
      ref={containerRef} 
      className={`${styles.customDropdownContainer} ${className}`}
    >
      <button
        type="button"
        ref={dropdownRef}
        onClick={handleToggle}
        className={`${styles.customDropdownButton} ${error ? styles.inputError : ''} ${isOpen ? styles.dropdownOpen : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.dropdownButtonText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FaChevronDown
          className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.customDropdownMenu}>
          <ul className={styles.dropdownList} role="listbox">
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${styles.dropdownItem} ${
                  option.value === value ? styles.dropdownItemSelected : ''
                } ${
                  index === highlightedIndex ? styles.dropdownItemHighlighted : ''
                }`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => handleMouseEnter(index)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;

