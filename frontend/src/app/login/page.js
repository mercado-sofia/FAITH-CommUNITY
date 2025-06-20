'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'
import { FaUser, FaLock } from 'react-icons/fa'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showError, setShowError] = useState(false)
  const router = useRouter()

  const handleLogin = (e) => {
    e.preventDefault()

    if (email === 'superadmin@faith.com' && password === 'super123') {
      document.cookie = 'userRole=superadmin; path=/' 
      localStorage.setItem('token', 'superadmin')
      router.push('/superadmin')
    } else if (email === 'admin@faith.com' && password === 'admin123') {
      document.cookie = 'userRole=admin; path=/'
      localStorage.setItem('token', 'admin')
      router.push('/admin')
    } else {
      setShowError(true)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <span className={styles.loginLabel}>Log In</span>
      </div>
      <div className={styles.rightPane}>
        <div className={styles.logoWrapper}>
          <Image src="/logo/faith_community_logo.png" alt="Logo" width={80} height={80} />
        </div>
        <form onSubmit={handleLogin} className={styles.form}>
          <h2 className={styles.title}>Log In</h2>

          <p className={styles.label}>Email</p>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
              setEmail(e.target.value)
              setShowError(false)
            }}
              required
            />
          </div>

          <p className={styles.label}>Password</p>
          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
              setPassword(e.target.value)
              setShowError(false)
            }}
              required
            />
          </div>
          {showError && (
            <p className={styles.errorMessage}>The email or password you entered is incorrect.</p>
          )}
          <button type="submit" className={styles.loginBtn}>Log In</button>
        </form>
      </div>
    </div>
  )
}
