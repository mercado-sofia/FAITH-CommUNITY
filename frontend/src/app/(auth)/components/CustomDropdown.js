"use client"

import { useState, useRef, useEffect } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import styles from '../signup/signup.module.css'

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue) => {
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
        onBlur={() => {
          setIsFocused(false)
          onBlur && onBlur()
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
