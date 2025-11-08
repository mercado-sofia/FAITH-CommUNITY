'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiChevronDown } from 'react-icons/fi'
import { useGetAllHighlightsQuery, useGetHighlightsStatisticsQuery } from '@/rtk/superadmin/highlightsApi'
import { useGetOrganizationsForFilterQuery } from '@/rtk/superadmin/dashboardApi'
import HighlightCard from './components/HighlightCard'
import HighlightDetailsModal from './components/HighlightDetailsModal'
import SearchBar from './components/SearchBar'
import styles from './highlights.module.css'

const SuperadminHighlightsPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0) // Force re-render when starred highlights change
  const [selectedHighlight, setSelectedHighlight] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(null)
  const dropdownRef = useRef(null)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return tab || 'featured' // Default to 'featured' if no URL parameter
  })

  // Listen for starred highlights changes
  useEffect(() => {
    const handleStarredChange = () => {
      setRefreshKey(prev => prev + 1)
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('starredHighlightsChanged', handleStarredChange)
      return () => {
        window.removeEventListener('starredHighlightsChanged', handleStarredChange)
      }
    }
  }, [])

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

  // Get status filter based on active tab
  const getStatusFilter = () => {
    switch (activeTab) {
      case 'approved':
        return 'approved'
      case 'pending':
        return 'pending'
      case 'rejected':
        return 'rejected'
      case 'all':
      case 'featured':
      default:
        return null // Get all highlights
    }
  }

  const statusFilter = getStatusFilter()

  const { 
    data: highlights = [], 
    isLoading: highlightsLoading, 
    error: highlightsError,
    refetch: refetchHighlights 
  } = useGetAllHighlightsQuery(statusFilter)

  const { 
    data: statistics = {}, 
    isLoading: statsLoading 
  } = useGetHighlightsStatisticsQuery()

  const {
    data: organizations = [],
    isLoading: orgsLoading
  } = useGetOrganizationsForFilterQuery()

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

  // Search function with relevance scoring (prioritizing Organization name and Title)
  const searchHighlights = (highlights, query) => {
    if (!query || !query.trim()) return highlights
    
    const searchTerm = query.toLowerCase().trim()
    const searchTermExact = searchTerm.trim()
    
    // Calculate relevance score for each highlight
    const highlightsWithScores = highlights.map(highlight => {
      let score = 0
      let hasMatch = false
      
      // Helper function to check if string matches and calculate score
      const checkMatch = (value, priorityScore, exactBonus = 0) => {
        if (!value || typeof value !== 'string') return false
        const valueLower = value.toLowerCase()
        if (valueLower.includes(searchTerm)) {
          hasMatch = true
          score += priorityScore
          // Bonus for exact match or starts with
          if (valueLower === searchTermExact) {
            score += exactBonus * 2
          } else if (valueLower.startsWith(searchTermExact)) {
            score += exactBonus
          }
          return true
        }
        return false
      }
      
      // PRIORITY 1: Organization name and acronym (highest priority - 100 points)
      if (checkMatch(highlight.organization_name, 100, 20)) {}
      if (checkMatch(highlight.organization_acronym, 100, 20)) {}
      
      // PRIORITY 2: Title (high priority - 80 points)
      if (checkMatch(highlight.title, 80, 15)) {}
      
      // PRIORITY 3: Description (lower priority - 30 points)
      if (checkMatch(highlight.description, 30, 5)) {}
      
      // PRIORITY 4: Status (lowest priority - 10 points)
      if (checkMatch(highlight.status, 10, 2)) {}
      
      // If no matches found, return null to filter out
      if (!hasMatch) return null
      
      return { highlight, score }
    }).filter(item => item !== null)
    
    // Sort by score (descending) and return only highlights
    return highlightsWithScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.highlight)
  }

  // Filter highlights by organization
  const filterByOrganization = (highlights, orgId) => {
    if (orgId === 'all') return highlights
    return highlights.filter(h => h.organization_id === parseInt(orgId))
  }

  // Get starred highlights from localStorage
  const getStarredHighlights = () => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem('superadmin_starred_highlights')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }

  // Get featured highlights (only starred highlights)
  const getFeaturedHighlights = (highlights) => {
    const starredIds = getStarredHighlights()
    // Only show approved highlights that are starred
    return highlights.filter(h => 
      h.status === 'approved' && starredIds.has(h.id)
    )
  }

  // Process highlights based on active tab
  // Use refreshKey to force re-evaluation when starred highlights change
  let processedHighlights = highlights
  const _refreshKey = refreshKey // Use refreshKey to trigger re-evaluation

  // Apply search filter
  if (searchQuery.trim()) {
    processedHighlights = searchHighlights(processedHighlights, searchQuery)
  }

  // Apply organization filter
  if (selectedOrganization !== 'all') {
    processedHighlights = filterByOrganization(processedHighlights, selectedOrganization)
  }

  // Apply tab-specific filtering
  if (activeTab === 'featured') {
    // Featured tab: only show starred highlights
    processedHighlights = getFeaturedHighlights(processedHighlights)
  } else if (activeTab === 'approved') {
    // Approved tab: show all approved highlights (these sync with FAITHtree Stories Highlights)
    processedHighlights = processedHighlights.filter(h => h.status === 'approved')
  } else if (activeTab === 'pending') {
    processedHighlights = processedHighlights.filter(h => h.status === 'pending')
  } else if (activeTab === 'rejected') {
    processedHighlights = processedHighlights.filter(h => h.status === 'rejected')
  }

  // Use organizations from API for filter dropdown
  // Filter out "Collab Admin" as it's not a real organization but a collaboration condition
  const organizationOptions = (organizations || []).filter(org => {
    // Exclude organizations with "Collab Admin" in acronym or "Collaboration Administrator" in name
    const acronym = (org.acronym || '').toLowerCase()
    const name = (org.name || '').toLowerCase()
    return !acronym.includes('collab admin') && !name.includes('collaboration administrator')
  })

  // Search handler
  const handleSearchChange = (query) => {
    setSearchQuery(query)
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

  if (highlightsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.twoColumnLayout}>
              <div className={styles.leftColumn}>
                <h1 className={styles.pageTitle}>Highlights Management</h1>
              </div>
              <div className={styles.rightColumn}>
                <div className={styles.statsContainer}>
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>—</h2>
                        <p className={styles.label}>Total Highlights</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.approvedCount}>— Approved</span>
                            <span className={styles.pendingCount}>— Pending</span>
                            <span className={styles.rejectedCount}>— Rejected</span>
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
          <p>Loading highlights...</p>
        </div>
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
                <h1 className={styles.pageTitle}>Highlights Management</h1>
              </div>
              <div className={styles.rightColumn}>
                <div className={styles.statsContainer}>
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>—</h2>
                        <p className={styles.label}>Total Highlights</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.approvedCount}>— Approved</span>
                            <span className={styles.pendingCount}>— Pending</span>
                            <span className={styles.rejectedCount}>— Rejected</span>
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
          <p className={styles.errorMessage}>Failed to load highlights</p>
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
          <div className={styles.twoColumnLayout}>
            {/* Left Column - 50% width */}
            <div className={styles.leftColumn}>
              <h1 className={styles.pageTitle}>Highlights Management</h1>
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
                        <h2 className={styles.count}>{statistics.totalHighlights || 0}</h2>
                        <p className={styles.label}>Total Highlights</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.approvedCount}>
                              {statistics.approvedHighlights || 0} Approved
                            </span>
                            <span className={styles.pendingCount}>
                              {statistics.pendingHighlights || 0} Pending
                            </span>
                            <span className={styles.rejectedCount}>
                              {statistics.rejectedHighlights || 0} Rejected
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
            className={`${styles.navTab} ${activeTab === 'approved' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('approved')}
          >
            Approved
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'pending' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('pending')}
          >
            Pending
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'rejected' ? styles.activeTab : ''}`}
            onClick={() => updateTabUrl('rejected')}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Organization Filter Header - Only show in "All" tab */}
      {activeTab === 'all' && (
        <div className={styles.highlightsHeader}>
          <h2 className={styles.sectionTitle}>Highlights by Organization</h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Organization:</label>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <div
                  className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
                  onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
                >
                  {orgsLoading ? "Loading..." : selectedOrganization === "all" ? "All Organizations" : organizationOptions.find(org => org.id.toString() === selectedOrganization)?.acronym + " - " + organizationOptions.find(org => org.id.toString() === selectedOrganization)?.name}
                  <FiChevronDown className={styles.icon} />
                </div>
                {showDropdown === "organization" && (
                  <ul className={styles.options}>
                    <li key="all" onClick={() => {
                      setSelectedOrganization("all")
                      setShowDropdown(null)
                    }}>
                      All Organizations
                    </li>
                    {organizationOptions.map(org => (
                      <li key={org.id} onClick={() => {
                        setSelectedOrganization(org.id.toString())
                        setShowDropdown(null)
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
      )}

      {/* Highlights Grid */}
      <div className={styles.highlightsSection}>
        {processedHighlights.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {activeTab === 'featured' 
                ? 'No featured highlights yet. Star approved highlights to add them here.' 
                : 'No highlights found with the selected filters.'}
            </p>
          </div>
        ) : (
          <div className={styles.highlightsGrid}>
            {processedHighlights.map(highlight => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                onViewDetails={handleViewDetails}
              />
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
    </div>
  )
}

export default SuperadminHighlightsPage

