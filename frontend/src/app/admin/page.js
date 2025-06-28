"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import { initializeAuth, selectIsAuthenticated, selectCurrentAdmin } from "../../rtk/superadmin/adminSlice"
import Link from "next/link"
import styles from "./styles/dashboard.module.css"

export default function AdminDashboard() {
  const router = useRouter()
  const dispatch = useDispatch()
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const currentAdmin = useSelector(selectCurrentAdmin)

  useEffect(() => {
    console.log("🔍 Admin Dashboard - Checking authentication")

    // Initialize auth from localStorage
    dispatch(initializeAuth())

    // Check for admin authentication
    const adminToken = localStorage.getItem("adminToken")
    const adminData = localStorage.getItem("adminData")
    const userRole = document.cookie.includes("userRole=admin")

    console.log("🔍 Auth Check:", {
      adminToken: adminToken ? "Present" : "Missing",
      adminData: adminData ? "Present" : "Missing",
      userRole: userRole,
    })

    if (!adminToken || !adminData || !userRole) {
      console.log("❌ Admin authentication failed - redirecting to login")
      router.push("/login")
    } else {
      console.log("✅ Admin authentication successful")
      setIsAuthChecked(true)
    }
  }, [dispatch, router]) // Removed isAuthenticated and currentAdmin from dependencies

  if (!isAuthChecked) {
    return (
      <div className={styles.mainArea}>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Placeholder numbers
  const programCount = 8
  const eventCount = 3
  const volunteerCount = 15

  return (
    <div className={styles.mainArea}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Welcome back, {currentAdmin?.org_name || "Admin"}!</h1>
        <p>{"Manage your organization's content easily from this dashboard."}</p>
        {currentAdmin && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
            Logged in as: {currentAdmin.email}
          </div>
        )}
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
