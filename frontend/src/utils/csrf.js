export async function getCsrfToken() {
  if (typeof window === 'undefined') return null
  try {
    const resp = await fetch('http://localhost:8080/api/csrf-token', { credentials: 'include' })
    const data = await resp.json()
    window.__CSRF_TOKEN__ = data?.csrfToken || null
    return window.__CSRF_TOKEN__
  } catch {
    return null
  }
}

export async function fetchWithCsrf(input, init = {}) {
  const headers = new Headers(init.headers || {})
  const token = window.__CSRF_TOKEN__ || (await getCsrfToken())
  if (token) headers.set('x-csrf-token', token)
  return fetch(input, { ...init, headers, credentials: 'include' })
}
