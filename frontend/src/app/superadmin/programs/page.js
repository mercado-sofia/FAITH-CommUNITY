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
          const dropdownWrappers = document.querySelectorAll(`.${styles.dropdownWrapper}`);
          const isAnyDropdownVisible = Array.from(dropdownWrappers).some(wrapper => 
            wrapper.querySelector(`.${styles.options}`) && 
            window.getComputedStyle(wrapper.querySelector(`.${styles.options}`)).display !== 'none'
          );
          
          if (!isAnyDropdownVisible) {
            setShowDropdown(null);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
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

  // Search function to filter programs
  const searchPrograms = (programs, query) => {
    if (!query.trim()) return programs
    
    const searchTerm = query.toLowerCase()
    return programs.filter(program => 
      program.title?.toLowerCase().includes(searchTerm) ||
      program.description?.toLowerCase().includes(searchTerm) ||
      program.location?.toLowerCase().includes(searchTerm) ||
      program.category?.toLowerCase().includes(searchTerm)
    )
  }

  // Filter organizations based on selected filters and search
  const filteredOrganizations = organizationPrograms.map(org => {
    // First filter by organization
    if (selectedOrganization !== 'all' && org.organizationId !== parseInt(selectedOrganization)) {
      return null
    }

    // Then apply search filter to programs
    const filteredPrograms = {
      upcoming: searchPrograms(org.programs.upcoming, searchQuery),
      active: searchPrograms(org.programs.active, searchQuery),
      completed: searchPrograms(org.programs.completed, searchQuery)
    }

    return {
      ...org,
      programs: filteredPrograms
    }
  }).filter(org => org !== null)

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
                  {/* Empty stats during loading */}
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
                  {/* Empty stats during error */}
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
                  <>
                    <div className={styles.statCard}>
                      <span className={styles.statNumber}>{statistics.totalPrograms}</span>
                      <span className={styles.statLabel}>Total Programs</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statNumber}>{statistics.upcomingPrograms}</span>
                      <span className={styles.statLabel}>Upcoming</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statNumber}>{statistics.activePrograms}</span>
                      <span className={styles.statLabel}>Active</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statNumber}>{statistics.completedPrograms}</span>
                      <span className={styles.statLabel}>Completed</span>
                    </div>
                  </>
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
                    {org.organizationLogo && (
                      <Image 
                        src={getOrganizationImageUrl(org.organizationLogo, 'logo')}
                        alt={`${org.organizationName} logo`}
                        className={styles.organizationLogo}
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