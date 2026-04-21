<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/services/supabase';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/types/db';
	import ResourceLink from './ResourceLink.svelte';
	import type { ResourceType } from '$lib/services/resourceService';
	import { fade } from 'svelte/transition';

	// Locally extend the database type until official types are regenerated
	interface ExtendedDatabase extends Database {
		public: Database['public'] & {
			Tables: Database['public']['Tables'] & {
				channel_resource_pins: {
					Row: Pin & { channel_id: string; created_at: string };
					Insert: never;
					Update: never;
				};
			};
		};
	}

	const db = supabase as unknown as SupabaseClient<ExtendedDatabase>;

	interface Pin {
		id: string;
		type: ResourceType;
		resource_id: string;
		metadata: {
			name: string;
		};
	}

	let { channelId } = $props<{ channelId: string }>();

	let pins = $state<Pin[]>([]);
	let isLoading = $state(true);

	async function fetchPins() {
		isLoading = true;
		try {
			const { data, error } = await db
				.from('channel_resource_pins')
				.select('*')
				.eq('channel_id', channelId)
				.order('created_at', { ascending: true });

			if (!error) {
				pins = data || [];
			}
		} catch (err) {
			console.error('[PinnedResources] Failed to fetch pins:', err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchPins();

		// Realtime subscription
		const channel = supabase
			.channel(`pins:${channelId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'channel_resource_pins',
					filter: `channel_id=eq.${channelId}`
				},
				() => fetchPins()
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	});

	$effect(() => {
		if (channelId) fetchPins();
	});
</script>

{#if !isLoading && pins.length > 0}
	<div
		in:fade
		class="flex items-center gap-2 border-t border-stroke/30 bg-surface-dim/20 px-6 py-1.5"
	>
		<div
			class="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-content-dim uppercase"
		>
			<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
				/>
			</svg>
			Pinned
		</div>
		<div class="mx-1 h-3 w-px bg-stroke/50"></div>
		<div class="scrollbar-hide flex flex-1 items-center gap-2 overflow-x-auto">
			{#each pins as pin (pin.id)}
				<ResourceLink type={pin.type} id={pin.resource_id} name={pin.metadata?.name || 'Unknown'} />
			{/each}
		</div>
	</div>
{/if}
