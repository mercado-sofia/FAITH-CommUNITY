"use client"
import { useEffect, useState } from "react"
import styles from "../../login/login.module.css"
import QRCode from "qrcode"

export default function SuperadminMfaPage() {
  const [otpauth, setOtpauth] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [otp, setOtp] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [superadminId, setSuperadminId] = useState("")

  useEffect(() => {
    try {
      const sa = JSON.parse(localStorage.getItem('superAdminData') || '{}')
      setSuperadminId(sa?.id || "")
    } catch {}
  }, [])

  const handleSetup = async () => {
    setLoading(true)
    setMessage("")
    try {
      const token = localStorage.getItem('superAdminToken')
      const resp = await fetch(`http://localhost:8080/api/superadmin/auth/mfa/setup/${superadminId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Setup failed')
      setOtpauth(data.otpauth)
      const url = await QRCode.toDataURL(data.otpauth)
      setQrDataUrl(url)
      setMessage('Scan the QR with your authenticator, then enter the 6-digit code to verify.')
    } catch (e) {
      setMessage(e.message)
    }
    setLoading(false)
  }

  const handleVerify = async () => {
    setLoading(true)
    setMessage("")
    try {
      const token = localStorage.getItem('superAdminToken')
      const resp = await fetch(`http://localhost:8080/api/superadmin/auth/mfa/verify/${superadminId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Verification failed')
      setMessage('MFA enabled successfully.')
    } catch (e) {
      setMessage(e.message)
    }
    setLoading(false)
  }

  const handleDisable = async () => {
    setLoading(true)
    setMessage("")
    try {
      const token = localStorage.getItem('superAdminToken')
      const resp = await fetch(`http://localhost:8080/api/superadmin/auth/mfa/disable/${superadminId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Disable failed')
      setOtpauth("")
      setQrDataUrl("")
      setOtp("")
      setMessage('MFA disabled.')
    } catch (e) {
      setMessage(e.message)
    }
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <span className={styles.loginLabel}>Superadmin MFA</span>
      </div>
      <div className={styles.rightPane}>
        <div className={styles.form} style={{ paddingTop: 24 }}>
          <h2 className={styles.title}>Two-Factor Authentication</h2>
          <p>Protect your account with an authenticator app (TOTP).</p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
            <button className={styles.loginBtn} onClick={handleSetup} disabled={loading || !superadminId}>Setup</button>
            <button className={styles.loginBtn} onClick={handleDisable} disabled={loading || !superadminId} style={{ background: '#a33' }}>Disable</button>
          </div>
          {qrDataUrl && (
            <div style={{ marginTop: 16 }}>
              <img src={qrDataUrl} alt="MFA QR" style={{ width: 220, height: 220 }} />
              <p style={{ marginTop: 8, wordBreak: 'break-all' }}>{otpauth}</p>
              <div className={styles.inputGroup}>
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} placeholder="Enter 6-digit OTP" />
              </div>
              <button className={styles.loginBtn} onClick={handleVerify} disabled={loading || !otp}>Verify</button>
            </div>
          )}
          {message && <p className={styles.errorMessage} style={{ color: '#155' }}>{message}</p>}
        </div>
      </div>
    </div>
  )
}

