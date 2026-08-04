import type { ApiEnvelope } from '../types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1/admin'

let accessToken = ''
let refreshPromise: Promise<boolean> | null = null

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly status: number,
  ) {
    super(message)
  }
}

export function setAccessToken(token: string): void {
  accessToken = token
}

// parseEnvelope converts an HTTP response into the shared API envelope with a useful infrastructure error.
async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const content = await response.text()
  if (!content.trim()) {
    throw new ApiError(`后端服务无响应（HTTP ${response.status}），请确认 Fat Bird API 已启动`, 50300, response.status)
  }
  try {
    return JSON.parse(content) as ApiEnvelope<T>
  } catch {
    throw new ApiError(`后端返回了非 JSON 响应（HTTP ${response.status}）`, 50300, response.status)
  }
}

// fetchAPI performs one API request and normalizes network connection failures.
async function fetchAPI(path: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, options)
  } catch {
    throw new ApiError('无法连接 Fat Bird API，请确认后端已在 8080 端口启动', 50300, 0)
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetchAPI('/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return false
        const body = await parseEnvelope<{ accessToken: string }>(response)
        if (body.code !== 200) return false
        setAccessToken(body.data.accessToken)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await fetchAPI(path, {
    ...options,
    headers,
    credentials: 'include',
  })
  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return request<T>(path, options, false)
  }
  const body = await parseEnvelope<T>(response)
  if (!response.ok || body.code !== 200) {
    throw new ApiError(body.message || '请求失败', body.code, response.status)
  }
  return body.data
}
