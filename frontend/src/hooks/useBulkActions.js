import { useState, useCallback } from 'react'

/**
 * Custom hook for managing bulk actions on invitations
 * Handles selection state and bulk operations
 */
export const useBulkActions = () => {
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isBulkCancelling, setIsBulkCancelling] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Selection handlers
  const handleSelectAll = useCallback((e, items) => {
    if (e.target.checked) {
      setSelectedItems(new Set(items.map(item => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }, [])

  const handleSelectItem = useCallback((id) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return newSelected
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  // Bulk action request handlers
  const handleBulkCancelRequest = useCallback((selectedInvitationIds) => {
    setSelectedItems(new Set(selectedInvitationIds))
    setShowBulkCancelModal(true)
  }, [])

  const handleBulkDeleteRequest = useCallback((selectedInvitationIds) => {
    setSelectedItems(new Set(selectedInvitationIds))
    setShowBulkDeleteModal(true)
  }, [])

  // Bulk action confirmation handlers
  const handleBulkCancelConfirm = useCallback(async (cancelInvitation, showSuccessModal, refetchCallback) => {
    if (selectedItems.size === 0) return
    
    setIsBulkCancelling(true)
    try {
      const selectedIds = Array.from(selectedItems)
      await Promise.all(selectedIds.map(id => cancelInvitation(id, refetchCallback)))
      setShowBulkCancelModal(false)
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Bulk cancel failed:', error)
      showSuccessModal('Failed to cancel selected invitations')
    } finally {
      setIsBulkCancelling(false)
    }
  }, [selectedItems])

  const handleBulkDeleteConfirm = useCallback(async (deleteInvitation, showSuccessModal, refetchCallback) => {
    if (selectedItems.size === 0) return
    
    setIsBulkDeleting(true)
    try {
      const selectedIds = Array.from(selectedItems)
      await Promise.all(selectedIds.map(id => deleteInvitation(id, refetchCallback)))
      setShowBulkDeleteModal(false)
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Bulk delete failed:', error)
      showSuccessModal('Failed to delete selected invitations')
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedItems])

  // Modal cancel handlers
  const handleBulkCancelCancel = useCallback(() => {
    setShowBulkCancelModal(false)
  }, [])

  const handleBulkDeleteCancel = useCallback(() => {
    setShowBulkDeleteModal(false)
  }, [])

  return {
    // State
    selectedItems,
    showBulkCancelModal,
    showBulkDeleteModal,
    isBulkCancelling,
    isBulkDeleting,
    
    // Selection handlers
    handleSelectAll,
    handleSelectItem,
    clearSelection,
    
    // Bulk action handlers
    handleBulkCancelRequest,
    handleBulkDeleteRequest,
    handleBulkCancelConfirm,
    handleBulkDeleteConfirm,
    handleBulkCancelCancel,
    handleBulkDeleteCancel,
  }
}
