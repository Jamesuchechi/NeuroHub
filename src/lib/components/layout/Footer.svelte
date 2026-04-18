<script lang="ts">
	import { resolve } from '$app/paths';

	// Adapt links for NeuroHub
	const neuroLinks = [
		{ name: 'About', href: '/about' },
		{ name: 'Blog', href: '/blog' },
		{ name: 'Jobs', href: '/jobs' },
		{ name: 'Help', href: '/help' },
		{ name: 'API', href: '/api' },
		{ name: 'Privacy', href: '/privacy' },
		{ name: 'Terms', href: '/terms' },
		{ name: 'Contact', href: '/contact' }
	];

	const currentYear = new Date().getFullYear();
</script>

<footer class="mt-auto w-full py-8 text-center text-[12px] font-medium text-zinc-500">
	<div class="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2 px-8">
		{#each neuroLinks as link (link.name)}
			<a href={resolve(link.href as unknown as '/')} class="transition-colors hover:text-white">
				{link.name}
			</a>
		{/each}
	</div>

	<div class="flex items-center justify-center gap-4">
		<div class="flex items-center gap-1">
			<span>English</span>
			<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
		<span>© {currentYear} NeuroHub</span>
	</div>
</footer>
