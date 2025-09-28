import { useState, useCallback } from 'react'
import {
  useSendInvitationMutation,
  useCancelInvitationMutation,
  useDeleteInvitationMutation,
  useDeactivateAdminFromInvitationMutation,
} from '../../../rtk/superadmin/invitationsApi'
import {
  useUpdateAdminMutation,
  useDeactivateAdminMutation,
  useDeleteAdminMutation,
} from '../../../rtk/superadmin/adminApi'

/**
 * Custom hook for managing invitation and admin operations
 * Handles all CRUD operations for invitations and admin management
 */
export const useInvitationsOperations = () => {
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '' })

  // API mutations
  const [sendInvitation, { isLoading: isSendingInvitation }] = useSendInvitationMutation()
  const [cancelInvitation, { isLoading: isCancellingInvitation }] = useCancelInvitationMutation()
  const [deleteInvitation, { isLoading: isDeletingInvitation }] = useDeleteInvitationMutation()
  const [deactivateAdminFromInvitation, { isLoading: isDeactivatingFromInvitation }] = useDeactivateAdminFromInvitationMutation()
  const [deactivateAdmin, { isLoading: isDeactivatingAdmin }] = useDeactivateAdminMutation()
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation()
  const [deleteAdmin, { isLoading: isRemoving }] = useDeleteAdminMutation()

  // Success modal handlers
  const showSuccessModal = useCallback((message) => {
    setSuccessModal({ isVisible: true, message })
  }, [])

  const closeSuccessModal = useCallback(() => {
    setSuccessModal({ isVisible: false, message: '' })
  }, [])

  // Invitation operations
  const handleSendInvitation = useCallback(async (email, refetchCallback) => {
    try {
      await sendInvitation({ email }).unwrap()
      showSuccessModal('Invitation sent successfully!')
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Send invitation failed:', error)
      const errorMessage = error?.data?.error || error?.message || 'Failed to send invitation'
      throw new Error(errorMessage)
    }
  }, [sendInvitation, showSuccessModal])

  const handleCancelInvitation = useCallback(async (id, refetchCallback) => {
    try {
      await cancelInvitation(id).unwrap()
      showSuccessModal('Invitation cancelled successfully!')
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Cancel invitation failed:', error)
      showSuccessModal('Failed to cancel invitation')
    }
  }, [cancelInvitation, showSuccessModal])

  const handleDeleteInvitation = useCallback(async (id, refetchCallback) => {
    try {
      const result = await deleteInvitation(id).unwrap()
      showSuccessModal(result.message || 'Invitation deleted successfully!')
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Delete invitation failed:', error)
      showSuccessModal('Failed to delete invitation')
    }
  }, [deleteInvitation, showSuccessModal])

  const handleDeactivateAdminFromInvitation = useCallback(async (id, refetchCallback) => {
    try {
      const result = await deactivateAdminFromInvitation(id).unwrap()
      showSuccessModal(result.message || 'Admin deactivated successfully!')
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Deactivate admin from invitation failed:', error)
      showSuccessModal('Failed to deactivate admin')
    }
  }, [deactivateAdminFromInvitation, showSuccessModal])

  // Admin operations
  const handleDeactivateAdmin = useCallback(async (adminId, refetchCallback) => {
    try {
      const result = await deactivateAdmin(adminId).unwrap()
      showSuccessModal(result.message)
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Toggle admin status failed:', error)
      showSuccessModal('Failed to update admin account status')
    }
  }, [deactivateAdmin, showSuccessModal])

  const handleUpdateAdmin = useCallback(async (adminData, refetchCallback) => {
    try {
      await updateAdmin(adminData).unwrap()
      showSuccessModal('Admin updated successfully!')
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Update admin failed:', error)
      showSuccessModal('Failed to update admin')
      throw error
    }
  }, [updateAdmin, showSuccessModal])

  const handleDeleteAdmin = useCallback(async (adminId, refetchCallback) => {
    try {
      await deleteAdmin(adminId).unwrap()
      showSuccessModal('Admin deleted successfully!')
      if (refetchCallback) refetchCallback()
    } catch (error) {
      console.error('Delete admin failed:', error)
      showSuccessModal('Failed to delete admin')
    }
  }, [deleteAdmin, showSuccessModal])

  return {
    // State
    successModal,
    
    // Loading states
    isSendingInvitation,
    isCancellingInvitation,
    isDeletingInvitation,
    isDeactivatingFromInvitation,
    isDeactivatingAdmin,
    isUpdating,
    isRemoving,
    
    // Modal handlers
    showSuccessModal,
    closeSuccessModal,
    
    // Operations
    handleSendInvitation,
    handleCancelInvitation,
    handleDeleteInvitation,
    handleDeactivateAdminFromInvitation,
    handleDeactivateAdmin,
    handleUpdateAdmin,
    handleDeleteAdmin,
  }
}
