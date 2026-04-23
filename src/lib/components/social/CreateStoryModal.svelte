<script lang="ts">
	import { authStore } from '$lib/stores/authStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { storyService, type StoryInsert } from '$lib/services/storyService';
	import { cloudinaryService } from '$lib/services/cloudinary';
	import { slide } from 'svelte/transition';
	import Modal from '../ui/Modal.svelte';
	import Button from '../ui/Button.svelte';

	let { show = $bindable(), onsuccess } = $props<{
		show: boolean;
		onsuccess: () => void;
	}>();

	let mode = $state<'media' | 'text'>('media');
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let textContent = $state('');
	let caption = $state('');
	let activeGradient = $state('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
	let activeFont = $state('Inter');
	let isUploading = $state(false);
	let isGeneratingAlt = $state(false);
	let error = $state<string | null>(null);
	let generatedAltText = $state<string | null>(null);

	const gradients = [
		'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
		'linear-gradient(135deg, #1D2671 0%, #C33764 100%)',
		'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
		'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
		'linear-gradient(135deg, #f8ff00 0%, #3ad59f 100%)'
	];

	let customColor = $state('#f97316');

	const fonts = ['Inter', 'Outfit', 'Space Grotesk', 'Playfair Display', 'Permanent Marker'];

	let scope = $state<'global' | 'workspace'>('global');

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		selectedFile = file;
		previewUrl = URL.createObjectURL(file);
		error = null;
	}

	async function generateAiCaption() {
		if (!selectedFile) return;
		isGeneratingAlt = true;
		error = null;

		try {
			// 1. Upload to Cloudinary first to get a URL
			const uploadResult = await cloudinaryService.uploadFile(selectedFile, {
				folder: 'stories_temp'
			});
			const imageUrl = uploadResult.secure_url;

			// 2. Generate alt text and caption
			const [alt, aiCaption] = await Promise.all([
				storyService.generateMediaMetadata(imageUrl, 'alt-text'),
				storyService.generateMediaMetadata(imageUrl, 'caption')
			]);

			generatedAltText = alt;
			caption = aiCaption;
		} catch (err: unknown) {
			console.error('[AI:Caption] Error:', err);
			error = 'AI failed to analyze image.';
		} finally {
			isGeneratingAlt = false;
		}
	}

	async function handleSubmit() {
		if (!$authStore.user) return;
		if (mode === 'media' && !selectedFile) return;
		if (mode === 'text' && !textContent.trim()) return;

		isUploading = true;
		error = null;

		try {
			let mediaUrl: string | null = null;
			let mediaType: 'image' | 'video' | 'text' = 'image';

			if (mode === 'media' && selectedFile) {
				const uploadResult = await cloudinaryService.uploadFile(selectedFile, {
					folder: 'stories',
					tags: ['story', scope]
				});
				mediaUrl = uploadResult.secure_url;
				mediaType = uploadResult.resource_type === 'video' ? 'video' : 'image';
			} else {
				mediaType = 'text';
			}

			// If we haven't generated alt text yet and it's an image, try to do it now
			if (mediaType === 'image' && mediaUrl && !generatedAltText) {
				try {
					generatedAltText = await storyService.generateMediaMetadata(mediaUrl, 'alt-text');
				} catch (e) {
					console.warn('Auto-alt generation failed during upload', e);
				}
			}

			await storyService.createStory({
				user_id: $authStore.user.id,
				media_url: mediaUrl,
				media_type: mediaType,
				content: mode === 'text' ? textContent : caption || null,
				alt_text: generatedAltText,
				workspace_id: scope === 'workspace' ? $workspaceStore.currentWorkspace?.id : null,
				background_gradient: mode === 'text' ? activeGradient : null,
				font_family: mode === 'text' ? activeFont : null
			} as StoryInsert);

			show = false;
			reset();
			onsuccess();
		} catch (err: unknown) {
			console.error('[CreateStory] Error:', err);
			error = err instanceof Error ? err.message : 'Failed to share story';
		} finally {
			isUploading = false;
		}
	}

	function reset() {
		mode = 'media';
		selectedFile = null;
		previewUrl = null;
		textContent = '';
		caption = '';
		generatedAltText = null;
		isUploading = false;
		isGeneratingAlt = false;
		error = null;
	}
</script>

<Modal bind:show title="Share a Story">
	<div class="scrollbar-hide max-h-[75vh] space-y-6 overflow-y-auto p-1 pb-20">
		<!-- Mode Toggle -->
		<div class="flex items-center gap-2 rounded-2xl border border-stroke bg-surface-dim p-1.5">
			<button
				class="flex-1 rounded-xl px-4 py-2 text-xs font-bold transition-all {mode === 'media'
					? 'bg-surface text-content shadow-lg ring-1 ring-stroke'
					: 'text-content-dim hover:text-content'}"
				onclick={() => (mode = 'media')}
			>
				Photo / Video
			</button>
			<button
				class="flex-1 rounded-xl px-4 py-2 text-xs font-bold transition-all {mode === 'text'
					? 'bg-surface text-content shadow-lg ring-1 ring-stroke'
					: 'text-content-dim hover:text-content'}"
				onclick={() => (mode = 'text')}
			>
				Text Story
			</button>
		</div>

		<!-- Main Content Area -->
		{#if mode === 'media'}
			<div class="flex flex-col gap-4">
				{#if previewUrl}
					<div
						class="group relative mx-auto aspect-9/16 max-h-[400px] w-full overflow-hidden rounded-3xl border border-stroke bg-zinc-900 shadow-2xl"
					>
						{#if selectedFile?.type.startsWith('video')}
							<video
								src={previewUrl}
								class="h-full w-full object-cover"
								autoplay
								muted
								loop
								playsinline
							></video>
						{:else}
							<img src={previewUrl} alt="Preview" class="h-full w-full object-cover" />
						{/if}
						<button
							onclick={() => {
								selectedFile = null;
								previewUrl = null;
							}}
							class="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:bg-red-500"
							aria-label="Remove media"
							title="Remove media"
						>
							✕
						</button>
					</div>
					<div class="relative">
						<textarea
							bind:value={caption}
							placeholder="Add a caption..."
							class="w-full resize-none rounded-2xl border border-stroke bg-surface-dim p-4 pr-12 text-sm text-content transition-all outline-none focus:border-brand-orange"
							rows="2"
						></textarea>
						<button
							class="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange transition-all hover:bg-brand-orange hover:text-white disabled:animate-pulse disabled:opacity-50"
							onclick={generateAiCaption}
							disabled={isGeneratingAlt}
							title="Auto-generate caption & alt-text"
						>
							{#if isGeneratingAlt}
								<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
										fill="none"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							{:else}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>

					{#if generatedAltText}
						<div
							class="rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-3"
							transition:slide
						>
							<p class="mb-1 text-[10px] font-bold tracking-widest text-brand-orange uppercase">
								AI Alt-Text
							</p>
							<p class="text-[11px] leading-relaxed text-content">
								{generatedAltText}
							</p>
						</div>
					{/if}
				{:else}
					<label
						class="mx-auto flex aspect-9/16 max-h-[400px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-stroke bg-surface-dim transition-all hover:border-brand-orange hover:bg-surface-dim/80"
					>
						<div
							class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange"
						>
							<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</div>
						<div class="text-center">
							<p class="text-sm font-bold text-content">Select Photo or Video</p>
							<p class="text-xs text-content-dim">Up to 10MB</p>
						</div>
						<input
							type="file"
							accept="image/*,video/*"
							class="hidden"
							onchange={handleFileSelect}
						/>
					</label>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col gap-6">
				<div
					class="mx-auto flex aspect-9/16 max-h-[400px] w-full items-center justify-center rounded-3xl border border-stroke p-8 text-center shadow-2xl transition-all duration-500"
					style="background: {activeGradient}"
				>
					<textarea
						bind:value={textContent}
						placeholder="Type something..."
						class="w-full bg-transparent text-center text-2xl font-black text-white outline-none placeholder:text-white/30"
						style="font-family: {activeFont}"
						rows="4"
					></textarea>
				</div>

				<div class="space-y-4">
					<div class="flex flex-wrap gap-2">
						{#each gradients as g (g)}
							<button
								class="h-10 w-10 rounded-xl border-2 transition-all {activeGradient === g
									? 'scale-110 border-white shadow-lg'
									: 'border-transparent opacity-60 hover:opacity-100'}"
								style="background: {g}"
								onclick={() => (activeGradient = g)}
								aria-label="Select gradient"
								title="Select background style"
							></button>
						{/each}

						<!-- Custom Color Picker -->
						<div class="relative h-10 w-10">
							<input
								type="color"
								bind:value={customColor}
								oninput={() => (activeGradient = customColor)}
								class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
								title="Choose custom color"
							/>
							<div
								class="flex h-full w-full items-center justify-center rounded-xl border-2 border-stroke bg-surface-dim transition-all hover:border-brand-orange"
								style="background: {!gradients.includes(activeGradient)
									? activeGradient
									: 'transparent'}"
							>
								{#if gradients.includes(activeGradient)}
									<svg
										class="h-5 w-5 text-content-dim"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="3"
											d="M12 4v16m8-8H4"
										/>
									</svg>
								{/if}
							</div>
						</div>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each fonts as f (f)}
							<button
								class="rounded-xl border border-stroke bg-surface-dim px-3 py-1.5 text-xs font-bold transition-all {activeFont ===
								f
									? 'bg-surface text-brand-orange shadow-md ring-1 ring-brand-orange'
									: 'text-content-dim hover:text-content'}"
								style="font-family: {f}"
								onclick={() => (activeFont = f)}
							>
								{f}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Visibility -->
		{#if $workspaceStore.currentWorkspace}
			<div
				class="flex items-center justify-between rounded-2xl border border-stroke bg-surface-dim p-4 transition-all {isUploading
					? 'pointer-events-none opacity-50'
					: ''}"
			>
				<div class="flex flex-col">
					<span class="text-sm font-bold text-content">Visibility</span>
					<span class="text-[10px] font-black tracking-widest text-content-dim uppercase"
						>Who can see this</span
					>
				</div>
				<div class="flex gap-2">
					<button
						class="rounded-md px-4 py-2 text-[10px] font-bold transition-all {scope === 'global'
							? 'bg-zinc-800 text-white shadow-lg'
							: 'text-content-dim hover:text-content'}"
						onclick={() => (scope = 'global')}
					>
						Global
					</button>
					<button
						class="rounded-md px-4 py-2 text-[10px] font-bold transition-all {scope === 'workspace'
							? 'bg-brand-blue text-white shadow-lg'
							: 'text-content-dim hover:text-content'}"
						onclick={() => (scope = 'workspace')}
					>
						{$workspaceStore.currentWorkspace.name}
					</button>
				</div>
			</div>
		{/if}

		{#if error}
			<p
				class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-500"
			>
				{error}
			</p>
		{/if}

		<Button
			variant="primary"
			loading={isUploading}
			disabled={isUploading ||
				(mode === 'media' && !selectedFile) ||
				(mode === 'text' && !textContent.trim())}
			onclick={handleSubmit}
		>
			Share Story
		</Button>
	</div>
</Modal>
