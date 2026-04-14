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

- [ ] Create `profiles` table (id, username, avatar_url, bio, created_at)
- [ ] Create `workspaces` table (id, name, slug, description, owner_id, logo_url, created_at)
- [ ] Create `workspace_members` table (workspace_id, user_id, role: enum `owner|member|guest`, joined_at)
- [ ] Create `workspace_invites` table (id, workspace_id, email, token, role, expires_at, used_at)
- [ ] Write RLS policies for all tables (owners write all, members read, guests limited read)

### RBAC System (Supabase Custom Claims)

- [ ] Create `user_roles` enum type in Postgres
- [ ] Write Postgres function `get_user_role(workspace_id)` using JWT claims
- [ ] Create auth hook (Supabase DB webhook) to inject `workspace_roles` map into JWT on sign-in
- [ ] Write RLS helper function `authorize(permission text)` for policy reuse
- [ ] Test RBAC with Supabase SQL editor — verify role isolation

### Auth UI & Flows

- [ ] Build `/login` page (email/password + OAuth buttons)
- [ ] Build `/register` page with username selection
- [ ] Build `/forgot-password` and `/reset-password` flows
- [ ] Implement auth guard `+layout.svelte` for `(auth)` group
- [ ] Setup `hooks.client.ts` for auth state listener (`onAuthStateChange`)
- [ ] Create `authStore.ts` with current user, session, loading state

### Workspace Management

- [ ] Build `/dashboard` page — list workspaces, create new button
- [ ] Build workspace creation modal (name, slug, description, logo upload)
- [ ] Implement workspace slug uniqueness validation (debounced check)
- [ ] Build `/workspace/[slug]/settings` page (update name, logo, danger zone: delete)
- [ ] Build members management UI (list members, change roles, remove)
- [ ] Implement invite-by-email flow (send token, `/invite/[token]` accept page)
- [ ] Add multi-factor auth (Supabase MFA — TOTP)

### State Management Foundation

- [ ] Create `workspaceStore.ts` (current workspace, members, role)
- [ ] Create `userStore.ts` (profile, preferences)
- [ ] Setup `getContext`/`setContext` pattern in root layout to avoid prop drilling

---

## Phase 2 — Core Layout & Navigation

**Target: Week 1–2**

### App Shell

- [ ] Build root `+layout.svelte` with three-panel layout:
  - Left: Fixed sidebar (workspace switcher, nav icons)
  - Center: Main content area
  - Right: Context panel (collapsible)
- [ ] Implement `SplitPane.svelte` resizable panels with drag handle
- [ ] Build collapsible sidebar with smooth CSS transitions
- [ ] Implement keyboard shortcuts system (`cmd+K` command palette, `cmd+/` shortcuts modal)

### Sidebar Navigation

- [ ] Workspace switcher dropdown (recent workspaces, add workspace)
- [ ] Channel list section with collapse/expand
- [ ] Notes section shortcut
- [ ] Snippets section shortcut
- [ ] Settings gear icon at bottom
- [ ] User avatar + presence indicator at bottom

### Command Palette (`cmd+K`)

- [ ] Build `CommandPalette.svelte` modal with fuzzy search
- [ ] Commands: navigate to channel, open note, search snippets, invite member
- [ ] Keyboard navigation (arrows, enter, escape)
- [ ] Recent items history

### Theming

- [ ] Setup Tailwind dark mode (class strategy)
- [ ] Build theme toggle (light/dark/system) stored in `localStorage`
- [ ] Define CSS custom properties for brand colors
- [ ] Create design token file `src/lib/tokens.ts`

### Empty States & Loading

- [ ] Design empty state components (no channels, no notes, no snippets)
- [ ] Build skeleton loader components (ChatSkeleton, NoteSkeleton, SnippetSkeleton)
- [ ] Build global error boundary in root layout

---

## Phase 3 — Realtime Chat

**Target: Week 2–3**

### Database Schema — Channels & Messages

- [ ] Create `channels` table (id, workspace_id, name, description, type: `text|announcement|private`, created_by, created_at)
- [ ] Create `messages` table (id, channel_id, user_id, content, parent_id [threads], edited_at, deleted_at, created_at)
- [ ] Create `message_reactions` table (message_id, user_id, emoji, created_at)
- [ ] Create `user_status` table (user_id, workspace_id, status: `online|away|offline`, last_seen)
- [ ] Create `typing_indicators` table (channel_id, user_id, updated_at) — short-lived rows
- [ ] Write RLS policies (members INSERT messages, moderators soft-delete, guests read-only)

### Realtime Subscriptions

- [ ] Setup `chatStore.ts` with Supabase Realtime subscription on `messages` (INSERT/UPDATE/DELETE)
- [ ] Setup presence subscription via `user_status` table changes
- [ ] Setup typing indicators subscription (poll `typing_indicators` every 1s, cleanup rows > 3s old)
- [ ] Implement subscription lifecycle (subscribe on channel mount, unsubscribe on destroy)
- [ ] Handle reconnection / offline state gracefully

### Chat UI

- [ ] Build `ChannelView.svelte` as main chat container
- [ ] Build `ChatMessage.svelte` component (avatar, name, timestamp, content, reactions)
- [ ] Implement infinite scroll / cursor pagination (load older messages on scroll up)
- [ ] Build `MessageInput.svelte` (rich text, `@mention` autocomplete, emoji picker, file attach)
- [ ] Implement optimistic UI: insert message locally before server confirm, rollback on error
- [ ] Build message hover actions toolbar (react, reply, edit, delete)
- [ ] Implement message editing (inline edit with cancel/save)
- [ ] Implement soft delete (show "message deleted" placeholder)

### Threads

- [ ] Build thread sidebar panel (open on reply click)
- [ ] Thread message count badge on parent messages
- [ ] Thread participants avatars
- [ ] Subscribe to thread messages separately

### Reactions & Presence

- [ ] Build emoji picker component (use `emoji-mart` or custom)
- [ ] Reaction row under messages with count + toggle
- [ ] Online presence indicator dots on user avatars
- [ ] Typing indicator component ("Alice and Bob are typing...")

### Channel Management

- [ ] Create channel modal (name, description, type: public/private)
- [ ] Archive / delete channel (owner only)
- [ ] Channel settings panel (name, description, member management for private)
- [ ] Announcements channel type (only owners can post)

---

## Phase 4 — Knowledge Engine (Notes)

**Target: Week 3–4**

### Database Schema — Notes

- [ ] Create `notes` table (id, workspace_id, author_id, title, content TEXT, versions JSONB[], tags TEXT[], is_public, created_at, updated_at)
- [ ] Create `note_links` table (from_note_id, to_note_id) — for bi-directional links
- [ ] Create `note_collaborators` table (note_id, user_id, permission: `view|edit`)
- [ ] Supabase Storage bucket `note-attachments` with RLS policies

### Notes Editor

- [ ] Integrate `@tiptap/svelte` or `CodeMirror` for rich markdown editor
- [ ] Implement `[[note-title]]` bi-directional link syntax with autocomplete
- [ ] `@mention` user syntax in notes
- [ ] Image upload via drag-and-drop (upload to Supabase Storage, embed URL)
- [ ] Syntax-highlighted code blocks inside notes
- [ ] Build `NoteEditor.svelte` with toolbar (headings, bold, italic, code, lists, links)

### Notes List & Navigation

- [ ] Build notes sidebar panel (list, search, filter by tag)
- [ ] Build note card component (title, excerpt, tags, last edited)
- [ ] Tag system: add/remove tags, filter notes by tag
- [ ] Build backlinks panel (which notes link to this note)
- [ ] Pin important notes to sidebar

### Versioning

- [ ] Auto-save every 30s to `versions` JSONB array (keep last 50 versions)
- [ ] Build version history drawer (list versions with timestamp + author)
- [ ] Version diff view (highlight added/removed lines)
- [ ] Restore from version with confirm dialog
- [ ] Future upgrade path: Yjs CRDTs for live collaborative editing

### Notes Organization

- [ ] Workspace-wide notes home page (recent, pinned, by tag)
- [ ] Note search (full-text using Supabase `to_tsvector`)
- [ ] Export note as Markdown / PDF
- [ ] Duplicate note
- [ ] Share note publicly (generate shareable link with token)

---

## Phase 5 — Dev Tools Engine

**Target: Week 4–5**

### Database Schema — Snippets & API Tests

- [ ] Create `snippets` table (id, workspace_id, author_id, title, code TEXT, language, description, tags TEXT[], parent_id [forks], visibility, created_at)
- [ ] Create `api_tests` table (id, workspace_id, author_id, name, method, url, headers JSONB, body TEXT, last_response JSONB, created_at)
- [ ] Create `snippet_stars` table (snippet_id, user_id)

### Code Snippets

- [ ] Build `SnippetEditor.svelte` with Prism.js or CodeMirror 6 syntax highlighting
- [ ] Language selector (30+ languages via Prism)
- [ ] Build snippets browser (grid/list toggle, filter by language/tag/author)
- [ ] Snippet fork: create copy with `parent_id` reference, show fork lineage
- [ ] Share snippet across workspaces (visibility: private/workspace/public)
- [ ] Copy snippet to clipboard button
- [ ] Star/unstar snippets

### Code Execution Sandbox

- [ ] Build iframe + Web Worker sandbox for JavaScript execution
- [ ] Show stdout / stderr in output panel
- [ ] Timeout execution after 5s (kill worker)
- [ ] Security: block DOM access from sandbox, whitelist safe APIs only
- [ ] Show execution time + memory estimate

### API Tester

- [ ] Build `ApiTester.svelte` modal/panel (URL, method, headers editor, body editor)
- [ ] Send request from browser (handle CORS via Supabase Edge Function proxy if needed)
- [ ] Response viewer (JSON tree, raw, headers)
- [ ] Save request to `api_tests` table
- [ ] Request history list per workspace
- [ ] cURL export button (generate curl command from request)
- [ ] Environment variables (store base URLs, tokens per workspace)

---

## Phase 6 — AI Layer

**Target: Week 5–6**

### Infrastructure

- [ ] Create Supabase Edge Function `ai-chat` to proxy OpenAI/Groq (never expose keys to client)
- [ ] Integrate Vercel AI SDK for streaming responses in SvelteKit
- [ ] Build `src/lib/services/ai.ts` — unified AI client with error handling + retry
- [ ] Rate limiting on Edge Function (per user: 20 req/min via Supabase Redis / Upstash)
- [ ] AI usage logging table `ai_requests` (user_id, tokens_used, model, created_at)

### Context Builder

- [ ] Create `src/lib/utils/contextBuilder.ts`:
  - Fetch last N messages from current channel
  - Fetch recently edited notes (top 5 by recency)
  - Fetch pinned snippets in workspace
  - Prioritize by recency + manual relevance score
  - Truncate to stay under 10k token budget
  - Include workspace name + user's role as system context
- [ ] Build context preview panel (show what AI "knows" before sending)

### AI Chat Commands

- [ ] Build slash command parser in `MessageInput.svelte`
- [ ] `/summarize` — summarize last 50 messages in channel
- [ ] `/explain [code]` — explain selected code snippet
- [ ] `/review [snippet-id]` — code review a snippet
- [ ] `/todo` — extract action items from recent messages
- [ ] `/draft [topic]` — draft a note on a topic using channel context
- [ ] `/translate [lang]` — translate message to another language
- [ ] `/ask [question]` — ask AI anything with workspace context injected

### AI Inline Features

- [ ] "AI Continue" button in note editor (extend current paragraph)
- [ ] "AI Improve" button (grammar + clarity rewrite)
- [ ] Auto-tag suggestion for notes and snippets (AI suggests tags on save)
- [ ] Smart snippet title suggestion from code content
- [ ] Build AI response component with streaming (token-by-token render)
- [ ] Show thinking/loading state with animated dots

### Semantic Search (pgvector)

- [ ] Enable `pgvector` extension in Supabase
- [ ] Add `embedding vector(1536)` column to `messages`, `notes`, `snippets`
- [ ] Supabase Edge Function to generate embeddings on INSERT (OpenAI `text-embedding-3-small`)
- [ ] Build semantic search API endpoint
- [ ] Integrate into command palette search (`cmd+K`)
- [ ] "Similar notes" panel in note sidebar

---

## Phase 7 — Search & Discovery

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

## Phase 8 — Notifications & Activity

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

## Phase 9 — Performance & Polish

**Target: Week 8**

### Performance

- [ ] Audit bundle size (`vite-bundle-visualizer`)
- [ ] Lazy-load heavy components (code editor, emoji picker) with dynamic imports
- [ ] Implement virtual scrolling for large message lists (`svelte-virtual-list`)
- [ ] Image lazy loading + blur placeholder for avatars/attachments
- [ ] Supabase cursor-based pagination for all lists (no offset pagination)
- [ ] Cache workspace metadata in Svelte stores (avoid redundant fetches)
- [ ] Setup TanStack Query (`@tanstack/svelte-query`) for server state management

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

## Phase 10 — Security Hardening

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

## Phase 11 — Observability & Monitoring

**Target: Week 9**

- [ ] Integrate Sentry (error tracking — frontend + Edge Functions)
- [ ] Integrate PostHog (product analytics — page views, feature usage)
- [ ] Custom Sentry context: workspace_id, user_role on every error
- [ ] Setup Supabase dashboard alerts (high DB CPU, edge function errors)
- [ ] Create internal `health` endpoint for uptime monitoring
- [ ] Log AI token usage per workspace for cost tracking

---

## Phase 12 — Deployment & DevOps

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

## Phase 13 — Extended Features (Post-MVP)

**Ongoing / Backlog**

### Developer Integrations

- [ ] GitHub PR viewer widget (OAuth, list open PRs per repo, inline diff)
- [ ] Linear / Jira issue linker (paste issue URL → rich preview card)
- [ ] Figma embed (paste Figma URL → live embed)
- [ ] Webhook system (receive external events into channels)

### Advanced AI

- [ ] Long-term memory: store AI conversation summaries per user/workspace
- [ ] AI-generated weekly digest (summarize top discussions, decisions)
- [ ] Code review bot: auto-trigger on snippet creation
- [ ] Meeting notes assistant (paste transcript → structured summary)

### Real-Time Collaboration

- [ ] Yjs CRDT integration for live multi-cursor note editing
- [ ] Live cursors / selection highlighting in notes (show collaborators)
- [ ] Conflict resolution UI for simultaneous edits

### Workspace Analytics

- [ ] Activity heatmap (messages per day, per channel)
- [ ] Most active contributors leaderboard
- [ ] AI usage stats per workspace

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

_Last updated: Phase 0 Complete — Project initialized_
