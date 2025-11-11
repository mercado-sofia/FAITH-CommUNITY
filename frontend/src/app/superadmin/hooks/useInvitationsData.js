import { useMemo, useCallback } from 'react'
import { useGetAllInvitationsQuery } from '../../../rtk/superadmin/invitationsApi'

/**
 * Custom hook for managing invitations data with filtering and pagination
 * Handles data fetching, filtering, sorting, and pagination logic
 */
export const useInvitationsData = (params) => {
  const { data: invitations = [], error: invitationsError, isLoading: isFetchingInvitations, refetch: refetchInvitations } = useGetAllInvitationsQuery()

  // Filter and search functionality
  const filteredInvitations = useMemo(() => {
    let filtered = [...invitations]

    // Search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filtered = filtered.filter(invitation => 
        invitation.email.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (params.sort) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    return filtered
  }, [invitations, params.search, params.sort])

  // Pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredInvitations.length / params.show)
    const startIndex = (params.page - 1) * params.show
    const endIndex = startIndex + params.show
    const paginatedInvitations = filteredInvitations.slice(startIndex, endIndex)

    return {
      totalPages,
      startIndex,
      endIndex,
      paginatedInvitations,
      totalCount: invitations.length,
      filteredCount: filteredInvitations.length
    }
  }, [filteredInvitations, params.show, params.page, invitations.length])

  // Statistics
  const statistics = useMemo(() => {
    const totalCount = invitations.length
    const activeCount = invitations.filter(inv => inv.status === 'ACTIVE').length
    const pendingCount = invitations.filter(inv => inv.status === 'PENDING').length
    const cancelledCount = invitations.filter(inv => inv.status === 'CANCELLED').length

    return {
      totalCount,
      activeCount,
      pendingCount,
      cancelledCount
    }
  }, [invitations])

  return {
    // Data
    invitations,
    filteredInvitations,
    ...paginationData,
    statistics,
    
    // State
    invitationsError,
    isFetchingInvitations,
    
    // Actions
    refetchInvitations,
  }
}
