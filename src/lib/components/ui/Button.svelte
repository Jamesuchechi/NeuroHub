<script lang="ts">
	const variants = {
		primary: 'bg-content text-surface hover:opacity-90',
		secondary: 'bg-surface-dim text-content border border-stroke hover:bg-surface',
		ghost: 'bg-transparent text-content-dim hover:text-content',
		danger: 'bg-red-600 text-white hover:bg-red-700'
	};

	const sizes = {
		sm: 'px-3 py-2 text-xs rounded-lg',
		md: 'px-4 py-3.5 text-sm rounded-xl',
		lg: 'px-6 py-4 text-base rounded-2xl'
	};

	import type { MouseEventHandler } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		type?: 'button' | 'submit' | 'reset';
		variant?: keyof typeof variants;
		size?: keyof typeof sizes;
		loading?: boolean;
		onclick?: MouseEventHandler<HTMLButtonElement>;
		disabled?: boolean;
		class?: string;
		width?: 'full' | 'auto';
	}

	import type { SvelteHTMLElements } from 'svelte/elements';
	let {
		children,
		type = 'button',
		variant = 'primary',
		size = 'md',
		loading = false,
		onclick = () => {},
		disabled = false,
		class: className = '',
		width = 'full',
		...rest
	}: Props & SvelteHTMLElements['button'] = $props();
</script>

<button
	{type}
	{onclick}
	{...rest}
	disabled={disabled || loading}
	aria-busy={loading}
	class="{width === 'full'
		? 'w-full'
		: 'w-auto'} cursor-pointer font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 {variants[
		variant
	]} {sizes[size]} {className}"
>
	{#if loading}
		<span class="flex items-center justify-center gap-2">
			<svg
				class="h-4 w-4 animate-spin text-current motion-reduce:animate-[spin_2s_linear_infinite]"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			Working...
		</span>
	{:else}
		{@render children()}
	{/if}
</button>
