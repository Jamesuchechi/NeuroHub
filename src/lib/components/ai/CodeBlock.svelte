<script lang="ts">
	let { code, lang = '' } = $props<{ code: string; lang?: string }>();

	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Maps language identifiers to file extensions for downloads. */
	function getExtension(l: string): string {
		const map: Record<string, string> = {
			javascript: 'js',
			typescript: 'ts',
			python: 'py',
			rust: 'rs',
			go: 'go',
			java: 'java',
			csharp: 'cs',
			c: 'c',
			cpp: 'cpp',
			ruby: 'rb',
			php: 'php',
			swift: 'swift',
			kotlin: 'kt',
			sql: 'sql',
			html: 'html',
			css: 'css',
			scss: 'scss',
			json: 'json',
			yaml: 'yml',
			markdown: 'md',
			bash: 'sh',
			shell: 'sh',
			sh: 'sh',
			dockerfile: 'Dockerfile',
			svelte: 'svelte',
			vue: 'vue'
		};
		return map[l.toLowerCase()] ?? l ?? 'txt';
	}

	/** Displays the badge label for a given lang identifier. */
	function getLangLabel(l: string): string {
		const labels: Record<string, string> = {
			javascript: 'JavaScript',
			typescript: 'TypeScript',
			python: 'Python',
			rust: 'Rust',
			go: 'Go',
			svelte: 'Svelte',
			sql: 'SQL',
			html: 'HTML',
			css: 'CSS',
			bash: 'Bash',
			sh: 'Shell',
			json: 'JSON',
			yaml: 'YAML',
			markdown: 'Markdown'
		};
		return labels[l.toLowerCase()] ?? (l ? l.toUpperCase() : '');
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			if (copyTimeout) clearTimeout(copyTimeout);
			copied = true;
			copyTimeout = setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// Clipboard not available (e.g. non-secure context) — silently ignore
		}
	}

	function download() {
		const ext = getExtension(lang);
		const filename = lang === 'dockerfile' ? 'Dockerfile' : `neuro-snippet.${ext}`;
		const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="code-block group relative my-4 overflow-hidden rounded-xl">
	<!-- Header bar -->
	<div class="code-header flex items-center justify-between px-4 py-2">
		<span class="code-lang-badge">
			{#if lang}
				<span class="code-lang-dot"></span>
				{getLangLabel(lang)}
			{:else}
				Code
			{/if}
		</span>

		<div class="flex items-center gap-1.5">
			<!-- Copy button -->
			<button
				onclick={copy}
				class="code-action-btn {copied ? 'code-action-btn-copied' : ''}"
				title={copied ? 'Copied!' : 'Copy to clipboard'}
				aria-label="Copy code"
			>
				{#if copied}
					<!-- Check icon -->
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M5 13l4 4L19 7"
						/>
					</svg>
					<span>Copied!</span>
				{:else}
					<!-- Copy icon -->
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
					<span>Copy</span>
				{/if}
			</button>

			<!-- Download button -->
			<button
				onclick={download}
				class="code-action-btn"
				title="Download as file"
				aria-label="Download code as file"
			>
				<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				<span>Download</span>
			</button>
		</div>
	</div>

	<!-- Code body -->
	<div class="code-body overflow-x-auto px-4 pt-0 pb-4">
		<pre class="code-pre"><code class="code-content">{code}</code></pre>
	</div>
</div>

<style>
	.code-block {
		background: #0d0d0d;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.code-header {
		background: rgba(255, 255, 255, 0.04);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.code-lang-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.4);
	}

	.code-lang-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #f97316;
		box-shadow: 0 0 6px rgba(249, 115, 22, 0.6);
	}

	.code-action-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		background: transparent;
		border: 1px solid transparent;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.code-action-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.code-action-btn-copied {
		color: #4ade80 !important;
		background: rgba(74, 222, 128, 0.08) !important;
		border-color: rgba(74, 222, 128, 0.2) !important;
	}

	.code-body {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
	}

	.code-pre {
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
	}

	.code-content {
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.65;
		color: #e4e4e7;
		white-space: pre;
		tab-size: 2;
	}

	/* Light theme override — matches safe-markdown wrapper theme */
	:global(:root:not(.dark)) .code-block {
		background: #1a1a1a;
		border-color: rgba(0, 0, 0, 0.15);
	}
</style>
