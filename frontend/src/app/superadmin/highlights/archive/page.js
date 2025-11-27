'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronDown, FiArchive, FiArrowLeft } from 'react-icons/fi'
import { useGetArchivedHighlightsQuery } from '@/rtk/superadmin/highlightsApi'
import { useGetOrganizationsForFilterQuery } from '@/rtk/superadmin/dashboardApi'
import HighlightCard from '../components/HighlightCard'
import { HighlightDetailsModal } from '@/components/portal'
import { ConfirmationModal } from '@/components'
import SearchBar from '../components/SearchBar'
import { SkeletonLoader } from '../../components'
import { useArchiveHighlightMutation, useUnarchiveHighlightMutation, useDeleteHighlightMutation } from '@/rtk/superadmin/highlightsApi'
import styles from '../highlights.module.css'

const ArchiveHighlightsPage = () => {
  const router = useRouter()
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHighlight, setSelectedHighlight] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [highlightToAction, setHighlightToAction] = useState(null)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const dropdownRef = useRef(null)

  const { 
    data: highlights = [], 
    isLoading: highlightsLoading, 
    error: highlightsError,
    refetch: refetchHighlights 
  } = useGetArchivedHighlightsQuery()

  const {
    data: organizations = [],
    isLoading: orgsLoading
  } = useGetOrganizationsForFilterQuery()

  const [unarchiveHighlight] = useUnarchiveHighlightMutation()
  const [deleteHighlight] = useDeleteHighlightMutation()

  // Handle click outside for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(null)
      }
    }

    function handleResize() {
      setShowDropdown(null)
    }

    function handleScroll() {
      if (showDropdown) {
        setShowDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showDropdown])

  // Enhanced search function for archived highlights
  const searchHighlights = (highlights, query) => {
    if (!query || !query.trim()) return highlights
    
    const searchTerm = query.toLowerCase().trim()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0)
    
    // Helper function to format dates for searching
    const formatDateForSearch = (dateString) => {
      if (!dateString) return ''
      try {
        const date = new Date(dateString)
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december']
        const month = monthNames[date.getMonth()]
        const day = date.getDate()
        const year = date.getFullYear()
        return `${month} ${day} ${year} ${date.toLocaleDateString()}`
      } catch {
        return dateString
      }
    }
    
    const highlightsWithScores = highlights.map(highlight => {
      let score = 0
      let hasMatch = false
      
      // Enhanced checkMatch function with multiple matching strategies
      const checkMatch = (value, priorityScore, exactMatchBonus = 0) => {
        if (!value) return false
        const valueStr = String(value).trim().toLowerCase()
        
        // Exact match (highest priority)
        if (valueStr === searchTerm) {
          hasMatch = true
          score += priorityScore + (exactMatchBonus || 0)
          return true
        }
        
        // Starts with match (high priority)
        if (valueStr.startsWith(searchTerm)) {
          hasMatch = true
          score += priorityScore + (exactMatchBonus || 0) * 0.5
          return true
        }
        
        // Word boundary match (medium-high priority)
        const wordBoundaryRegex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
        if (wordBoundaryRegex.test(valueStr)) {
          hasMatch = true
          score += priorityScore * 0.8
          return true
        }
        
        // Contains match (lower priority)
        if (valueStr.includes(searchTerm)) {
          hasMatch = true
          score += priorityScore * 0.6
          return true
        }
        
        // Multi-word search: check if all words are present
        if (searchWords.length > 1) {
          const allWordsPresent = searchWords.every(word => valueStr.includes(word))
          if (allWordsPresent) {
            hasMatch = true
            score += priorityScore * 0.5
            return true
          }
        }
        
        return false
      }
      
      // Search in organization fields (highest priority)
      checkMatch(highlight.organization_name, 100, 50)
      checkMatch(highlight.organization_acronym, 100, 50)
      
      // Search in title (high priority)
      checkMatch(highlight.title, 80, 40)
      
      // Search in program title
      checkMatch(highlight.program_title, 70, 30)
      
      // Search in description (lower priority but still important)
      if (highlight.description) {
        checkMatch(highlight.description, 30)
      }
      
      // Search in formatted dates
      if (highlight.created_at) {
        const formattedCreatedDate = formatDateForSearch(highlight.created_at)
        if (formattedCreatedDate.toLowerCase().includes(searchTerm)) {
          hasMatch = true
          score += 15
        }
      }
      
      // Search in year (if user searches for a year like "2024")
      if (/^\d{4}$/.test(searchTerm)) {
        const year = parseInt(searchTerm)
        if (highlight.created_at) {
          const createdYear = new Date(highlight.created_at).getFullYear()
          if (createdYear === year) {
            hasMatch = true
            score += 20
          }
        }
      }
      
      if (!hasMatch) return null
      return { highlight, score }
    }).filter(item => item !== null)
    
    return highlightsWithScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.highlight)
  }

  // Filter highlights by organization
  const filterByOrganization = (highlights, orgId) => {
    if (orgId === 'all') return highlights
    return highlights.filter(h => h.organization_id === parseInt(orgId))
  }

  // Process highlights
  let processedHighlights = highlights

  // Apply search filter
  if (searchQuery.trim()) {
    processedHighlights = searchHighlights(processedHighlights, searchQuery)
  }

  // Apply organization filter
  if (selectedOrganization !== 'all') {
    processedHighlights = filterByOrganization(processedHighlights, selectedOrganization)
  }

  // Handle restore (unarchive)
  const handleRestore = async () => {
    if (!highlightToAction) return
    
    setIsRestoring(true)
    try {
      await unarchiveHighlight(highlightToAction.id).unwrap()
      setHighlightToAction(null)
      setRestoreModalOpen(false)
      refetchHighlights()
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('highlightStatusChanged'))
      }
    } catch (error) {
      console.error('Error restoring highlight:', error)
      let errorMessage = 'Failed to restore highlight. Please try again.'
      if (error?.data) {
        errorMessage = error.data.message || error.data.error || errorMessage
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      alert(errorMessage)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleRestoreClick = (highlight) => {
    setHighlightToAction(highlight)
    setRestoreModalOpen(true)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!highlightToAction) return
    
    try {
      await deleteHighlight(highlightToAction.id).unwrap()
      setDeleteModalOpen(false)
      setHighlightToAction(null)
      refetchHighlights()
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('highlightStatusChanged'))
      }
    } catch (error) {
      console.error('Error deleting highlight:', error)
      alert('Failed to delete highlight. Please try again.')
    }
  }

  // Handle view details
  const handleViewDetails = (highlight) => {
    setSelectedHighlight(highlight)
    setIsModalOpen(true)
  }

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedHighlight(null)
  }

  // Search handler
  const handleSearchChange = (query) => {
    setSearchQuery(query)
  }

  if (highlightsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.twoColumnLayout}>
              <div className={styles.leftColumn}>
                <h1 className={styles.pageTitle}>Archives</h1>
              </div>
            </div>
          </div>
        </div>
        <SkeletonLoader type="highlights" count={6} />
      </div>
    )
  }

  if (highlightsError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.twoColumnLayout}>
              <div className={styles.leftColumn}>
                <h1 className={styles.pageTitle}>Archives</h1>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Failed to load archived highlights</p>
          <button onClick={refetchHighlights} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Archives</h1>
          <div className={styles.headerActions}>
            <button
              onClick={() => router.push('/superadmin/highlights')}
              className={styles.addButton}
              title="Go back to Highlights"
            >
              <FiArrowLeft /> Go back
            </button>
          </div>
        </div>
        <div className={styles.searchSection}>
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            placeholder="Search Archived Highlights..."
          />
          <div className={styles.dropdownWrapper} ref={dropdownRef}>
            <div
              className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
              onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
            >
              {orgsLoading ? (
                "Loading..."
              ) : (
                <>
                  <span className={styles.organizationLabel}>Organization:</span>
                  <span className={styles.organizationValue}>
                    {selectedOrganization === "all" ? "All" : organizations.find(org => org.id.toString() === selectedOrganization)?.acronym || "All"}
                  </span>
                </>
              )}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "organization" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedOrganization("all")
                  setShowDropdown(null)
                }}>
                  All
                </li>
                {organizations.map(org => (
                  <li key={org.id} onClick={() => {
                    setSelectedOrganization(org.id.toString())
                    setShowDropdown(null)
                  }}>
                    {org.acronym}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Organization Filter Header */}
      <div className={styles.highlightsHeader}>
        <div className={styles.featuredCountInfo}>
          <span className={styles.featuredCountText}>
            {processedHighlights.length} Archived {selectedOrganization !== 'all' ? 'for this organization' : 'highlights'}
          </span>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className={styles.highlightsSection}>
        {processedHighlights.length === 0 ? (
          <div className={styles.emptyState}>
            <FiArchive style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '1rem' }} />
            <h3 className={styles.emptyStateTitle}>No archived highlights found</h3>
            <p className={styles.emptyStateText}>
              {searchQuery || selectedOrganization !== 'all'
                ? 'No archived highlights match your current filters.'
                : 'No highlights have been archived yet.'}
            </p>
          </div>
        ) : (
          <div className={styles.highlightsGrid}>
            {processedHighlights.map(highlight => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                onViewDetails={handleViewDetails}
                searchQuery={searchQuery}
                onRestore={handleRestoreClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight Details Modal */}
      <HighlightDetailsModal 
        highlight={selectedHighlight}
        isOpen={isModalOpen}
        portal="superadmin"
        onClose={handleCloseModal}
      />


      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false)
          setHighlightToAction(null)
        }}
        onConfirm={handleDelete}
        itemName={highlightToAction?.title}
        itemType="highlight"
        actionType="delete"
        isLoading={false}
        customMessage={
          highlightToAction?.organization_name
            ? `Are you sure you want to delete this highlight? Organization: ${highlightToAction.organization_name}. This action cannot be undone.`
            : undefined
        }
      />

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={restoreModalOpen}
        onCancel={() => {
          setRestoreModalOpen(false)
          setHighlightToAction(null)
        }}
        onConfirm={handleRestore}
        itemName={highlightToAction?.title || ''}
        itemType="highlight"
        actionType="unarchive"
        isLoading={isRestoring}
        customMessage={
          highlightToAction?.organization_name || highlightToAction?.organization_acronym
            ? `Are you sure you want to unarchive this highlight? Organization: ${highlightToAction.organization_name || highlightToAction.organization_acronym}. It will be restored and visible on the website again.`
            : undefined
        }
      />
    </div>
  )
}

export default ArchiveHighlightsPage


