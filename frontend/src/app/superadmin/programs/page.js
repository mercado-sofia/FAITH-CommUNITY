'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiChevronDown } from 'react-icons/fi'
import { useGetAllProgramsByOrganizationQuery, useGetProgramsStatisticsQuery } from '@/rtk/superadmin/programsApi'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import ProgramDetailsModal from './components/ProgramDetailsModal'
import FeaturedProjects from './components/featuredProjects'
import ProgramCard from './components/ProgramCard'
import SearchBar from './components/SearchBar'
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

    const handleScroll = (e) => {
      // Only close dropdowns if scrolling outside of dropdown containers
      if (showDropdown) {
        // Check if the target is a DOM element and has the closest method
        if (e.target && typeof e.target.closest === 'function') {
          if (!e.target.closest(`.${styles.dropdownWrapper}`)) {
            setShowDropdown(null);
          }
        } else {
          // For window scroll events, check if any dropdown wrapper is visible
          if (typeof document !== 'undefined' && typeof window !== 'undefined') {
            const dropdownWrappers = document.querySelectorAll(`.${styles.dropdownWrapper}`);
            const isAnyDropdownVisible = Array.from(dropdownWrappers).some(wrapper => {
              const optionsElement = wrapper.querySelector(`.${styles.options}`);
              if (optionsElement && typeof window.getComputedStyle !== 'undefined') {
                return window.getComputedStyle(optionsElement).display !== 'none';
              }
              return false;
            });
            
            if (!isAnyDropdownVisible) {
              setShowDropdown(null);
            }
          }
        }
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
    isLoading: statsLoading 
  } = useGetProgramsStatisticsQuery()

  // Hierarchical search function with priority scoring
  // Priority order: Organization Name > Program Title > Description > Category/Location > Other fields > Collaborators
  const searchPrograms = (programs, query, organizationName = null, organizationAcronym = null) => {
    if (!query || !query.trim()) return programs
    
    const searchTerm = query.toLowerCase().trim()
    
    // Score programs based on match priority (higher score = higher priority)
    const scoredPrograms = programs.map(program => {
      let score = 0
      let matches = false
      
      // Priority 1: Program Title match (100 points)
      const titleMatch = program.title?.toLowerCase().includes(searchTerm) || false
      if (titleMatch) {
        score += 100
        matches = true
      }
      
      // Priority 2: Program Description match (50 points)
      const descriptionMatch = program.description?.toLowerCase().includes(searchTerm) || false
      if (descriptionMatch) {
        score += 50
        matches = true
      }
      
      // Priority 3: Category match (30 points)
      const categoryMatch = program.category?.toLowerCase().includes(searchTerm) || false
      if (categoryMatch) {
        score += 30
        matches = true
      }
      
      // Priority 4: Location match (30 points)
      const locationMatch = program.location?.toLowerCase().includes(searchTerm) || false
      if (locationMatch) {
        score += 30
        matches = true
      }
      
      // Priority 5: Status match (20 points)
      const statusMatch = program.status?.toLowerCase().includes(searchTerm) || false
      if (statusMatch) {
        score += 20
        matches = true
      }
      
      // Priority 6: Slug match (20 points)
      const slugMatch = program.slug?.toLowerCase().includes(searchTerm) || false
      if (slugMatch) {
        score += 20
        matches = true
      }
      
      // Priority 7: Submitted by fields (10 points)
      const submittedByNameMatch = program.submitted_by_name?.toLowerCase().includes(searchTerm) || false
      const submittedByRoleMatch = program.submitted_by_role?.toLowerCase().includes(searchTerm) || false
      if (submittedByNameMatch || submittedByRoleMatch) {
        score += 10
        matches = true
      }
      
      // Priority 8: Collaborator information (lowest priority - 5 points)
      const collaboratorMatch = program.collaborators?.some(collab => 
        collab.organization_name?.toLowerCase().includes(searchTerm) ||
        collab.organization_acronym?.toLowerCase().includes(searchTerm)
      ) || false
      if (collaboratorMatch) {
        score += 5
        matches = true
      }
      
      // Organization name/acronym in program object (shouldn't really happen, but handle it)
      const programOrgNameMatch = program.organization_name?.toLowerCase().includes(searchTerm) || false
      const programOrgAcronymMatch = program.organization_acronym?.toLowerCase().includes(searchTerm) || false
      if (programOrgNameMatch || programOrgAcronymMatch) {
        score += 100 // Same priority as title since it's important
        matches = true
      }
      
      // If no matches found, return null to filter out
      if (!matches) return null
      
      return { program, score }
    }).filter(item => item !== null)
    
    // Sort by score (descending) and return only programs
    return scoredPrograms
      .sort((a, b) => b.score - a.score)
      .map(item => item.program)
  }

  // Filter and prioritize organizations based on selected filters and search
  // Priority: Organization Name > Programs with Title matches > Programs with Description matches > Other
  const filteredOrganizations = organizationPrograms.map(org => {
    // First filter by organization dropdown
    if (selectedOrganization !== 'all' && org.organizationId !== parseInt(selectedOrganization)) {
      return null
    }

    // Apply search filter to programs with organization context (returns sorted by priority)
    const filteredPrograms = {
      upcoming: searchPrograms(org.programs.upcoming, searchQuery, org.organizationName, org.organizationAcronym),
      active: searchPrograms(org.programs.active, searchQuery, org.organizationName, org.organizationAcronym),
      completed: searchPrograms(org.programs.completed, searchQuery, org.organizationName, org.organizationAcronym)
    }

    // Calculate organization priority score for sorting
    let orgPriorityScore = 0
    
    // If search query is active, check if organization name/acronym matches OR if it has any matching programs
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim()
      const orgNameMatch = org.organizationName?.toLowerCase().includes(searchTerm) || false
      const orgAcronymMatch = org.organizationAcronym?.toLowerCase().includes(searchTerm) || false
      
      // Priority 1 (Highest): Organization name/acronym match (1000 points)
      if (orgNameMatch || orgAcronymMatch) {
        orgPriorityScore += 1000
      }
      
      // Count total matching programs and calculate average program priority
      const totalMatchingPrograms = 
        filteredPrograms.upcoming.length + 
        filteredPrograms.active.length + 
        filteredPrograms.completed.length
      
      // Only include organization if it matches by name/acronym OR has matching programs
      if (!orgNameMatch && !orgAcronymMatch && totalMatchingPrograms === 0) {
        return null
      }
      
      // Priority 2: Has programs with title matches (calculate from program scores)
      // Programs are already sorted by priority, so we can check the first few
      const allFilteredPrograms = [
        ...filteredPrograms.upcoming,
        ...filteredPrograms.active,
        ...filteredPrograms.completed
      ]
      
      // Check if any programs have high priority matches (title matches)
      const hasTitleMatches = allFilteredPrograms.some(program => {
        const titleMatch = program.title?.toLowerCase().includes(searchTerm) || false
        return titleMatch
      })
      
      if (hasTitleMatches) {
        orgPriorityScore += 500 // High priority for having title matches
      }
      
      // Priority 3: Has programs with description matches
      const hasDescriptionMatches = allFilteredPrograms.some(program => {
        const descMatch = program.description?.toLowerCase().includes(searchTerm) || false
        return descMatch
      })
      
      if (hasDescriptionMatches) {
        orgPriorityScore += 200 // Medium priority for description matches
      }
      
      // Priority 4: Has any matching programs (lower priority)
      if (totalMatchingPrograms > 0) {
        orgPriorityScore += 100 // Base priority for having any matches
      }
    }

    return {
      ...org,
      programs: filteredPrograms,
      _priorityScore: orgPriorityScore // Internal score for sorting
    }
  })
  .filter(org => org !== null)
  // Sort organizations by priority score (descending) - organizations with name matches first
  .sort((a, b) => {
    if (searchQuery.trim()) {
      return b._priorityScore - a._priorityScore
    }
    // If no search, maintain original order
    return 0
  })
  // Remove the internal score before returning
  .map(org => {
    const { _priorityScore, ...orgWithoutScore } = org
    return orgWithoutScore
  })

  // Get all unique organizations for filter dropdown
  const organizationOptions = organizationPrograms.map(org => ({
    id: org.organizationId,
    name: org.organizationName,
    acronym: org.organizationAcronym
  }))

  // Search handler
  const handleSearchChange = (query) => {
    setSearchQuery(query)
  }

  const renderProgramCard = (program, organizationData) => {
    return (
      <ProgramCard
        key={program.id}
        program={program}
        onViewDetails={(program) => {
          setSelectedProgram(program)
          setIsModalOpen(true)
        }}
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

  if (programsLoading) {
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
                            <span className={styles.activeCount}>— Active</span>
                            <span className={styles.upcomingCount}>— Upcoming</span>
                            <span className={styles.completedCount}>— Completed</span>
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
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading programs...</p>
        </div>
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
                            <span className={styles.activeCount}>— Active</span>
                            <span className={styles.upcomingCount}>— Upcoming</span>
                            <span className={styles.completedCount}>— Completed</span>
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
          <p className={styles.errorMessage}>Failed to load programs</p>
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
          <div className={styles.twoColumnLayout}>
            {/* Left Column - 50% width */}
            <div className={styles.leftColumn}>
              <h1 className={styles.pageTitle}>Programs Management</h1>
              <div className={styles.searchSection}>
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                />
              </div>
            </div>

            {/* Right Column - 50% width */}
            <div className={styles.rightColumn}>
              <div className={styles.statsContainer}>
                {!statsLoading && (
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>{statistics.totalPrograms}</h2>
                        <p className={styles.label}>Total Programs</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.activeCount}>
                              {statistics.activePrograms} Active
                            </span>
                            <span className={styles.upcomingCount}>
                              {statistics.upcomingPrograms} Upcoming
                            </span>
                            <span className={styles.completedCount}>
                              {statistics.completedPrograms} Completed
                            </span>
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
      </div>

      {/* Content based on active tab */}
      {activeTab === 'featured' && <FeaturedProjects searchQuery={searchQuery} />}

      {/* Programs by Organization - show when 'All' or status tabs are active */}
      {(activeTab === 'all' || activeTab === 'upcoming' || activeTab === 'active' || activeTab === 'completed') && (
        <div className={styles.programsSection}>
        {/* Header with title and filter */}
        <div className={styles.programsHeader}>
          <h2 className={styles.sectionTitle}>Programs by Organization</h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Organization:</label>
              <div className={styles.dropdownWrapper}>
              <div
                className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
                onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
              >
                {selectedOrganization === "all" ? "All Organizations" : organizationOptions.find(org => org.id.toString() === selectedOrganization)?.acronym + " - " + organizationOptions.find(org => org.id.toString() === selectedOrganization)?.name}
                <FiChevronDown className={styles.icon} />
              </div>
              {showDropdown === "organization" && (
                <ul className={styles.options}>
                  <li key="all" onClick={() => {
                    setSelectedOrganization("all");
                    setShowDropdown(null);
                  }}>
                    All Organizations
                  </li>
                  {organizationOptions.map(org => (
                    <li key={org.id} onClick={() => {
                      setSelectedOrganization(org.id.toString());
                      setShowDropdown(null);
                    }}>
                      {org.acronym} - {org.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        </div>

        {filteredOrganizations.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No organizations found with the selected filters.</p>
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
                        width={80}
                        height={80}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className={styles.organizationDetails}>
                      <h3 className={styles.organizationName}>
                        <span 
                          className={styles.organizationAcronym}
                          style={{ 
                            backgroundColor: org.organizationColor || '#f3f4f6',
                            color: (() => {
                              if (!org.organizationColor) return '#374151';
                              
                              const color = org.organizationColor.toLowerCase();
                              
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
                            })()
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
                </div>
              </div>
            )
          })
        )}
        </div>
      )}

      {/* Program Details Modal */}
      <ProgramDetailsModal 
        program={selectedProgram}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProgram(null)
        }}
      />
    </div>
  )
}

export default SuperadminProgramsPage