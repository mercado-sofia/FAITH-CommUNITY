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

  // Auto-resize when content changes
  useEffect(() => {
    const autoResizeTextarea = (textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
      }
    };

    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [value, maxHeight]);

  const handleInput = (e) => {
    if (textareaRef.current) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
    }
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