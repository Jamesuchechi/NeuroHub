<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { profileStore } from '$lib/stores/profileStore';
	import { authStore } from '$lib/stores/authStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { workspacesService } from '$lib/services/workspaces';
	import { supabase } from '$lib/services/supabase';
	import { goto } from '$app/navigation';
	import { fly, slide, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Avatar from '../ui/Avatar.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { onMount } from 'svelte';
	import { chatStore } from '$lib/stores/chatStore.svelte';

	const sidebarCollapsed = $derived($uiStore.sidebarCollapsed);

	import type { Database } from '$lib/types/db';

	type Workspace = Database['public']['Tables']['workspaces']['Row'];

	const profile = $derived($profileStore.profile);
	const user = $derived($authStore.user);
	const currentWorkspace = $derived($workspaceStore.currentWorkspace);

	let workspaces = $state<Workspace[]>([]);
	let showSwitcher = $state(false);
	let channelsExpanded = $state(true);
	let chatsExpanded = $state(true);

	/**
	 * Workspace Channels (Reactive)
	 */
	const channels = $derived(chatStore.channels);

	interface NavLink {
		name: string;
		href: string;
		icon: string;
	}

	const workspaceLinks = $derived<NavLink[]>([
		{
			name: 'NeuroAI',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/ai` : '#',
			icon: 'brain'
		},
		{
			name: 'Dashboard',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}` : '/dashboard',
			icon: 'dashboard'
		},
		{
			name: 'Notes',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/notes` : '#',
			icon: 'book'
		},
		{
			name: 'Snippets',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/snippets` : '#',
			icon: 'code'
		}
	]);

	const adminLinks = $derived<NavLink[]>(
		currentWorkspace
			? [
					{
						name: 'Team Members',
						href: `/workspace/${currentWorkspace.slug}/settings`,
						icon: 'users'
					},
					{
						name: 'Workspace Settings',
						href: `/workspace/${currentWorkspace.slug}/settings`,
						icon: 'settings'
					}
				]
			: []
	);

	const globalLinks: NavLink[] = [
		{ name: 'Activity Feed', href: '/dashboard', icon: 'pulse' },
		{ name: 'Workspaces', href: '/dashboard', icon: 'grid' }
	];

	async function loadWorkspaces() {
		if (!user) return;
		try {
			workspaces = await workspacesService.getUserWorkspaces(user.id);
		} catch (err) {
			console.error('Failed to load workspaces for switcher:', err);
		}
	}

	async function switchWorkspace(slug: string) {
		if (!user) return;
		await workspaceStore.setWorkspace(slug, user.id);
		showSwitcher = false;
		goto(resolve(`/workspace/${slug}` as unknown as '/'));
	}

	async function handleLogout() {
		try {
			await supabase.auth.signOut();
			goto(resolve('/login' as unknown as '/'));
		} catch (err) {
			console.error('Logout failed:', err);
		}
	}

	onMount(() => {
		loadWorkspaces();
	});

	$effect(() => {
		if (currentWorkspace) {
			chatStore.init(currentWorkspace.id);
		}
	});
</script>

<aside
	in:fly={{ x: -280, duration: 800, easing: cubicOut }}
	class="relative flex h-screen flex-col border-r border-stroke bg-surface text-content-dim transition-all duration-300 ease-in-out {sidebarCollapsed
		? 'w-20'
		: 'w-full'}"
>
	<!-- Collapse Toggle -->
	<button
		onclick={() => uiStore.setSidebarCollapsed(!sidebarCollapsed)}
		class="absolute top-20 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-stroke bg-surface text-zinc-500 shadow-lg transition-all hover:text-white"
		aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
	>
		<svg
			class="h-3 w-3 transition-transform duration-300 {sidebarCollapsed ? 'rotate-180' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	</button>

	<!-- Workspace Switcher -->
	<div class="relative p-5">
		<button
			onclick={() => (showSwitcher = !showSwitcher)}
			class="group flex w-full items-center gap-3 rounded-xl border border-stroke bg-surface-dim/50 p-2.5 text-left transition-all hover:border-stroke hover:bg-surface-dim/50 {showSwitcher
				? 'border-brand-orange/50 bg-surface-dim'
				: ''}"
		>
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-orange to-brand-blue p-2 shadow-lg transition-transform group-hover:scale-105"
			>
				{#if currentWorkspace?.logo_url}
					<img src={currentWorkspace.logo_url} alt="Logo" class="h-full w-full object-contain" />
				{:else if currentWorkspace}
					<span class="text-lg font-black text-white">{currentWorkspace.name[0]}</span>
				{:else}
					<img src="/logo.png" alt="Logo" class="h-full w-full object-contain" />
				{/if}
			</div>
			<div
				class="flex-1 overflow-hidden transition-all duration-300 {sidebarCollapsed
					? 'w-0 opacity-0'
					: 'w-auto opacity-100'}"
			>
				<p class="truncate text-sm font-bold whitespace-nowrap text-content">
					{currentWorkspace?.name || 'Select Workspace'}
				</p>
				<p class="truncate text-[10px] tracking-tight text-zinc-500 uppercase">
					{currentWorkspace ? 'Active Workspace' : 'NeuroHub Hub'}
				</p>
			</div>
			{#if !sidebarCollapsed}
				<svg
					class="h-4 w-4 text-zinc-600 transition-transform duration-300 {showSwitcher
						? 'rotate-180'
						: ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			{/if}
		</button>

		{#if showSwitcher}
			<div
				transition:slide={{ duration: 300, easing: cubicOut }}
				class="absolute top-[calc(100%-8px)] right-5 left-5 z-50 mt-2 space-y-1 rounded-xl border border-stroke bg-surface-dim p-2 shadow-2xl backdrop-blur-xl"
			>
				<div class="mb-1 px-2 py-1.5">
					<p class="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
						Your Workspaces
					</p>
				</div>
				{#each workspaces as ws (ws.id)}
					<button
						onclick={() => switchWorkspace(ws.slug)}
						class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all hover:bg-surface-dim {currentWorkspace?.id ===
						ws.id
							? 'bg-surface-dim/50'
							: ''}"
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-dim text-xs font-bold text-content-dim"
						>
							{#if ws.logo_url}
								<img src={ws.logo_url} alt={ws.name} class="h-full w-full object-cover" />
							{:else}
								{ws.name[0]}
							{/if}
						</div>
						<div class="flex-1 overflow-hidden">
							<p class="truncate text-xs font-bold text-content">{ws.name}</p>
							<p class="truncate text-[9px] text-content-dim">neurohub.io/{ws.slug}</p>
						</div>
						{#if currentWorkspace?.id === ws.id}
							<div class="h-1.5 w-1.5 rounded-full bg-brand-orange shadow-neon-orange"></div>
						{/if}
					</button>
				{/each}

				<div class="my-2 border-t border-zinc-900 pt-2 text-left">
					<button
						onclick={() => {
							showSwitcher = false;
							goto(resolve('/dashboard' as unknown as '/'));
						}}
						class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-zinc-500 transition-all hover:bg-zinc-900 hover:text-white"
					>
						<div
							class="flex h-8 w-8 items-center justify-center rounded border border-dashed border-zinc-800 text-lg"
						>
							+
						</div>
						<p class="text-xs font-medium">Create New Workspace</p>
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Main Navigation Scroll Area -->
	<div class="scrollbar-none flex-1 overflow-y-auto px-5">
		<!-- Search Shortcut -->
		<div class="mb-6">
			<button
				class="flex w-full items-center gap-3 rounded-xl border border-stroke bg-surface-dim/50 px-4 py-2.5 text-content-dim transition-all hover:border-stroke hover:bg-surface-dim"
			>
				<svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				{#if !sidebarCollapsed}
					<span class="text-xs font-medium">Search...</span>
					<span
						class="ml-auto rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600"
						>⌘K</span
					>
				{/if}
			</button>
		</div>

		<!-- Global Hub Block / Hub Toggle -->
		<div class="mb-6">
			{#if currentWorkspace}
				<a
					href={resolve('/dashboard' as unknown as '/')}
					title={sidebarCollapsed ? 'Back to Hub' : ''}
					class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-content-dim transition-all hover:bg-surface-dim hover:text-content"
				>
					<div
						class="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500 transition-colors group-hover:text-brand-orange"
					>
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
					</div>
					{#if !sidebarCollapsed}
						<span>Back to Hub</span>
					{/if}
				</a>
			{:else}
				{#if !sidebarCollapsed}
					<p class="mb-2 px-3 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">
						Global Hub
					</p>
				{/if}
				<nav class="space-y-1">
					{#each globalLinks as link (link.name)}
						<a
							href={resolve(link.href as unknown as '/')}
							title={sidebarCollapsed ? link.name : ''}
							class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all {page
								.url.pathname === link.href
								? 'bg-surface-dim text-content'
								: 'hover:bg-surface-dim/40 hover:text-content'}"
						>
							<div
								class="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500 transition-colors group-hover:text-brand-orange"
							>
								{#if link.icon === 'pulse'}
									<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								{:else if link.icon === 'grid'}
									<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
										/>
									</svg>
								{/if}
							</div>
							{#if !sidebarCollapsed}
								{link.name}
							{/if}
						</a>
					{/each}
				</nav>
			{/if}
		</div>

		<!-- Tools Section (Always Visible) -->
		<div class="mb-6">
			{#if !sidebarCollapsed}
				<p class="mb-2 px-3 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">Tools</p>
			{/if}
			<nav class="space-y-1">
				{#each workspaceLinks as link (link.name)}
					<a
						href={link.href !== '#' ? resolve(link.href as unknown as '/') : '#'}
						title={sidebarCollapsed ? link.name : ''}
						class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all {!currentWorkspace &&
						link.href === '#'
							? 'cursor-not-allowed opacity-40'
							: page.url.pathname.startsWith(link.href) && link.href !== '/dashboard'
								? 'bg-surface-dim text-content'
								: 'hover:bg-surface-dim/40 hover:text-content'}"
						onclick={(e) => {
							if (link.href === '#') {
								e.preventDefault();
								showSwitcher = true;
							}
						}}
					>
						<div
							class="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500 transition-colors group-hover:text-brand-orange"
						>
							{#if link.icon === 'brain'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
							{:else if link.icon === 'dashboard'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
									/>
								</svg>
							{:else if link.icon === 'book'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
							{:else if link.icon === 'code'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
									/>
								</svg>
							{/if}
						</div>
						{#if !sidebarCollapsed}
							{link.name}
							{#if link.name === 'Notes'}
								<button
									class="ml-auto flex h-4 w-4 items-center justify-center rounded border border-dashed border-zinc-800 text-zinc-600 transition-colors hover:border-brand-orange hover:text-brand-orange"
									title="New Note"
									onclick={(e) => {
										e.stopPropagation();
										if (!currentWorkspace) showSwitcher = true;
									}}
								>
									+
								</button>
							{/if}
						{/if}
					</a>
				{/each}
			</nav>
		</div>

		<!-- Channels Section (Always Visible) -->
		<div class="mb-6">
			<button
				onclick={() => {
					if (sidebarCollapsed) {
						uiStore.setSidebarCollapsed(false);
						channelsExpanded = true;
					} else {
						channelsExpanded = !channelsExpanded;
					}
				}}
				class="group mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold tracking-[2px] text-content-dim uppercase hover:text-content"
			>
				{#if !sidebarCollapsed}
					<span>Channels</span>
					<svg
						class="h-3 w-3 transition-transform duration-200 {channelsExpanded ? 'rotate-90' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				{:else}
					<div
						class="flex h-5 w-5 items-center justify-center text-zinc-500 group-hover:text-brand-orange"
					>
						#
					</div>
				{/if}
			</button>

			{#if channelsExpanded && !sidebarCollapsed}
				<nav transition:slide={{ duration: 200 }} class="space-y-0.5">
					{#if currentWorkspace}
						{#if channels.length > 0}
							{#each channels as channel (channel.id)}
								<a
									href={resolve(
										`/workspace/${currentWorkspace.slug}/chat/${channel.id}` as unknown as '/'
									)}
									class="group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all {chatStore.activeChannelId ===
									channel.id
										? 'bg-brand-orange/10 text-brand-orange'
										: 'hover:bg-zinc-900/40 hover:text-white'}"
								>
									<span
										class="font-mono text-xs transition-colors {chatStore.activeChannelId ===
										channel.id
											? 'text-brand-orange'
											: 'text-zinc-600 group-hover:text-brand-orange'}">#</span
									>
									<span class="truncate font-medium">{channel.name}</span>
									{#if chatStore.channelHasUnread(channel.id)}
										<div
											class="ml-auto h-2 w-2 rounded-full bg-brand-orange shadow-neon-orange"
											in:fade
										></div>
									{/if}
								</a>
							{/each}
						{:else}
							<button
								onclick={() => uiStore.setCreateChannelModalOpen(true)}
								class="mx-3 my-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-stroke p-4 text-center transition-all hover:bg-surface-dim/40"
							>
								<p class="text-[10px] font-bold text-content-dim uppercase">No channels yet</p>
								<p class="mt-1 text-[9px] text-zinc-600">Create your first discussion space</p>
								<span
									class="mt-3 rounded-lg bg-zinc-900 px-2 py-1 text-[9px] font-bold text-brand-orange"
									>Create Channel</span
								>
							</button>
						{/if}
					{:else}
						<div class="px-3 py-2 text-left">
							<p class="text-[10px] text-zinc-500 italic">Select workspace to view channels</p>
						</div>
					{/if}

					<button
						onclick={() =>
							!currentWorkspace ? (showSwitcher = true) : uiStore.setCreateChannelModalOpen(true)}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-zinc-600 transition-all hover:text-zinc-400"
					>
						<span
							class="flex h-4 w-4 items-center justify-center rounded border border-dashed border-zinc-800"
							>+</span
						>
						<span>Add Channel</span>
					</button>
				</nav>
			{/if}
		</div>

		<!-- Chats Section (Always Visible) -->
		<div class="mb-6">
			<button
				onclick={() => {
					if (sidebarCollapsed) {
						uiStore.setSidebarCollapsed(false);
						chatsExpanded = true;
					} else {
						chatsExpanded = !chatsExpanded;
					}
				}}
				class="group mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase hover:text-zinc-400"
			>
				{#if !sidebarCollapsed}
					<span>Chats</span>
					<svg
						class="h-3 w-3 transition-transform duration-200 {chatsExpanded ? 'rotate-90' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				{:else}
					<div
						class="flex h-5 w-5 items-center justify-center text-zinc-500 group-hover:text-brand-orange"
					>
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
				{/if}
			</button>

			{#if chatsExpanded && !sidebarCollapsed}
				<nav transition:slide={{ duration: 200 }} class="space-y-0.5">
					{#if currentWorkspace}
						<div class="px-3 py-2 text-left">
							<p class="text-[10px] text-zinc-500 italic">No recent chats found</p>
						</div>
					{:else}
						<div class="px-3 py-2 text-left">
							<p class="text-[10px] text-zinc-500 italic">Select workspace to view chats</p>
						</div>
					{/if}

					<button
						onclick={() =>
							!currentWorkspace ? (showSwitcher = true) : uiStore.setStartChatModalOpen(true)}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-zinc-600 transition-all hover:text-zinc-400"
					>
						<span
							class="flex h-4 w-4 items-center justify-center rounded border border-dashed border-zinc-800"
							>+</span
						>
						<span>New Message</span>
					</button>
				</nav>
			{/if}
		</div>

		{#if currentWorkspace}
			<!-- Administration Section -->
			<div class="mb-6">
				{#if !sidebarCollapsed}
					<p class="mb-2 px-3 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">
						Administration
					</p>
				{/if}
				<nav class="space-y-1">
					{#each adminLinks as link (link.name)}
						<a
							href={resolve(link.href as unknown as '/')}
							title={sidebarCollapsed ? link.name : ''}
							class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
								link.href
							)
								? 'bg-zinc-900 text-white'
								: 'hover:bg-zinc-900/40 hover:text-white'}"
						>
							<div
								class="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500 transition-colors group-hover:text-brand-orange"
							>
								{#if link.icon === 'users'}
									<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
								{:else if link.icon === 'settings'}
									<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								{/if}
							</div>
							{#if !sidebarCollapsed}
								{link.name}
							{/if}
						</a>
					{/each}
				</nav>
			</div>
		{/if}
	</div>

	<!-- Sidebar Footer -->
	<div class="mt-auto space-y-4 border-t border-stroke p-5">
		<!-- Theme Toggle Integrated -->
		<ThemeToggle collapsed={sidebarCollapsed} />

		<!-- User Profile Section -->
		<a
			href={resolve('/profile' as unknown as '/')}
			title={sidebarCollapsed ? profile?.username || 'User' : ''}
			class="group/profile flex items-center gap-3 rounded-xl border border-stroke bg-surface-dim/20 p-2.5 transition-all hover:border-brand-orange/30 hover:bg-surface-dim/40"
		>
			<div class="relative shrink-0">
				<Avatar name={profile?.username || 'User'} size="sm" src={profile?.avatar_url} />
				<!-- Presence Indicator -->
				<div
					class="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-black bg-brand-green shadow-[0_0_8px_rgba(34,197,94,0.5)]"
					title="Online"
				></div>
			</div>

			<div
				class="flex-1 overflow-hidden transition-all duration-300 {sidebarCollapsed
					? 'w-0 opacity-0'
					: 'w-auto opacity-100'}"
			>
				<p
					class="truncate text-xs font-bold text-content transition-colors group-hover/profile:text-brand-orange"
				>
					{profile?.username || 'Developer'}
				</p>
				<p class="truncate text-[10px] text-zinc-500 lowercase">Free Plan</p>
			</div>
		</a>

		<!-- Action Rail (Separated) -->
		<div
			class="flex items-center rounded-xl border border-stroke bg-surface-dim/50 p-1.5 transition-all {sidebarCollapsed
				? 'flex-col gap-1'
				: 'justify-between'}"
		>
			<div
				class="flex items-center transition-all {sidebarCollapsed ? 'flex-col gap-0.5' : 'gap-0.5'}"
			>
				<button
					class="rounded-lg p-2 text-zinc-600 transition-all hover:bg-zinc-900 hover:text-white"
					aria-label="Settings"
					title="Settings"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</button>

				<button
					class="rounded-lg p-2 text-zinc-600 transition-all hover:bg-zinc-900 hover:text-white"
					aria-label="Notifications"
					title="Notifications"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
						/>
					</svg>
				</button>
			</div>

			<button
				onclick={handleLogout}
				class="rounded-lg p-2 text-zinc-600 transition-all hover:bg-zinc-900 hover:text-red-500"
				aria-label="Log out"
				title="Log out"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
			</button>
		</div>
	</div>
</aside>

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
