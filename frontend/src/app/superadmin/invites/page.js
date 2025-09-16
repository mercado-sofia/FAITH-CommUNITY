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
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import ConfirmationModal from "../components/ConfirmationModal"
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
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Showing {startIndex + 1} to {Math.min(endIndex, filteredCount)} of {filteredCount} invitations
        </div>
        <div className={styles.paginationControls}>
          {/* First Page Button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={params.page === 1}
            className={styles.navButton}
            aria-label="Go to first page"
            title="First page"
          >
            <RiArrowLeftDoubleFill size={16}/>
          </button>
          
          {/* Previous Page Button */}
          <button
            onClick={() => handlePageChange(params.page - 1)}
            disabled={params.page === 1}
            className={styles.navButton}
            aria-label="Go to previous page"
            title="Previous page"
          >
            <RiArrowLeftSLine size={16}/>
          </button>
          
          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`${styles.paginationButton} ${params.page === page ? 'active' : ''}`}
              aria-label={`Go to page ${page}`}
              aria-current={params.page === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
          
          {/* Next Page Button */}
          <button
            onClick={() => handlePageChange(params.page + 1)}
            disabled={params.page === totalPages}
            className={styles.navButton}
            aria-label="Go to next page"
            title="Next page"
          >
            <RiArrowRightSLine size={16}/>
          </button>
          
          {/* Last Page Button */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={params.page === totalPages}
            className={styles.navButton}
            aria-label="Go to last page"
            title="Last page"
          >
            <RiArrowRightDoubleFill size={16}/>
          </button>
        </div>
      </div>

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
      <ConfirmationModal
        isOpen={showBulkCancelModal}
        itemName={`${selectedItems.size} invitation${selectedItems.size > 1 ? 's' : ''}`}
        itemType="invitation"
        actionType="cancel"
        onConfirm={handleBulkCancelConfirmWrapped}
        onCancel={handleBulkCancelCancel}
        isDeleting={isBulkCancelling}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}`}
        itemType="admin account and invitation data"
        actionType="delete"
        onConfirm={handleBulkDeleteConfirmWrapped}
        onCancel={handleBulkDeleteCancel}
        isDeleting={isBulkDeleting}
      />
    </div>
  )
}

export default ManageProfiles