"use client"

import { useState, useMemo } from "react"
import SearchAndFilter from "./components/SearchAndFilter"
import VolunteerTable from "./components/VolunteerTable"
import applications from "./data/mockData"
import styles from "./volunteers.module.css"

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState(applications)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [programFilter, setProgramFilter] = useState("All")

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((volunteer) => {
      const matchesSearch =
        volunteer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.program.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "All" || volunteer.status === statusFilter
      const matchesProgram = programFilter === "All" || volunteer.program === programFilter

      return matchesSearch && matchesStatus && matchesProgram
    })
  }, [volunteers, searchQuery, statusFilter, programFilter])

  const handleStatusUpdate = (id, newStatus) => {
    setVolunteers((prev) =>
      prev.map((volunteer) => (volunteer.id === id ? { ...volunteer, status: newStatus } : volunteer)),
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Volunteer Applications</h1>
      </div>

      <SearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
      />

      <VolunteerTable volunteers={filteredVolunteers} onStatusUpdate={handleStatusUpdate} />
    </div>
  )
}