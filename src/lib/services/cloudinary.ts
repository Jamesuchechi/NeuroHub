export interface CloudinaryUploadResponse {
	public_id: string;
	version: number;
	signature: string;
	width: number;
	height: number;
	format: string;
	resource_type: string;
	created_at: string;
	tags: string[];
	bytes: number;
	type: string;
	etag: string;
	placeholder: boolean;
	url: string;
	secure_url: string;
	original_filename: string;
}

/**
 * Service to handle client-side communication with Cloudinary.
 */
export const cloudinaryService = {
	/**
	 * Gets a signature from our server for a signed upload.
	 */
	async getSignature(paramsToSign: Record<string, string | number>) {
		const response = await fetch('/api/cloudinary/sign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ paramsToSign })
		});

		if (!response.ok) {
			throw new Error('Failed to get Cloudinary signature');
		}

		return response.json();
	},

	/**
	 * Uploads a file directly to Cloudinary using a signed request.
	 */
	async uploadFile(
		file: File | string,
		options: { folder?: string; tags?: string[] } = {}
	): Promise<CloudinaryUploadResponse> {
		const timestamp = Math.round(new Date().getTime() / 1000);

		const paramsToSign = {
			timestamp,
			folder: options.folder || 'neurohub',
			tags: options.tags?.join(',') || ''
		};

		// 1. Get signature from our server
		const { signature, apiKey, cloudName } = await this.getSignature(paramsToSign);

		// 2. Build form data for Cloudinary
		const formData = new FormData();
		formData.append('file', file);
		formData.append('api_key', apiKey);
		formData.append('timestamp', timestamp.toString());
		formData.append('signature', signature);
		formData.append('folder', paramsToSign.folder);
		formData.append('tags', paramsToSign.tags);

		// 3. Perform upload
		const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
			method: 'POST',
			body: formData
		});

		if (!uploadResponse.ok) {
			const errorData = await uploadResponse.json();
			throw new Error(errorData.error?.message || 'Cloudinary upload failed');
		}

		return uploadResponse.json();
	},

	/**
	 * Returns a Cloudinary URL with AI-driven optimizations and transformations.
	 * @param url The original Cloudinary secure_url
	 * @param options Transformation options
	 */
	getOptimizedUrl(
		url: string,
		options: { width?: number; height?: number; crop?: string; gravity?: string } = {}
	) {
		if (!url || !url.includes('cloudinary.com')) return url;

		const { width, height, crop = 'fill', gravity = 'auto' } = options;

		// Build transformation string
		// f_auto: auto format (webp/avif)
		// q_auto: auto quality
		let transforms = 'f_auto,q_auto';
		if (width) transforms += `,w_${width}`;
		if (height) transforms += `,h_${height}`;
		if (crop) transforms += `,c_${crop}`;
		if (gravity) transforms += `,g_${gravity}`;

		// Insert transformations into the URL
		// Typical URL: https://res.cloudinary.com/cloud_name/image/upload/v1/folder/image.jpg
		// Target: https://res.cloudinary.com/cloud_name/image/upload/[transforms]/v1/folder/image.jpg
		return url.replace('/upload/', `/upload/${transforms}/`);
	}
};
