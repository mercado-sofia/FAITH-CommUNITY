import { useEffect, useRef } from 'react';
import styles from '../SectionEditModal.module.css';

export default function AutoResizeTextarea({
  name,
  value,
  onChange,
  placeholder,
  className = '',
  maxHeight = 400,
  ...props
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  };

  // Auto-resize when content changes
  useEffect(() => {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [value]);

  const handleInput = (e) => {
    autoResizeTextarea(e.target);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      name={name}
      value={value}
      onChange={onChange}
      onInput={handleInput}
      className={`${styles.textarea} ${className}`}
      placeholder={placeholder}
      {...props}
    />
  );
}
