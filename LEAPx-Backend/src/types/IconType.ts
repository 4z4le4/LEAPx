// Request Types
export interface CreateIconRequest {
    name: string
    url?: string
    description?: string
}

export interface UpdateIconRequest {
    id: number
    name?: string
    url?: string
    description?: string
}

export interface DeleteIconRequest {
    id: number
}

// Response Types
export interface IconResponse {
    id: number
    name: string
    url: string
    description: string | null
    createdAt: Date
    updatedAt: Date
}

export interface GetIconsParams {
    search?: string
    page?: number
    limit?: number
    sortBy?: 'name' | 'createdAt' | 'updatedAt'
    sortOrder?: 'asc' | 'desc'
}

// API Response wrapper
export interface ApiResponse<T> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

export interface PaginatedResponse<T> {
    success: boolean
    data: T[]
    pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}