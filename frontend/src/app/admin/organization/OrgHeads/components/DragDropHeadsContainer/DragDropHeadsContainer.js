'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { FaGripVertical, FaFacebook, FaEnvelope, FaCrown, FaUserTie, FaUser } from 'react-icons/fa'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import styles from './DragDropHeadsContainer.module.css'


export default function DragDropHeadsContainer({ 
  heads, 
  onReorder
}) {
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const handleDragStart = useCallback((e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    e.target.style.opacity = '0.5'
  }, [])

  const handleDragEnd = useCallback((e) => {
    e.target.style.opacity = '1'
    setDraggedItem(null)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault()
    
    if (draggedItem === null || draggedItem === dropIndex) {
      return
    }

    const newHeads = [...heads]
    const draggedHead = newHeads[draggedItem]
    
    // Remove dragged item
    newHeads.splice(draggedItem, 1)
    
    // Insert at new position
    const insertIndex = draggedItem < dropIndex ? dropIndex - 1 : dropIndex
    newHeads.splice(insertIndex, 0, draggedHead)
    
    // Update display_order for all heads
    const reorderedHeads = newHeads.map((head, index) => ({
      ...head,
      display_order: index + 1
    }))
    
    onReorder(reorderedHeads)
    setDraggedItem(null)
    setDragOverIndex(null)
  }, [heads, draggedItem, onReorder])

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

  if (!heads || heads.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No organization heads to display</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {heads.map((head, index) => (
        <div
          key={head.id || index}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`
            ${styles.headCard} 
            ${draggedItem === index ? styles.dragging : ''}
            ${dragOverIndex === index ? styles.dragOver : ''}
          `}
        >
          {/* Drag Handle */}
          <div className={styles.dragHandle}>
            <FaGripVertical />
          </div>



          {/* Head Photo */}
          <div className={styles.headPhoto}>
            {head.photo ? (
              <Image
                src={getOrganizationImageUrl(head.photo, 'head')}
                alt={`Profile photo of ${head.head_name || head.name || 'organization head'}`}
                width={80}
                height={100}
                className={styles.photo}
                onError={(e) => {
                  e.target.src = '/defaults/default.png'
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

          {/* Head Info */}
          <div className={styles.headInfo}>
            <div className={styles.nameRoleSection}>
              <h3 className={styles.headName}>
                {head.head_name || head.name || 'Not specified'}
              </h3>
              <div className={styles.roleContainer}>
                {getRoleIcon(head.role)}
                <span className={styles.headRole}>
                  {head.role || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Contact Info */}
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

          {/* Order Indicator */}
          <div className={styles.orderIndicator}>
            #{index + 1}
          </div>
        </div>
      ))}
    </div>
  )
}
