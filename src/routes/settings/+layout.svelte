<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AppShell from '$lib/components/layout/AppShell.svelte';

	let { children } = $props();

	const navItems = [
		{ id: 'profile', name: 'Profile', href: '/settings/profile', icon: 'user' },
		{ id: 'account', name: 'Account', href: '/settings/account', icon: 'settings' },
		{ id: 'mfa', name: 'Security', href: '/settings/mfa', icon: 'shield' }
	];

	const activeItem = $derived(
		navItems.find((item) => page.url.pathname.includes(item.href))?.id || 'profile'
	);
</script>

<AppShell>
	<div class="flex h-full w-full bg-surface">
		<!-- Settings Sub-Sidebar -->
		<aside class="w-64 border-r border-stroke bg-surface-dim/20 px-4 py-8 md:w-72 lg:w-80">
			<h2 class="mb-8 px-4 text-2xl font-black tracking-tight text-white uppercase">Settings</h2>

			<nav class="flex flex-col gap-1">
				{#each navItems as item (item.id)}
					<a
						href={resolve(item.href as unknown as '/')}
						class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all {activeItem ===
						item.id
							? 'bg-brand-orange/10 text-brand-orange shadow-sm'
							: 'text-zinc-500 hover:bg-surface-dim hover:text-white'}"
					>
						<span class="capitalize">{item.name}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Settings Content -->
		<main class="flex-1 overflow-y-auto px-6 py-12 md:px-12 lg:px-20">
			<div class="mx-auto max-w-3xl">
				{@render children()}
			</div>
		</main>
	</div>
</AppShell>
