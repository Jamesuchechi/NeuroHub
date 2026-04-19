<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState, Compartment } from '@codemirror/state';
	import { oneDark } from '@codemirror/theme-one-dark';

	import { javascript } from '@codemirror/lang-javascript';
	import { python } from '@codemirror/lang-python';
	import { rust } from '@codemirror/lang-rust';
	import { cpp } from '@codemirror/lang-cpp';
	import { java } from '@codemirror/lang-java';
	import { sql } from '@codemirror/lang-sql';
	import { html } from '@codemirror/lang-html';
	import { css } from '@codemirror/lang-css';
	import { json } from '@codemirror/lang-json';
	import { markdown } from '@codemirror/lang-markdown';
	import { yaml } from '@codemirror/lang-yaml';
	import { go } from '@codemirror/lang-go';
	import { php } from '@codemirror/lang-php';
	import { vue } from '@codemirror/lang-vue';
	import { StreamLanguage } from '@codemirror/language';
	import { ruby } from '@codemirror/legacy-modes/mode/ruby';
	import { shell } from '@codemirror/legacy-modes/mode/shell';
	import { swift } from '@codemirror/legacy-modes/mode/swift';
	import { clojure } from '@codemirror/legacy-modes/mode/clojure';
	import { haskell } from '@codemirror/legacy-modes/mode/haskell';
	import { perl } from '@codemirror/legacy-modes/mode/perl';
	import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
	import { dart, scala, objectiveC } from '@codemirror/legacy-modes/mode/clike';
	import { r } from '@codemirror/legacy-modes/mode/r';
	import { cmake } from '@codemirror/legacy-modes/mode/cmake';

	import type { Language } from '$lib/types/devtools';

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

	let editorDiv: HTMLDivElement;
	let view: EditorView;
	let languageCompartment = new Compartment();
	let readonlyCompartment = new Compartment();
	let themeCompartment = new Compartment();

	function getLangExtension(lang: Language) {
		if (lang === 'python') return python();
		if (lang === 'rust') return rust();
		if (lang === 'cpp' || lang === 'c') return cpp();
		if (lang === 'java' || lang === 'kotlin') return java();
		if (lang === 'sql') return sql();
		if (lang === 'html') return html();
		if (lang === 'css') return css();
		if (lang === 'json') return json();
		if (lang === 'markdown') return markdown();
		if (lang === 'yaml') return yaml();
		if (lang === 'go') return go();
		if (lang === 'php') return php();
		if (lang === 'vue') return vue();

		// Legacy Modes
		if (lang === 'ruby') return StreamLanguage.define(ruby);
		if (lang === 'shell') return StreamLanguage.define(shell);
		if (lang === 'swift') return StreamLanguage.define(swift);
		if (lang === 'clojure') return StreamLanguage.define(clojure);
		if (lang === 'haskell') return StreamLanguage.define(haskell);
		if (lang === 'perl') return StreamLanguage.define(perl);
		if (lang === 'powershell') return StreamLanguage.define(powerShell);
		if (lang === 'r') return StreamLanguage.define(r);
		if (lang === 'cmake') return StreamLanguage.define(cmake);
		if (lang === 'dart') return StreamLanguage.define(dart);
		if (lang === 'scala') return StreamLanguage.define(scala);
		if (lang === 'objectivec') return StreamLanguage.define(objectiveC);

		// Default to js/ts families
		return javascript({
			typescript: ['typescript', 'tsx'].includes(lang),
			jsx: ['jsx', 'tsx'].includes(lang)
		});
	}

	function createView(initialCode: string, initialLang: Language, isReadonly: boolean) {
		if (view) view.destroy();

		let isDark = false;
		if (typeof document !== 'undefined') {
			isDark = document.documentElement.classList.contains('dark');
		}

		const extensions = [
			basicSetup,
			languageCompartment.of(getLangExtension(initialLang)),
			readonlyCompartment.of(EditorState.readOnly.of(isReadonly)),
			themeCompartment.of(isDark ? oneDark : []),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					const newDoc = update.state.doc.toString();
					// Prevent redundant updates that might move cursor or lose focus
					if (newDoc !== code) {
						untrack(() => {
							code = newDoc;
							onchange?.(newDoc);
						});
					}
				}
			}),
			EditorView.theme({
				'&': { minHeight },
				'.cm-scroller': { overflow: 'auto' }
			})
		];

		const state = EditorState.create({
			doc: initialCode,
			extensions
		});

		view = new EditorView({
			state,
			parent: editorDiv
		});
	}

	onMount(() => {
		createView(code, language, readonly);

		// Observe theme changes
		const observer = new MutationObserver(() => {
			if (view) {
				const isDark = document.documentElement.classList.contains('dark');
				view.dispatch({
					effects: themeCompartment.reconfigure(isDark ? oneDark : [])
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
		// Update language extension without destroying the view
		if (view) {
			view.dispatch({
				effects: languageCompartment.reconfigure(getLangExtension(language))
			});
		}
	});

	$effect(() => {
		// Update readonly state without destroying the view
		if (view) {
			view.dispatch({
				effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(readonly))
			});
		}
	});

	$effect(() => {
		// If code is updated externally, sync it
		if (view && code !== view.state.doc.toString()) {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: code }
			});
		}
	});
</script>

<div class="border-border flex flex-col overflow-hidden rounded-lg border text-sm {className}">
	<div bind:this={editorDiv} class="w-full flex-1" style="min-height: {minHeight};"></div>
</div>

<style>
	/* Ensure CodeMirror takes full height if flexed */
	:global(.cm-editor) {
		height: 100%;
		outline: none !important;
	}
</style>
