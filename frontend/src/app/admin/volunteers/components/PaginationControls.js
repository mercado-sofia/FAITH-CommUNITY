'use client'

import styles from './styles/PaginationControls.module.css'

export default function PaginationControls({ currentPage, totalPages, onPageChange, startIndex, endIndex, totalCount }) {
  return (
    <div className={styles.pagination}>
      <div className={styles.paginationInfo}>
        Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} entries
      </div>
      <div className={styles.paginationControls}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.paginationButton}
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${styles.paginationButton} ${currentPage === page ? styles.paginationButtonActive : ""}`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.paginationButton}
        >
          Next
        </button>
      </div>
    </div>
  )
}