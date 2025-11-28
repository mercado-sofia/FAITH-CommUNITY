'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiChevronDown, FiArchive } from 'react-icons/fi'
import { useGetAllProgramsByOrganizationQuery, useGetProgramsStatisticsQuery } from '@/rtk/superadmin/programsApi'
import { useGetOrganizationsForFilterQuery } from '@/rtk/superadmin/dashboardApi'
import { getOrganizationImageUrl } from '@/utils/shared/uploadPaths'
import { ProgramDetailsModal } from '@/components/portal'
import FeaturedProjects from './components/featuredProjects'
import ProgramCard from './components/ProgramCard'
import SearchBar from './components/SearchBar'
import { SkeletonLoader } from '../components'
import styles from './programs.module.css'

const SuperadminProgramsPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return tab || 'featured' // Default to 'featured' if no URL parameter
  })

  // Helper function to update URL parameter
  const updateTabUrl = (tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'featured') {
      // Remove tab parameter for featured (default)
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Sync URL parameter changes with activeTab state
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    } else if (!tab && activeTab !== 'featured') {
      setActiveTab('featured')
    }
  }, [searchParams, activeTab])

  // Handle click outside for dropdowns
  useEffect(() => {
    // Check for window and document to avoid SSR errors
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleClickOutside = (e) => {
      // Don't close if clicking on dropdown options or inside dropdown containers
      if (e.target.closest(`.${styles.options}`)) {
        return;
      }
      
      if (!e.target.closest(`.${styles.dropdownWrapper}`)) {
        setShowDropdown(null);
      }
    };

    const handleResize = () => {
      // Close dropdowns on window resize to prevent positioning issues
      setShowDropdown(null);
    };

    const handleScroll = () => {
      if (showDropdown) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      }
    };
  }, [showDropdown]);

  const { 
    data: organizationPrograms = [], 
    isLoading: programsLoading, 
    error: programsError,
    refetch: refetchPrograms 
  } = useGetAllProgramsByOrganizationQuery()

  const { 
    data: statistics = {}, 
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useGetProgramsStatisticsQuery()

  // Fetch all organizations to show even those without programs
  // Use the same hook as Highlights Management for consistency
  const { 
    data: allOrganizations = [], 
    isLoading: organizationsLoading 
  } = useGetOrganizationsForFilterQuery()

  // Merge organizations with programs data - include all organizations even without programs
  const orgsWithProgramsMap = new Map()
  organizationPrograms.forEach(org => {
    if (org?.organizationId) {
      orgsWithProgramsMap.set(org.organizationId, org)
    }
  })

  const allOrganizationsWithPrograms = allOrganizations.map(org => {
    const orgWithPrograms = orgsWithProgramsMap.get(org.id)
    if (orgWithPrograms) {
      return orgWithPrograms
    }
    // Organization without programs - create empty structure
    return {
      organizationId: org.id,
      organizationName: org.name,
      organizationAcronym: org.acronym,
      orgLogo: org.logo || null,
      organizationColor: org.color || null,
      programs: {
        upcoming: [],
        active: [],
        completed: []
      }
    }
  })

  // Search programs with priority scoring (Title > Description > Category/Location > Other > Collaborators)
  const searchPrograms = (programs, query) => {
    if (!query?.trim()) return programs
    
    const searchTerm = query.toLowerCase().trim()
    
    const scoredPrograms = programs.map(program => {
      let score = 0
      let matches = false
      
      const checkMatch = (value, points) => {
        if (value?.toLowerCase().includes(searchTerm)) {
          score += points
          matches = true
        }
      }

      // Priority scoring: Title (100) > Description (50) > Category/Location (30) > Status/Slug (20) > Submitted by (10) > Collaborators (5)
      checkMatch(program.title, 100)
      checkMatch(program.description, 50)
      checkMatch(program.category, 30)
      checkMatch(program.location, 30)
      checkMatch(program.status, 20)
      checkMatch(program.slug, 20)
      
      if (program.submitted_by_name?.toLowerCase().includes(searchTerm) || 
          program.submitted_by_role?.toLowerCase().includes(searchTerm)) {
        score += 10
        matches = true
      }
      
      if (program.collaborators?.some(collab => 
        collab.organization_name?.toLowerCase().includes(searchTerm) ||
        collab.organization_acronym?.toLowerCase().includes(searchTerm)
      )) {
        score += 5
        matches = true
      }
      
      return matches ? { program, score } : null
    }).filter(Boolean)
    
    return scoredPrograms
      .sort((a, b) => b.score - a.score)
      .map(item => item.program)
  }

  // Filter and prioritize organizations based on selected filters and search
  const filteredOrganizations = allOrganizationsWithPrograms
    .filter(org => selectedOrganization === 'all' || org.organizationId === parseInt(selectedOrganization))
    .map(org => {
      const filteredPrograms = {
        upcoming: searchPrograms(org.programs.upcoming, searchQuery),
        active: searchPrograms(org.programs.active, searchQuery),
        completed: searchPrograms(org.programs.completed, searchQuery)
      }

      let orgPriorityScore = 0
      
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.toLowerCase().trim()
        const orgNameMatch = org.organizationName?.toLowerCase().includes(searchTerm)
        const orgAcronymMatch = org.organizationAcronym?.toLowerCase().includes(searchTerm)
        
        if (orgNameMatch || orgAcronymMatch) {
          orgPriorityScore += 1000
        }
        
        const allFilteredPrograms = [
          ...filteredPrograms.upcoming,
          ...filteredPrograms.active,
          ...filteredPrograms.completed
        ]
        
        const totalMatchingPrograms = allFilteredPrograms.length
        
        // Filter out if no matches
        if (!orgNameMatch && !orgAcronymMatch && totalMatchingPrograms === 0) {
          return null
        }
        
        // Priority scoring for programs
        if (allFilteredPrograms.some(p => p.title?.toLowerCase().includes(searchTerm))) {
          orgPriorityScore += 500
        }
        if (allFilteredPrograms.some(p => p.description?.toLowerCase().includes(searchTerm))) {
          orgPriorityScore += 200
        }
        if (totalMatchingPrograms > 0) {
          orgPriorityScore += 100
        }
      }

      return {
        ...org,
        programs: filteredPrograms,
        _priorityScore: orgPriorityScore
      }
    })
    .filter(Boolean)
    .sort((a, b) => searchQuery.trim() ? b._priorityScore - a._priorityScore : 0)
    .map(({ _priorityScore, ...org }) => org)

  // Get organizations for filter dropdown (API already filters valid organizations)
  const organizationOptions = allOrganizations.map(org => ({
    id: org.id,
    name: org.name,
    acronym: org.acronym
  }))

  const handleSearchChange = (query) => {
    setSearchQuery(query)
  }

  // Calculate text color based on background color for proper contrast
  const getTextColor = (backgroundColor) => {
    if (!backgroundColor) return '#374151';
    
    const color = backgroundColor.toLowerCase();
    
    // Check for white colors
    if (color === '#ffffff' || color === '#fff' || color === 'white') {
      return '#374151';
    }
    
    // Check for light gray colors
    if (color === '#f3f4f6' || color === '#f9fafb' || color === '#e5e7eb' || 
        color === '#d1d5db' || color === '#9ca3af' || color === '#6b7280') {
      return '#374151';
    }
    
    // Check if it's a light color by hex value
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // If brightness is high (light color), use dark text
      return brightness > 128 ? '#374151' : 'white';
    }
    
    // Default to white for other colors
    return 'white';
  }

  const handleViewDetails = (program) => {
    // Always set the program first, then open modal
    // This ensures the correct program is displayed
    setSelectedProgram(program)
    setIsModalOpen(true)
  }

  const renderProgramCard = (program, organizationData) => {
    return (
      <ProgramCard
        key={program.id}
        program={program}
        onViewDetails={handleViewDetails}
        showOrganizationBadge={false}
        organizationData={organizationData}
      />
    )
  }

  const renderProgramSection = (programs, title, statusKey, organizationData) => {
    // If 'all' tab is selected, show all programs
    // Otherwise, filter by the selected status tab
    const filteredPrograms = activeTab === 'all' || activeTab.toLowerCase() === statusKey.toLowerCase() 
      ? programs 
      : []

    if (filteredPrograms.length === 0 && activeTab !== 'all' && activeTab.toLowerCase() !== statusKey.toLowerCase()) {
      return null
    }

    return (
      <div className={styles.programSection}>
        <h4 className={styles.programSectionTitle}>
          {title} ({filteredPrograms.length})
        </h4>
        {filteredPrograms.length > 0 ? (
          <div className={`${styles.featuredGrid} ${styles.programGrid}`}>
            {filteredPrograms.map(program => renderProgramCard(program, organizationData))}
          </div>
        ) : (
          <div className={styles.emptyProgramSection}>
            <p>No {title.toLowerCase()} programs</p>
          </div>
        )}
      </div>
    )
  }

  // Show loading state while fetching programs or organizations
  if (programsLoading || organizationsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.twoColumnLayout}>
              <div className={styles.leftColumn}>
                <h1 className={styles.pageTitle}>Programs Management</h1>
              </div>
              <div className={styles.rightColumn}>
                <div className={styles.statsContainer}>
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>—</h2>
                        <p className={styles.label}>Total Programs</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.featuredCount}>— Featured</span>
                            <span className={styles.activeCount}>— Active</span>
                            <span className={styles.upcomingCount}>— Upcoming</span>
                            <span className={styles.completedCount}>— Completed</span>
                            <span className={styles.archivedCount}>— Archived</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SkeletonLoader type="programs" count={6} />
      </div>
    )
  }

  // Helper function to extract detailed error information
  const getErrorDetails = (error) => {
    if (!error) return null

    const errorDetails = {
      status: error.status || 'UNKNOWN',
      statusText: error.statusText || '',
      message: '',
      errorType: '',
      failedPart: '',
      suggestion: ''
    }

    // Extract error message from various possible locations
    if (error.data) {
      if (typeof error.data === 'string') {
        errorDetails.message = error.data
      } else if (error.data.message) {
        errorDetails.message = error.data.message
      } else if (error.data.error) {
        errorDetails.message = error.data.error
      } else if (error.data.details) {
        errorDetails.message = error.data.details
      }
    } else if (error.error) {
      errorDetails.message = typeof error.error === 'string' ? error.error : error.error.message || 'Unknown error'
    } else if (error.message) {
      errorDetails.message = error.message
    }

    // Determine error type and failed part
    if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR') {
      errorDetails.errorType = 'Network Error'
      errorDetails.failedPart = 'Unable to connect to the server'
      errorDetails.suggestion = 'Please check your internet connection and ensure the API server is running. If the problem persists, contact support.'
    } else if (error.status === 401) {
      errorDetails.errorType = 'Authentication Error'
      errorDetails.failedPart = 'Your session has expired'
      errorDetails.suggestion = 'Please log out and log in again to refresh your session.'
    } else if (error.status === 403) {
      errorDetails.errorType = 'Authorization Error'
      errorDetails.failedPart = 'Access denied'
      errorDetails.suggestion = 'You do not have permission to access this resource. Please contact your administrator.'
    } else if (error.status === 404) {
      errorDetails.errorType = 'Not Found Error'
      errorDetails.failedPart = 'The requested resource was not found'
      errorDetails.suggestion = 'The API endpoint may have changed or the resource has been removed. Please contact support.'
    } else if (error.status >= 500) {
      errorDetails.errorType = 'Server Error'
      errorDetails.failedPart = 'Server encountered an error'
      errorDetails.suggestion = 'The server is experiencing issues. Please try again in a few moments. If the problem persists, contact support.'
    } else if (error.status >= 400) {
      errorDetails.errorType = 'Client Error'
      errorDetails.failedPart = 'Invalid request'
      errorDetails.suggestion = 'There was an issue with your request. Please try again or contact support if the problem persists.'
    } else {
      errorDetails.errorType = 'Unknown Error'
      errorDetails.failedPart = 'An unexpected error occurred'
      errorDetails.suggestion = 'Please try again. If the problem persists, contact support.'
    }

    // If no message was extracted, use a default
    if (!errorDetails.message) {
      errorDetails.message = errorDetails.failedPart || 'An unexpected error occurred'
    }

    return errorDetails
  }

  // Show error state only for real errors (network errors, 500, etc.)
  // RTK Query only sets error for actual failures, not empty data
  if (programsError && !programsLoading) {
    const programsErrorDetails = getErrorDetails(programsError)
    const statsErrorDetails = statsError ? getErrorDetails(statsError) : null

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.twoColumnLayout}>
              <div className={styles.leftColumn}>
                <h1 className={styles.pageTitle}>Programs Management</h1>
              </div>
              <div className={styles.rightColumn}>
                <div className={styles.statsContainer}>
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>—</h2>
                        <p className={styles.label}>Total Programs</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.featuredCount}>— Featured</span>
                            <span className={styles.activeCount}>— Active</span>
                            <span className={styles.upcomingCount}>— Upcoming</span>
                            <span className={styles.completedCount}>— Completed</span>
                            <span className={styles.archivedCount}>— Archived</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Failed to Load Programs</p>
          
          {/* Programs API Error Details */}
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#dc2626',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ❌ Programs API Error
              </span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '13px', color: '#374151' }}>Failed API Endpoint:</strong>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem', fontFamily: 'monospace' }}>
                GET /api/program-projects/superadmin/all
              </span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '13px', color: '#374151' }}>Error Type:</strong>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                {programsErrorDetails.errorType}
              </span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '13px', color: '#374151' }}>Status Code:</strong>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                {programsErrorDetails.status} {programsErrorDetails.statusText ? `(${programsErrorDetails.statusText})` : ''}
              </span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '13px', color: '#374151' }}>Failed Part:</strong>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                {programsErrorDetails.failedPart}
              </span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '13px', color: '#374151' }}>Error Message:</strong>
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280', 
                marginTop: '0.25rem',
                padding: '0.5rem',
                background: '#fff',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
                fontFamily: 'monospace',
                wordBreak: 'break-word'
              }}>
                {programsErrorDetails.message}
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fecaca' }}>
              <strong style={{ fontSize: '13px', color: '#374151' }}>What to do:</strong>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>
                {programsErrorDetails.suggestion}
              </p>
            </div>
          </div>

          {/* Statistics API Error Details (if different from programs error) */}
          {statsErrorDetails && statsErrorDetails.status !== programsErrorDetails.status && (
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ❌ Statistics API Error
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Failed API Endpoint:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem', fontFamily: 'monospace' }}>
                  GET /api/program-projects/superadmin/statistics
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Error Type:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                  {statsErrorDetails.errorType}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Status Code:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                  {statsErrorDetails.status} {statsErrorDetails.statusText ? `(${statsErrorDetails.statusText})` : ''}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Error Message:</strong>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6b7280', 
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word'
                }}>
                  {statsErrorDetails.message}
                </div>
              </div>
            </div>
          )}

          <button onClick={() => {
            refetchPrograms()
            refetchStats()
          }} className={styles.retryButton}>
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
          <div className={styles.twoColumnLayout}>
            {/* Left Column - 50% width */}
            <div className={styles.leftColumn}>
              <h1 className={styles.pageTitle}>Programs Management</h1>
              <div className={styles.searchSection}>
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                />
                <div className={styles.dropdownWrapper}>
                  <div
                    className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
                    onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
                  >
                    {organizationsLoading ? (
                      "Loading..."
                    ) : (
                      <>
                        <span className={styles.organizationLabel}>Organization:</span>
                        <span className={styles.organizationValue}>
                          {selectedOrganization === "all" ? "All" : organizationOptions.find(org => org.id.toString() === selectedOrganization)?.acronym || "All"}
                        </span>
                      </>
                    )}
                    <FiChevronDown className={styles.icon} />
                  </div>
                  {showDropdown === "organization" && (
                    <ul className={styles.options}>
                      <li key="all" onClick={() => {
                        setSelectedOrganization("all");
                        setShowDropdown(null);
                      }}>
                        All
                      </li>
                      {organizationsLoading ? (
                        <li style={{ padding: '0.5rem', textAlign: 'center', color: '#666' }}>
                          Loading organizations...
                        </li>
                      ) : (
                        organizationOptions.map(org => (
                          <li key={org.id} onClick={() => {
                            setSelectedOrganization(org.id.toString());
                            setShowDropdown(null);
                          }}>
                            {org.acronym}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - 50% width */}
            <div className={styles.rightColumn}>
              <div className={styles.statsContainer}>
                {!statsLoading && !statsError && (
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>{statistics.totalPrograms || 0}</h2>
                        <p className={styles.label}>Total Programs</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.featuredCount}>
                              {statistics.featuredPrograms || 0} Featured
                            </span>
                            <span className={styles.activeCount}>
                              {statistics.activePrograms || 0} Active
                            </span>
                            <span className={styles.upcomingCount}>
                              {statistics.upcomingPrograms || 0} Upcoming
                            </span>
                            <span className={styles.completedCount}>
                              {statistics.completedPrograms || 0} Completed
                            </span>
                            {statistics.archivedPrograms > 0 && (
                              <span className={styles.archivedCount}>
                                {statistics.archivedPrograms} Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {statsLoading && (
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>—</h2>
                        <p className={styles.label}>Total Programs</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.featuredCount}>— Featured</span>
                            <span className={styles.activeCount}>— Active</span>
                            <span className={styles.upcomingCount}>— Upcoming</span>
                            <span className={styles.completedCount}>— Completed</span>
                            <span className={styles.archivedCount}>— Archived</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {statsError && !statsLoading && (
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>—</h2>
                        <p className={styles.label}>Total Programs</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.featuredCount}>— Featured</span>
                            <span className={styles.activeCount}>— Active</span>
                            <span className={styles.upcomingCount}>— Upcoming</span>
                            <span className={styles.completedCount}>— Completed</span>
                            <span className={styles.archivedCount}>— Archived</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Full width row */}
      <div className={styles.navigationSection}>
        <div className={styles.navigationTabs}>
          <button
            className={`${styles.navTab} ${activeTab === 'featured' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('featured')}
          >
            Featured
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('all')}
          >
            All
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'active' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('active')}
          >
            Active
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'completed' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('completed')}
          >
            Completed
          </button>
        </div>
        <button
          onClick={() => router.push('/superadmin/programs/archive')}
          className={styles.archiveButton}
        >
          <FiArchive /> Archive
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'featured' && <FeaturedProjects searchQuery={searchQuery} />}

      {/* Programs by Organization - show when 'All' or status tabs are active */}
      {(activeTab === 'all' || activeTab === 'upcoming' || activeTab === 'active' || activeTab === 'completed') && (
        <div className={styles.programsSection}>
        {/* Header with title */}
        <div className={styles.programsHeader}>
          <h2 className={styles.sectionTitle}>Programs by Organization</h2>
        </div>

        {/* Show empty state when there are no organizations or programs */}
        {!programsLoading && !organizationsLoading && !programsError && allOrganizationsWithPrograms.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>No organizations found</h3>
            <p className={styles.emptyStateText}>
              There are no organizations in the system yet.
            </p>
          </div>
        ) : filteredOrganizations.length === 0 && !programsLoading && !organizationsLoading && !programsError ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>No organizations found</h3>
            <p className={styles.emptyStateText}>
              No organizations found matching your current filters. Try adjusting your search or organization filter.
            </p>
          </div>
        ) : (
          filteredOrganizations.map(org => {
            return (
              <div key={org.organizationId} className={styles.organizationSection}>
                <div className={styles.organizationHeader}>
                  <div className={styles.organizationInfo}>
                    {org.orgLogo && (
                      <Image 
                        src={getOrganizationImageUrl(org.orgLogo, 'logo')}
                        alt={`${org.organizationName} logo`}
                        className={styles.orgLogo}
                        width={60}
                        height={60}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className={styles.organizationDetails}>
                      <h3 className={styles.organizationName}>
                        <span 
                          className={styles.organizationAcronym}
                          style={{ 
                            backgroundColor: org.organizationColor || '#f3f4f6',
                            color: getTextColor(org.organizationColor)
                          }}
                        >
                          {org.organizationAcronym}
                        </span>
                        {org.organizationName}
                      </h3>
                      <div className={styles.organizationStats}>
                        <span>Total: {org.programs.upcoming.length + org.programs.active.length + org.programs.completed.length}</span>
                        <span>Upcoming: {org.programs.upcoming.length}</span>
                        <span>Active: {org.programs.active.length}</span>
                        <span>Completed: {org.programs.completed.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.organizationPrograms}>
                  {/* Check if organization has any programs */}
                  {org.programs.upcoming.length === 0 && 
                   org.programs.active.length === 0 && 
                   org.programs.completed.length === 0 ? (
                    <div className={styles.emptyProgramSection}>
                      <p>This organization has not yet added any programs.</p>
                    </div>
                  ) : (
                    <>
                      {renderProgramSection(org.programs.upcoming, 'Upcoming Programs', 'upcoming', {
                        name: org.organizationName,
                        acronym: org.organizationAcronym,
                        color: org.organizationColor || '#444444'
                      })}
                      {renderProgramSection(org.programs.active, 'Active Programs', 'active', {
                        name: org.organizationName,
                        acronym: org.organizationAcronym,
                        color: org.organizationColor || '#444444'
                      })}
                      {renderProgramSection(org.programs.completed, 'Completed Programs', 'completed', {
                        name: org.organizationName,
                        acronym: org.organizationAcronym,
                        color: org.organizationColor || '#444444'
                      })}
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
        </div>
      )}

      {/* Program Details Modal */}
      {/* Use key to force re-render when program changes, ensuring correct data display */}
      {isModalOpen && selectedProgram && (
        <ProgramDetailsModal 
          key={`program-modal-${selectedProgram.id}`}
          program={selectedProgram}
          isOpen={isModalOpen}
          portal="superadmin"
          enableDataFetch={true}
          onClose={() => {
            setIsModalOpen(false)
            // Small delay before clearing to ensure modal closes smoothly
            setTimeout(() => {
              setSelectedProgram(null)
            }, 100)
          }}
        />
      )}
    </div>
  )
}

export default SuperadminProgramsPage