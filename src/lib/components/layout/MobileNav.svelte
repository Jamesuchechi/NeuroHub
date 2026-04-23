<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);

	const navItems = $derived([
		{
			name: 'Chat',
			icon: 'message-square',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/chat` : '/dashboard'
		},
		{
			name: 'Notes',
			icon: 'book',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/notes` : '/dashboard'
		},
		{
			name: 'Snippets',
			icon: 'code',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/snippets` : '/dashboard'
		},
		{
			name: 'AI',
			icon: 'brain',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/ai` : '/dashboard'
		}
	]);
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-40 border-t border-stroke bg-surface/80 p-2 backdrop-blur-xl md:hidden"
>
	<div class="flex items-center justify-around">
		<button
			onclick={() => uiStore.setMobileSidebarOpen(true)}
			class="flex flex-col items-center gap-1 p-2 text-zinc-500 transition-colors active:text-brand-orange"
			aria-label="Menu"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
			<span class="text-[10px] font-medium">Menu</span>
		</button>

		{#each navItems as item (item.name)}
			{@const isActive = page.url.pathname.includes(item.href) && item.href !== '/dashboard'}
			<a
				href={resolve(item.href as unknown as '/')}
				class="flex flex-col items-center gap-1 p-2 transition-all {isActive
					? 'scale-110 text-brand-orange'
					: 'text-zinc-500'}"
			>
				<div class="flex h-5 w-5 items-center justify-center">
					{#if item.icon === 'message-square'}
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
							/>
						</svg>
					{:else if item.icon === 'book'}
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
					{:else if item.icon === 'code'}
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
							/>
						</svg>
					{:else if item.icon === 'brain'}
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							/>
						</svg>
					{/if}
				</div>
				<span class="text-[9px] font-bold tracking-tighter uppercase">{item.name}</span>
			</a>
		{/each}
	</div>
</nav>
