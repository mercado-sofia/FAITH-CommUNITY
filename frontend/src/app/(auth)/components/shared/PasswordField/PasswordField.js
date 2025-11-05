"use client"

import { useState, useId } from "react"
import { FaLock } from "react-icons/fa"
import { FiEye, FiEyeOff } from "react-icons/fi"
import styles from "./PasswordField.module.css"

export default function PasswordField({
	id,
	name = "password",
	value,
	onChange,
	onFocus,
	onBlur,
	placeholder = "Enter your password",
	disabled = false,
	ariaLabel = "Password",
	className = "",
	error = false,
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
				className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
				placeholder={placeholder}
				aria-label={ariaLabel}
				autoComplete="off"
				value={value}
				onChange={onChange}
				onFocus={onFocus}
				onBlur={onBlur}
				disabled={disabled}
			/>
			<button
				type="button"
				className={styles.toggle}
				onClick={() => setShow((p) => !p)}
				aria-label={show ? "Hide password" : "Show password"}
				disabled={disabled}
				tabIndex="-1"
			>
				{show ? <FiEyeOff /> : <FiEye />}
			</button>
		</div>
	)
}
