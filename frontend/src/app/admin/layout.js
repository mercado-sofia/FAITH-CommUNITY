"use client"

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { initializeAuth } from "../../rtk/superadmin/adminSlice"
import Sidebar from "./components/Sidebar"
import styles from "./styles/dashboard.module.css"

export default function AdminLayout({ children }) {
  const dispatch = useDispatch()

  useEffect(() => {
    // Initialize auth state when admin layout loads
    dispatch(initializeAuth())
  }, [dispatch]) // Only run once when layout mounts

  return (
    <>
      <Sidebar />
      <main className={styles.mainContent}>{children}</main>
    </>
  )
}
