<script lang="ts">
	import { resolve } from '$app/paths';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Footer from '$lib/components/layout/Footer.svelte';

	let { children } = $props();
</script>

<div
	class="relative min-h-screen bg-black text-white selection:bg-brand-orange selection:text-black"
>
	<!-- Top Navigation -->
	<nav
		class="sticky top-0 z-50 border-b border-white/5 bg-black/80 p-6 backdrop-blur-xl"
		in:fly={{ y: -20, duration: 800, easing: cubicOut }}
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between">
			<a href={resolve('/' as unknown as '/')} class="group flex items-center gap-3">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 transition-all group-hover:scale-110 group-hover:bg-brand-orange/10 group-hover:ring-brand-orange/30"
				>
					<img src="/logo.png" alt="NeuroHub" class="h-5 w-5 object-contain" />
				</div>
				<span
					class="text-lg font-black tracking-tighter uppercase italic transition-colors group-hover:text-brand-orange"
					>NeuroHub</span
				>
			</a>

			<div class="hidden gap-6 md:flex">
				<a
					href={resolve('/register' as unknown as '/')}
					class="text-sm font-bold text-zinc-500 transition-colors hover:text-white">Join the Hub</a
				>
				<a
					href="https://github.com"
					target="_blank"
					class="text-sm font-bold text-brand-blue transition-colors hover:text-white"
					>View Source</a
				>
			</div>
		</div>
	</nav>

	<!-- Main Content Section -->
	<main class="relative z-10 px-6 py-20 md:py-32">
		<div class="mx-auto max-w-3xl" in:fade={{ duration: 800, delay: 200 }}>
			{@render children()}
		</div>
	</main>

	<!-- Dedicated Static Footer Section -->
	<div class="mt-20 border-t border-white/5 bg-zinc-950/20 py-12">
		<Footer />
	</div>

	<!-- Background Aesthetics -->
	<div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
		<div
			class="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-brand-orange/5 blur-[120px]"
		></div>
		<div
			class="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-brand-blue/5 blur-[120px]"
		></div>
	</div>
</div>

<style>
	@reference "tailwindcss";

	:global(html),
	:global(body) {
		scroll-behavior: smooth;
		height: auto !important;
		overflow-y: auto !important;
	}

	/* Premium typography overrides for static content */
	:global(.prose h1) {
		@apply mt-0 mb-12 text-5xl font-black tracking-tighter md:text-7xl;
	}

	:global(.prose h2) {
		@apply mt-16 mb-6 text-2xl font-bold tracking-tight text-white md:text-3xl;
	}

	:global(.prose p) {
		@apply mb-8 text-lg leading-relaxed text-zinc-400 md:text-xl;
	}

	:global(.prose section) {
		@apply mb-16;
	}
</style>
