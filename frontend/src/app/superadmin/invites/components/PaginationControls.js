'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from './styles/PaginationControls.module.css';

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalCount
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) {
    return (
      <div className={styles.paginationContainer}>
        <div className={styles.infoText}>
          Showing {totalCount} of {totalCount} invitations
        </div>
      </div>
    );
  }

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.infoText}>
        Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} invitations
      </div>
      
      <div className={styles.paginationControls}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${styles.pageButton} ${styles.navButton}`}
          title="Previous page"
        >
          <FiChevronLeft size={16} />
        </button>
        
        <div className={styles.pageNumbers}>
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`${styles.pageButton} ${styles.numberButton} ${
                page === currentPage ? styles.active : ''
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${styles.pageButton} ${styles.navButton}`}
          title="Next page"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
