'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchAndFilterControls from './components/SearchAndFilterControls'
import VolunteerTable from './components/VolunteerTable'
import applications from './data/mockData'
import styles from './volunteers.module.css'

export default function VolunteersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('filter') ? capitalizeFirstLetter(searchParams.get('filter')) : 'All status'
  )
  const [sortOrder, setSortOrder] = useState(
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest'
  )
  const [programFilter, setProgramFilter] = useState('All Programs')
  const [volunteers, setVolunteers] = useState(applications)
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
    const filtered = volunteers.filter((volunteer) => {
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
  }, [volunteers, searchQuery, statusFilter, programFilter, sortOrder])

  const handleStatusUpdate = (id, newStatus) => {
    setVolunteers((prev) =>
      prev.map((volunteer) =>
        volunteer.id === id ? { ...volunteer, status: newStatus } : volunteer
      )
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
      />

      <VolunteerTable
        volunteers={filteredVolunteers}
        onStatusUpdate={handleStatusUpdate}
        itemsPerPage={showCount}
      />
    </div>
  )
}