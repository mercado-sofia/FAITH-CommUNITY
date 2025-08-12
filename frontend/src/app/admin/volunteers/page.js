'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import SearchAndFilterControls from './components/SearchAndFilterControls'
import VolunteerTable from './components/VolunteerTable'
import { useGetVolunteersByAdminOrgQuery, useUpdateVolunteerStatusMutation, useSoftDeleteVolunteerMutation } from '../../../rtk/admin/volunteersApi'
import { useGetProgramsByAdminOrgQuery } from '../../../rtk/admin/adminProgramsApi'
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../rtk/superadmin/adminSlice'
import styles from './volunteers.module.css'

export default function VolunteersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get current admin data from Redux store
  const currentAdmin = useSelector(selectCurrentAdmin)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Fetch volunteers from API using admin's organization
  const { 
    data: volunteersData = [], 
    isLoading, 
    error,
    refetch 
  } = useGetVolunteersByAdminOrgQuery(currentAdmin?.id, {
    skip: !isAuthenticated || !currentAdmin?.id,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  })

  // Fetch programs from API using admin's organization
  const { 
    data: programsData = [], 
    isLoading: programsLoading,
    error: programsError 
  } = useGetProgramsByAdminOrgQuery(currentAdmin?.org, {
    skip: !isAuthenticated || !currentAdmin?.org,
    refetchOnMountOrArgChange: true
  })

  // Extract unique programs from volunteers data as fallback
  const programsFromVolunteers = useMemo(() => {
    if (!volunteersData || volunteersData.length === 0) return []
    
    const uniquePrograms = [...new Set(volunteersData.map(volunteer => volunteer.program))]
      .filter(program => program && program.trim() !== '')
      .map((programName, index) => ({
        id: `volunteer-program-${index}`,
        title: programName,
        description: `Program: ${programName}`,
        category: 'Unknown',
        status: 'active'
      }))
    
    return uniquePrograms
  }, [volunteersData])

  // Use programs from API if available, otherwise use programs extracted from volunteers
  const availablePrograms = useMemo(() => {
    if (programsData && programsData.length > 0) {
      return programsData
    }
    // Fallback to programs extracted from volunteers data
    return programsFromVolunteers
  }, [programsData, programsFromVolunteers])
  
  const [updateVolunteerStatus] = useUpdateVolunteerStatusMutation()
  const [softDeleteVolunteer] = useSoftDeleteVolunteerMutation()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('filter') ? capitalizeFirstLetter(searchParams.get('filter')) : 'All status'
  )
  const [sortOrder, setSortOrder] = useState(
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest'
  )
  const [programFilter, setProgramFilter] = useState('All Programs')
  const [showCount, setShowCount] = useState(
    parseInt(searchParams.get('show')) || 10
  )

  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  useEffect(() => {
    const params = new URLSearchParams()

    if (statusFilter.toLowerCase() !== 'all status') {
      params.set('filter', statusFilter.toLowerCase())
    }

    if (sortOrder && sortOrder !== 'latest') {
      params.set('sort', sortOrder)
    }

    if (showCount && showCount !== 10) {
      params.set('show', showCount.toString())
    }

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, statusFilter, sortOrder, showCount])

  const filteredVolunteers = useMemo(() => {
    if (!volunteersData || volunteersData.length === 0) return []
    
    const filtered = volunteersData.filter((volunteer) => {
      const matchesSearch =
        volunteer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.program.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter.toLowerCase() === 'all status' ||
        volunteer.status.toLowerCase() === statusFilter.toLowerCase()

      const matchesProgram =
        programFilter === 'All Programs' || volunteer.program === programFilter

      return matchesSearch && matchesStatus && matchesProgram
    })

    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)      
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB
    })

    return sorted
  }, [volunteersData, searchQuery, statusFilter, programFilter, sortOrder])

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateVolunteerStatus({ id, status: newStatus }).unwrap()
      // Refetch data to get updated status
      refetch()
    } catch (error) {
      console.error('Failed to update volunteer status:', error)
      // You could add a toast notification here
    }
  }

  const handleSoftDelete = async (id, volunteerName) => {
    if (window.confirm(`Are you sure you want to delete ${volunteerName}? This action will hide the volunteer from the list but preserve their data.`)) {
      try {
        await softDeleteVolunteer(id).unwrap()
        // Force refetch data to remove deleted volunteer from list
        await refetch()
      } catch (error) {
        console.error('Failed to delete volunteer:', error)
        alert('Failed to delete volunteer. Please try again.')
      }
    }
  }

  // Handle authentication check
  if (!isAuthenticated || !currentAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'orange' }}>
          <p>Please log in to view volunteer applications.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Showing volunteers for {currentAdmin.orgName || currentAdmin.org}
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading volunteer applications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Showing volunteers for {currentAdmin.orgName || currentAdmin.org}
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>Error loading volunteer applications: {error.message}</p>
          <button onClick={refetch} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Volunteer Applications</h1>
      </div>

      <SearchAndFilterControls
        showCount={showCount}
        onShowCountChange={setShowCount}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        programs={availablePrograms}
        programsLoading={programsLoading}
      />

      <VolunteerTable
        volunteers={filteredVolunteers}
        onStatusUpdate={handleStatusUpdate}
        onSoftDelete={handleSoftDelete}
        itemsPerPage={showCount}
      />
    </div>
  )
}