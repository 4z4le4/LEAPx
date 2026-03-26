import { v2 as cloudinary } from 'cloudinary'
import prisma from '@/lib/prisma'
import { CloudinaryUploadResponse } from '@/types/CloudinaryTypes'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadOptions {
    folder?: string
    tags?: string[]
    transformation?: Record<string, unknown>
    uploadedBy?: number
    publicId?: string 
}

/**
 * Upload image to Cloudinary and save to database
 */
export async function uploadImage(
    file: File | Buffer | string,
    options: UploadOptions = {}
): Promise<{
    cloudinaryImage: {
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
    cloudinary: CloudinaryUploadResponse
}> {
  // Convert File to base64 if needed
    let uploadSource: string | Buffer
    let originalFilename: string | undefined

    if (file instanceof File) {
        const buffer = await file.arrayBuffer()
        uploadSource = Buffer.from(buffer)
        originalFilename = file.name
    } else {
        uploadSource = file
    }

    // Upload to Cloudinary
    const uploadOptions: Record<string, unknown> = {
        folder: options.folder || 'leap',
        resource_type: 'image',
    }

    if (options.publicId) {
        uploadOptions.public_id = options.publicId
    }

    if (options.tags && options.tags.length > 0) {
        uploadOptions.tags = options.tags
    }

    if (options.transformation) {
        uploadOptions.transformation = options.transformation
    }

    const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
            if (error) reject(error)
            else if (result) resolve(result as CloudinaryUploadResponse)
            else reject(new Error('Upload failed'))
        }
        )

        if (Buffer.isBuffer(uploadSource)) {
        uploadStream.end(uploadSource)
        } else {
        uploadStream.end(uploadSource)
        }
    })

    // Save to database
    const cloudinaryImage = await prisma.cloudinaryImage.create({
        data: {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        folder: result.folder,
        resourceType: result.resource_type,
        originalFilename: originalFilename || result.original_filename,
        uploadedBy: options.uploadedBy,
        tags: result.tags || [],
        },
    })

    return {
        cloudinaryImage,
        cloudinary: result,
    }
}

/**
 * Delete image from Cloudinary and database
 */
export async function deleteImage(publicId: string): Promise<void> {
  // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId)

    // Delete from database
    await prisma.cloudinaryImage.delete({
        where: { publicId },
    })
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedUrl(
    publicId: string,
    options: {
        width?: number
        height?: number
        crop?: string
        quality?: string | number
        format?: string
    } = {}
    ): string {
    return cloudinary.url(publicId, {
        transformation: [
        {
            width: options.width,
            height: options.height,
            crop: options.crop || 'fill',
            quality: options.quality || 'auto',
            fetch_format: options.format || 'auto',
        },
        ],
    })
}

export default cloudinary