<script lang="ts">
	import { authStore } from '$lib/stores/authStore';
	import { onMount } from 'svelte';
	import Particles from '$lib/components/ui/Particles.svelte';

	let { children } = $props();

	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.session && !state.loading) {
				// Potential dashboard redirect could go here or in +layout.svelte
			}
		});
		return unsubscribe;
	});
</script>

<div class="relative z-1 flex min-h-screen overflow-hidden bg-black text-white">
	<Particles />

	<div class="page flex w-full">
		<!-- Left Section: Branding & Features -->
		<div class="left hidden flex-[6] items-center justify-center p-16 md:flex">
			<div class="max-w-xl">
				<div class="mb-12">
					<img src="/logo.png" alt="NeuroHub Logo" class="h-40 w-40 object-contain" />
				</div>
				<h1 class="mb-8 text-7xl leading-none font-black tracking-tighter">
					Happening<br />
					<span class="text-orange-500">now</span> in<br />
					<span class="text-blue-500">AI.</span>
				</h1>
				<p class="mb-10 text-lg leading-relaxed text-zinc-500">
					Build, ship, and collaborate with your<br />team at the speed of thought.
				</p>
				<div class="features flex flex-col gap-4">
					<div class="feat flex items-center gap-4 font-medium text-zinc-400">
						<span class="h-2 w-2 rounded-full bg-orange-500"></span>
						Real-time AI pair programming
					</div>
					<div class="feat flex items-center gap-4 font-medium text-zinc-400">
						<span class="h-2 w-2 rounded-full bg-blue-500"></span>
						Live team chat & co-editing
					</div>
					<div class="feat flex items-center gap-4 font-medium text-zinc-400">
						<span class="h-2 w-2 rounded-full bg-white"></span>
						Integrated dev tools & deploy
					</div>
				</div>
			</div>
		</div>

		<!-- Right Section: Auth Form -->
		<div
			class="right z-10 flex flex-1 flex-col justify-center border-l border-zinc-900 bg-black/50 p-8 backdrop-blur-sm md:flex-[4] md:p-16"
		>
			<div class="mx-auto w-full max-w-sm">
				{@render children()}
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		background-color: black;
	}
</style>
