'use client';

import styles from '../programs.module.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { PiCaretDoubleLeft, PiCaretDoubleRight } from 'react-icons/pi';
import { useState, useEffect } from 'react';

export default function Pagination({ currentPage = 1, totalPages = 1, onPageChange }) {
  const [startPage, setStartPage] = useState(1);
  const visibleCount = 5;

  // Adjust startPage if currentPage is outside the range
  useEffect(() => {
    if (currentPage < startPage) {
      setStartPage(currentPage);
    } else if (currentPage >= startPage + visibleCount) {
      setStartPage(currentPage - visibleCount + 1);
    }
  }, [currentPage, startPage]); 

  const handleShift = (step) => {
    let newStart = startPage + step;
    if (newStart < 1) newStart = 1;
    if (newStart > totalPages - visibleCount + 1) {
      newStart = Math.max(1, totalPages - visibleCount + 1);
    }
    setStartPage(newStart);
  };

  const pages = [];

  // Double left
  pages.push(
    <button
      key="first"
      className={`${styles.pageBtn} ${startPage === 1 ? styles.disabled : ''}`}
      onClick={() => handleShift(-visibleCount)}
      disabled={startPage === 1}
      aria-label="Jump Back"
    >
      <PiCaretDoubleLeft size={15} />
    </button>
  );

  // Single left
  pages.push(
    <button
      key="prev"
      className={`${styles.pageBtn} ${startPage === 1 ? styles.disabled : ''}`}
      onClick={() => handleShift(-1)}
      disabled={startPage === 1}
      aria-label="Previous"
    >
      <FiChevronLeft size={15} />
    </button>
  );

  // Page buttons
  for (let i = startPage; i < startPage + visibleCount && i <= totalPages; i++) {
    pages.push(
      <button
        key={i}
        className={`${styles.pageBtn} ${currentPage === i ? styles.active : ''}`}
        onClick={() => onPageChange?.(i)}
      >
        {i}
      </button>
    );
  }

  // Single right
  pages.push(
    <button
      key="next"
      className={`${styles.pageBtn} ${startPage + visibleCount - 1 >= totalPages ? styles.disabled : ''}`}
      onClick={() => handleShift(1)}
      disabled={startPage + visibleCount - 1 >= totalPages}
      aria-label="Next"
    >
      <FiChevronRight size={15} />
    </button>
  );

  // Double right
  pages.push(
    <button
      key="last"
      className={`${styles.pageBtn} ${startPage + visibleCount - 1 >= totalPages ? styles.disabled : ''}`}
      onClick={() => handleShift(visibleCount)}
      disabled={startPage + visibleCount - 1 >= totalPages}
      aria-label="Jump Forward"
    >
      <PiCaretDoubleRight size={15} />
    </button>
  );

  return <div className={styles.pagination}>{pages}</div>;
}