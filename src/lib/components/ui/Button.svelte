<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

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

	interface Props {
		children: Snippet;
		variant?: keyof typeof variants;
		size?: keyof typeof sizes;
		loading?: boolean;
		width?: 'full' | 'auto';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		download?: boolean | string;
		disabled?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		children,
		variant = 'primary',
		size = 'md',
		loading = false,
		width = 'full',
		href,
		type = 'button',
		download,
		disabled = false,
		class: className = '',
		onclick,
		...rest
	}: Props = $props();

	const commonClasses = $derived(
		`${
			width === 'full' ? 'w-full' : 'w-auto'
		} cursor-pointer font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center ${
			variants[variant]
		} ${sizes[size]} ${className}`
	);
</script>

{#if href}
	<a href={resolve(href as unknown as '/')} {download} class={commonClasses} {onclick} {...rest}>
		{@render children()}
	</a>
{:else}
	<button {type} disabled={disabled || loading} class={commonClasses} {onclick} {...rest}>
		{#if loading}
			<span class="flex items-center justify-center gap-2">
				<svg
					class="h-4 w-4 animate-spin text-current"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
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
{/if}
