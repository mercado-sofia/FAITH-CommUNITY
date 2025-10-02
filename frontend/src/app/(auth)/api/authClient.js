export function getBaseUrl() {
	return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
}

export async function postJson(path, body, options = {}) {
	try {
		const res = await fetch(`${getBaseUrl()}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(options.headers || {}),
			},
			body: JSON.stringify(body),
			credentials: options.credentials || 'include',
			cache: 'no-store',
		})
		
		let data
		try {
			data = await res.json()
		} catch (e) {
			data = null
		}
		return { ok: res.ok, status: res.status, data }
	} catch (error) {
		return { ok: false, status: 0, data: null, error: error.message }
	}
}