# skills

My own Claude Code skills, grouped by stack and installed per project with
[skills.sh](https://skills.sh) instead of globally.

This repository is the install source for my projects. Third-party skills are
vendored: copied here unmodified, with their licence, by `scripts/vendor.mjs`,
and recorded in [vendor.json](vendor.json). The only skills installed straight
from upstream are the few in-use ones whose source has no licence file; they are
listed under [exceptions](CATALOG.md#exceptions-installed-from-their-source) in
[CATALOG.md](CATALOG.md), which also lists third-party skills that are
candidates for vendoring.

## Install a skill into a project

```bash
cd <project>
npx skills add Lacho00/skills --skill <name>
```

The install is recorded in the project's `skills-lock.json`. To pick up later
changes, run `npx skills update` in the project.

## Skills

### Own

| Skill | Stack | What it does |
|---|---|---|
| `astro-framework` | Astro | Astro project layout, islands, content collections, adapters and the checks that prove a change works |
| `git-protect-main` | Git | Local pre-push hook that refuses direct pushes to `main` (or other protected branches) in every worktree of a repo |

### General

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `playwright-best-practices` | [currents-dev/playwright-best-practices-skill](https://github.com/currents-dev/playwright-best-practices-skill) | MIT | Playwright tests, flaky tests, Page Object Model, CI |
| `security-audit` | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | MIT | Security guidance and vulnerability review for codebases, APIs, services, CLI tools,… |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 | Toolkit for interacting with and testing local web applications using Playwright |

### UI and motion

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `animate` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Build an animation from scratch, making the decisions in the order that determines whether it… |
| `animate-expo` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Build animations in React Native and Expo, making the decisions in the order that determines… |
| `animation-performance` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Keep web animations inside the frame budget |
| `animation-vocabulary` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Reverse-lookup glossary that turns a vague description of a web animation or motion effect… |
| `apple-design` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Apple's approach to interface design and fluid, physical motion, translated for the web |
| `ask-emil` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Pick which of the emilkowalski skills fits the task |
| `ask-sonner` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Guide to Sonner, the React toast library |
| `break-ui` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Try to break a piece of UI by feeding it worst-case data |
| `choreograph` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Coordinate several elements that animate together |
| `design-taste-frontend` | [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | MIT | Anti-generic frontend design rules |
| `emil-design-eng` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Design-engineering philosophy for UI polish and animation decisions |
| `find-animation-opportunities` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Search a codebase or UI for places that don't animate but should, and reject everything that… |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 | Guidance for distinctive, intentional visual design when building new UI or reshaping an… |
| `gestures` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Build drag, swipe, and sheet interactions that track the finger 1:1 and stay interruptible |
| `gsap-core` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: the core API |
| `gsap-frameworks` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: Vue, Svelte, and other non-React frameworks |
| `gsap-performance` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: performance |
| `gsap-plugins` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: GSAP plugins |
| `gsap-react` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: React |
| `gsap-scrolltrigger` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: ScrollTrigger |
| `gsap-timeline` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: timelines |
| `gsap-utils` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | GSAP: gsap.utils |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 | Design, critique, audit and polish a frontend interface |
| `improve-animations` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Survey a codebase's animation and motion code as a senior motion advisor, then produce a… |
| `learn-taste` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Turn a session's design corrections into rules, with their why, in DESIGN.md, a project skill,… |
| `make-interfaces-feel-better` | [watermeloncorp/watermelon-platform](https://github.com/watermeloncorp/watermelon-platform) | MIT | Design engineering principles for making interfaces feel polished |
| `mobile-native` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Make a web app feel native on a phone |
| `pick-ui-library` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Pick the library for a frontend task from a curated list |
| `prototype` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Build multiple genuinely different versions of a UI piece you describe, rendered behind a… |
| `remove-animations` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Find the animations an interface doesn't need and remove them |
| `review-animations` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | Review animation and motion code against a high craft bar |
| `shadcn` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | Manages shadcn components and projects |
| `tailwind-design-system` | [wshobson/agents](https://github.com/wshobson/agents) | MIT | Build scalable design systems with Tailwind CSS v4, design tokens, component libraries, and… |
| `watermelon-ui` | [watermeloncorp/watermelon-platform](https://github.com/watermeloncorp/watermelon-platform) | MIT | Discover and install free, source-backed React UI from Watermelon |
| `web-artifacts-builder` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 | Build multi-component HTML artifacts with React, Tailwind and shadcn/ui |
| `write-swift` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | How to write modern Swift well |

### Design and UX

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `accessibility` | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) | MIT | Audit and improve web accessibility following WCAG 2.2 guidelines |
| `accessibility-review` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Run a WCAG 2.1 AA accessibility audit on a design or page |
| `design-critique` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Get structured design feedback on usability, hierarchy, and consistency |
| `design-handoff` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Generate developer handoff specs from a design |
| `design-system` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Audit, document, or extend your design system |
| `research-synthesis` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Synthesize user research into themes, insights, and recommendations |
| `user-research` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Plan, conduct, and synthesize user research |
| `ux-copy` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | Apache-2.0 | Write or review UX copy |

### Three.js

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `threejs-animation` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Keyframe, skeletal and morph-target animation, procedural motion and clip blending, on WebGL… |
| `threejs-asset-pipeline` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Shrinking glTF assets for three.js with gltf-transform: inspect, validate and optimize… |
| `threejs-fundamentals` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Three.js scene setup: scenes and fog, cameras, the renderer and tone mapping, the animation… |
| `threejs-geometry` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Creating and shaping three.js geometry: built-in shapes, 3D text, vertex buffers and… |
| `threejs-interaction` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Picking with raycasting, camera controls, transform gizmos, drag, hover and box selection for… |
| `threejs-lighting` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Light types and physical units, shadow maps, HDR environment lighting, light probes, and… |
| `threejs-loaders` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Loading three.js assets: glTF with Draco, meshopt and KTX2 compression, other model formats,… |
| `threejs-materials` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Choosing and configuring three.js materials - unlit, diffuse, specular, PBR, toon, point and… |
| `threejs-performance` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Measuring and optimizing three.js speed: render statistics, memory counters, fewer draw calls… |
| `threejs-postprocessing` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Three.js post-processing: composer pass chains, built-in renderer effects, and the WebGPU/TSL… |
| `threejs-react-three-fiber` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Building three.js scenes from React with React Three Fiber and drei: renderer setup, the scene… |
| `threejs-shaders` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Custom GLSL vertex and fragment shaders: uniforms, varyings, shader chunks, extending built-in… |
| `threejs-textures` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | Three.js textures: image loading, color spaces, UV channels and transforms, texture types from… |

### Data

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `prisma-cli` | [prisma/skills](https://github.com/prisma/skills) | MIT | Prisma ORM 7 CLI reference for existing Prisma 7 applications or explicitly selected Prisma 7… |
| `prisma-client-api` | [prisma/skills](https://github.com/prisma/skills) | MIT | Prisma Client API reference covering model queries, filters, operators, and client methods |
| `supabase` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT | Supabase: database, auth, storage, edge functions |
| `supabase-postgres-best-practices` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT | Postgres best practices maintained by Supabase, for Postgres running anywhere |

### Cloudflare

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `cloudflare` | [cloudflare/skills](https://github.com/cloudflare/skills) | Apache-2.0 | Discover and choose Cloudflare products for apps, APIs, AI agents, storage, networking, and… |
| `web-perf` | [cloudflare/skills](https://github.com/cloudflare/skills) | Apache-2.0 | Audit, diagnose, or optimize website loading and interaction performance, Core Web Vitals, and… |
| `workers-best-practices` | [cloudflare/skills](https://github.com/cloudflare/skills) | Apache-2.0 | Cloudflare Workers best practices for production applications |
| `wrangler` | [cloudflare/skills](https://github.com/cloudflare/skills) | Apache-2.0 | Run or troubleshoot Wrangler CLI commands in projects that have a wrangler.jsonc,… |

### SEO

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `ai-seo` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | MIT | Get cited and recommended in AI answers (AI SEO / GEO) |
| `seo-audit` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | MIT | Audit and diagnose technical and on-page SEO |

### Kotlin / Android

| Skill | Vendored from | Licence | What it does |
|---|---|---|---|
| `android-cli` | [android/skills](https://github.com/android/skills) | Apache-2.0 | Use the `android` CLI to create projects, manage the SDK, and run apps on devices |
| `compose-animations` | [chrisbanes/skills](https://github.com/chrisbanes/skills) | Apache-2.0 | Write or review Jetpack Compose motion |
| `edge-to-edge` | [android/skills](https://github.com/android/skills) | Apache-2.0 | Use this skill to migrate your Jetpack Compose app to add adaptive edge-to-edge support and… |
| `jetpack-compose-performance` | [android/skills](https://github.com/android/skills) | Apache-2.0 | Diagnose and optimize Android Jetpack Compose UI code |

## Adding a skill

1. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`.
2. Name it in kebab-case with a stack prefix: `kotlin-…`, `next-…`, `react-…`,
   `astro-…`, `general-…`. Vendored skills keep their upstream name. The frontmatter `name` must equal the folder name.
3. Write the `description` as "Use when …" (max 1024 characters). It is what
   decides when the skill loads.
4. Keep skills generic: no client, project, host or path names.
5. If the skill adapts someone else's work, add the source to [NOTICE](NOTICE).
6. Run `npm ci && npm test && npm run check`, then open a PR. CI runs the same checks.

## Vendoring a third-party skill

```bash
node scripts/vendor.mjs --add <owner/repo> <path-to-skill-folder>   # first copy
node scripts/vendor.mjs --check                                     # compare with upstream
node scripts/vendor.mjs --update [name...]                          # copy the latest upstream commit
```

- Only MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause and ISC sources are copied.
  A source without a licence file, or whose licence changes to anything else,
  is refused and the old copy is kept.
- The licence file goes into the skill folder; NOTICE is regenerated from
  vendor.json.
- Copies stay unmodified: CI compares each one with the hash in vendor.json.
  To adapt a skill, write a new own skill instead. If a copy really has to be
  edited, set `"modified": true` in its vendor.json entry; updates then only
  report upstream changes.
- A copy that tells the agent to install something (`npx skills add` from
  another source, a plugin install, a download piped to a shell) is refused.
  The one exception is a vendor's own installer, vetted once and named in
  vendor.json: `--add … --allow-install <url-prefix>` stores the prefix in
  `allowInstall`, and an install command is allowed only when every URL in it
  starts with that prefix. `android-cli` allows
  `https://dl.google.com/android/cli/`, Google's installer for the CLI.
- CI fails if any file asks an agent to install skills, plugins or scripts from
  outside this repository.

### Weekly upstream updates

`.github/workflows/vendor-update.yml` runs every Monday (or by hand from the
Actions tab). It runs `scripts/vendor-prs.mjs`, which:

- compares every vendored skill with the last upstream commit touching its path;
- for each source that changed, copies the new commit on a `vendor/<owner>-<repo>`
  branch, runs `npm test` and `npm run check`, and opens or refreshes one PR per
  source with links to the upstream diff;
- for a copy marked `"modified": true`, opens an issue instead of a PR;
- fails the job (GitHub emails it) when a source is refused, for example because
  its licence is no longer redistributable. The old copy stays.

It never merges: read the diff, run the OCR review, and merge by hand.

The workflow needs "Allow GitHub Actions to create and approve pull requests"
enabled in the repository settings. PRs opened with the default token do not
trigger the `check` workflow. To run `check` on them too, add a fine-grained PAT
as the `VENDOR_TOKEN` secret.

## Which projects are behind

```bash
npm run status                 # every project next to this repo
npm run status -- <dir> --json
```

Reads each project's `skills-lock.json` and compares the hash of every skill
installed from Lacho00/skills with `skills/<name>` on `origin/main`. It lists the
skills that are behind (run `npx skills update` in that project), the ones no
longer in this repository, and how many skills still come from other sources.

## License

[MIT](LICENSE).
