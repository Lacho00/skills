---
name: astro-framework
description: Use when working in an Astro project — .astro files, astro.config.*, pages and routing, layouts, content collections, islands and client directives, images, SSR adapters, or the astro CLI. Gives the project layout, the commands that prove a change works, and the version-sensitive points to check against the installed Astro before writing code.
---

# Astro

Working notes for content-driven sites built with Astro. Astro changes between
major versions (content collections, config options, adapters, Zod imports), so
this skill tells you what to check, not a full API. The installed version and
the official docs win over anything written here.

## When to use

- Editing or creating `.astro` components, pages, layouts or `astro.config.*`.
- Content collections, routing, images, integrations, adapters or deployment of an Astro site.
- Not for: React/Vue/Svelte component internals (use that framework's skill), or
  hosting-provider specifics beyond picking the adapter.

## First, pin the version

1. Read the installed version: `node -p "require('astro/package.json').version"`.
2. Look up anything version-sensitive in the docs for that major version:
   <https://docs.astro.build>, or a docs MCP server (for example Context7) when
   the project has one. Upgrade guides:
   `https://docs.astro.build/en/guides/upgrade-to/v<major>/`.
3. Copy the project's existing patterns (config file, collection definitions,
   layouts) before introducing a new one.

## Project layout

| Path | Role |
|---|---|
| `src/pages/` | Required. File-based routes: `.astro`, `.md`, `.mdx`, and `.ts`/`.js` endpoints |
| `src/layouts/` | Page shells with `<slot />` (convention) |
| `src/components/` | Components (convention) |
| `src/content.config.ts` | Content collection definitions. The legacy `src/content/config.ts` is not read since Astro 6 |
| `src/styles/` | Global CSS (convention) |
| `src/fetch.ts` | Reserved since Astro 7 for advanced routing (`fetchFile` in the config); do not use the name for anything else |
| `src/assets/` | Images processed by `astro:assets` |
| `public/` | Copied as-is to the build output; never optimised |
| `astro.config.mjs` / `.ts` | Config: `site`, `base`, `output`, `adapter`, `integrations`, `i18n` |

## Components and pages

- The frontmatter fence (`---`) runs on the server, at build time for static
  pages or per request when rendered on demand. Nothing in it reaches the browser.
- Props come from `Astro.props`; type them with `interface Props { … }` in the frontmatter.
- `<style>` in a component is scoped by default; `<style is:global>` opts out.
- `<script>` tags are bundled and processed; `<script is:inline>` ships as written.
- Dynamic routes: `src/pages/blog/[slug].astro` needs `getStaticPaths()` when
  the page is prerendered; on-demand pages read `Astro.params` instead.
- Set `site` in the config: canonical URLs, sitemaps and RSS depend on it.

## Islands

Framework components render to static HTML unless they carry a client directive:

| Directive | Hydrates |
|---|---|
| `client:load` | Immediately on page load |
| `client:idle` | When the browser is idle |
| `client:visible` | When the component enters the viewport |
| `client:media="(query)"` | When the media query matches |
| `client:only="react"` | Browser only, no server render (name the framework) |

Default to no directive; add the lightest one that works. `server:defer` marks a
server island: rendered on demand after the page, so it needs an adapter.

## Content collections

- Define collections in `src/content.config.ts` with `defineCollection`, a
  loader (`glob()` / `file()` from `astro/loaders`, or a custom one) and a schema.
- `defineCollection` comes from `astro:content`; Zod comes from
  `import { z } from 'astro/zod'` (Zod 4 since Astro 6: `z.email()`, not
  `z.string().email()`; `error:` instead of `message:`). Importing `z` from
  `astro:content` is deprecated.
- Query with `getCollection()` / `getEntry()` from `astro:content`; render with
  `const { Content } = await render(entry)`. Entries are addressed by `id`;
  `entry.render()`, `slug` and `getEntryBySlug()` are gone since Astro 6.
- Run `npx astro sync` after changing a schema so the generated types follow.

## Images

- Images in `src/` imported and passed to `<Image />` or `<Picture />` from
  `astro:assets` are optimised and get width/height (no layout shift).
- Images in `public/` are served untouched; use them only when optimisation must not happen.
- Remote images need their domain in `image.domains` or `image.remotePatterns`.

## Rendering and adapters

- Static output is the default. Pages opt into on-demand rendering with
  `export const prerender = false`, or the whole site with `output: 'server'`.
- On-demand rendering needs an adapter: `npx astro add node` (or `cloudflare`,
  `netlify`, `vercel`). `astro add` edits the config and installs the package;
  review its diff.
- Environment variables: prefer the typed schema, `env: { schema: { NAME: envField.string({ context, access }) } }`
  in the config (`envField` from `astro/config`), read through `astro:env/client`
  or `astro:env/server`. Otherwise `import.meta.env`; only `PUBLIC_` variables
  reach the client, and values are inlined at build time.

## CLI

| Command | Use |
|---|---|
| `npx astro dev` | Dev server |
| `npx astro check` | Type and template diagnostics |
| `npx astro sync` | Regenerate types for content collections and `astro:env` |
| `npx astro build` | Production build into `dist/` |
| `npx astro preview` | Serve the build locally (not supported by every adapter) |
| `npx astro add <integration>` | Add an integration or adapter |

Prefer the project's own `package.json` scripts when they wrap these.

## Astro 7 traps

- Node 22.12 or newer (floor set in Astro 6).
- The Rust compiler is the only compiler: unclosed tags are build errors.
- `compressHTML` defaults to `'jsx'`: whitespace between inline elements can change.
- Sätteri is the default Markdown processor. Remark/rehype plugins need
  `@astrojs/markdown-remark` and `markdown: { processor: unified() }`.
- `@astrojs/db` is removed.

## Checks

- `npx astro check` reports 0 errors.
- `npx astro build` succeeds and `dist/` contains the changed routes.
- Pages that should be static are still prerendered (build log lists them under
  static routes); nothing gained a client directive it does not need.
