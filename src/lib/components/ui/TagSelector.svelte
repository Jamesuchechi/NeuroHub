<script lang="ts">
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';

	let { value = $bindable([]), label = 'Skills', placeholder = 'Add a skill...' } = $props();

	let inputValue = $state('');

	function addTag() {
		const tag = inputValue.trim().toLowerCase();
		if (tag && !value.includes(tag)) {
			value = [...value, tag];
			inputValue = '';
		}
	}

	function removeTag(tag: string) {
		value = value.filter((t: string) => t !== tag);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		} else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
			removeTag(value[value.length - 1]);
		}
	}

	const inputId = `tag-input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="space-y-2">
	<label for={inputId} class="block text-[10px] font-black tracking-widest text-zinc-500 uppercase"
		>{label}</label
	>
	<div
		class="flex min-h-14 w-full flex-wrap gap-2 rounded-2xl border border-white/5 bg-white/3 p-3 transition-all focus-within:border-brand-orange focus-within:bg-white/5"
	>
		{#each value as tag (tag)}
			<div
				animate:flip={{ duration: 200 }}
				in:scale={{ duration: 200, start: 0.8 }}
				class="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-white/20"
			>
				{tag}
				<button
					type="button"
					onclick={() => removeTag(tag)}
					class="text-white/40 hover:text-white"
					aria-label="Remove {tag}"
				>
					<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		{/each}
		<input
			id={inputId}
			type="text"
			bind:value={inputValue}
			onkeydown={handleKeydown}
			{placeholder}
			class="min-w-[120px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700"
		/>
	</div>
	<p class="text-[10px] text-zinc-600">Press Enter to add skills like "React", "Rust", or "AI".</p>
</div>
