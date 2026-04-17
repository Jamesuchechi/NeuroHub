<script lang="ts">
	import { authStore } from '$lib/stores/authStore';
	import { activityService } from '$lib/services/activity';

	let { poll } = $props<{
		poll: NonNullable<import('$lib/services/activity').Activity['poll']>;
	}>();

	const { user } = $derived($authStore);
	const totalVotes = $derived(
		poll.options.reduce(
			(
				sum: number,
				opt: import('$lib/types/db').AppDatabase['public']['Tables']['poll_options']['Row']
			) => sum + opt.votes_count,
			0
		)
	);
	const isExpired = $derived(new Date(poll.expires_at) < new Date());
	const hasVoted = $derived(!!poll.user_vote);
	const showResults = $derived(hasVoted || isExpired);

	async function vote(optionId: string) {
		if (!user || hasVoted || isExpired) return;
		try {
			await activityService.castVote(user.id, poll.id, optionId);
		} catch (err) {
			console.error('Failed to vote:', err);
		}
	}

	function getPercentage(count: number) {
		if (totalVotes === 0) return 0;
		return Math.round((count / totalVotes) * 100);
	}
</script>

<div class="mt-4 space-y-3 rounded-2xl border border-stroke bg-surface-dim/30 p-4">
	<h4 class="text-sm font-bold text-content">{poll.question}</h4>

	<div class="space-y-2">
		{#each poll.options as option (option.id)}
			{#if showResults}
				<div
					class="relative h-10 w-full overflow-hidden rounded-xl border border-stroke/50 bg-surface"
				>
					<!-- Progress Bar -->
					<div
						class="absolute inset-y-0 left-0 bg-brand-orange/10 transition-all duration-1000"
						style="width: {getPercentage(option.votes_count)}%"
					></div>

					<div class="relative flex h-full items-center justify-between px-4 text-sm">
						<div class="flex items-center gap-2">
							<span
								class="font-medium {poll.user_vote === option.id
									? 'text-brand-orange'
									: 'text-content'}"
							>
								{option.text}
							</span>
							{#if poll.user_vote === option.id}
								<svg class="h-4 w-4 text-brand-orange" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>
						<span class="font-bold text-content-dim">{getPercentage(option.votes_count)}%</span>
					</div>
				</div>
			{:else}
				<button
					onclick={() => vote(option.id)}
					disabled={!user}
					class="w-full rounded-xl border border-stroke bg-surface py-2.5 text-sm font-bold text-brand-orange transition-all hover:border-brand-orange hover:bg-brand-orange/5 disabled:opacity-50"
				>
					{option.text}
				</button>
			{/if}
		{/each}
	</div>

	<div
		class="flex items-center justify-between pt-1 text-[10px] font-bold tracking-wider text-content-dim uppercase"
	>
		<span>{totalVotes} votes</span>
		<span>
			{#if isExpired}
				Final Results
			{:else}
				{Math.round((new Date(poll.expires_at).getTime() - Date.now()) / 3600000)}h remaining
			{/if}
		</span>
	</div>
</div>
