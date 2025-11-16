import { API_BASE_URL } from '@/config/api';

export function getBaseUrl() {
	// Use centralized API_BASE_URL which handles rewrites correctly
	return API_BASE_URL || '';
}

export async function postJson(path, body, options = {}) {
	try {
		// Use relative path if API_BASE_URL is empty (rewrites enabled)
		// Otherwise use full URL
		const baseUrl = getBaseUrl();
		const url = baseUrl ? `${baseUrl}${path}` : path;
		
		const res = await fetch(url, {
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