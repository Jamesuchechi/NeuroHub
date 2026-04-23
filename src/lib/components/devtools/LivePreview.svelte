<script lang="ts">
	let { code, language = 'html' } = $props<{ code: string; language: string }>();

	// Construct the full HTML document
	let srcDoc = $derived.by(() => {
		if (!code) return '';
		if (language !== 'html' && language !== 'javascript') return '';

		const trimmedCode = code.trim();
		const isHtml =
			language === 'html' ||
			trimmedCode.startsWith('<!') ||
			trimmedCode.startsWith('<html') ||
			(trimmedCode.startsWith('<') && trimmedCode.includes('>'));

		// Extract assets for HTML mode
		const css = isHtml
			? [...code.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
			: '';

		const extractedJs = isHtml
			? [...code.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
			: code;

		// HTML is the code minus style/script tags
		const html = isHtml
			? code.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '')
			: '';

		// Basic sanitization: if JS starts with <, it's probably accidental HTML
		const js = extractedJs.trim().startsWith('<')
			? `console.error("Syntax Error: JS code appears to contain HTML tags.");`
			: extractedJs;

		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="https://cdn.tailwindcss.com"></scr${'ipt'}>
				<style>
					body { 
						margin: 0; 
						padding: 1rem; 
						font-family: ui-sans-serif, system-ui, sans-serif;
						background-color: transparent;
						color: inherit;
						min-height: 100vh;
					}
					${css}
				</style>
			</head>
			<body>
				${html}
				<script>
					// Error handling for the sandbox
					window.onerror = function(msg, url, line) {
						window.parent.postMessage({ type: 'error', msg, line }, '*');
						return false;
					};
					try {
						${js}
						//# sourceURL=sandbox.js
					} catch (err) {
						window.parent.postMessage({ type: 'error', msg: err.message }, '*');
					}
				</scr${'ipt'}>
			</body>
			</html>
		`;
	});
</script>

<div
	class="relative h-full w-full overflow-hidden rounded-md border border-stroke/30 bg-white shadow-inner dark:bg-zinc-950"
>
	<iframe
		title="Sandbox Live Preview"
		class="h-full w-full border-none"
		sandbox="allow-scripts allow-modals allow-popups"
		srcdoc={srcDoc}
	></iframe>
</div>
