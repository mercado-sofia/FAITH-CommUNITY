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
		
		// Log request for debugging (but not sensitive data)
		if (process.env.NODE_ENV === 'development') {
			console.log('[postJson] Making request to:', url);
			console.log('[postJson] Method: POST, Has body:', !!body);
		}
		
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(options.headers || {}),
			},
			body: JSON.stringify(body),
			credentials: options.credentials || 'include', // CRITICAL: Include httpOnly cookies
			cache: 'no-store',
		})
		
		// Log response status for debugging
		if (process.env.NODE_ENV === 'development') {
			console.log('[postJson] Response status:', res.status, res.statusText);
			console.log('[postJson] Response headers:', Object.fromEntries(res.headers.entries()));
		}
		
		// Get response text first to handle both JSON and non-JSON responses
		let responseText = '';
		try {
			responseText = await res.text();
		} catch (textError) {
			if (process.env.NODE_ENV === 'development') {
				console.error('[postJson] Error reading response text:', textError);
			}
			responseText = '';
		}
		
		let data = null;
		
		// Try to parse as JSON
		if (responseText && responseText.trim()) {
			try {
				data = JSON.parse(responseText);
			} catch (e) {
				// Not valid JSON - use the text as error message
				if (process.env.NODE_ENV === 'development') {
					console.warn('[postJson] Response is not valid JSON:', responseText.substring(0, 200));
				}
				data = { error: responseText || 'Unknown error', rawResponse: responseText };
			}
		} else {
			// Empty response - create error object
			if (!res.ok) {
				data = { 
					error: `Request failed with status ${res.status}: ${res.statusText || 'Unknown error'}`,
					status: res.status,
					statusText: res.statusText
				};
			}
		}
		
		// Log error details for debugging
		if (!res.ok && process.env.NODE_ENV === 'development') {
			console.error('[postJson] Request failed:', {
				url,
				status: res.status,
				statusText: res.statusText,
				data: data || 'No response data',
				responseText: responseText ? responseText.substring(0, 500) : 'Empty response'
			});
		}
		
		return { ok: res.ok, status: res.status, data }
	} catch (error) {
		console.error('[postJson] Network error:', error);
		return { ok: false, status: 0, data: null, error: error.message }
	}
}