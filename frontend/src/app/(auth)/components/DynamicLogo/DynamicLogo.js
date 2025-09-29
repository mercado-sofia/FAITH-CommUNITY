'use client'

import Image from 'next/image'
import { FaSpinner } from 'react-icons/fa'
import { useDynamicLogo } from '@/hooks/useDynamicLogo'
import styles from './DynamicLogo.module.css'

export default function DynamicLogo({ 
  width = 80, 
  height = 80, 
  alt = "Logo",
  className = "",
  showLoading = true 
}) {
  const { logoUrl, isLoading } = useDynamicLogo()

  if (isLoading && showLoading) {
    return (
      <div className={`${styles.logoPlaceholder} ${className}`} style={{ width, height }}>
        <FaSpinner className={styles.logoSpinner} />
      </div>
    )
  }

  return (
    <Image 
      src={logoUrl || "/assets/logos/faith_logo.png"} 
      alt={alt} 
      width={width} 
      height={height}
      unoptimized
      className={className}
    />
  )
}
