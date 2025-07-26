'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FilterControls from './components/FilterControls'
import VolunteerTable from './components/VolunteerTable'
import applications from './data/mockData'
import styles from './volunteers.module.css'

export default function VolunteersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialFilter = searchParams.get('filter') || 'all status'

  const [searchQuery, setSearchQuery] = useState('') // kept for future use
  const [statusFilter, setStatusFilter] = useState(initialFilter)
  const [programFilter, setProgramFilter] = useState('All')
  const [volunteers, setVolunteers] = useState(applications)
  const [showCount, setShowCount] = useState(10)

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== 'all status') {
      params.set('filter', statusFilter.toLowerCase())
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [statusFilter, router]) 

  const filteredVolunteers = useMemo(() => {
    return volunteers
      .filter((volunteer) => {
        const matchesSearch =
          volunteer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          volunteer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          volunteer.program.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus =
          statusFilter === 'all status' ||
          volunteer.status.toLowerCase() === statusFilter.toLowerCase()

        const matchesProgram =
          programFilter === 'All' || volunteer.program === programFilter

        return matchesSearch && matchesStatus && matchesProgram
      })
      .slice(0, showCount)
  }, [volunteers, searchQuery, statusFilter, programFilter, showCount])

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

      <FilterControls
        showCount={showCount}
        onShowCountChange={setShowCount}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <VolunteerTable
        volunteers={filteredVolunteers}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  )
}