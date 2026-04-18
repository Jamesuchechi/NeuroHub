<script lang="ts">
	import { authStore } from '$lib/stores/authStore';
	import { onMount } from 'svelte';
	import Particles from '$lib/components/ui/Particles.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { children, split = true } = $props();

	let mouseX = $state(0);
	let mouseY = $state(0);

	function handleMouseMove(e: MouseEvent) {
		mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
		mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
	}

	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.session && !state.loading) {
				// Potential dashboard redirect could go here or in +layout.svelte
			}
		});
		window.addEventListener('mousemove', handleMouseMove);
		return () => {
			unsubscribe();
			window.removeEventListener('mousemove', handleMouseMove);
		};
	});
</script>

<div class="relative z-1 flex h-screen flex-col overflow-y-auto bg-black text-white">
	<Particles />

	<!-- Floating Brand Logo (Top Left) -->
	<div class="absolute top-10 left-10 z-50 flex items-center gap-4">
		<img
			src="/logo.png"
			alt="NeuroHub Logo"
			class="h-16 w-16 rounded-[30%] object-contain shadow-2xl ring-1 ring-white/10"
		/>
		<span class="text-2xl font-black tracking-tighter text-white uppercase italic">NeuroHub</span>
	</div>

	<!-- Main Content Area -->
	<div class="page flex w-full flex-1">
		<!-- Left Section: Visual Experience -->
		{#if split}
			<div
				class="left relative hidden flex-6 flex-col items-center justify-center overflow-hidden p-16 md:flex"
			>
				<div class="relative flex h-[600px] w-full max-w-2xl items-center justify-center">
					<!-- Background Glow -->
					<div
						class="bg-radial-gradient absolute inset-0 from-brand-orange/20 to-transparent opacity-50 blur-3xl"
					></div>

					<!-- Image Stack (Instagram-inspired, unique tech twist) -->
					<div class="relative z-10 h-full w-full">
						<!-- Hero 1: Brainstorming -->
						<div
							class="image-card absolute top-[10%] left-[5%] z-30 overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-transform duration-700 ease-out"
							style="transform: translate({mouseX * 0.5}px, {mouseY *
								0.5}px) rotate(-4deg); width: 60%; height: 70%;"
							in:fly={{ y: 50, duration: 1000, delay: 200, easing: cubicOut }}
						>
							<img
								src="/images/landing/hero-1.png"
								alt="Team Brainstorming"
								class="h-full w-full object-cover"
							/>
						</div>

						<!-- Hero 2: Collaboration -->
						<div
							class="image-card absolute top-[30%] right-[0%] z-20 overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-transform duration-700 ease-out"
							style="transform: translate({mouseX * 0.8}px, {mouseY *
								0.8}px) rotate(6deg); width: 55%; height: 60%;"
							in:fly={{ y: 50, duration: 1000, delay: 400, easing: cubicOut }}
						>
							<img
								src="/images/landing/hero-2.png"
								alt="Collaboration"
								class="h-full w-full object-cover"
							/>
						</div>

						<!-- Hero 3: Focused Coding -->
						<div
							class="image-card absolute bottom-[5%] left-[25%] z-40 overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-transform duration-700 ease-out"
							style="transform: translate({mouseX}px, {mouseY}px) rotate(-2deg); width: 50%; height: 50%;"
							in:fly={{ y: 50, duration: 1000, delay: 600, easing: cubicOut }}
						>
							<img
								src="/images/landing/hero-3.png"
								alt="Intense Coding"
								class="h-full w-full object-cover"
							/>
						</div>
					</div>

					<!-- Floating Text -->
					<div class="absolute -bottom-12 left-8 z-50 max-w-md">
						<h1
							class="mb-4 text-6xl leading-tight font-black tracking-tighter text-white"
							in:fade={{ delay: 800 }}
						>
							Happening <span class="text-brand-orange">now</span> in
							<span class="text-brand-blue">AI.</span>
						</h1>
						<p class="text-lg font-medium text-zinc-400" in:fade={{ delay: 1000 }}>
							Build, ship, and collaborate with your team at the speed of thought.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Right Section: Auth Container -->
		<div
			class="right z-10 flex flex-1 flex-col justify-center bg-black/60 backdrop-blur-3xl {split
				? 'border-l border-white/5 md:flex-4'
				: 'items-center'}"
		>
			<div class="w-full px-8 py-20 md:px-16 lg:px-24 {split ? '' : 'max-w-2xl lg:max-w-3xl'}">
				{@render children()}
			</div>
		</div>
	</div>

	<!-- Instagram-style Footer -->
	<div class="z-50 border-t border-white/5 bg-black/50 backdrop-blur-sm">
		<Footer />
	</div>
</div>

<style>
	:global(body) {
		background-color: black;
		overflow-x: hidden;
	}

	.image-card {
		background: #111;
	}

	.image-card::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.6) 100%);
		pointer-events: none;
	}

	.bg-radial-gradient {
		background: radial-gradient(
			circle at center,
			var(--tw-gradient-from) 0%,
			var(--tw-gradient-to) 70%
		);
	}
</style>
