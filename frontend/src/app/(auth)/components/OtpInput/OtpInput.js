"use client"

import { FaLock } from "react-icons/fa"
import styles from "./OtpInput.module.css"

export default function OtpInput({ value, onChange, disabled }) {
	return (
		<div className={styles.inputGroup}>
			<FaLock className={styles.icon} />
			<input
				id="otp"
				type="text"
				inputMode="numeric"
				pattern="[0-9]*"
				maxLength={6}
				placeholder="Enter 6-digit OTP"
				aria-label="One-time password"
				autoComplete="off"
				value={value}
				onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
				disabled={disabled}
			/>
		</div>
	)
}
