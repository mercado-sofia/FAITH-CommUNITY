'use client';

import styles from '../programs.module.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { PiCaretDoubleLeft, PiCaretDoubleRight } from 'react-icons/pi';
import { useState, useEffect } from 'react';

export default function Pagination({ currentPage = 1, totalPages = 1, onPageChange }) {
  const visibleCount = Math.min(5, totalPages); // Ensure not more than total pages
  const [startPage, setStartPage] = useState(1);

  useEffect(() => {
    const maxStart = Math.max(1, totalPages - visibleCount + 1);
    const clampedStart = Math.min(currentPage, maxStart);
    setStartPage(clampedStart);
  }, [currentPage, totalPages, visibleCount]);

  const handleShift = (step) => {
    let newStart = startPage + step;
    newStart = Math.max(1, Math.min(newStart, totalPages - visibleCount + 1));
    setStartPage(newStart);
  };

  const pageButtons = [];

  // First page set
  pageButtons.push(
    <button
      key="first"
      className={`${styles.pageBtn} ${startPage === 1 ? styles.disabled : ''}`}
      onClick={() => handleShift(-visibleCount)}
      disabled={startPage === 1}
      aria-label="Jump to first set of pages"
      aria-disabled={startPage === 1}
    >
      <PiCaretDoubleLeft size={15} />
    </button>
  );

  // Previous page
  pageButtons.push(
    <button
      key="prev"
      className={`${styles.pageBtn} ${currentPage === 1 ? styles.disabled : ''}`}
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      aria-label="Go to previous page"
      aria-disabled={currentPage === 1}
    >
      <FiChevronLeft size={15} />
    </button>
  );

  // Numbered buttons
  for (let i = startPage; i < startPage + visibleCount && i <= totalPages; i++) {
    pageButtons.push(
      <button
        key={i}
        className={`${styles.pageBtn} ${currentPage === i ? styles.active : ''}`}
        onClick={() => onPageChange(i)}
        aria-label={`Page ${i}`}
        aria-current={currentPage === i ? 'page' : undefined}
        aria-disabled={currentPage === i}
      >
        {i}
      </button>
    );
  }

  // Next page
  pageButtons.push(
    <button
      key="next"
      className={`${styles.pageBtn} ${currentPage === totalPages ? styles.disabled : ''}`}
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      aria-label="Go to next page"
      aria-disabled={currentPage === totalPages}
    >
      <FiChevronRight size={15} />
    </button>
  );

  // Last page set
  pageButtons.push(
    <button
      key="last"
      className={`${styles.pageBtn} ${startPage + visibleCount - 1 >= totalPages ? styles.disabled : ''}`}
      onClick={() => handleShift(visibleCount)}
      disabled={startPage + visibleCount - 1 >= totalPages}
      aria-label="Jump to last set of pages"
      aria-disabled={startPage + visibleCount - 1 >= totalPages}
    >
      <PiCaretDoubleRight size={15} />
    </button>
  );

  return (
    <nav className={styles.pagination} role="navigation" aria-label="Pagination">
      {pageButtons}
    </nav>
  );
}