'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { FaEdit, FaPlus, FaFacebook, FaEnvelope, FaSearch, FaTimes, FaCrown, FaUserTie, FaUser, FaGripVertical } from 'react-icons/fa'
import { FaListUl } from 'react-icons/fa6'
import { BsFillGrid3X3GapFill } from 'react-icons/bs'
import { FiTrash2 } from 'react-icons/fi'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import styles from './OrgHeadsSection.module.css'
import { sortHeadsByOrder, filterHeads } from '../../utils'
import DragDropHeadsContainer from '../components/DragDropHeadsContainer/DragDropHeadsContainer'

export default function OrgHeadsSection({
  orgHeadsData,
  onEditIndividualHead,
  onDeleteIndividualHead,
  onAddOrgHead,
  onReorderHeads,
  saving = false
}) {

  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isDragMode, setIsDragMode] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [localReorderedData, setLocalReorderedData] = useState(null)
  
  // Clear localReorderedData when orgHeadsData changes from external source (e.g., after refresh)
  // This ensures we use fresh data from the database after page refresh
  useEffect(() => {
    // Only clear if the data length changes (indicating a fresh fetch)
    if (localReorderedData && localReorderedData.length !== orgHeadsData.length) {
      setLocalReorderedData(null)
    }
  }, [orgHeadsData.length, localReorderedData]) // Include localReorderedData in dependencies
  
  const handleAddHeadsClick = () => {
    if (onAddOrgHead) {
      onAddOrgHead();
    }
  }

  const handleEditIndividualHead = (head) => {
    if (onEditIndividualHead) {
      onEditIndividualHead(head);
    }
  }

  const handleDeleteIndividualHead = (head) => {
    if (onDeleteIndividualHead) {
      onDeleteIndividualHead(head);
    }
  }

  // Process and sort heads data
  const processedHeads = useMemo(() => {
    // Use localReorderedData if available (for immediate UI updates), otherwise use orgHeadsData
    const dataToUse = localReorderedData || orgHeadsData
    
    if (!dataToUse || dataToUse.length === 0) return []
    
    // The backend already sorts by display_order, but we sort again to ensure consistency
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
    if (roleStr.includes('adviser') || roleStr.includes('advisor') || roleStr.includes('president')) {
      return <FaCrown className={styles.roleIcon} />
    }
    if (roleStr.includes('secretary') || roleStr.includes('treasurer') || roleStr.includes('pro') || roleStr.includes('public relations')) {
      return <FaUserTie className={styles.roleIcon} />
    }
    return <FaUser className={styles.roleIcon} />
  }

  const handleReorder = async (reorderedHeads) => {
    try {
      const headsWithOrder = reorderedHeads.map((head, index) => ({
        ...head,
        display_order: index + 1
      }))
      
      // Update local state immediately for UI feedback
      setLocalReorderedData(headsWithOrder)
      
      // Call parent's reorder handler if provided
      if (onReorderHeads) {
        await onReorderHeads(headsWithOrder)
      }
      
    } catch (error) {
      // Revert local state on error
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
            onClick={handleAddHeadsClick}
            className={styles.addButton}
            title="Add Organization Heads"
          >
            <FaPlus /> Add Org Heads
          </button>
        </div>
      </div>



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
                {/* Individual Action Buttons Container */}
                <div className={styles.individualActionButtons}>
                  {/* Individual Edit Button */}
                  <button
                    onClick={() => handleEditIndividualHead(head)}
                    className={styles.individualEditButton}
                    title="Edit this head"
                  >
                    <FaEdit />
                  </button>
                  
                  {/* Individual Delete Button */}
                  <button
                    onClick={() => handleDeleteIndividualHead(head)}
                    className={styles.individualDeleteButton}
                    title="Delete this head"
                    disabled={saving}
                  >
                    <FiTrash2 />
                  </button>
                </div>
                
                <div className={styles.headPhoto}>
                  {head.photo ? (
                    <Image
                      src={getOrganizationImageUrl(head.photo, 'head')}
                      alt={`Profile photo of ${head.head_name || head.name || 'organization head'}`}
                      width={80}
                      height={100}
                      className={styles.photo}
                      onError={(e) => {
                        e.target.src = '/defaults/default.png';
                      }}
                    />
                  ) : (
                    <Image
                      src="/defaults/default.png"
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
                      <span className={styles.headRole}>
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
              <p>No organization heads added yet.</p>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
