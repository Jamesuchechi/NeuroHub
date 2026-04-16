<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Button from './Button.svelte';

	interface Props {
		title: string;
		description: string;
		icon?: 'chat' | 'note' | 'snippets' | 'search' | 'team' | 'bell';
		actionText?: string;
		onAction?: () => void;
	}

	let { title, description, icon, actionText, onAction }: Props = $props();

	const iconPaths: Record<string, string> = {
		chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
		note: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		snippets: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		team: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
	};
</script>

<div
	class="flex h-full w-full flex-col items-center justify-center p-8 text-center"
	transition:fade={{ duration: 400 }}
>
	<div
		class="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-stroke bg-surface-dim/50 shadow-xl"
		in:fly={{ y: 20, duration: 800, easing: cubicOut }}
	>
		<svg class="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			{#if icon && iconPaths[icon]}
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d={iconPaths[icon]}
				/>
			{:else}
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M12 4v16m8-8H4"
				/>
			{/if}
		</svg>
	</div>

	<h3
		class="mb-2 text-xl font-bold tracking-tight text-content"
		in:fly={{ y: 20, duration: 800, delay: 100, easing: cubicOut }}
	>
		{title}
	</h3>

	<p
		class="mb-8 max-w-xs text-sm leading-relaxed text-content-dim"
		in:fly={{ y: 20, duration: 800, delay: 200, easing: cubicOut }}
	>
		{description}
	</p>

	{#if actionText && onAction}
		<div in:fly={{ y: 20, duration: 800, delay: 300, easing: cubicOut }}>
			<Button variant="primary" onclick={onAction}>
				{actionText}
			</Button>
		</div>
	{/if}
</div>
