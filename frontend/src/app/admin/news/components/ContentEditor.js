'use client';

import { useRef, useEffect, useState } from 'react';
import { FaBold, FaItalic, FaUnderline, FaStrikethrough, FaLink, FaListUl, FaListOl, FaQuoteLeft, FaAlignLeft, FaAlignCenter, FaAlignRight } from 'react-icons/fa';
import styles from './styles/ContentEditor.module.css';

const ContentEditor = ({ value, onChange, placeholder = "Write your content here..." }) => {
  const editorRef = useRef();
  const [activeFormats, setActiveFormats] = useState(new Set());

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    updateActiveFormats();
    handleContentChange();
  };

  const updateActiveFormats = () => {
    const formats = new Set();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
    if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
    if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
    
    setActiveFormats(formats);
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

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarSection}>
          <select
            onChange={(e) => {
              if (e.target.value) {
                executeCommand('formatBlock', e.target.value);
                e.target.value = '';
              }
            }}
            className={styles.headingSelect}
          >
            <option value="">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
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
