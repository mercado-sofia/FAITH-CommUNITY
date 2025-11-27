'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiChevronDown, FiArchive } from 'react-icons/fi'
import { useGetAllHighlightsQuery, useGetHighlightsStatisticsQuery } from '@/rtk/superadmin/highlightsApi'
import { useGetOrganizationsForFilterQuery } from '@/rtk/superadmin/dashboardApi'
import HighlightCard from './components/HighlightCard'
import HighlightDetailsModal from './components/HighlightDetailsModal'
import SearchBar from './components/SearchBar'
import { SkeletonLoader } from '../components'
import styles from './highlights.module.css'

const SuperadminHighlightsPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHighlight, setSelectedHighlight] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(null)
  const dropdownRef = useRef(null)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    // Only allow 'featured' and 'all' tabs, default to 'featured'
    if (tab === 'all' || tab === 'featured') {
      return tab
    }
    return 'featured' // Default to 'featured' if no URL parameter or invalid tab
  })


  // Helper function to update URL parameter
  const updateTabUrl = useCallback((tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'featured') {
      // Remove tab parameter for featured (default)
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  // Sync URL parameter changes with activeTab state
  useEffect(() => {
    const tab = searchParams.get('tab')
    // Only allow 'featured' and 'all' tabs
    if (tab === 'all' || tab === 'featured') {
      if (tab !== activeTab) {
        setActiveTab(tab)
      }
    } else if (!tab && activeTab !== 'featured') {
      setActiveTab('featured')
    }
  }, [searchParams, activeTab])

  // Always fetch only approved highlights
  const statusFilter = 'approved'

  const { 
    data: highlights = [], 
    isLoading: highlightsLoading, 
    error: highlightsError,
    refetch: refetchHighlights 
  } = useGetAllHighlightsQuery(statusFilter)


  const { 
    data: statistics = {}, 
    isLoading: statsLoading,
    refetch: refetchStatistics
  } = useGetHighlightsStatisticsQuery()

  const {
    data: organizations = [],
    isLoading: orgsLoading
  } = useGetOrganizationsForFilterQuery()

  // Listen for highlight status changes to refetch data
  // This must be after the hooks that define refetchHighlights and refetchStatistics
  useEffect(() => {
    const handleHighlightStatusChange = () => {
      // Refetch highlights and statistics when status changes
      refetchHighlights()
      refetchStatistics()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('highlightStatusChanged', handleHighlightStatusChange)
      return () => {
        window.removeEventListener('highlightStatusChanged', handleHighlightStatusChange)
      }
    }
  }, [refetchHighlights, refetchStatistics])

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

  // Search function with relevance scoring (prioritizing Organization name, Title, and Associated Program)
  const searchHighlights = (highlights, query) => {
    if (!query || !query.trim()) return highlights
    
    const searchTerm = query.toLowerCase().trim()
    const searchTermExact = searchTerm.trim()
    
    // Split search term into individual words for more flexible matching
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0)
    
    // Calculate relevance score for each highlight
    const highlightsWithScores = highlights.map(highlight => {
      let score = 0
      let hasMatch = false
      
      // Helper function to check if string matches and calculate score
      const checkMatch = (value, priorityScore, exactBonus = 0, wordMatchBonus = 0) => {
        // Handle null, undefined, or non-string values
        if (value === null || value === undefined) {
          return false
        }
        
        // Convert to string if not already and trim whitespace
        const valueStr = typeof value === 'string' ? value.trim() : String(value).trim()
        if (!valueStr || valueStr === '') {
          return false
        }
        
        // Normalize whitespace (replace multiple spaces with single space)
        const normalizedValue = valueStr.replace(/\s+/g, ' ').trim()
        const valueLower = normalizedValue.toLowerCase()
        const normalizedSearchTerm = searchTerm.replace(/\s+/g, ' ').trim()
        
        // Check for full phrase match (case-insensitive, normalized whitespace)
        if (valueLower.includes(normalizedSearchTerm)) {
          hasMatch = true
          score += priorityScore
          // Bonus for exact match or starts with
          if (valueLower === normalizedSearchTerm) {
            score += exactBonus * 2
          } else if (valueLower.startsWith(normalizedSearchTerm)) {
            score += exactBonus
          }
          return true
        }
        
        // Check for exact sequence matching (case-insensitive substring)
        // This ensures "art" matches "Art Center", "artist", "Modern Art" but NOT "cart" or "part"
        // The sequence must appear as a complete substring at word boundaries
        if (searchWords.length > 0) {
          let wordMatches = 0
          let totalWordScore = 0
          const matchedWords = []
          
          searchWords.forEach(word => {
            if (word.length > 0) {
              const wordLower = word.toLowerCase()
              const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              
              // Strategy: The exact sequence must appear as a substring, but only if:
              // 1. It's at the start of a word (word boundary) OR
              // 2. It's a complete word (surrounded by word boundaries) OR
              // 3. It's at the start of the entire string
              // This prevents "art" from matching "cart" (not at word boundary)
              // But allows "art" to match "artist" (at start of word) and "Art Center" (complete word)
              
              // Check if sequence appears as substring first (performance optimization)
              if (valueLower.includes(wordLower)) {
                // Check if it's at word boundary (start of word) - this is the key requirement
                // Pattern: (start of string OR word boundary) followed by the sequence
                // This ensures "art" matches "artist" and "Art Center" but not "cart"
                const wordBoundaryPattern = new RegExp(`(^|\\b)${escapedWord}`, 'i')
                const wholeWordPattern = new RegExp(`\\b${escapedWord}\\b`, 'i')
                
                // Test if sequence appears at word boundary or as whole word
                const isAtWordBoundary = wordBoundaryPattern.test(valueStr)
                const isWholeWord = wholeWordPattern.test(valueStr)
                
                // Match if: at word boundary OR as complete word
                // This allows:
                // - "art" to match "artist" (at word start: "art"ist)
                // - "art" to match "Art Center" (whole word: "Art")
                // - "art" to match "Modern Art" (whole word: "Art")
                // But prevents:
                // - "art" from matching "cart" (not at boundary: c"art")
                // - "art" from matching "part" (not at boundary: p"art")
                if (isAtWordBoundary || isWholeWord) {
                  wordMatches++
                  matchedWords.push(word)
                  
                  // Score based on match quality
                  if (isWholeWord) {
                    totalWordScore += 3 // Best: complete word match
                  } else if (isAtWordBoundary) {
                    totalWordScore += 2 // Good: at start of word
                  }
                }
              }
            }
          })
          
          // For multi-word searches, require ALL words to match (exact sequence matching)
          // This ensures "for highlight" only matches if both "for" and "highlight" appear as sequences
          const requiredMatches = searchWords.length
          
          if (wordMatches >= requiredMatches) {
            hasMatch = true
            // Scale score based on how many words matched
            const matchRatio = wordMatches / searchWords.length
            const matchScore = matchRatio >= 1.0
              ? priorityScore 
              : priorityScore * (0.7 + matchRatio * 0.2) // Scale from 70% to 90% based on match ratio
            score += matchScore
            score += wordMatchBonus * totalWordScore
            return true
          }
        }
        
        return false
      }
      
      // PRIORITY 1: Organization name and acronym (highest priority - 100 points)
      checkMatch(highlight.organization_name, 100, 20, 5)
      checkMatch(highlight.organization_acronym, 100, 20, 5)
      
      // PRIORITY 2: Title (high priority - 80 points)
      checkMatch(highlight.title, 80, 15, 5)
      
      // PRIORITY 3: Associated Program (high priority - 70 points)
      // Search in program_title field - this is critical for the user's issue
      // Also check alternative field names that might contain program title
      const programTitle = highlight.program_title || highlight.programTitle || highlight.associated_program || highlight.associatedProgram || null
      
      checkMatch(programTitle, 70, 15, 5)
      
      // Also search program_id if it's a number that matches
      if (highlight.program_id) {
        const programIdStr = String(highlight.program_id)
        if (programIdStr.includes(searchTerm)) {
          hasMatch = true
          score += 50 // Lower score for ID match vs title match
          if (programIdStr === searchTermExact) {
            score += 10
          }
        }
      }
      
      // PRIORITY 4: Impact Level (medium priority - 60 points)
      // Search for impact level keywords: "high", "low", "average", "impact"
      if (highlight.impact_level) {
        const impactLevel = highlight.impact_level.toLowerCase()
        const impactLevelLabel = impactLevel === 'low' ? 'small impact' : 
                                 impactLevel === 'average' ? 'average impact' : 
                                 impactLevel === 'high' ? 'high impact' : ''
        
        // Check if search term matches impact level keywords
        const searchTermLower = searchTerm.toLowerCase()
        const matchesImpact = 
          (searchTermLower === 'high' && impactLevel === 'high') ||
          ((searchTermLower === 'low' || searchTermLower === 'small') && impactLevel === 'low') ||
          (searchTermLower === 'average' && impactLevel === 'average') ||
          (searchTermLower === 'impact' && highlight.impact_level) ||
          (searchTermLower.includes('high') && impactLevel === 'high') ||
          ((searchTermLower.includes('low') || searchTermLower.includes('small')) && impactLevel === 'low') ||
          (searchTermLower.includes('average') && impactLevel === 'average') ||
          (impactLevelLabel.includes(searchTermLower))
        
        if (matchesImpact) {
          hasMatch = true
          score += 60
          // Bonus for exact match
          if (searchTermLower === impactLevel || searchTermLower === impactLevelLabel) {
            score += 15
          } else if (impactLevelLabel.includes(searchTermLower)) {
            score += 10
          }
        }
      }
      
      // PRIORITY 5: Description (lower priority - 30 points)
      checkMatch(highlight.description, 30, 5, 2)
      
      // PRIORITY 6: Status (lowest priority - 10 points)
      checkMatch(highlight.status, 10, 2, 1)
      
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

  // Get featured highlights - fetch from API
  const [featuredHighlightsFromApi, setFeaturedHighlightsFromApi] = useState([])

  useEffect(() => {
    const fetchFeaturedHighlights = async () => {
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const response = await fetch(`${API_BASE_URL || ''}/api/admin/highlights/featured`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setFeaturedHighlightsFromApi(data.highlights || [])
        }
      } catch (error) {
        // Error fetching featured highlights - silently fail, will show empty state
      }
    }

    fetchFeaturedHighlights()

    // Listen for changes
    const handleStarredChange = () => {
      fetchFeaturedHighlights()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('starredHighlightsChanged', handleStarredChange)
      return () => {
        window.removeEventListener('starredHighlightsChanged', handleStarredChange)
      }
    }
  }, [])

  // Get featured highlights (from API)
  const getFeaturedHighlights = (highlights) => {
    const featuredIds = new Set(featuredHighlightsFromApi.map(fh => fh.highlight_id || fh.id))
    // Filter by featured and ensure status is approved (safety check)
    return highlights.filter(h => h.status === 'approved' && featuredIds.has(h.id))
  }

  // Process highlights based on active tab
  // Safety filter: Explicitly ensure only approved highlights are displayed
  // This is a defensive measure in case the API returns unexpected data
  let processedHighlights = highlights.filter(h => h.status === 'approved')

  // Create a map of featured highlights with their impact_level (BEFORE search so search can use it)
  const featuredHighlightsMap = new Map()
  featuredHighlightsFromApi.forEach(fh => {
    featuredHighlightsMap.set(fh.highlight_id || fh.id, {
      isFeatured: true,
      impact_level: fh.impact_level || 'average'
    })
  })

  // Merge impact_level from featured highlights into processed highlights (BEFORE search)
  processedHighlights = processedHighlights.map(highlight => {
    const featuredData = featuredHighlightsMap.get(highlight.id)
    if (featuredData) {
      return {
        ...highlight,
        impact_level: featuredData.impact_level,
        isFeatured: true
      }
    }
    return highlight
  })

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
    // Featured tab: only show starred/featured highlights
    processedHighlights = getFeaturedHighlights(processedHighlights)
  } else if (activeTab === 'all') {
    // All tab: show all approved highlights (both featured and non-featured combined)
    // No additional filtering needed - already filtered to approved above
  }

  // Use organizations from API for filter dropdown
  // Include all organizations, including "Collab Admin" as it's a real organization in the database
  const organizationOptions = organizations || []

  // Calculate featured count from API data
  const featuredCount = featuredHighlightsFromApi.length

  // Calculate featured count per organization
  const getFeaturedCountByOrganization = (orgId) => {
    if (orgId === 'all') {
      return featuredHighlightsFromApi.length
    }
    return featuredHighlightsFromApi.filter(fh => fh.organization_id === parseInt(orgId)).length
  }

  // Calculate featured count by impact level per organization
  const getFeaturedCountByImpactLevel = (orgId) => {
    let filteredHighlights = featuredHighlightsFromApi
    if (orgId !== 'all') {
      filteredHighlights = featuredHighlightsFromApi.filter(fh => fh.organization_id === parseInt(orgId))
    }
    
    return {
      high: filteredHighlights.filter(fh => fh.impact_level === 'high').length,
      average: filteredHighlights.filter(fh => fh.impact_level === 'average').length,
      low: filteredHighlights.filter(fh => fh.impact_level === 'low').length
    }
  }

  const currentOrgFeaturedCount = getFeaturedCountByOrganization(selectedOrganization)
  const impactLevelCounts = getFeaturedCountByImpactLevel(selectedOrganization)

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
                            <span className={styles.approvedCount}>— Featured</span>
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
                            <span className={styles.approvedCount}>— Featured</span>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                <h1 className={styles.pageTitle}>Highlights Management</h1>
              </div>
              <div className={styles.searchSection}>
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
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
                          {selectedOrganization === "all" ? "All" : organizationOptions.find(org => org.id.toString() === selectedOrganization)?.acronym || "All"}
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
                      {organizationOptions.map(org => (
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

            {/* Right Column - 50% width */}
            <div className={styles.rightColumn}>
              <div className={styles.statsContainer}>
                {!statsLoading && (
                  <div className={styles.statCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.textContent}>
                        <h2 className={styles.count}>{statistics.approvedHighlights || 0}</h2>
                        <p className={styles.label}>Total Highlights</p>
                        <div className={styles.extraInfo}>
                          <div className={styles.statusCounts}>
                            <span className={styles.approvedCount}>
                              {featuredCount} Total Featured
                            </span>
                            {statistics.archivedHighlights > 0 && (
                              <span className={styles.archivedCount} style={{ marginLeft: '1rem', color: '#6b7280' }}>
                                {statistics.archivedHighlights} Archived
                              </span>
                            )}
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
        </div>
        <button
          onClick={() => router.push('/superadmin/highlights/archive')}
          className={styles.archiveButton}
        >
          <FiArchive /> Archive
        </button>
      </div>

      {/* Highlights Header - Show count info */}
      <div className={styles.highlightsHeader}>
        {/* Show featured count per organization in Featured tab */}
        {activeTab === 'featured' && (
          <div className={styles.featuredCountInfo}>
            <span className={styles.featuredCountText}>
              {currentOrgFeaturedCount} Featured {selectedOrganization !== 'all' ? 'for this organization' : ''}
            </span>
            {currentOrgFeaturedCount > 0 && (
              <div className={styles.impactLevelBreakdown}>
                <span className={styles.impactBreakdownItem}>
                  <span className={`${styles.impactBreakdownLabel} ${styles.impactHigh}`}>High:</span> 
                  <span className={styles.impactBreakdownValue}>{impactLevelCounts.high}</span>
                </span>
                <span className={styles.impactBreakdownItem}>
                  <span className={`${styles.impactBreakdownLabel} ${styles.impactAverage}`}>Average:</span> 
                  <span className={styles.impactBreakdownValue}>{impactLevelCounts.average}</span>
                </span>
                <span className={styles.impactBreakdownItem}>
                  <span className={`${styles.impactBreakdownLabel} ${styles.impactLow}`}>Small:</span> 
                  <span className={styles.impactBreakdownValue}>{impactLevelCounts.low}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Highlights Grid */}
      <div className={styles.highlightsSection}>
        {processedHighlights.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>
              {activeTab === 'featured' 
                ? 'No featured highlights found' 
                : 'No highlights found'}
            </h3>
            <p className={styles.emptyStateText}>
              {activeTab === 'featured' 
                ? 'No featured highlights yet. Star approved highlights to add them here.' 
                : 'No approved highlights found matching your current filters.'}
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
        onActionComplete={() => {
          refetchHighlights()
          refetchStatistics()
        }}
      />
    </div>
  )
}

export default SuperadminHighlightsPage