<script lang="ts">
	import type { Activity, Attachment, PostPayload } from '$lib/services/activity';
	import { activityService } from '$lib/services/activity';
	import { authStore } from '$lib/stores/authStore';
	import { resolve } from '$app/paths';
	import Avatar from '../ui/Avatar.svelte';
	import Poll from '../social/Poll.svelte';
	import { slide, fade } from 'svelte/transition';

	let { activity } = $props<{ activity: Activity }>();

	const types: Record<string, { label: string; icon: string; color: string }> = {
		workspace_create: {
			label: 'built a new workspace',
			icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
			color: 'text-blue-400'
		},
		workspace_join: {
			label: 'joined the team',
			icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
			color: 'text-green-400'
		},
		story_create: {
			label: 'shared a story',
			icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
			color: 'text-orange-400'
		},
		post: {
			label: '',
			icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
			color: 'text-brand-orange'
		}
	};

	const config = $derived(
		activity
			? types[activity.type] || { label: 'triggered an event', icon: '', color: 'text-zinc-500' }
			: null
	);

	// Interaction States
	let showComments = $state(false);
	let comments = $state<Activity[]>([]);
	let newComment = $state('');
	let isSubmittingComment = $state(false);
	let isLiking = $state(false);
	let isReposting = $state(false);

	function formatTime(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h`;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function getYouTubeId(url: string) {
		const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
		const match = url.match(regExp);
		return match && match[2].length === 11 ? match[2] : null;
	}

	const attachments = $derived((activity?.attachments as unknown as Attachment[]) || []);

	async function handleLike() {
		if (!$authStore.user || isLiking) return;
		isLiking = true;
		try {
			await activityService.toggleLike($authStore.user.id, activity.id, activity.user_liked);
		} finally {
			isLiking = false;
		}
	}

	async function toggleComments() {
		showComments = !showComments;
		if (showComments && comments.length === 0) {
			comments = await activityService.fetchReplies(activity.id, $authStore.user?.id || null);
		}
	}

	async function submitComment() {
		const user = $authStore.user;
		if (!user || !newComment.trim() || isSubmittingComment) return;
		isSubmittingComment = true;
		try {
			const reply = await activityService.createPost(user.id, newComment, {
				parentId: activity.id,
				workspaceId: activity.workspace_id,
				isPublic: activity.is_public
			});

			if (reply) {
				// We need to fetch the full reply with profile for display
				// Or we can optimistically build it
				const fullReply = await activityService.fetchActivityById(reply.id, user.id);
				if (fullReply) {
					comments = [...comments, fullReply];
					newComment = '';
				}
			}
		} catch (err) {
			console.error('Failed to submit threaded reply:', err);
		} finally {
			isSubmittingComment = false;
		}
	}

	async function handleRepost() {
		if (!$authStore.user || isReposting) return;
		isReposting = true;
		try {
			await activityService.repostActivity($authStore.user.id, activity.id);
		} finally {
			isReposting = false;
		}
	}
</script>

{#if activity && config}
	<div class="group relative flex gap-4 p-4 transition-all hover:bg-white/2">
		<!-- Left: Avatar & Connector -->
		<div class="flex flex-col items-center">
			<Avatar
				name={activity.profiles?.username || 'User'}
				src={activity.profiles?.avatar_url}
				size="sm"
				class="z-10 ring-2 ring-black transition-transform group-hover:scale-105"
			/>
			<div class="mt-2 w-px flex-1 bg-stroke/30 group-last:hidden"></div>
		</div>

		<!-- Right: Content -->
		<div class="min-w-0 flex-1 pb-4">
			<!-- Header -->
			<div class="mb-0.5 flex flex-wrap items-center gap-1.5">
				<span class="text-sm font-black text-content decoration-brand-orange/50 hover:underline">
					{activity.profiles?.username || 'Unknown'}
				</span>
				<span class="text-[13px] font-medium text-content-dim">
					{config.label}
				</span>
				<span class="text-[13px] text-content-dim/60">·</span>
				<span class="text-[13px] font-medium text-content-dim/60">
					{formatTime(activity.created_at)}
				</span>

				{#if activity.workspace_id}
					<div
						class="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brand-blue/20 bg-brand-blue/10 px-2.5 py-0.5"
					>
						<div class="h-1 w-1 animate-pulse rounded-full bg-brand-blue"></div>
						<span class="text-[10px] font-black tracking-wider text-brand-blue uppercase"
							>Workspace</span
						>
					</div>
				{/if}
			</div>

			<!-- Body -->
			<div
				class="text-[15px] leading-relaxed font-normal wrap-break-word whitespace-pre-wrap text-content/90"
			>
				{#if activity.repost_id}
					<div
						class="mb-3 border-l-2 border-brand-orange/30 py-1 pl-4 text-sm text-content-dim italic"
					>
						Reposted an activity from another Hub member
					</div>
				{/if}

				{#if activity.type === 'post' && activity.payload.content}
					<a href={resolve(`/dashboard/post/${activity.id}`)} class="group/text block">
						<p
							class="text-[15px] leading-relaxed whitespace-pre-wrap text-content transition-colors group-hover/text:text-content/80"
						>
							{activity.payload.content}
						</p>
					</a>
				{:else if activity.type !== 'post'}
					<div
						class="mt-2 flex items-center gap-3 rounded-2xl border border-stroke bg-surface-dim/50 p-3"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface shadow-inner"
						>
							<svg
								class="h-5 w-5 {config.color}"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={config.icon}
								/>
							</svg>
						</div>
						<div class="text-xs font-bold text-content-dim">Activity logged in the Hub</div>
					</div>
				{/if}

				{#if activity.poll}
					<div class="mt-3">
						<Poll poll={activity.poll} />
					</div>
				{/if}
			</div>

			<!-- Attachments Grid -->
			{#if attachments.length > 0}
				<div class="mt-3 grid grid-cols-1 gap-2 {attachments.length > 1 ? 'sm:grid-cols-2' : ''}">
					{#each attachments as att, i (att.url + i)}
						<div
							class="group/media relative overflow-hidden rounded-2xl border border-stroke bg-surface"
						>
							{#if att.type === 'image'}
								<img
									src={att.url}
									alt="Post media"
									class="max-h-[400px] w-full object-cover transition-transform duration-700 group-hover/media:scale-105"
									loading="lazy"
								/>
							{:else if att.type === 'video'}
								<!-- svelte-ignore a11y_media_has_caption -->
								<video
									src={att.url}
									class="max-h-[400px] w-full"
									controls
									playsinline
									preload="metadata"
								></video>
							{:else if att.type === 'link' && att.provider === 'youtube'}
								{@const ytId = getYouTubeId(att.url)}
								{#if ytId}
									<div class="aspect-video w-full">
										<iframe
											width="100%"
											height="100%"
											src="https://www.youtube.com/embed/{ytId}"
											title="YouTube video player"
											frameborder="0"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowfullscreen
										></iframe>
									</div>
								{:else}
									<a
										href={resolve(att.url as unknown as '/')}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-3 p-4 transition-colors hover:bg-white/5"
									>
										<div
											class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"
										>
											<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
												/>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M14.828 14.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.101"
												/>
											</svg>
										</div>
										<div class="min-w-0">
											<p class="truncate text-sm font-bold text-content">{att.url}</p>
											<p class="text-[10px] font-black tracking-widest text-content-dim uppercase">
												External Link
											</p>
										</div>
									</a>
								{/if}
							{:else if att.type === 'link'}
								<a
									href={resolve(att.url as unknown as '/')}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-3 p-4 transition-colors hover:bg-white/5"
								>
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-content-dim"
									>
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
									</div>
									<div class="min-w-0">
										<p class="truncate text-sm font-bold text-content">{att.url}</p>
										<p class="text-[10px] font-black tracking-widest text-content-dim uppercase">
											Visit Site
										</p>
									</div>
								</a>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Interactive Actions -->
			<div class="mt-4 flex items-center gap-8">
				<button
					onclick={toggleComments}
					class="group/btn flex items-center gap-2 text-content-dim/60 transition-colors hover:text-brand-orange {showComments
						? 'text-brand-orange'
						: ''}"
				>
					<div class="rounded-full p-2 group-hover/btn:bg-brand-orange/10">
						<svg
							class="h-4 w-4"
							fill={showComments ? 'currentColor' : 'none'}
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
							/>
						</svg>
					</div>
					<span class="text-xs font-bold">{activity.comments_count || 0}</span>
				</button>

				<button
					onclick={handleRepost}
					disabled={isReposting}
					class="group/btn flex items-center gap-2 text-content-dim/60 transition-colors hover:text-green-500 {activity.user_reposted
						? 'text-green-500'
						: ''}"
				>
					<div class="rounded-full p-2 group-hover/btn:bg-green-500/10">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
							/>
						</svg>
					</div>
					<span class="text-xs font-bold">{activity.reposts_count || 0}</span>
				</button>

				<button
					onclick={handleLike}
					disabled={isLiking}
					class="group/btn flex items-center gap-2 text-content-dim/60 transition-colors hover:text-red-500 {activity.user_liked
						? 'text-red-500'
						: ''}"
				>
					<div class="rounded-full p-2 group-hover/btn:bg-red-500/10">
						<svg
							class="h-4 w-4"
							fill={activity.user_liked ? 'currentColor' : 'none'}
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/>
						</svg>
					</div>
					<span class="text-xs font-bold">{activity.likes_count || 0}</span>
				</button>
			</div>

			<!-- Comment Section -->
			{#if showComments}
				<div transition:slide class="mt-4 space-y-4 border-t border-stroke/30 pt-4">
					<div class="flex gap-3">
						<Avatar name={$authStore.user?.user_metadata?.username || 'Me'} size="xs" />
						<div class="flex-1">
							<textarea
								bind:value={newComment}
								placeholder="Post your reply"
								class="min-h-[40px] w-full resize-none border-none bg-transparent text-sm text-content outline-none placeholder:text-content-dim/40"
							></textarea>
							<div class="mt-2 flex justify-end">
								<button
									onclick={submitComment}
									disabled={!newComment.trim() || isSubmittingComment}
									class="rounded-full bg-brand-orange px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-brand-orange/90 disabled:opacity-50"
								>
									{isSubmittingComment ? 'Sending...' : 'Reply'}
								</button>
							</div>
						</div>
					</div>

					{#each comments as comment (comment.id)}
						<div transition:fade class="group/reply flex gap-3 py-3">
							<Avatar
								name={comment.profiles?.username || 'User'}
								src={comment.profiles?.avatar_url}
								size="xs"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="text-xs font-bold text-content">{comment.profiles?.username}</span>
									<span class="text-[10px] text-content-dim">{formatTime(comment.created_at)}</span>
								</div>
								<p class="mt-1 text-sm text-content/80">
									{(comment.payload as unknown as PostPayload)?.content || ''}
								</p>
								<div class="mt-2 flex items-center gap-4">
									<button
										onclick={() =>
											activityService.toggleLike(
												$authStore.user?.id || '',
												comment.id,
												comment.user_liked
											)}
										class="flex items-center gap-1.5 text-[10px] font-bold {comment.user_liked
											? 'text-red-500'
											: 'text-content-dim hover:text-red-500'} transition-colors"
									>
										<svg
											class="h-3 w-3"
											fill={comment.user_liked ? 'currentColor' : 'none'}
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
											/>
										</svg>
										{comment.likes_count || 0}
									</button>
								</div>
							</div>
						</div>
					{:else}
						{#if !isSubmittingComment}
							<p class="text-xs text-center text-content-dim/40 py-4 italic">
								No replies yet. Be the first!
							</p>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
