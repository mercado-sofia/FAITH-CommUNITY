'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronDown, FiArchive, FiArrowLeft } from 'react-icons/fi'
import { useGetArchivedHighlightsQuery } from '@/rtk/superadmin/highlightsApi'
import { useGetOrganizationsForFilterQuery } from '@/rtk/superadmin/dashboardApi'
import HighlightCard from '../components/HighlightCard'
import HighlightDetailsModal from '../components/HighlightDetailsModal'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
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

  // Search function (same as main page)
  const searchHighlights = (highlights, query) => {
    if (!query || !query.trim()) return highlights
    
    const searchTerm = query.toLowerCase().trim()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0)
    
    const highlightsWithScores = highlights.map(highlight => {
      let score = 0
      let hasMatch = false
      
      const checkMatch = (value, priorityScore) => {
        if (!value) return false
        const valueStr = String(value).trim().toLowerCase()
        if (valueStr.includes(searchTerm)) {
          hasMatch = true
          score += priorityScore
          return true
        }
        return false
      }
      
      checkMatch(highlight.organization_name, 100)
      checkMatch(highlight.organization_acronym, 100)
      checkMatch(highlight.title, 80)
      checkMatch(highlight.program_title, 70)
      checkMatch(highlight.description, 30)
      
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
    
    try {
      await unarchiveHighlight(highlightToAction.id).unwrap()
      setHighlightToAction(null)
      refetchHighlights()
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('highlightStatusChanged'))
      }
    } catch (error) {
      console.error('Error restoring highlight:', error)
      alert('Failed to restore highlight. Please try again.')
    }
  }

  const handleRestoreClick = (highlight) => {
    if (window.confirm(`Are you sure you want to restore "${highlight.title}"? It will be visible on the public website again.`)) {
      setHighlightToAction(highlight)
      handleRestore()
    }
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
          />
        </div>
      </div>

      {/* Organization Filter Header */}
      <div className={styles.highlightsHeader}>
        <div className={styles.highlightsHeaderTop}>
          <h2 className={styles.sectionTitle}>Archived Highlights</h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
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
        </div>
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
              <div key={highlight.id} style={{ position: 'relative' }}>
                <HighlightCard
                  highlight={highlight}
                  onViewDetails={handleViewDetails}
                  searchQuery={searchQuery}
                />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  display: 'flex',
                  gap: '0.5rem',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => handleRestoreClick(highlight)}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      setHighlightToAction(highlight)
                      setDeleteModalOpen(true)
                    }}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Highlight Details Modal */}
      <HighlightDetailsModal 
        highlight={selectedHighlight}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />


      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setHighlightToAction(null)
        }}
        onConfirm={handleDelete}
        highlightTitle={highlightToAction?.title}
        organizationName={highlightToAction?.organization_name}
        isLoading={false}
      />
    </div>
  )
}

export default ArchiveHighlightsPage

