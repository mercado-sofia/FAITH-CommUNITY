'use client';

import { useMemo } from 'react';
import styles from './TreeCarousel.module.css';

function TreeCarousel({ 
  highlightChunks = [], 
  currentTreeIndex = 0, 
  onTreeSelect,
  theme = 'morning' 
}) {
  // Filter out the current tree from carousel
  const otherTrees = useMemo(() => {
    return highlightChunks
      .map((chunk, index) => ({ chunk, index }))
      .filter(({ index }) => index !== currentTreeIndex)
  }, [highlightChunks, currentTreeIndex])

  // Don't show carousel if there's only one tree or no other trees
  if (highlightChunks.length <= 1 || otherTrees.length === 0) {
    return null
  }

  const handleTreeClick = (treeIndex) => {
    if (onTreeSelect) {
      onTreeSelect(treeIndex)
    }
  }

  return (
    <div className={`${styles.carouselContainer} ${styles[`carousel${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
      <div className={styles.carouselHeader}>
        <span className={styles.carouselTitle}>Other Trees</span>
      </div>
      
      <div className={styles.carouselContent}>
        {otherTrees.map(({ chunk, index }) => {
          const starCount = chunk.length
          const treeNumber = index + 1
          
          return (
            <div
              key={index}
              className={styles.treePreview}
              onClick={() => handleTreeClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleTreeClick(index)
                }
              }}
              aria-label={`Tree ${treeNumber} with ${starCount} stars`}
            >
              <div className={styles.treePreviewIcon}>
                <svg viewBox="0 0 100 100" className={styles.treeSvg}>
                  {/* Simple tree shape */}
                  <path
                    d="M50 20 L35 50 L30 50 L45 80 L55 80 L70 50 L65 50 Z"
                    fill={theme === 'rainy' ? '#2c455e' : '#4caf50'}
                    opacity="0.8"
                  />
                  {/* Stars on tree */}
                  {chunk.slice(0, 6).map((highlight, starIdx) => {
                    const angle = (starIdx * 60) * (Math.PI / 180)
                    const radius = 15 + (starIdx % 3) * 5
                    const x = 50 + Math.cos(angle) * radius
                    const y = 50 + Math.sin(angle) * radius
                    const starSize = highlight?.impact_level === 'high' ? 4 : highlight?.impact_level === 'average' ? 3 : 2
                    
                    return (
                      <circle
                        key={starIdx}
                        cx={x}
                        cy={y}
                        r={starSize}
                        fill="#FFD700"
                        opacity={highlight?.impact_level === 'high' ? 1 : highlight?.impact_level === 'average' ? 0.8 : 0.6}
                      />
                    )
                  })}
                </svg>
              </div>
              <div className={styles.treePreviewInfo}>
                <span className={styles.treeNumber}>Tree {treeNumber}</span>
                <span className={styles.starCount}>{starCount} {starCount === 1 ? 'star' : 'stars'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TreeCarousel