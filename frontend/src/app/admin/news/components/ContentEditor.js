'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FaBold, FaItalic, FaUnderline, FaStrikethrough, FaLink, FaListUl, FaListOl, FaQuoteLeft, FaAlignLeft, FaAlignCenter, FaAlignRight } from 'react-icons/fa';
import styles from './styles/ContentEditor.module.css';

const ContentEditor = ({ value, onChange, placeholder = "Write your content here..." }) => {
  const editorRef = useRef();
  const [activeFormats, setActiveFormats] = useState(new Set());
  const [activeHeading, setActiveHeading] = useState(null); // null, 'h1', 'h2', or 'h3'

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const updateActiveFormats = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !editorRef.current?.contains(selection.anchorNode)) {
      setActiveFormats(new Set());
      setActiveHeading(null);
      return;
    }

    const formats = new Set();
    
    // Check for formatting
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikethrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    if (document.queryCommandState('formatBlock')) {
      const blockFormat = document.queryCommandValue('formatBlock');
      if (blockFormat === 'blockquote') formats.add('blockquote');
    }
    
    // Check for heading
    const parentElement = selection.anchorNode?.nodeType === Node.TEXT_NODE 
      ? selection.anchorNode.parentElement 
      : selection.anchorNode;
    
    if (parentElement) {
      const headingMatch = parentElement.closest('h1, h2, h3');
      if (headingMatch) {
        setActiveHeading(headingMatch.tagName.toLowerCase());
      } else {
        setActiveHeading(null);
      }
    }
    
    setActiveFormats(formats);
  }, []);

  const executeCommand = (command, value = null) => {
    try {
      document.execCommand(command, false, value);
      editorRef.current.focus();
      updateActiveFormats();
      handleContentChange();
    } catch (error) {
      console.error('Execute command failed:', error);
    }
  };

  const updateCurrentFormat = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      setActiveHeading(null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    // If it's a text node, get its parent element
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement;
    }
    
    // Find the closest block element within the editor
    while (element && element !== editorRef.current && editorRef.current.contains(element)) {
      if (element.tagName) {
        const tagName = element.tagName.toLowerCase();
        switch (tagName) {
          case 'h1':
            setActiveHeading('h1');
            return;
          case 'h2':
            setActiveHeading('h2');
            return;
          case 'h3':
            setActiveHeading('h3');
            return;
          default:
            break;
        }
      }
      element = element.parentElement;
    }
    
    // Default to null (normal text) if no heading found
    setActiveHeading(null);
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyUp = () => {
    updateActiveFormats();
    handleContentChange();
  };

  const handleMouseUp = () => {
    updateActiveFormats();
  };

  // Add selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateActiveFormats]);

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const insertHeading = (level) => {
    executeCommand('formatBlock', `h${level}`);
  };

  const formatButtons = [
    { icon: FaBold, command: 'bold', title: 'Bold' },
    { icon: FaItalic, command: 'italic', title: 'Italic' },
    { icon: FaUnderline, command: 'underline', title: 'Underline' },
    { icon: FaStrikethrough, command: 'strikeThrough', title: 'Strikethrough' },
  ];

  const listButtons = [
    { icon: FaListUl, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: FaListOl, command: 'insertOrderedList', title: 'Numbered List' },
  ];

  const alignButtons = [
    { icon: FaAlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: FaAlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: FaAlignRight, command: 'justifyRight', title: 'Align Right' },
  ];

  // Handle heading button selection
  const handleHeadingSelect = (headingType) => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Ensure we have a selection
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      // Create a range at the end of the editor
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.addRange(range);
    }
    
    // Apply the format using execCommand
    try {
      if (activeHeading === headingType) {
        // If clicking the same heading button, convert to normal paragraph
        document.execCommand('formatBlock', false, 'p');
        setActiveHeading(null);
      } else {
        // Apply the selected heading format
        document.execCommand('formatBlock', false, headingType);
        setActiveHeading(headingType);
      }
    } catch (error) {
      console.error('Format command failed:', error);
    }
    
    // Trigger content change and format update
    handleContentChange();
    updateActiveFormats();
    
    // Keep focus on editor
    editorRef.current.focus();
  };

  const headingButtons = [
    { type: 'h1', label: 'H1', title: 'Heading 1' },
    { type: 'h2', label: 'H2', title: 'Heading 2' },
    { type: 'h3', label: 'H3', title: 'Heading 3' },
  ];

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarSection}>
          {/* Heading Buttons */}
          {headingButtons.map((button, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleHeadingSelect(button.type)}
              className={`${styles.toolbarButton} ${styles.headingButton} ${activeHeading === button.type ? styles.active : ''}`}
              title={button.title}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div className={styles.toolbarSection}>
          {formatButtons.map((button, index) => (
            <button
              key={index}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`${styles.toolbarButton} ${activeFormats.has(button.command) ? styles.active : ''}`}
              title={button.title}
            >
              <button.icon />
            </button>
          ))}
        </div>

        <div className={styles.toolbarSection}>
          {listButtons.map((button, index) => (
            <button
              key={index}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`${styles.toolbarButton} ${activeFormats.has(button.command) ? styles.active : ''}`}
              title={button.title}
            >
              <button.icon />
            </button>
          ))}
        </div>

        <div className={styles.toolbarSection}>
          {alignButtons.map((button, index) => (
            <button
              key={index}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`${styles.toolbarButton} ${activeFormats.has(button.command) ? styles.active : ''}`}
              title={button.title}
            >
              <button.icon />
            </button>
          ))}
        </div>

        <div className={styles.toolbarSection}>
          <button
            type="button"
            onClick={insertLink}
            className={styles.toolbarButton}
            title="Insert Link"
          >
            <FaLink />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', 'blockquote')}
            className={styles.toolbarButton}
            title="Quote"
          >
            <FaQuoteLeft />
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        className={styles.editor}
        onInput={handleContentChange}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default ContentEditor;
