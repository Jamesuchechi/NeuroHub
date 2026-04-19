<script lang="ts">
	import DOMPurify from 'dompurify';

	/**
	 * SearchHighlight component
	 * Safely renders text with <mark> tags highlighted for search results.
	 * Expects <mark> tags provided by Postgres ts_headline.
	 * Sanitized via DOMPurify to prevent XSS attacks.
	 */
	let { text = '', class: className = '' } = $props<{
		text?: string;
		class?: string;
	}>();

	// Sanitize content to prevent XSS while preserving the <mark> tags from Postgres
	const sanitizedContent = $derived.by(() => {
		if (!text) return '';
		// Ensure we don't crash during SSR, sanitization will run on the client
		if (typeof window === 'undefined') return text;
		return DOMPurify.sanitize(text, {
			ALLOWED_TAGS: ['mark'],
			ALLOWED_ATTR: []
		});
	});
</script>

<div class="search-highlight leading-relaxed text-content-dim {className}">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html sanitizedContent}
</div>

<style>
	@reference "../../../routes/layout.css";

	:global(.search-highlight mark) {
		@apply rounded bg-brand-orange/20 px-0.5 font-semibold text-brand-orange;
		font-style: normal;
	}
</style>
