import { useAuthStore } from '../stores/authStore'

const API_URL = '/api'

interface RequestOptions extends RequestInit {
    skipAuth?: boolean
}

class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { skipAuth, ...fetchOptions } = options
    const token = useAuthStore.getState().token

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (!skipAuth && token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
    })

    if (!response.ok) {
        const data = await response.json().catch(() => ({}))

        // Handle 401 by logging out
        if (response.status === 401) {
            useAuthStore.getState().logout()
        }

        throw new ApiError(
            data.message || `Request failed with status ${response.status}`,
            response.status,
            data
        )
    }

    // Handle empty responses
    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
}

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        request<{ user: any; accessToken: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        }),

    register: (email: string, password: string, name: string) =>
        request<{ user: any; accessToken: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
            skipAuth: true,
        }),

    getProfile: () => request<any>('/auth/profile'),
}

// Guides API
export const guidesApi = {
    getAll: () => request<any[]>('/guides'),

    getById: (id: string) => request<any>(`/guides/${id}`),

    getByShareId: (shareId: string) =>
        request<any>(`/guides/share/${shareId}`, { skipAuth: true }),

    create: (data: { title: string; description?: string; isPublic?: boolean }) =>
        request<any>('/guides', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<{ title: string; description: string; isPublic: boolean; status: string }>) =>
        request<any>(`/guides/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<void>(`/guides/${id}`, { method: 'DELETE' }),

    // Steps
    addStep: (guideId: string, stepData: any) =>
        request<any>(`/guides/${guideId}/steps`, {
            method: 'POST',
            body: JSON.stringify(stepData),
        }),

    updateStep: (guideId: string, stepId: string, data: any) =>
        request<any>(`/guides/${guideId}/steps/${stepId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteStep: (guideId: string, stepId: string) =>
        request<any>(`/guides/${guideId}/steps/${stepId}`, {
            method: 'DELETE',
        }),

    reorderSteps: (guideId: string, stepIds: string[]) =>
        request<any>(`/guides/${guideId}/steps/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ stepIds }),
        }),

    // Export
    exportHtml: (guideId: string) =>
        fetch(`${API_URL}/guides/${guideId}/export/html`, {
            headers: {
                Authorization: `Bearer ${useAuthStore.getState().token}`,
            },
        }).then((res) => res.text()),
}

export { ApiError }
