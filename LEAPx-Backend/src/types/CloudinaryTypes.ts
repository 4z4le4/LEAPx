export interface CloudinaryUploadResponse {
    public_id: string
    version: number
    signature: string
    width: number
    height: number
    format: string
    resource_type: string
    created_at: string
    tags: string[]
    bytes: number
    type: string
    url: string
    secure_url: string
    folder?: string
    original_filename?: string
}

export interface CloudinaryImageRecord {
    id: number
    publicId: string
    url: string
    secureUrl: string
    format: string | null
    width: number | null
    height: number | null
    bytes: number | null
    folder: string | null
    resourceType: string
    originalFilename: string | null
    uploadedBy: number | null
    tags: string[]
    createdAt: Date
    updatedAt: Date
    }

export interface UploadImageRequest {
    folder?: string
    tags?: string[]
    uploadedBy?: number
}

export interface DeleteImageRequest {
    publicId: string
}

export interface AddEventBannerRequest {
    event_id: number
    cloudinaryImage_id: number
    caption_TH?: string
    caption_EN?: string
    isMain?: boolean
    sortOrder?: number
}

export interface UpdateEventBannerRequest {
    id: number
    caption_TH?: string
    caption_EN?: string
    isMain?: boolean
    sortOrder?: number
    isActive?: boolean
}

export interface SetEventLogoRequest {
    event_id: number
    cloudinaryImage_id: number
}

export interface AddEventPhotoRequest {
    event_id: number
    cloudinaryImage_id: number
    caption_TH?: string
    caption_EN?: string
    isMain?: boolean
    sortOrder?: number
}

export interface UpdateEventPhotoRequest {
    id: number
    caption_TH?: string
    caption_EN?: string
    isMain?: boolean
    sortOrder?: number
}

export interface UploadImageResponse {
    success: boolean
    data?: {
        cloudinaryImage: CloudinaryImageRecord
        cloudinary: CloudinaryUploadResponse
    }
    error?: string
}

export interface EventBannerResponse {
    id: number
    event_id: number
    cloudinaryImage_id: number
    caption_TH: string | null
    caption_EN: string | null
    isMain: boolean
    sortOrder: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    cloudinaryImage: CloudinaryImageRecord
}

export interface EventLogoResponse {
    id: number
    event_id: number
    cloudinaryImage_id: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    cloudinaryImage: CloudinaryImageRecord
}

export interface EventPhotoResponse {
    id: number
    event_id: number
    cloudinaryImage_id: number
    caption_TH: string | null
    caption_EN: string | null
    isMain: boolean
    sortOrder: number
    createdAt: Date
    updatedAt: Date
    cloudinaryImage: CloudinaryImageRecord
}

