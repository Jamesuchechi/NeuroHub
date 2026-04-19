/**
 * Token types for our safe markdown renderer.
 */
export type MarkdownToken =
	| { type: 'paragraph'; children: InlineToken[] }
	| { type: 'list'; items: InlineToken[][] }
	| { type: 'code-block'; content: string };

export type InlineToken =
	| { type: 'text'; content: string }
	| { type: 'bold'; content: string }
	| { type: 'code'; content: string };

/**
 * Parses a markdown string into a structured array of safe tokens.
 * Handles bold, inline code, code blocks, and simple lists.
 */
export function parseMarkdown(md: string): MarkdownToken[] {
	if (!md) return [];

	const blocks: MarkdownToken[] = [];
	// Split by double newlines for paragraphs/blocks
	const rawBlocks = md.split(/\n\n+/);

	for (const block of rawBlocks) {
		const trimmedBlock = block.trim();
		if (!trimmedBlock) continue;

		// 1. Handle Code Blocks
		const codeBlockMatch = trimmedBlock.match(/^```([\s\S]*?)```$/);
		if (codeBlockMatch) {
			blocks.push({ type: 'code-block', content: codeBlockMatch[1] });
			continue;
		}

		// 2. Handle Lists
		const lines = trimmedBlock.split('\n');
		const isList = lines.every((line) => line.trim().match(/^[-*•]|\d+\.\s/));

		if (isList) {
			const items = lines.map((line) => {
				const content = line.replace(/^(\s*([-*•]|\d+\.)\s+)/, '');
				return parseInline(content);
			});
			blocks.push({ type: 'list', items });
			continue;
		}

		// 3. Handle Paragraphs (default)
		// If a block contains multiple lines but aren't a list, we treat it as one paragraph
		// but join with spaces unless they are meant to be separate.
		blocks.push({ type: 'paragraph', children: parseInline(trimmedBlock.replace(/\n/g, ' ')) });
	}

	return blocks;
}

/**
 * Parses inline content for bold and code tags.
 */
function parseInline(text: string): InlineToken[] {
	const tokens: InlineToken[] = [];
	// Regex for bold (** or __) and inline code (`)
	const regex = /(\*\*(.*?)\*\*|__(.*?)__|`(.*?)`)/g;

	let lastIndex = 0;
	let match;

	while ((match = regex.exec(text)) !== null) {
		// Add preceding text
		if (match.index > lastIndex) {
			tokens.push({ type: 'text', content: text.substring(lastIndex, match.index) });
		}

		if (match[2] || match[3]) {
			tokens.push({ type: 'bold', content: match[2] || match[3] });
		} else if (match[4]) {
			tokens.push({ type: 'code', content: match[4] });
		}

		lastIndex = regex.lastIndex;
	}

	// Add remaining text
	if (lastIndex < text.length) {
		tokens.push({ type: 'text', content: text.substring(lastIndex) });
	}

	return tokens;
}
