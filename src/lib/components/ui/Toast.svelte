<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toast } from '$lib/stores/toastStore';
	import type { ToastType } from '$lib/stores/toastStore';

	let {
		id,
		message,
		type = 'success'
	} = $props<{
		id: string;
		message: string;
		type: ToastType;
	}>();

	const colors: Record<ToastType, string> = {
		success: 'border-green-500/20 bg-green-500/10 text-green-500',
		error: 'border-red-500/20 bg-red-950/20 text-red-400',
		info: 'border-blue-500/20 bg-blue-500/10 text-blue-400'
	};

	const variantClasses = $derived(colors[type as ToastType]);
</script>

<div
	in:fly={{ y: 20, duration: 300 }}
	out:fly={{ x: 100, duration: 200 }}
	class="flex items-center gap-4 rounded-2xl border p-4 shadow-2xl backdrop-blur-md {variantClasses}"
>
	<div class="shrink-0">
		{#if type === 'success'}
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		{:else}
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				{#if type === 'error'}
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				{:else}
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				{/if}
			</svg>
		{/if}
	</div>
	<p class="flex-1 text-sm leading-tight font-bold">{message}</p>
	<button
		onclick={() => toast.dismiss(id)}
		class="ml-4 shrink-0 opacity-50 transition-opacity hover:opacity-100"
		aria-label="Dismiss notification"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	</button>
</div>
