'use client'

import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import styles from './styles/PaginationControls.module.css'

export default function PaginationControls({ currentPage, totalPages, onPageChange, startIndex, endIndex, totalCount }) {

  
  // Handle edge cases
  if (totalPages <= 0) {
    return (
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          No entries to display
        </div>
      </div>
    )
  }

  // Generate page numbers with sliding window logic (3 pages max)
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 3 // Show exactly 3 page buttons
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is 3 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Sliding window logic for more than 3 pages
      let startPage = currentPage - 1
      let endPage = currentPage + 1
      
      // Adjust window if near the beginning
      if (startPage < 1) {
        startPage = 1
        endPage = 3
      }
      
      // Adjust window if near the end
      if (endPage > totalPages) {
        endPage = totalPages
        startPage = totalPages - 2
      }
      
      // Add the 3 pages in the window
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={styles.pagination} style={{ border: '2px solid #3b82f6' }}>
      <div className={styles.paginationInfo}>
        Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} entries
      </div>
      <div className={styles.paginationControls}>
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={styles.navButton}
          aria-label="Go to first page"
          title="First page"
        >
          <RiArrowLeftDoubleFill size={16}/>
        </button>
        
        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.navButton}
          aria-label="Go to previous page"
          title="Previous page"
        >
          <RiArrowLeftSLine size={16}/>
        </button>
        
        {/* Page Numbers */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${styles.paginationButton} ${
              currentPage === page ? styles.paginationButtonActive : ''
            }`}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        
        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.navButton}
          aria-label="Go to next page"
          title="Next page"
        >
          <RiArrowRightSLine size={16}/>
        </button>
        
        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={styles.navButton}
          aria-label="Go to last page"
          title="Last page"
        >
          <RiArrowRightDoubleFill size={16}/>
        </button>
      </div>
    </div>
  )
}
