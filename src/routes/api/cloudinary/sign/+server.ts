import { json, error } from '@sveltejs/kit';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '$lib/config';
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '$env/static/private';
import type { RequestHandler, RequestEvent } from './$types';

// Configure Cloudinary on the server
cloudinary.config({
	cloud_name: config.public.cloudinaryCloudName,
	api_key: CLOUDINARY_API_KEY,
	api_secret: CLOUDINARY_API_SECRET
});

export const POST: RequestHandler = async (event: RequestEvent) => {
	const { request, locals } = event;

	// Real authentication check using the new Supabase SSR hook
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized: You must be logged in to upload media');
	}

	try {
		const body = await request.json();
		const { paramsToSign } = body;

		if (!paramsToSign) {
			throw error(400, 'Missing paramsToSign');
		}

		// Generate signature
		const signature = cloudinary.utils.api_sign_request(paramsToSign, CLOUDINARY_API_SECRET);

		return json({
			signature,
			timestamp: paramsToSign.timestamp,
			apiKey: CLOUDINARY_API_KEY,
			cloudName: config.public.cloudinaryCloudName
		});
	} catch (err) {
		console.error('[Cloudinary Sign] Error:', err);
		throw error(500, 'Failed to generate signature');
	}
};
