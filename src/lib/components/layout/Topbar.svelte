<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '../ui/Button.svelte';
	import ThemeToggle from '../ui/ThemeToggle.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { notificationStore } from '$lib/stores/notificationStore.svelte';
	import NotificationDropdown from '../notifications/NotificationDropdown.svelte';
	import { onMount, onDestroy } from 'svelte';

	let showNotifications = $state(false);

	onMount(() => {
		notificationStore.init();
	});

	onDestroy(() => {
		notificationStore.cleanup();
	});

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);
	const { contextPanelCollapsed } = $derived($uiStore);

	// Generate breadcrumbs from path with workspace name support
	const pathSegments = $derived(
		page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, i, arr) => {
				const href = '/' + arr.slice(0, i + 1).join('/');
				let name = segment.charAt(0).toUpperCase() + segment.slice(1);

				// If this segment is a workspace slug and match current workspace, use its name
				if (arr[i - 1] === 'workspace' && currentWorkspace && segment === currentWorkspace.slug) {
					name = currentWorkspace.name;
				}

				return { name, href };
			})
	);
</script>

<header
	class="flex h-16 w-full items-center justify-between border-b border-stroke bg-surface/50 px-4 backdrop-blur-md md:px-8"
>
	<!-- Left: Breadcrumbs + Mobile Menu -->
	<div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
		{#if $uiStore.isMobile}
			<button
				onclick={() => uiStore.setMobileSidebarOpen(true)}
				class="mr-2 p-1 text-content-dim active:text-brand-orange"
				aria-label="Open menu"
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>
		{/if}
		<svg
			class="hidden h-4 w-4 text-content-dim md:block"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
			/>
		</svg>
		<span class="text-content-dim/30">/</span>
		{#each pathSegments as segment, i (segment.href)}
			{#if i > 0}
				<span class="text-content-dim/30">/</span>
			{/if}
			<a
				href={resolve(segment.href as unknown as '/')}
				class="truncate text-xs font-semibold tracking-tight transition-colors {i ===
				pathSegments.length - 1
					? 'text-content'
					: 'text-content-dim hover:text-content'}"
			>
				{segment.name}
			</a>
		{/each}
	</div>

	<!-- Right: Actions -->
	<div class="flex items-center gap-4">
		<div class="relative">
			<button
				onclick={() => (showNotifications = !showNotifications)}
				class="relative rounded-full p-2 transition-all hover:bg-surface-dim {showNotifications
					? 'bg-surface-dim text-brand-orange'
					: 'text-content-dim hover:text-content'}"
				aria-label="Notifications"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>

				{#if notificationStore.unreadCount > 0}
					<span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75"
						></span>
						<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-orange"></span>
					</span>
				{/if}
			</button>

			{#if showNotifications}
				<div
					class="fixed inset-0 z-40"
					onclick={() => (showNotifications = false)}
					aria-hidden="true"
				></div>
				<div class="absolute top-full right-0 z-50 mt-2 w-80">
					<NotificationDropdown onclose={() => (showNotifications = false)} />
				</div>
			{/if}
		</div>

		<ThemeToggle />

		<button
			onclick={() => uiStore.setContextPanelCollapsed(!contextPanelCollapsed)}
			class="rounded-lg p-2 text-content-dim transition-all hover:bg-surface-dim hover:text-content"
			class:text-orange-500={!contextPanelCollapsed}
			class:bg-surface-dim={!contextPanelCollapsed}
			title={contextPanelCollapsed ? 'Show Context Panel' : 'Hide Context Panel'}
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
				/>
			</svg>
		</button>

		<div class="h-4 w-px bg-stroke"></div>

		<Button
			variant="primary"
			size="sm"
			class="hidden px-4! py-2! text-[11px]! font-bold! md:flex"
			onclick={() => uiStore.setInviteModalOpen(true)}>Invite</Button
		>
	</div>
</header>
