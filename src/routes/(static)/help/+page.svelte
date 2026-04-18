<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="prose">
	<h1 class="text-white">Help <span class="text-zinc-600">Center</span></h1>

	<section>
		<p>
			Need assistance inside the Hub? We've gathered the most common questions and troubleshooting
			guides to keep you building.
		</p>
	</section>

	<div class="grid gap-6 md:grid-cols-2">
		<div
			class="rounded-3xl border border-white/5 bg-white/2 p-8 transition-colors hover:border-brand-orange/30"
		>
			<h3 class="mb-4 font-bold text-white">Onboarding</h3>
			<p class="text-sm text-zinc-500">
				Setting up your profile, choosing your stack, and inviting your first collaborator.
			</p>
		</div>
		<div
			class="rounded-3xl border border-white/5 bg-white/2 p-8 transition-colors hover:border-brand-blue/30"
		>
			<h3 class="mb-4 font-bold text-white">Workspaces</h3>
			<p class="text-sm text-zinc-500">
				Managing repositories, setting permissions, and using the real-time activity feed.
			</p>
		</div>
		<div
			class="rounded-3xl border border-white/5 bg-white/2 p-8 transition-colors hover:border-zinc-500/30"
		>
			<h3 class="mb-4 font-bold text-white">Neural Core</h3>
			<p class="text-sm text-zinc-500">
				Understanding AI-assisted features, memory management, and agentic workflows.
			</p>
		</div>
		<div
			class="rounded-3xl border border-white/5 bg-white/2 p-8 transition-colors hover:border-zinc-500/30"
		>
			<h3 class="mb-4 font-bold text-white">Billing</h3>
			<p class="text-sm text-zinc-500">
				Subscription management for teams and enterprise billing details.
			</p>
		</div>
	</div>

	<section class="mt-20">
		<h2 id="faq">Frequent Questions</h2>
		<div class="space-y-12">
			<div>
				<h3 class="mb-2 text-lg font-bold text-white">How do I verify my account?</h3>
				<p class="text-zinc-500">
					Registration requires a valid email. You'll receive a confirmation link that activates
					your workspace immediately.
				</p>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-bold text-white">Is NeuroHub free for individuals?</h3>
				<p class="text-zinc-500">
					Yes, the Core features of NeuroHub are free for individual developers building open-source
					projects.
				</p>
			</div>
		</div>
	</section>

	<section class="mt-24 border-t border-white/5 pt-12 text-center">
		<p class="text-zinc-500">Can't find what you're looking for?</p>
		<a
			href={resolve('/contact' as unknown as '/')}
			class="mt-4 inline-block font-black text-brand-orange hover:underline">Speak with a human</a
		>
	</section>
</div>
