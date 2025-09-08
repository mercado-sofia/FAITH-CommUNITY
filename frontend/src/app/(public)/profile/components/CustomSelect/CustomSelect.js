'use client';

import { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import styles from './CustomSelect.module.css';

export default function CustomSelect({ 
  name, 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    onChange({
      target: {
        name: name,
        value: optionValue
      }
    });
  };

  const selectedOption = options.find(option => option.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`${styles.customSelect} ${className}`} ref={dropdownRef}>
      <div 
        className={`${styles.selectTrigger} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.selectValue}>
          {displayText}
        </span>
        <FaChevronDown className={`${styles.selectArrow} ${isOpen ? styles.rotated : ''}`} />
      </div>
      
      {isOpen && (
        <div className={styles.selectOptions}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.selectOption} ${
                selectedValue === option.value ? styles.selected : ''
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
