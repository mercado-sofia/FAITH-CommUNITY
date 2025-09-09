import { useEffect } from 'react'

/**
 * Custom hook to lock/unlock background scroll when modal is open
 * @param {boolean} isOpen - Whether the modal is open
 */
export default function useModalScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return

    // Store the original overflow value
    const originalOverflow = document.body.style.overflow

    // Lock the scroll
    document.body.style.overflow = 'hidden'

    // Cleanup function to restore scroll when modal closes
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])
}
