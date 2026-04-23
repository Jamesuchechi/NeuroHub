<script lang="ts">
	import { fade } from 'svelte/transition';

	let { textarea = null as HTMLTextAreaElement | null, onFormat = (_content: string) => {} } =
		$props<{
			textarea: HTMLTextAreaElement | null;
			onFormat: (content: string) => void;
		}>();

	function applyFormat(prefix: string, suffix: string = prefix, isBlock = false) {
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selection = textarea.value.substring(start, end);
		const before = textarea.value.substring(0, start);
		const after = textarea.value.substring(end);

		let newContent: string;
		if (isBlock) {
			// Prefix each line for lists/quotes
			const lines = selection.split('\n');
			const formatted = lines.map((l: string) => prefix + l).join('\n');
			newContent = before + formatted + after;
		} else {
			newContent = before + prefix + selection + suffix + after;
		}

		onFormat(newContent);

		// Reset selection and focus
		setTimeout(() => {
			textarea.focus();
			if (selection.length > 0) {
				textarea.setSelectionRange(start + prefix.length, end + prefix.length);
			} else {
				textarea.setSelectionRange(start + prefix.length, start + prefix.length);
			}
		}, 0);
	}
</script>

<div class="flex items-center gap-1 border-b border-stroke pb-2" transition:fade>
	<button
		onclick={() => applyFormat('**')}
		class="flex h-7 w-7 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
		title="Bold (Ctrl+B)"
		aria-label="Bold"
	>
		<span class="font-bold">B</span>
	</button>
	<button
		onclick={() => applyFormat('_')}
		class="flex h-7 w-7 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
		title="Italic (Ctrl+I)"
		aria-label="Italic"
	>
		<span class="italic">I</span>
	</button>
	<button
		onclick={() => applyFormat('`')}
		class="flex h-7 w-7 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
		title="Inline Code"
		aria-label="Inline Code"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
			/>
		</svg>
	</button>
	<button
		onclick={() => applyFormat('[', '](url)')}
		class="flex h-7 w-7 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
		title="Link"
		aria-label="Link"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
			/>
		</svg>
	</button>
	<div class="mx-1 h-4 w-px bg-stroke"></div>
	<button
		onclick={() => applyFormat('- ', '', true)}
		class="flex h-7 w-7 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
		title="Bullet List"
		aria-label="Bullet List"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	</button>
	<button
		onclick={() => applyFormat('```\n', '\n```')}
		class="flex h-7 w-7 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
		title="Code Block"
		aria-label="Code Block"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
	</button>
</div>
