'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiLogOut } from 'react-icons/fi'

export default function UserLogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Get user token
        const userToken = localStorage.getItem('userToken')
        
        if (userToken) {
          // Call logout API
          const response = await fetch('http://localhost:8080/api/users/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            console.warn('Logout API call failed, but continuing with client-side logout')
          }
        }

        // Clear all user-related data
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
        localStorage.removeItem('token')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userName')

        // Clear cookies
        document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"

        // Redirect to home page
        router.push('/')
      } catch (error) {
        console.error('Logout error:', error)
        setError('An error occurred during logout')
      } finally {
        setIsLoggingOut(false)
      }
    }

    performLogout()
  }, [router])

  if (isLoggingOut) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <FiLogOut size={48} style={{ marginBottom: '20px', color: '#666' }} />
        <h2>Logging out...</h2>
        <p>Please wait while we log you out.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h2>Logout Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Go to Home
        </button>
      </div>
    )
  }

  return null
}
