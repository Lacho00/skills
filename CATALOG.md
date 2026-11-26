# Catalog of third-party skills

Skills from other repositories worth having, grouped by stack. Projects never
install them from their source (except the unlicensed ones listed under
[Exceptions](#exceptions-installed-from-their-source)): a skill listed here is first vendored into this
repository (`node scripts/vendor.mjs --add <owner/repo> <path>`, licence
permitting), reviewed in a PR, and then installed from Lacho00/skills like any
other skill. A row moves to the README skills table once it is vendored.

## General

| Skill | Source | What it does |
|---|---|---|
| `handoff` | [mattpocock/skills](https://github.com/mattpocock/skills) | Compact the session into a handoff doc for a fresh session |
| `to-questionnaire` | [mattpocock/skills](https://github.com/mattpocock/skills) | Turn an open decision into a questionnaire for someone else |
| `wizard` | [mattpocock/skills](https://github.com/mattpocock/skills) | Interactive bash wizard for steps only a human can do |

## JS/TS tooling

| Skill | Source | What it does |
|---|---|---|
| `setup-pre-commit` | [mattpocock/skills](https://github.com/mattpocock/skills) | Husky + lint-staged + typecheck + tests on commit |

## Next.js / React

| Skill | Source | What it does |
|---|---|---|
| `react-patterns` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | React component and state patterns |
| `react-testing` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | React testing patterns |
| `nextjs-turbopack` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | Next.js with Turbopack |
| `next-cache-components-adoption` | [vercel/next.js](https://github.com/vercel/next.js) | Adopt Cache Components in a Next.js app. MIT. The first vendoring attempt failed: the repository is too big to clone over a slow link; retry on a fast one |
| `animated-component-libraries` | [freshtechbro/claudedesignskills](https://github.com/freshtechbro/claudedesignskills) | Animated React component libraries, React Bits among them |
| `aceternity-ui` | [secondsky/claude-skills](https://github.com/secondsky/claude-skills) | Aceternity UI animated components for React and Next.js. Path: `plugins/aceternity-ui/` |
| `motionsites-web-builder` | [Motionsites-AI/claude-skill](https://github.com/Motionsites-AI/claude-skill) | MotionSites motion-heavy site builder. Vendor without `examples/` and `media/`, which are not MIT. Check first whether it needs their paid service |

## Kotlin / Android

| Skill | Source | What it does |
|---|---|---|
| `kotlin-coroutines-flows` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | Coroutines and Flow patterns |
| `kotlin-testing` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | Kotlin testing |
| `kotlin-patterns` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | Idiomatic Kotlin |
| `android-clean-architecture` | [affaan-m/ecc](https://github.com/affaan-m/ecc) | Android clean architecture |

## Exceptions: installed from their source

These skills are in use but their repositories have no licence file, or a
licence outside the allowed list, so they cannot be copied here. They skip this repository's review and CI checks, so each
update in a project is taken on trust: read the upstream diff before running the
skills CLI update there. Projects that need them install them from the source
repository with the skills CLI, as the only exception to the rule above. Each
one moves into this repository as soon as its source adds a licence.

| Skill | Source | Status |
|---|---|---|
| `deploy-to-vercel` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | No licence file |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | No licence file (frontmatter says MIT) |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | No licence file |
| `close-reading-skill-builder`, `criterion-referenced-rubric-generator`, `discipline-specific-critical-thinking-task-designer`, `historical-source-adapter`, `single-point-rubric-designer` | [garethmanning/education-agent-skills](https://github.com/garethmanning/education-agent-skills) | CC BY-SA 4.0, not on the allowed list |

## Refused

| Skill | Source | Reason |
|---|---|---|
| `high-end-visual-design` | [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | Removed upstream; the repository now ships only `design-taste-frontend` |
| `astro` | [astrolicious/agent-skills](https://github.com/astrolicious/agent-skills) | Replaced by the own `astro-framework`, which covers Astro 6 and 7; the upstream skill predates them. No licence file either (asked in [astrolicious/agent-skills#4](https://github.com/astrolicious/agent-skills/issues/4)) |
| `socratic-teaching-scaffolds` | [lyndonkl/claude](https://github.com/lyndonkl/claude) | No licence file. Replaced by the vendored `socratic-tutor` |
| `find-skills` | [vercel-labs/skills](https://github.com/vercel-labs/skills) | Its purpose is finding and installing skills from any source, which this repository's rule forbids. This catalog takes its place |
