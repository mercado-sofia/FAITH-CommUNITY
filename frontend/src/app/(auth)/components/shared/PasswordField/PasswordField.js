"use client"

import { useState, useId } from "react"
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa"
import styles from "./PasswordField.module.css"

export default function PasswordField({
	id,
	name = "password",
	value,
	onChange,
	placeholder = "Enter your password",
	disabled = false,
	ariaLabel = "Password",
	className = "",
}) {
	const [show, setShow] = useState(false)
	const fallbackId = useId()
	const inputId = id || fallbackId
	return (
		<div className={styles.inputGroup}>
			<FaLock className={styles.icon} />
			<input
				id={inputId}
				name={name}
				type={show ? "text" : "password"}
				className={`${styles.input} ${className}`}
				placeholder={placeholder}
				aria-label={ariaLabel}
				autoComplete="off"
				value={value}
				onChange={onChange}
				disabled={disabled}
			/>
			<button
				type="button"
				className={styles.toggle}
				onClick={() => setShow((p) => !p)}
				aria-label={show ? "Hide password" : "Show password"}
				disabled={disabled}
			>
				{show ? <FaEyeSlash /> : <FaEye />}
			</button>
		</div>
	)
}
