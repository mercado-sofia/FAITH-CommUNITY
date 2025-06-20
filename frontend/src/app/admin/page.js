'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './styles/dashboard.module.css'

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || token !== 'admin') {
      router.push('/login')
    } else {
      setIsAuthChecked(true)
    }
  }, [])

  if (!isAuthChecked) return null 

  // Placeholder numbers
  const programCount = 8
  const eventCount = 3
  const volunteerCount = 15

  return (
    <div className={styles.mainArea}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Welcome back, Org Admin!</h1>
        <p>Manage your organization’s content easily from this dashboard.</p>
      </div>

      {/* Cards */}
      <div className={styles.cardRow}>
        <Link href="/admin/programs" className={styles.linkCard}>
          <div className={`${styles.card} ${styles.programCard}`}>
            <h3>Programs</h3>
            <p>{programCount} active programs</p>
          </div>
        </Link>

        <Link href="/admin/events" className={styles.linkCard}>
          <div className={styles.card}>
            <h3>Events</h3>
            <p>{eventCount} upcoming events</p>
          </div>
        </Link>

        <Link href="/admin/members" className={styles.linkCard}>
          <div className={styles.card}>
            <h3>Volunteers</h3>
            <p>{volunteerCount} registered volunteers</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className={styles.section}>
        <h2>Recent Activities</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeader}>Action</th>
                <th className={styles.tableHeader}>Date</th>
                <th className={styles.tableHeader}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.tableData}>Updated program: Literacy Drive</td>
                <td className={styles.tableData}>May 3, 2025</td>
                <td className={styles.tableData}>
                  <span className={styles.badge}>Completed</span>
                </td>
              </tr>
              <tr>
                <td className={styles.tableData}>Added new event: Clean-Up Day</td>
                <td className={styles.tableData}>May 2, 2025</td>
                <td className={styles.tableData}>
                  <span className={styles.badgePending}>Pending</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}