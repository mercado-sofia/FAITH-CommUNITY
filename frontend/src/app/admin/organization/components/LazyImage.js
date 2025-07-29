'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { imageCache } from './utils/photoUtils'
import styles from './styles/LazyImage.module.css'

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = '/default.png',
  onLoad,
  onError,
  priority = false,
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority) // Load immediately if priority
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [priority, isInView])

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src || src === placeholder || src === '' || src === null || src === undefined) return

    const loadImage = async () => {
      setIsLoading(true)
      setHasError(false)

      try {
        const cachedSrc = await imageCache.get(src)
        setImageSrc(cachedSrc)
        setIsLoading(false)
        onLoad?.()
      } catch (error) {
        console.error('Failed to load image:', error)
        setHasError(true)
        setIsLoading(false)
        setImageSrc(placeholder)
        onError?.(error)
      }
    }

    loadImage()
  }, [isInView, src, placeholder, onLoad, onError])

  const handleImageLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleImageError = (error) => {
    setHasError(true)
    setIsLoading(false)
    setImageSrc(placeholder)
    onError?.(error)
  }

  return (
    <div
      ref={imgRef}
      className={`${styles.container} ${className}`}
      style={{ width, height }}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className={styles.skeleton}>
          <div className={styles.skeletonShimmer} />
        </div>
      )}

      {/* Actual image */}
      <Image
        src={imageSrc}
        alt={alt}
        {...(width && height ? { width, height } : { fill: true })}
        className={`${styles.image} ${isLoading ? styles.loading : styles.loaded}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        priority={priority}
        {...props}
      />

      {/* Error state */}
      {hasError && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorIcon}>📷</div>
          <span className={styles.errorText}>Failed to load</span>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && isInView && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  )
}
