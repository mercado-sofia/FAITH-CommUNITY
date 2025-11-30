"use client"

import { useState, useRef, useEffect } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import styles from './CustomDropdown.module.css'

export default function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select", 
  disabled = false,
  error = false,
  onFocus,
  onBlur
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const dropdownRef = useRef(null)
  const blurTimeoutRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        // Clear any pending blur timeout since we're handling it via click-outside
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current)
          blurTimeoutRef.current = null
        }
        // Update focus state immediately when clicking outside
        setIsFocused(false)
        onBlur && onBlur()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [onBlur])

  const handleSelect = (optionValue) => {
    // Clear any pending blur timeout when selecting an option
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    onChange(optionValue)
    setIsOpen(false)
  }

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={styles.customDropdown} ref={dropdownRef}>
      <button 
        type="button"
        className={`${styles.dropdownHeader} ${error ? styles.inputError : ''} ${disabled ? styles.disabled : ''} ${selectedOption && selectedOption.value !== '' ? styles.hasValue : ''} ${isFocused || isOpen ? styles.focused : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onFocus={() => {
          setIsFocused(true)
          onFocus && onFocus()
        }}
        onBlur={(e) => {
          // Delay blur handling to allow click-outside handler to run first
          // Check if the related target (element receiving focus) is outside the dropdown
          blurTimeoutRef.current = setTimeout(() => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.relatedTarget)) {
              setIsFocused(false)
              onBlur && onBlur()
            }
          }, 150)
        }}
        disabled={disabled}
      >
        <span className={styles.dropdownValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FaChevronDown 
          className={`${styles.dropdownArrow} ${isOpen ? styles.rotated : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className={styles.dropdownOptions}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.dropdownOption} ${option.value === value ? styles.selected : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
