import shared from './AuthLeftPanel.module.css'

export default function AuthLeftPanel({ labelText }) {
	return (
		<div className={shared.leftPane}>
			<span className={shared.label}>{labelText}</span>
		</div>
	)
}
