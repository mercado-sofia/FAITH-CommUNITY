"use client"

import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { initializeAuth } from "../../../rtk/superadmin/adminSlice"
import { useURLParams } from "../../../hooks/useURLParams"
import { useInvitationsData } from "../../../hooks/useInvitationsData"
import { useInvitationsOperations } from "../../../hooks/useInvitationsOperations"
import { useBulkActions } from "../../../hooks/useBulkActions"
import SearchAndFilterControls from "./components/SearchAndFilterControls"
import InvitationsTable from "./components/InvitationsTable"
import InviteModal from "./components/InviteModal"
import PaginationControls from "./components/PaginationControls"
import DeleteConfirmationModal from "../components/DeleteConfirmationModal"
import SuccessModal from "../components/SuccessModal"
import styles from "./invites.module.css"

const ManageProfiles = () => {
  const dispatch = useDispatch()

  // Initialize auth state from localStorage
  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  // Custom hooks
  const { params, updateParam } = useURLParams()
  const { 
    paginatedInvitations, 
    totalPages, 
    startIndex, 
    endIndex, 
    totalCount, 
    filteredCount,
    invitationsError, 
    isFetchingInvitations, 
    refetchInvitations 
  } = useInvitationsData(params)
  
  const {
    successModal,
    isSendingInvitation,
    isCancellingInvitation,
    isDeletingInvitation,
    isDeactivatingFromInvitation,
    showSuccessModal,
    closeSuccessModal,
    handleSendInvitation,
    handleCancelInvitation,
    handleDeleteInvitation,
    handleDeactivateAdminFromInvitation,
    handleDeactivateAdmin,
  } = useInvitationsOperations()

  const {
    selectedItems,
    showBulkCancelModal,
    showBulkDeleteModal,
    isBulkCancelling,
    isBulkDeleting,
    handleSelectAll,
    handleSelectItem,
    handleBulkCancelRequest,
    handleBulkDeleteRequest,
    handleBulkCancelConfirm,
    handleBulkDeleteConfirm,
    handleBulkCancelCancel,
    handleBulkDeleteCancel,
  } = useBulkActions()

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Event handlers
  const handleSearchChange = (value) => {
    updateParam('search', value)
  }

  const handleSortChange = (value) => {
    updateParam('sort', value)
  }

  const handleShowEntriesChange = (value) => {
    const numValue = Number(value)
    updateParam('show', numValue)
    updateParam('page', 1) // Reset to first page
  }

  const handlePageChange = (page) => {
    updateParam('page', page)
  }

  // Wrapped handlers for bulk actions
  const handleBulkCancelConfirmWrapped = () => {
    handleBulkCancelConfirm(handleCancelInvitation, showSuccessModal, refetchInvitations)
  }

  const handleBulkDeleteConfirmWrapped = () => {
    handleBulkDeleteConfirm(handleDeleteInvitation, showSuccessModal, refetchInvitations)
  }

  // Loading and error states
  if (isFetchingInvitations) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.loading}>Loading invitations...</div>
      </div>
    )
  }

  if (invitationsError) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.error}>
          <h2>Error loading invitations</h2>
          <p>{invitationsError?.data?.error || invitationsError?.message || 'Failed to fetch data'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainArea}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Admin Management</h1>
      </div>

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchQuery={params.search}
        onSearchChange={handleSearchChange}
        sortBy={params.sort}
        onSortChange={handleSortChange}
        showCount={params.show}
        onShowCountChange={handleShowEntriesChange}
        totalCount={totalCount}
        filteredCount={filteredCount}
        onAddNew={() => setShowInviteModal(true)}
        isCreating={isSendingInvitation}
      />

      {/* Invitations Table */}
      <InvitationsTable
        invitations={paginatedInvitations}
        onCancel={(id) => handleCancelInvitation(id, refetchInvitations)}
        onDeactivate={(id) => handleDeactivateAdminFromInvitation(id, refetchInvitations)}
        onDelete={(id) => handleDeleteInvitation(id, refetchInvitations)}
        onBulkCancel={handleBulkCancelRequest}
        onBulkDelete={handleBulkDeleteRequest}
        selectedItems={selectedItems}
        onSelectAll={(e) => handleSelectAll(e, paginatedInvitations)}
        onSelectItem={handleSelectItem}
        isCancelling={isCancellingInvitation}
        isDeleting={isDeletingInvitation}
        isDeactivating={isDeactivatingFromInvitation}
        itemsPerPage={params.show}
      />

      {/* Pagination */}
      <PaginationControls
        currentPage={params.page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={filteredCount}
      />

      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
      />

      {/* Modals */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={(email) => handleSendInvitation(email, refetchInvitations)}
        isInviting={isSendingInvitation}
      />

      {/* Bulk Cancel Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkCancelModal}
        itemName={`${selectedItems.size} invitation${selectedItems.size > 1 ? 's' : ''}`}
        itemType="invitation"
        onConfirm={handleBulkCancelConfirmWrapped}
        onCancel={handleBulkCancelCancel}
        isDeleting={isBulkCancelling}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}`}
        itemType="admin account and invitation"
        actionType="delete"
        onConfirm={handleBulkDeleteConfirmWrapped}
        onCancel={handleBulkDeleteCancel}
        isDeleting={isBulkDeleting}
      />
    </div>
  )
}

export default ManageProfiles