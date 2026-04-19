/**
 * Token types for our safe markdown renderer.
 */
export type MarkdownToken =
	| { type: 'paragraph'; children: InlineToken[] }
	| { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineToken[] }
	| { type: 'list'; items: InlineToken[][]; ordered: boolean }
	| { type: 'code-block'; content: string; lang: string }
	| { type: 'blockquote'; children: InlineToken[] }
	| { type: 'hr' };

export type InlineToken =
	| { type: 'text'; content: string }
	| { type: 'bold'; content: string }
	| { type: 'italic'; content: string }
	| { type: 'code'; content: string };

/**
 * Parses a markdown string into a structured array of safe tokens.
 * Handles headers, bold, italics, inline code, code blocks, lists, and blockquotes.
 */
export function parseMarkdown(md: string): MarkdownToken[] {
	if (!md) return [];

	const blocks: MarkdownToken[] = [];
	const lines = md.split('\n');
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmedLine = line.trim();

		if (!trimmedLine) {
			i++;
			continue;
		}

		// 1. Handle Code Blocks
		if (trimmedLine.startsWith('```')) {
			const lang = trimmedLine.slice(3).trim();
			let content = '';
			i++;
			while (i < lines.length && !lines[i].trim().startsWith('```')) {
				content += lines[i] + '\n';
				i++;
			}
			blocks.push({ type: 'code-block', content: content.trim(), lang });
			i++;
			continue;
		}

		// 2. Handle Horizontal Rules
		if (trimmedLine.match(/^(?:---|\*\*\*|___)$/)) {
			blocks.push({ type: 'hr' });
			i++;
			continue;
		}

		// 3. Handle Blockquotes
		if (trimmedLine.startsWith('>')) {
			let content = trimmedLine.replace(/^>\s?/, '');
			i++;
			while (i < lines.length && lines[i].trim().startsWith('>')) {
				content += ' ' + lines[i].trim().replace(/^>\s?/, '');
				i++;
			}
			blocks.push({ type: 'blockquote', children: parseInline(content) });
			continue;
		}

		// 4. Handle Headings
		const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
		if (headingMatch) {
			const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
			blocks.push({ type: 'heading', level, children: parseInline(headingMatch[2]) });
			i++;
			continue;
		}

		// 5. Handle Lists
		const unorderedMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
		const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);

		if (unorderedMatch || orderedMatch) {
			const isOrdered = !!orderedMatch;
			const items: InlineToken[][] = [];

			while (i < lines.length) {
				const currentLine = lines[i].trim();
				const itemMatch = isOrdered
					? currentLine.match(/^\d+\.\s+(.+)$/)
					: currentLine.match(/^[-*•]\s+(.+)$/);

				if (!itemMatch) break;

				items.push(parseInline(itemMatch[1]));
				i++;
			}
			blocks.push({ type: 'list', items, ordered: isOrdered });
			continue;
		}

		// 6. Handle Paragraphs (slurp subsequent non-special lines)
		let paragraphContent = trimmedLine;
		i++;
		while (i < lines.length) {
			const nextLine = lines[i].trim();
			if (
				!nextLine ||
				nextLine.startsWith('```') ||
				nextLine.match(/^(?:---|\*\*\*|___)$/) ||
				nextLine.startsWith('>') ||
				nextLine.match(/^#{1,6}\s+/) ||
				nextLine.match(/^[-*•]\s+/) ||
				nextLine.match(/^\d+\.\s+/)
			) {
				break;
			}
			paragraphContent += ' ' + nextLine;
			i++;
		}
		blocks.push({ type: 'paragraph', children: parseInline(paragraphContent) });
	}

	return blocks;
}

/**
 * Parses inline content for bold, italics, and code tags.
 */
function parseInline(text: string): InlineToken[] {
	const tokens: InlineToken[] = [];
	// Regex for bold (**), italics (* or _), and inline code (`)
	// Order matters: bold before italics
	const regex = /(\*\*(.*?)\*\*|__(.*?)__|(\*|_)(.*?)\4|`(.*?)`)/g;

	let lastIndex = 0;
	let match;

	while ((match = regex.exec(text)) !== null) {
		// Add preceding text
		if (match.index > lastIndex) {
			tokens.push({ type: 'text', content: text.substring(lastIndex, match.index) });
		}

		if (match[2] || match[3]) {
			// Bold
			tokens.push({ type: 'bold', content: match[2] || match[3] });
		} else if (match[5]) {
			// Italic
			tokens.push({ type: 'italic', content: match[5] });
		} else if (match[6]) {
			// Inline Code
			tokens.push({ type: 'code', content: match[6] });
		}

		lastIndex = regex.lastIndex;
	}

	// Add remaining text
	if (lastIndex < text.length) {
		tokens.push({ type: 'text', content: text.substring(lastIndex) });
	}

	return tokens;
}
