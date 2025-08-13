'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { FaEdit, FaPlus, FaFacebook, FaEnvelope, FaSearch, FaTimes, FaCrown, FaUserTie, FaUser, FaGripVertical } from 'react-icons/fa'
import { FaListUl } from 'react-icons/fa6'
import { BsFillGrid3X3GapFill } from 'react-icons/bs'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import styles from './styles/OrgHeadsSection.module.css'
import { sortHeadsByOrder, filterHeads, getRoleBadgeColor } from './utils/roleHierarchy'
import DragDropHeadsContainer from './DragDropHeadsContainer'

export default function OrgHeadsSection({
  orgHeadsData,
  message,
  setIsEditing,
  setShowEditModal,
  setOriginalData,
  setCurrentSection,
  setTempEditData
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isDragMode, setIsDragMode] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [localReorderedData, setLocalReorderedData] = useState(null)
  const handleEditClick = () => {
    setOriginalData([...orgHeadsData])
    setCurrentSection('orgHeads')
    setTempEditData([...orgHeadsData])
    setIsEditing(true)
    setShowEditModal(true)
  }

  // Process and sort heads data
  const processedHeads = useMemo(() => {
    // Use localReorderedData if available (for reordering), otherwise use orgHeadsData
    const dataToUse = localReorderedData || orgHeadsData
    
    if (!dataToUse || dataToUse.length === 0) return []
    
    // Sort by display order only (manual reordering)
    const sortedHeads = sortHeadsByOrder(dataToUse)
    
    // Then filter by search query
    return filterHeads(sortedHeads, searchQuery)
  }, [orgHeadsData, localReorderedData, searchQuery])

  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value)
  }

  const applySearch = () => {
    setSearchQuery(searchInput.trim())
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applySearch()
    }
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }



  const getRoleIcon = (role) => {
    const roleStr = role?.toLowerCase() || ''
    if (roleStr.includes('president')) return <FaCrown className={styles.roleIcon} />
    if (roleStr.includes('director') || roleStr.includes('manager')) return <FaUserTie className={styles.roleIcon} />
    return <FaUser className={styles.roleIcon} />
  }

  const handleReorder = async (reorderedHeads) => {
    try {
      const headsWithOrder = reorderedHeads.map((head, index) => ({
        ...head,
        display_order: index + 1
      }))
      
      setLocalReorderedData(headsWithOrder)
      
      console.log('Reordered heads with display_order:', headsWithOrder)
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const response = await fetch(`${API_BASE_URL}/api/heads/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heads: headsWithOrder })
    })
    
    if (!response.ok) {
      throw new Error('Failed to save reorder changes')
    }
    
    console.log('✅ Heads reorder saved to database')
    
    if (typeof window !== 'undefined' && window.localStorage) {
      const orgId = headsWithOrder[0]?.organization_id;
      if (orgId) {
        console.log('🔄 Clearing SWR cache for organization data');
      }
    }
      
    } catch (error) {
      console.error('Failed to reorder heads:', error)
      setLocalReorderedData(null)
    }
  }

  const toggleDragMode = () => {
    setIsDragMode(!isDragMode)
    if (!isDragMode) {
      setViewMode('list')
    }
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
  }



  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Organization Heads</h2>
        <div className={styles.headerControls}>
          {/* View Mode Toggle */}
          {orgHeadsData && orgHeadsData.length > 1 && (
            <div className={styles.viewControls}>
              <button
                onClick={toggleViewMode}
                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                title="Grid View"
              >
                <BsFillGrid3X3GapFill />
              </button>
              <button
                onClick={toggleViewMode}
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                title="List View"
              >
                <FaListUl />
              </button>
            </div>
          )}
          
          {/* Drag Mode Toggle */}
          {orgHeadsData && orgHeadsData.length > 1 && (
            <button
              onClick={toggleDragMode}
              className={`${styles.dragModeButton} ${isDragMode ? styles.active : ''}`}
              title={isDragMode ? 'Exit Reorder Mode' : 'Reorder Heads'}
            >
              <FaGripVertical /> {isDragMode ? 'Done' : 'Reorder'}
            </button>
          )}
          
          <button
            onClick={handleEditClick}
            className={styles.editIcon}
            title="Edit Organization Heads"
          >
            <FaEdit />
          </button>
        </div>
      </div>

      {message.text && message.section === 'orgHeads' && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Search and Filter Controls */}
      {orgHeadsData && orgHeadsData.length > 0 && (
        <div className={styles.controlsSection}>
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, role, or email..."
                value={searchInput}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className={styles.clearSearchButton}
                  title="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>


        </div>
      )}

      {/* Drag Mode Notice */}
      {isDragMode && (
        <div className={styles.dragModeNotice}>
          <FaGripVertical className={styles.dragIcon} />
          <span>Drag and drop to reorder organization heads by priority</span>
        </div>
      )}

      <div className={`${styles.headsContainer} ${styles[viewMode]} ${isDragMode ? styles.dragMode : ''}`}>
        {processedHeads.length > 0 ? (
          isDragMode ? (
            <DragDropHeadsContainer
              heads={processedHeads}
              onReorder={handleReorder}
            />
          ) : (
            processedHeads.map((head, index) => (
              <div key={head.id || index} className={styles.headCard}>
                <div className={styles.headPhoto}>
                  {head.photo ? (
                    <Image
                      src={getOrganizationImageUrl(head.photo, 'head')}
                      alt={`Profile photo of ${head.head_name || head.name || 'organization head'}`}
                      width={80}
                      height={100}
                      className={styles.photo}
                      onError={(e) => {
                        e.target.src = '/default.png';
                      }}
                    />
                  ) : (
                    <Image
                      src="/default.png"
                      alt="Default profile photo placeholder"
                      width={80}
                      height={100}
                      className={styles.photo}
                    />
                  )}
                </div>
                
                <div className={styles.headInfo}>
                  <div className={styles.nameRoleSection}>
                    <h3 className={styles.headName}>{head.head_name || head.name || 'Not specified'}</h3>
                    <div className={styles.roleContainer}>
                      {getRoleIcon(head.role)}
                      <span className={`${styles.headRole} ${styles[getRoleBadgeColor(head.role)]}`}>
                        {head.role || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.contactInfo}>
                    {head.email && (
                      <div className={styles.contactItem}>
                        <FaEnvelope className={styles.contactIcon} />
                        <a href={`mailto:${head.email}`} className={styles.contactLink}>
                          {head.email}
                        </a>
                      </div>
                    )}
                    
                    {head.facebook && (
                      <div className={styles.contactItem}>
                        <FaFacebook className={styles.contactIcon} />
                        <a 
                          href={head.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={styles.contactLink}
                        >
                          Facebook
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <p>No heads found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={clearSearch}
                  className={styles.clearButton}
                >
                  <FaTimes /> Clear Search
                </button>
              </>
            ) : (
              <>
                <p>No organization heads added yet.</p>
                <button
                  onClick={handleEditClick}
                  className={styles.addButton}
                >
                  <FaPlus /> Add Organization Heads
                </button>
              </>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
