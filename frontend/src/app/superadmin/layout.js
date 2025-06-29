"use client"

import Sidebar from "./components/Sidebar"
import styles from "./styles/dashboard.module.css"

export default function AdminLayout({ children }) {
  return (
    <>
      <Sidebar />
      <main className={styles.mainContent}>{children}</main>
    </>
  )
}
