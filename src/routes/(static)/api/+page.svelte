<div class="prose">
	<h1 class="text-white">Developer <span class="text-brand-blue">API</span></h1>

	<section>
		<p>
			Integrate your tools, bots, and agents directly into the Hub. Our API is built for
			high-performance, real-time communication between your local workspace and the NeuroHub cloud.
		</p>
	</section>

	<section class="rounded-3xl border border-white/5 bg-white/2 p-8 md:p-12">
		<h2 class="mt-0! text-sm font-black tracking-widest text-brand-orange uppercase">
			Neural Core
		</h2>
		<h2>AI Capabilities</h2>
		<p>
			Leverage our Neural Core to build AI-aware integrations. Our inference API provides access to
			specialized models optimized for development tasks, code drafting, and system architecture.
		</p>
		<ul class="space-y-4 text-lg text-zinc-500">
			<li class="flex items-center gap-3">
				<div class="h-1.5 w-1.5 rounded-full bg-brand-orange"></div>
				Structured JSON output for code analysis
			</li>
			<li class="flex items-center gap-3">
				<div class="h-1.5 w-1.5 rounded-full bg-brand-orange"></div>
				Context-aware drafting via the NeuroCanvas
			</li>
			<li class="flex items-center gap-3">
				<div class="h-1.5 w-1.5 rounded-full bg-brand-orange"></div>
				Real-time streaming for agentic interactions
			</li>
		</ul>
	</section>

	<section class="mt-16">
		<h2>General Integration</h2>
		<p>
			Use our REST and WebSocket endpoints to sync your internal tools. Whether it's custom webhooks
			for your CI/CD pipeline or a dedicated dashboard for your team's metrics, NeuroHub scales with
			your stack.
		</p>
		<pre class="overflow-x-auto rounded-2xl bg-zinc-900/50 p-6 text-sm text-brand-blue">
<code
				>GET /api/v1/workspaces/&#123;id&#125;/pulse
&#123;
  "status": "active",
  "neural_load": 0.42,
  "active_collaborators": 12
&#125;</code
			></pre>
	</section>

	<section class="mt-20 text-center">
		<p class="text-sm font-bold text-zinc-600">Full documentation coming soon in Phase 2.</p>
	</section>
</div>
