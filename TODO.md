# NeuroHub — Build Phases & Task Tracker

> AI-powered collaborative workspace for developers  
> Stack: SvelteKit · Supabase · OpenAI/Groq · TailwindCSS · TypeScript

---

## Project Vision

NeuroHub is a unified developer workspace that fuses real-time team communication, collaborative knowledge management, dev tooling (snippets, API testing), and an AI layer that understands your team's context. Think Slack + Notion + Cursor — built for dev teams, owned by you.

---

## Architecture Overview

```
Frontend          Backend / Infra        AI Layer
─────────────     ────────────────────   ──────────────────
SvelteKit SSR     Supabase Postgres      OpenAI / Groq API
Svelte Stores     Supabase Realtime      Vercel AI SDK
TailwindCSS       Supabase Auth          Context Builder
TanStack Query    Supabase Storage       pgvector (semantic)
Prism.js          Supabase Edge Fns      Streaming responses
```

---

## Phase 0 — Project Setup & Foundations

**Target: Day 1–2**

### Repository & Tooling

- [x] Init SvelteKit project with TypeScript (`npm create svelte@latest neurohub`)
- [x] Configure Tailwind CSS + `@tailwindcss/typography`
- [x] Setup ESLint + Prettier + Husky pre-commit hooks
- [x] Configure path aliases (`$lib`, `$stores`, `$components`, `$services`)
- [x] Setup Vitest for unit tests
- [x] Setup Playwright for E2E tests
- [x] Init GitHub repo, configure branch protection on `main`
- [x] Setup GitHub Actions CI pipeline (lint → test → build)

### Supabase Project Init

- [x] Create Supabase project (choose region closest to users)
- [x] Install Supabase CLI, link local project
- [x] Enable Supabase Auth (email/password + OAuth: GitHub, Google)
- [x] Run `supabase gen types typescript` and configure auto-generation in CI
- [x] Setup local Supabase dev environment with `supabase start`

### Environment & Config

- [x] Configure `.env.local` with all Supabase + AI API keys
- [x] Setup environment validation with `zod` on app startup
- [x] Create `src/lib/config.ts` for typed runtime config

---

## Phase 1 — Identity, Auth & Workspaces

**Target: Week 1**

### Database Schema — Auth & Workspaces

- [x] Create `profiles` table (id, username, avatar_url, bio, created_at)
- [x] Create `workspaces` table (id, name, slug, description, owner_id, logo_url, created_at)
- [x] Create `workspace_members` table (workspace_id, user_id, role: enum `owner|member|guest`, joined_at)
- [x] Create `workspace_invites` table (id, workspace_id, email, token, role, expires_at, used_at)
- [x] Write RLS policies for all tables (owners write all, members read, guests limited read)

### RBAC System (Supabase Custom Claims)

- [x] Create `user_roles` enum type in Postgres
- [x] Write Postgres function `get_user_role(workspace_id)` using JWT claims
- [x] Create auth hook (Supabase DB webhook) to inject `workspace_roles` map into JWT on sign-in
- [x] Write RLS helper function `authorize(permission text)` for policy reuse
- [x] Test RBAC with Supabase SQL editor — verify role isolation

### Auth UI & Flows

- [x] Build `/login` page (email/password + OAuth buttons)
- [x] Build `/register` page with username selection
- [x] Build `/forgot-password` and `/reset-password` flows
- [x] Implement auth guard `+layout.svelte` for `(auth)` group
- [x] Setup `hooks.client.ts` for auth state listener (`onAuthStateChange`)
- [x] Create `authStore.ts` with current user, session, loading state

### Workspace Management

- [x] Build `/dashboard` page — list workspaces, create new button
- [x] Build workspace creation modal (name, slug, description, logo upload)
- [x] Implement workspace slug uniqueness validation (debounced check)
- [x] Build `/workspace/[slug]/settings` page (update name, logo, danger zone: delete)
- [x] Build members management UI (list members, change roles, remove)
- [x] Implement invite-by-email flow (send token, `/invite/[token]` accept page)
- [x] Add multi-factor auth (Supabase MFA — TOTP)

### State Management Foundation

- [x] Create `workspaceStore.ts` (current workspace, members, role)
- [x] Create `userStore.ts` (profile, preferences)
- [x] Setup `getContext`/`setContext` pattern in root layout to avoid prop drilling

---

## Phase 2 — Core Layout & Navigation

**Status: Completed ✅**

### App Shell

- [x] Build root `+layout.svelte` with three-panel layout:
  - Left: Fixed sidebar (workspace switcher, nav icons)
  - Center: Main content area
  - Right: Context panel (collapsible)
- [x] Implement `SplitPane.svelte` resizable panels with drag handle
- [x] Build collapsible sidebar with smooth CSS transitions
- [x] Implement keyboard shortcuts system (`cmd+K` command palette, `cmd+/` shortcuts modal)

### Sidebar Navigation

- [x] Workspace switcher dropdown (recent workspaces, add workspace)
- [x] Channel list section with collapse/expand
- [x] Notes section shortcut
- [x] Snippets section shortcut
- [x] Settings gear icon at bottom
- [x] User avatar + presence indicator at bottom

### Command Palette (`cmd+K`)

- [x] Build `CommandPalette.svelte` modal with fuzzy search
- [x] Commands: navigate to channel, open note, search snippets, invite member
- [x] Keyboard navigation (arrows, enter, escape)
- [x] Recent items history

### Theming

- [x] Setup Tailwind dark mode (class strategy)
- [x] Build theme toggle (light/dark/system) stored in `localStorage`
- [x] Define CSS custom properties for brand colors
- [x] Create design token file `src/lib/tokens.ts`

### Empty States & Loading

- [x] Design empty state components (no channels, no notes, no snippets)
- [x] Build skeleton loader components (ChatSkeleton, NoteSkeleton, SnippetSkeleton)
- [x] Build global error boundary in root layout

---

---

## Phase 3 — Social Layer (Stories & Feeds)

**Status: Completed ✅**

### Achievements

- [x] **Context-Aware Stories**: Implemented Hub-wide and Workspace-specific story filtering with real-time reactive bonding.
- [x] **Collaborative Feed**: Developed a sleek Post Composer and activity system for broadcasting team updates.
- [x] **Production Stabilization**: Eliminated all remaining mock data and implemented "Strict Type Bridges" to ensure a zero-error build state.
- [x] **UI/UX Refinement**: Verified 100% A11y compliance and stabilized component-level state for a premium developer experience.

### Media Pipeline

- [x] Implement on-the-fly image transformations for profile previews (Cloudinary)

## Phase 4 — Realtime Chat

**Status: Completed ✅**

### Database Schema — Channels & Messages

- [x] Create `channels` table (id, workspace_id, name, description, type: `text|announcement|private`, created_by, created_at)
- [x] Create `messages` table (id, channel_id, user_id, content, parent_id [threads], edited_at, deleted_at, created_at)
- [x] Create `message_reactions` table (message_id, user_id, emoji, created_at)
- [x] Create `user_status` table (user_id, workspace_id, status: `online|away|offline`, last_seen)
- [x] Create `typing_indicators` table (channel_id, user_id, updated_at) — short-lived rows
- [x] Write RLS policies (members INSERT messages, moderators soft-delete, guests read-only)

### Realtime Subscriptions

- [x] Setup `chatStore.ts` with Supabase Realtime subscription on `messages` (INSERT/UPDATE/DELETE)
- [x] Setup presence subscription via `user_status` table changes
- [x] Setup typing indicators subscription (poll `typing_indicators` every 1s, cleanup rows > 3s old)
- [x] Implement subscription lifecycle (subscribe on channel mount, unsubscribe on destroy)
- [x] Handle reconnection / offline state gracefully

### Chat UI

- [x] Build `ChannelView.svelte` as main chat container
- [x] Build `ChatMessage.svelte` component (avatar, name, timestamp, content, reactions)
- [x] Implement infinite scroll / cursor pagination (load older messages on scroll up)
- [x] Build `MessageInput.svelte` (rich text, `@mention` autocomplete, emoji picker, file attach)
- [x] Implement optimistic UI: insert message locally before server confirm, rollback on error
- [x] Build message hover actions toolbar (react, reply, edit, delete)
- [x] Implement message editing (inline edit with cancel/save)
- [x] Implement soft delete (show "message deleted" placeholder)

### Threads

- [x] Build thread sidebar panel (open on reply click)
- [x] Thread message count badge on parent messages
- [x] Thread participants avatars
- [x] Subscribe to thread messages separately

### Reactions & Presence

- [x] Build emoji picker component (use `emoji-mart` or custom)
- [x] Reaction row under messages with count + toggle
- [x] Online presence indicator dots on user avatars
- [x] Typing indicator component ("Alice and Bob are typing...")

### Channel Management

- [x] Create channel modal (name, description, type: public/private)
- [x] Archive / delete channel (owner only)
- [x] Channel settings panel (name, description, member management for private)
- [x] Announcements channel type (only owners can post)

---

## Phase 5 — Knowledge Engine (Notes)

**Status: Completed ✅**

### Achievements

- [x] **Relational Knowledge Graph**: Implemented bi-directional wikilinks (`[[link]]`) with real-time backlink indexing and sync.
- [x] **High-Fidelity Editor**: Integrated TipTap with support for Mermaid diagrams (live preview), @mentions, and storage-backed image uploads.
- [x] **Hybrid Storage**: Combined Postgres JSONB for active state with a separate `note_versions` table for robust point-in-time recovery.
- [x] **Premium Organization**: Advanced pinning system, server-side Full-Text Search integration, and multi-format export (Markdown/PDF).
- [x] **Published View Engine**: Dedicated high-performance read-only view for published notes and public sharing.

### Database Schema — Notes

- [x] Create `notes` table (id, workspace_id, author_id, title, content TEXT, versions JSONB[], tags TEXT[], is_public, created_at, updated_at)
- [x] Create `note_links` table (from_note_id, to_note_id) — for bi-directional links
- [x] Create `note_collaborators` table (note_id, user_id, permission: `view|edit`)
- [x] Supabase Storage bucket `note-attachments` with RLS policies

### Notes Editor

- [x] Integrate `@tiptap/svelte` or `CodeMirror` for rich markdown editor
- [x] Implement `[[note-title]]` bi-directional link syntax with autocomplete
- [x] `@mention` user syntax in notes
- [x] Image upload via drag-and-drop (upload to Supabase Storage, embed URL)
- [x] Syntax-highlighted code blocks inside notes
- [x] Build `NoteEditor.svelte` with toolbar (headings, bold, italic, code, lists, links)

### Notes List & Navigation

- [x] Build notes sidebar panel (list, search, filter by tag)
- [x] Build note card component (title, excerpt, tags, last edited)
- [x] Tag system: add/remove tags, filter notes by tag
- [x] Build backlinks panel (which notes link to this note)
- [x] Pin important notes to sidebar

### Versioning

- [x] Auto-save every 30s to `versions` JSONB array (keep last 50 versions)
- [x] Build version history drawer (list versions with timestamp + author)
- [x] Version diff view (highlight added/removed lines)
- [x] Restore from version with confirm dialog
- [x] Future upgrade path: Yjs CRDTs for live collaborative editing

### Notes Organization

- [x] Workspace-wide notes home page (recent, pinned, by tag)
- [x] Note search (full-text using Supabase `to_tsvector`)
- [x] Export note as Markdown / PDF
- [x] Duplicate note
- [x] Share note publicly (generate shareable link with token)

---

## Phase 6 — Dev Tools Engine

**Target: Week 4–5**

### Database Schema — Snippets & API Tests

- [x] Create `snippets` table (id, workspace_id, author_id, title, code TEXT, language, description, tags TEXT[], parent_id [forks], visibility, created_at)
- [x] Create `api_tests` table (id, workspace_id, author_id, name, method, url, headers JSONB, body TEXT, last_response JSONB, created_at)
- [x] Create `snippet_stars` table (snippet_id, user_id)

### Code Snippets

- [x] Build `SnippetEditor.svelte` with Prism.js or CodeMirror 6 syntax highlighting
- [x] Language selector (30+ languages via Prism)
- [x] Build snippets browser (grid/list toggle, filter by language/tag/author)
- [x] Snippet fork: create copy with `parent_id` reference, show fork lineage
- [x] Share snippet across workspaces (visibility: private/workspace/public)
- [x] Copy snippet to clipboard button
- [x] Star/unstar snippets

### Code Execution Sandbox

- [x] Build iframe + Web Worker sandbox for JavaScript execution
- [x] Show stdout / stderr in output panel
- [x] Timeout execution after 5s (kill worker)
- [x] Security: block DOM access from sandbox, whitelist safe APIs only
- [x] Show execution time + memory estimate

### API Tester

- [x] Build `ApiTester.svelte` modal/panel (URL, method, headers editor, body editor)
- [x] Send request from browser (handle CORS via Supabase Edge Function proxy if needed)
- [x] Response viewer (JSON tree, raw, headers)
- [x] Save request to `api_tests` table
- [x] Request history list per workspace
- [x] cURL export button (generate curl command from request)
- [x] Environment variables (store base URLs, tokens per workspace)

---

## Phase 7 — AI Layer

**Target: Week 5–6**

### Infrastructure

- [x] Create Supabase Edge Function `ai-chat` to proxy Openrouter/Groq/mistral (Migrated to SvelteKit /api/ai/chat)
- [x] Integrate Vercel AI SDK for streaming responses in SvelteKit
- [x] Build `src/lib/services/ai.ts` — unified AI client with error handling + retry
- [x] Rate limiting on Edge Function (Migrated to SvelteKit rate limiting RPC)
- [x] AI usage logging table `ai_requests` (user_id, tokens_used, model, created_at)

### Context Builder

- [x] Create `src/lib/utils/contextBuilder.ts`:
  - [x] Fetch last N messages from current channel
  - [x] Fetch recently edited notes (top 5 by recency)
  - [x] Fetch pinned snippets in workspace
  - [x] Prioritize by recency + manual relevance score
  - [x] Truncate to stay under 10k token budget
  - [x] Include workspace name + user's role as system context
- [x] Build context preview panel (Implemented in Right Sidebar / ContextPanel)

### AI Chat Commands

- [x] Build slash command parser in `MessageInput.svelte`
- [x] `/summarize` — summarize last 50 messages in channel
- [x] `/explain [code]` — explain selected code snippet
- [x] `/review [snippet-id]` — code review a snippet
- [x] `/todo` — extract action items from recent messages
- [x] `/draft [topic]` — draft a note on a topic using channel context
- [x] `/translate [lang]` — translate message to another language
- [x] `/ask [question]` — ask AI anything with workspace context injected

### AI Inline Features

- [x] "AI Continue" button in note editor (extend current paragraph)
- [x] "AI Improve" button (grammar + clarity rewrite)
- [x] Auto-tag suggestion for notes and snippets (AI suggests tags on save)
- [x] Smart snippet title suggestion from code content
- [x] Build AI response component with streaming (token-by-token render)
- [x] Show thinking/loading state with animated dots

### Semantic Search (pgvector)

- [x] Enable `pgvector` extension in Supabase
- [x] Add `embedding vector(1536)` column to `messages`, `notes`, `snippets`
- [x] Supabase Webhook to generate embeddings on INSERT (Replaced Deno Edge Function)
- [x] Build semantic search API endpoint
- [x] Integrate into command palette search (`cmd+K`)
- [x] "Similar notes" panel in note sidebar (Implemented in Right Sidebar / ContextPanel)

---

## Phase 8 — Search & Discovery

**Target: Week 6–7**

### Full-Text Search

- [ ] Configure Postgres `tsvector` indexes on messages, notes, snippets
- [ ] Build search API endpoint (`/api/search?q=&workspace=`)
- [ ] Build search results UI (grouped by type: messages, notes, snippets)
- [ ] Highlight matched terms in results
- [ ] Search filters (date range, author, type, channel)

### Global Search UI

- [ ] Integrate search into command palette
- [ ] Dedicated `/workspace/[slug]/search` page for advanced search
- [ ] Search history (recent searches stored in localStorage)
- [ ] Keyboard navigation through results

---

## Phase 9 — Notifications & Activity

**Target: Week 7**

### Database Schema

- [ ] Create `notifications` table (id, user_id, type, payload JSONB, read_at, created_at)
- [ ] Create `notification_preferences` table (user_id, workspace_id, preferences JSONB)

### Notification Types

- [ ] `@mention` in message or note
- [ ] Reply to your message (thread)
- [ ] Workspace invite accepted
- [ ] Note shared with you
- [ ] AI command completed (for long-running tasks)

### Notification UI

- [ ] Notification bell icon in sidebar with unread badge
- [ ] Notification dropdown panel (mark read, navigate to source)
- [ ] Notification preferences page (per-workspace toggles)
- [ ] Browser push notifications (Web Push API + service worker) — optional

---

## Phase 10 — Performance & Polish

**Target: Week 8**

### Performance

- [ ] Audit bundle size (`vite-bundle-visualizer`)
- [ ] Lazy-load heavy components (code editor, emoji picker) with dynamic imports
- [ ] Implement virtual scrolling for large message lists (`svelte-virtual-list`)
- [ ] Image lazy loading + blur placeholder for avatars/attachments
- [ ] Supabase cursor-based pagination for all lists (no offset pagination)
- [ ] Cache workspace metadata in Svelte stores (avoid redundant fetches)

### Accessibility

- [ ] Full keyboard navigation audit (tab order, focus traps in modals)
- [ ] ARIA labels on all interactive elements
- [ ] Screen reader test (VoiceOver/NVDA)
- [ ] Color contrast check (WCAG AA minimum)
- [ ] Reduced-motion support (`prefers-reduced-motion`)

### Mobile Responsiveness

- [ ] Collapsible sidebar on mobile (drawer pattern)
- [ ] Touch-friendly message input
- [ ] Swipe-to-reply gesture on messages
- [ ] Bottom navigation bar on mobile (chat, notes, snippets)
- [ ] Test on iOS Safari + Android Chrome

### Error Handling & Resilience

- [ ] Global error boundary with friendly UI
- [ ] Offline detection banner ("You're offline — messages will send when reconnected")
- [ ] Retry logic for failed realtime subscriptions
- [ ] Optimistic update rollback on API errors (show error toast, restore previous state)

---

## Phase 11 — Security Hardening

**Target: Week 8–9**

### Auth & API Security

- [ ] Validate all AI prompts server-side (sanitize, length limit, injection check)
- [ ] Supabase Edge Function rate limiting per user (Upstash Redis)
- [ ] Review all RLS policies — deny-by-default, principle of least privilege
- [ ] CSRF protection on all form actions
- [ ] Content Security Policy headers in `hooks.server.ts`
- [ ] Audit Supabase Storage policies (prevent direct URL access to private files)

### Input Validation

- [ ] Validate all user inputs with `zod` on server-side (`+page.server.ts` actions)
- [ ] Sanitize note HTML content (prevent XSS via `DOMPurify`)
- [ ] Limit message length, note size, snippet size (server + client)
- [ ] File upload validation (type whitelist, size limit 10MB)

### Privacy

- [ ] GDPR: user data export endpoint (`/account/export`)
- [ ] Account deletion flow (cascade delete all user data)
- [ ] Private channels: enforce strict RLS (non-members cannot see channel exists)

---

## Phase 12 — Observability & Monitoring

**Target: Week 9**

- [ ] Setup Supabase dashboard alerts (high DB CPU, edge function errors)
- [ ] Create internal `health` endpoint for uptime monitoring
- [ ] Log AI token usage per workspace for cost tracking

---

## Phase 13 — Deployment & DevOps

**Target: Week 9–10**

### Environments

- [ ] Setup three environments: `local`, `staging`, `production`
- [ ] Configure environment-specific Supabase projects
- [ ] Separate `.env` files per environment, never commit secrets

### CI/CD

- [ ] GitHub Actions: on PR → lint + typecheck + Vitest
- [ ] GitHub Actions: on merge to `main` → deploy to Vercel (preview)
- [ ] GitHub Actions: on tag `v*.*.*` → deploy to production
- [ ] Run Playwright E2E against staging before promoting to prod
- [ ] Auto-run `supabase db push` migrations in CI

### Infrastructure

- [ ] Deploy SvelteKit to Vercel (or Netlify)
- [ ] Configure Supabase prod project with daily backups
- [ ] Setup custom domain + SSL
- [ ] Configure Vercel environment variables
- [ ] Supabase Edge Functions deployed via CLI in CI

---

## Phase 14 — Social Intelligence (Expert Features)

**Target: Week 11 and Beyond**

### Discovery & Networking

- [ ] "Recommended Developers" sidebar based on tech-stack overlap
- [ ] Trending snippets feed (Global vs Regional)
- [ ] Dev-Influence score (based on snippet forks and helpful AI summaries)

### AI Media Analysis

- [ ] Auto-generate accessibility ALT text for story images using AI
- [ ] Story auto-captions for developer videos
- [ ] AI-curated "Daily Roundup" story for team progress

---

## Key File Map

```
src/
├── lib/
│   ├── components/
│   │   ├── chat/          ChatMessage, MessageInput, ReactionBar, TypingIndicator
│   │   ├── notes/         NoteEditor, NoteCard, BacklinksPanel, VersionDrawer
│   │   ├── snippets/      SnippetEditor, SnippetCard, ExecutionSandbox
│   │   ├── ai/            AiResponse, ContextPreview, CommandSlash
│   │   ├── layout/        Sidebar, SplitPane, CommandPalette, ThemeToggle
│   │   └── ui/            Button, Modal, Toast, Avatar, Badge, Skeleton
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── workspaceStore.ts
│   │   ├── chatStore.ts
│   │   ├── notesStore.ts
│   │   └── uiStore.ts
│   ├── services/
│   │   ├── supabase.ts    # Typed Supabase client
│   │   ├── ai.ts          # AI service (stream, context inject)
│   │   └── realtime.ts    # Subscription manager
│   ├── utils/
│   │   ├── contextBuilder.ts
│   │   ├── optimistic.ts
│   │   ├── tokenizer.ts   # Count tokens before sending
│   │   └── slugify.ts
│   └── types/
│       └── db.ts          # Auto-generated from Supabase
├── routes/
│   ├── (auth)/            login, register, forgot-password
│   ├── dashboard/         workspace list
│   ├── workspace/[slug]/
│   │   ├── chat/[channelId]/
│   │   ├── notes/[noteId]/
│   │   ├── snippets/
│   │   ├── tools/         api tester
│   │   └── settings/
│   └── invite/[token]/
└── hooks.client.ts        auth listener, realtime init
```

---

## Tech Stack Summary

| Category      | Choice                | Why                               |
| ------------- | --------------------- | --------------------------------- |
| Framework     | SvelteKit             | SSR + reactivity + small bundle   |
| Database      | Supabase Postgres     | Realtime + RLS + Auth in one      |
| Auth          | Supabase Auth         | JWT + OAuth + MFA built-in        |
| Realtime      | Supabase Realtime     | Postgres CDC → WebSocket          |
| Storage       | Supabase Storage      | Files + images w/ RLS             |
| AI            | OpenAI / Groq         | GPT-4o / Llama-3 via unified API  |
| AI SDK        | Vercel AI SDK         | Streaming + SvelteKit integration |
| Styling       | TailwindCSS           | Utility-first, dark mode easy     |
| Editor        | TipTap / CodeMirror 6 | Extensible, works in Svelte       |
| Highlighting  | Prism.js              | Wide language support             |
| Vector Search | pgvector              | Semantic search in Postgres       |
| Testing       | Vitest + Playwright   | Unit + E2E                        |
| Monitoring    | Sentry + PostHog      | Errors + analytics                |
| Deploy        | Vercel + Supabase     | Tight SvelteKit integration       |

---

## MVP Checklist (Ship This First)

- [ ] Auth (email + GitHub OAuth)
- [ ] Create/join workspace
- [ ] Create channels + send messages (realtime)
- [ ] Basic markdown notes
- [ ] Code snippets viewer
- [ ] AI `/ask` and `/summarize` commands
- [ ] Dark mode
- [ ] Deploy to Vercel (staging URL)

**Skip for MVP:** Threads, API tester, semantic search, versioning, notifications, mobile

---

_Last updated: Phase 7 Completed — Robust AI Layer Solidified_
