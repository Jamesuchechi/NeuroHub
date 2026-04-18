<script lang="ts">
	import { LANGUAGES, type Language } from '$lib/types/devtools';

	let {
		value = $bindable('javascript'),
		disabled = false,
		onchange
	} = $props<{
		value?: Language;
		disabled?: boolean;
		onchange?: (lang: Language) => void;
	}>();

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newLang = target.value as Language;
		value = newLang;
		onchange?.(newLang);
	}

	function getBadgeColor(lang: Language): string {
		const familyAmber = ['javascript', 'typescript', 'jsx', 'tsx', 'svelte', 'vue', 'solidity'];
		const familyBlue = ['python', 'ruby', 'go', 'dart', 'r', 'cmake'];
		const familyPurple = [
			'rust',
			'c',
			'cpp',
			'java',
			'kotlin',
			'swift',
			'csharp',
			'zig',
			'elixir',
			'clojure',
			'haskell',
			'scala',
			'objectivec'
		];
		const familyGray = ['shell', 'dockerfile', 'perl', 'powershell', 'protobuf'];
		const familyTeal = ['sql', 'graphql'];
		const familyGreen = ['html', 'css', 'markdown'];
		const familyCoral = ['json', 'yaml'];

		if (familyAmber.includes(lang)) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
		if (familyBlue.includes(lang)) return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
		if (familyPurple.includes(lang)) return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
		if (familyGray.includes(lang)) return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
		if (familyTeal.includes(lang)) return 'bg-teal-500/20 text-teal-600 dark:text-teal-400';
		if (familyGreen.includes(lang)) return 'bg-green-500/20 text-green-600 dark:text-green-400';
		if (familyCoral.includes(lang)) return 'bg-orange-500/20 text-orange-600 dark:text-orange-400';
		return 'bg-muted text-foreground';
	}
</script>

<div class="group relative">
	<div
		class="bg-muted/50 hover:bg-muted border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200 {disabled
			? 'pointer-events-none opacity-50'
			: ''}"
	>
		<div class="h-2 w-2 rounded-full {getBadgeColor(value).replace('/20', '')}"></div>
		<span class="text-xs font-semibold whitespace-nowrap">
			{LANGUAGES.find((l) => l.value === value)?.label || value}
		</span>
		<svg
			class="text-muted-foreground group-hover:text-foreground h-3 w-3 transition-colors"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</div>

	<select
		{disabled}
		class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
		{value}
		onchange={handleChange}
		aria-label="Select language"
	>
		{#each LANGUAGES as lang (lang.value)}
			<option value={lang.value}>{lang.label}</option>
		{/each}
	</select>
</div>
