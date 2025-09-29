"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styles from "./signup.module.css"
import { VerifyEmail, SignupForm, RegistrationSuccess, AuthLeftPanel, DynamicLogo } from "../components"

export default function SignupPage() {
  const [currentView, setCurrentView] = useState('signup') // 'signup', 'success', 'verification'
  const [registrationData, setRegistrationData] = useState(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  // If there's a token in the URL, show verification page
  if (token) {
    return (
      <div className={styles.container}>
        <AuthLeftPanel labelText="Sign Up" />
        <div className={styles.rightPane}>
          <div className={styles.contentContainer}>
            <VerifyEmail token={token} />
          </div>
        </div>
      </div>
    )
  }

  const handleRegistrationSuccess = (data) => {
    setRegistrationData(data)
    setCurrentView('success')
  }

  return (
    <div className={styles.container}>
      <AuthLeftPanel labelText="Sign Up" />
      <div className={styles.rightPane}>
        <div className={styles.logoWrapper}>
          <DynamicLogo width={80} height={80} alt="Logo" />
        </div>
        <div className={styles.contentContainer}>
          {currentView === 'signup' && (
            <SignupForm onRegistrationSuccess={handleRegistrationSuccess} />
          )}
          {currentView === 'success' && (
            <RegistrationSuccess registrationData={registrationData} />
          )}
        </div>
      </div>
    </div>
  )
}
