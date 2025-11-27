'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronDown, FiArchive, FiArrowLeft } from 'react-icons/fi'
import { useGetArchivedProgramsQuery } from '@/rtk/superadmin/programsApi'
import { useGetOrganizationsForFilterQuery } from '@/rtk/superadmin/dashboardApi'
import ProgramCard from '../components/ProgramCard'
import { ProgramDetailsModal } from '@/components/portal'
import { ConfirmationModal } from '@/components'
import SearchBar from '../components/SearchBar'
import { SkeletonLoader } from '../../components'
import { useUnarchiveProgramMutation } from '@/rtk/superadmin/programsApi'
import styles from '../programs.module.css'

const ArchiveProgramsPage = () => {
  const router = useRouter()
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [programToAction, setProgramToAction] = useState(null)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const dropdownRef = useRef(null)

  const { 
    data: programs = [], 
    isLoading: programsLoading, 
    error: programsError,
    refetch: refetchPrograms 
  } = useGetArchivedProgramsQuery()

  const {
    data: organizations = [],
    isLoading: orgsLoading
  } = useGetOrganizationsForFilterQuery()

  const [unarchiveProgram] = useUnarchiveProgramMutation()
  // Note: Delete functionality might need a separate endpoint for programs
  // For now, we'll skip delete functionality or use a placeholder

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

  // Enhanced search function for archived programs
  const searchPrograms = (programs, query) => {
    if (!query || !query.trim()) return programs
    
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
    
    const programsWithScores = programs.map(program => {
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
      checkMatch(program.organization_name, 100, 50)
      checkMatch(program.organization_acronym, 100, 50)
      
      // Search in title (high priority)
      checkMatch(program.title, 80, 40)
      
      // Search in category
      checkMatch(program.category, 50, 20)
      
      // Search in description (lower priority but still important)
      if (program.description) {
        checkMatch(program.description, 30)
      }
      
      // Search in status
      if (program.status) {
        checkMatch(program.status, 40, 20)
      }
      
      // Search in formatted dates
      if (program.event_start_date) {
        const formattedStartDate = formatDateForSearch(program.event_start_date)
        if (formattedStartDate.toLowerCase().includes(searchTerm)) {
          hasMatch = true
          score += 25
        }
      }
      
      if (program.event_end_date) {
        const formattedEndDate = formatDateForSearch(program.event_end_date)
        if (formattedEndDate.toLowerCase().includes(searchTerm)) {
          hasMatch = true
          score += 25
        }
      }
      
      if (program.created_at) {
        const formattedCreatedDate = formatDateForSearch(program.created_at)
        if (formattedCreatedDate.toLowerCase().includes(searchTerm)) {
          hasMatch = true
          score += 15
        }
      }
      
      // Search in year (if user searches for a year like "2024")
      if (/^\d{4}$/.test(searchTerm)) {
        const year = parseInt(searchTerm)
        if (program.event_start_date) {
          const startYear = new Date(program.event_start_date).getFullYear()
          if (startYear === year) {
            hasMatch = true
            score += 30
          }
        }
        if (program.event_end_date) {
          const endYear = new Date(program.event_end_date).getFullYear()
          if (endYear === year) {
            hasMatch = true
            score += 30
          }
        }
        if (program.created_at) {
          const createdYear = new Date(program.created_at).getFullYear()
          if (createdYear === year) {
            hasMatch = true
            score += 20
          }
        }
      }
      
      if (!hasMatch) return null
      return { program, score }
    }).filter(item => item !== null)
    
    return programsWithScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.program)
  }

  // Filter programs by organization
  const filterByOrganization = (programs, orgId) => {
    if (orgId === 'all') return programs
    return programs.filter(p => p.organization_id === parseInt(orgId))
  }

  // Process programs
  let processedPrograms = programs

  // Apply search filter
  if (searchQuery.trim()) {
    processedPrograms = searchPrograms(processedPrograms, searchQuery)
  }

  // Apply organization filter
  if (selectedOrganization !== 'all') {
    processedPrograms = filterByOrganization(processedPrograms, selectedOrganization)
  }

  // Handle restore (unarchive)
  const handleRestore = async () => {
    if (!programToAction) return
    
    setIsRestoring(true)
    try {
      await unarchiveProgram(programToAction.id).unwrap()
      setProgramToAction(null)
      setRestoreModalOpen(false)
      refetchPrograms()
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('programStatusChanged'))
      }
    } catch (error) {
      console.error('Error restoring program:', error)
      let errorMessage = 'Failed to restore program. Please try again.'
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

  const handleRestoreClick = (program) => {
    setProgramToAction(program)
    setRestoreModalOpen(true)
  }

  // Handle view details
  const handleViewDetails = (program) => {
    setSelectedProgram(program)
    setIsModalOpen(true)
  }

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProgram(null)
  }

  // Search handler
  const handleSearchChange = (query) => {
    setSearchQuery(query)
  }

  if (programsLoading) {
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

  if (programsError) {
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
          <p className={styles.errorMessage}>Failed to load archived programs</p>
          <button onClick={refetchPrograms} className={styles.retryButton}>
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
              onClick={() => router.push('/superadmin/programs')}
              className={styles.addButton}
              title="Go back to Programs"
            >
              <FiArrowLeft /> Go back
            </button>
          </div>
        </div>
        <div className={styles.searchSection}>
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            placeholder="Search Archived Programs..."
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
      <div className={styles.programsHeader}>
        <div className={styles.programsHeaderTop}>
        </div>
        <div className={styles.featuredCountInfo}>
          <span className={styles.featuredCountText}>
            {processedPrograms.length} Archived {selectedOrganization !== 'all' ? 'for this organization' : 'Programs'}
          </span>
        </div>
      </div>

      {/* Programs Grid */}
      <div className={styles.programsSection}>
        {processedPrograms.length === 0 ? (
          <div className={styles.emptyState}>
            <FiArchive style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '1rem' }} />
            <h3 className={styles.emptyStateTitle}>No archived programs found</h3>
            <p className={styles.emptyStateText}>
              {searchQuery || selectedOrganization !== 'all'
                ? 'No archived programs match your current filters.'
                : 'No programs have been archived yet.'}
            </p>
          </div>
        ) : (
          <div className={styles.programGrid}>
            {processedPrograms.map(program => (
              <ProgramCard
                key={program.id}
                program={program}
                onViewDetails={handleViewDetails}
                showOrganizationBadge={true}
                onRestore={handleRestoreClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Program Details Modal */}
      <ProgramDetailsModal 
        program={selectedProgram}
        isOpen={isModalOpen}
        portal="superadmin"
        enableDataFetch={true}
        onClose={handleCloseModal}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={restoreModalOpen}
        onCancel={() => {
          setRestoreModalOpen(false)
          setProgramToAction(null)
        }}
        onConfirm={handleRestore}
        itemName={programToAction?.title || ''}
        itemType="program"
        actionType="unarchive"
        isLoading={isRestoring}
        customMessage={
          programToAction?.organization_name || programToAction?.organization_acronym
            ? `Are you sure you want to unarchive this program? Organization: ${programToAction.organization_name || programToAction.organization_acronym}. It will be restored and visible on the website again.`
            : undefined
        }
      />
    </div>
  )
}

export default ArchiveProgramsPage

