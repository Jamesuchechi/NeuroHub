<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Language } from '$lib/types/devtools';
	import { type EditorView, type ViewUpdate } from '@codemirror/view';
	import { type basicSetup } from 'codemirror';
	import type { EditorState, Compartment } from '@codemirror/state';
	import type { oneDark } from '@codemirror/theme-one-dark';
	import type { StreamLanguage } from '@codemirror/language';

	let {
		code = $bindable(''),
		language = 'javascript',
		readonly = false,
		minHeight = '200px',
		class: className = '',
		onchange
	} = $props<{
		code?: string;
		language?: Language;
		readonly?: boolean;
		minHeight?: string;
		class?: string;
		onchange?: (code: string) => void;
	}>();

	interface CodeMirrorModules {
		EditorView: typeof EditorView;
		basicSetup: typeof basicSetup;
		EditorState: typeof EditorState;
		Compartment: typeof Compartment;
		oneDark: typeof oneDark;
		StreamLanguage: typeof StreamLanguage;
	}

	let editorDiv: HTMLDivElement;
	let view: EditorView | null = null;
	let compartments: Record<string, Compartment> = {};
	let CM: CodeMirrorModules | null = null;
	let loading = $state(true);

	async function loadCodeMirror() {
		try {
			const [
				{ EditorView, basicSetup },
				{ EditorState, Compartment },
				{ oneDark },
				{ StreamLanguage }
			] = await Promise.all([
				import('codemirror'),
				import('@codemirror/state'),
				import('@codemirror/theme-one-dark'),
				import('@codemirror/language')
			]);

			CM = { EditorView, basicSetup, EditorState, Compartment, oneDark, StreamLanguage };
			compartments = {
				language: new Compartment(),
				readonly: new Compartment(),
				theme: new Compartment()
			};

			loading = false;
			// Initial creation
			createView(code, language, readonly);
		} catch (err) {
			console.error('Failed to load CodeMirror:', err);
		}
	}

	async function getLangExtension(lang: Language) {
		if (!CM) return [];

		// Dynamic language imports
		switch (lang) {
			case 'python':
				return (await import('@codemirror/lang-python')).python();
			case 'rust':
				return (await import('@codemirror/lang-rust')).rust();
			case 'cpp':
			case 'c':
				return (await import('@codemirror/lang-cpp')).cpp();
			case 'java':
			case 'kotlin':
				return (await import('@codemirror/lang-java')).java();
			case 'sql':
				return (await import('@codemirror/lang-sql')).sql();
			case 'html':
				return (await import('@codemirror/lang-html')).html();
			case 'css':
				return (await import('@codemirror/lang-css')).css();
			case 'json':
				return (await import('@codemirror/lang-json')).json();
			case 'markdown':
				return (await import('@codemirror/lang-markdown')).markdown();
			case 'yaml':
				return (await import('@codemirror/lang-yaml')).yaml();
			case 'go':
				return (await import('@codemirror/lang-go')).go();
			case 'php':
				return (await import('@codemirror/lang-php')).php();
			case 'vue':
				return (await import('@codemirror/lang-vue')).vue();

			// Legacy Modes
			case 'ruby': {
				const { ruby } = await import('@codemirror/legacy-modes/mode/ruby');
				return CM.StreamLanguage.define(ruby);
			}
			case 'shell': {
				const { shell } = await import('@codemirror/legacy-modes/mode/shell');
				return CM.StreamLanguage.define(shell);
			}
			case 'swift': {
				const { swift } = await import('@codemirror/legacy-modes/mode/swift');
				return CM.StreamLanguage.define(swift);
			}
			case 'clojure': {
				const { clojure } = await import('@codemirror/legacy-modes/mode/clojure');
				return CM.StreamLanguage.define(clojure);
			}
			case 'haskell': {
				const { haskell } = await import('@codemirror/legacy-modes/mode/haskell');
				return CM.StreamLanguage.define(haskell);
			}
			case 'perl': {
				const { perl } = await import('@codemirror/legacy-modes/mode/perl');
				return CM.StreamLanguage.define(perl);
			}
			case 'powershell': {
				const { powerShell } = await import('@codemirror/legacy-modes/mode/powershell');
				return CM.StreamLanguage.define(powerShell);
			}
			case 'r': {
				const { r } = await import('@codemirror/legacy-modes/mode/r');
				return CM.StreamLanguage.define(r);
			}
			case 'cmake': {
				const { cmake } = await import('@codemirror/legacy-modes/mode/cmake');
				return CM.StreamLanguage.define(cmake);
			}
			case 'dart': {
				const { dart } = await import('@codemirror/legacy-modes/mode/clike');
				return CM.StreamLanguage.define(dart);
			}
			case 'scala': {
				const { scala } = await import('@codemirror/legacy-modes/mode/clike');
				return CM.StreamLanguage.define(scala);
			}
			case 'objectivec': {
				const { objectiveC } = await import('@codemirror/legacy-modes/mode/clike');
				return CM.StreamLanguage.define(objectiveC);
			}

			default: {
				const { javascript } = await import('@codemirror/lang-javascript');
				return javascript({
					typescript: ['typescript', 'tsx'].includes(lang),
					jsx: ['jsx', 'tsx'].includes(lang)
				});
			}
		}
	}

	async function createView(initialCode: string, initialLang: Language, isReadonly: boolean) {
		if (!CM || !editorDiv) return;
		if (view) view.destroy();

		let isDark = false;
		if (typeof document !== 'undefined') {
			isDark = document.documentElement.classList.contains('dark');
		}

		const langExt = await getLangExtension(initialLang);

		const extensions = [
			CM.basicSetup,
			compartments.language.of(langExt),
			compartments.readonly.of(CM.EditorState.readOnly.of(isReadonly)),
			compartments.theme.of(isDark ? CM.oneDark : []),
			CM.EditorView.updateListener.of((update: ViewUpdate) => {
				if (update.docChanged) {
					const newDoc = update.state.doc.toString();
					if (newDoc !== code) {
						untrack(() => {
							code = newDoc;
							onchange?.(newDoc);
						});
					}
				}
			}),
			CM.EditorView.theme({
				'&': { minHeight },
				'.cm-scroller': { overflow: 'auto' }
			})
		];

		const state = CM.EditorState.create({
			doc: initialCode,
			extensions
		});

		view = new CM.EditorView({
			state,
			parent: editorDiv
		});
	}

	onMount(() => {
		loadCodeMirror();

		// Observe theme changes
		const observer = new MutationObserver(() => {
			if (view && CM) {
				const isDark = document.documentElement.classList.contains('dark');
				view.dispatch({
					effects: compartments.theme.reconfigure(isDark ? CM.oneDark : [])
				});
			}
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		return () => {
			if (view) view.destroy();
			observer.disconnect();
		};
	});

	$effect(() => {
		// Update language extension
		if (view && CM && language) {
			const currentView = view;
			getLangExtension(language).then((ext) => {
				if (currentView) {
					currentView.dispatch({
						effects: compartments.language.reconfigure(ext)
					});
				}
			});
		}
	});

	$effect(() => {
		// Update readonly state
		if (view && CM) {
			view.dispatch({
				effects: compartments.readonly.reconfigure(CM.EditorState.readOnly.of(readonly))
			});
		}
	});

	$effect(() => {
		// Sync external code changes
		if (view && CM && code !== view.state.doc.toString()) {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: code }
			});
		}
	});
</script>

<div class="border-border flex flex-col overflow-hidden rounded-lg border text-sm {className}">
	{#if loading}
		<div
			class="flex items-center justify-center bg-surface-dim/30"
			style="min-height: {minHeight};"
		>
			<div class="flex flex-col items-center gap-3">
				<div
					class="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
				></div>
				<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
					>Initializing Editor...</span
				>
			</div>
		</div>
	{/if}

	<div
		bind:this={editorDiv}
		class="w-full flex-1 {loading ? 'hidden' : ''}"
		style="min-height: {minHeight};"
	></div>
</div>

<style>
	:global(.cm-editor) {
		height: 100%;
		outline: none !important;
	}
</style>
