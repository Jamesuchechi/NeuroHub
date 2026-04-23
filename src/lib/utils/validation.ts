import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * Zod Schemas for consistent validation across server and client.
 */

// 1. Message Validation
export const MessageSchema = z.object({
	content: z
		.string()
		.min(1, 'Message cannot be empty')
		.max(2000, 'Message too long (max 2000 chars)'),
	channel_id: z.string().uuid().optional(),
	workspace_id: z.string().uuid().optional(),
	parent_id: z.string().uuid().optional().nullable(),
	attachments: z.array(z.any()).optional()
});

// 2. Note Validation
export const NoteSchema = z.object({
	title: z.string().min(1, 'Title is required').max(100, 'Title too long (max 100 chars)'),
	content: z.any(), // Tiptap JSON content
	status: z.enum(['draft', 'published']).optional(),
	tags: z.array(z.string()).max(10, 'Too many tags (max 10)').optional(),
	workspace_id: z.string().uuid().optional()
});

// 3. Snippet Validation
export const SnippetSchema = z.object({
	title: z.string().min(1, 'Title is required').max(100, 'Title too long (max 100 chars)'),
	code: z.string().min(1, 'Code cannot be empty').max(20000, 'Code too long (max 20,000 chars)'),
	language: z.string().max(50),
	description: z.string().max(500, 'Description too long').optional(),
	tags: z.array(z.string()).max(10, 'Too many tags (max 10)'),
	workspace_id: z.string().uuid()
});

// 4. File Validation
export const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/plain'
];

export const validateFile = (file: File) => {
	if (file.size > FILE_SIZE_LIMIT) {
		throw new Error(`File too large (max ${FILE_SIZE_LIMIT / 1024 / 1024}MB)`);
	}
	if (!ALLOWED_FILE_TYPES.includes(file.type)) {
		throw new Error(`Invalid file type: ${file.type}`);
	}
	return true;
};

/**
 * XSS Sanitization helper
 */
export const sanitizeHTML = (html: string): string => {
	if (typeof window !== 'undefined') {
		return DOMPurify.sanitize(html);
	}
	// Server-side sanitization requires JSDOM with DOMPurify
	// For now, if we are on server, we return as is or use a basic regex if JSDOM is not available
	// But in SvelteKit, we usually render on client or use a Node-compatible version
	return html;
};
