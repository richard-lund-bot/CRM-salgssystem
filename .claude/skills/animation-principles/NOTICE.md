# Animation Principles — vendored skills (curated subset)

These Claude Code skills teach Disney's 12 Principles of Animation. They are a
**curated subset** (28 of 144) vendored from the upstream skill marketplace, kept
in the repo so both Claude Code and the team can reference them while working on
Mova's motion layer (`css/app.css`, `js/animasjon.js`, `js/feiring.js`, etc.).

- **Source:** https://github.com/dylantarre/animation-principles
- **License:** MIT (see `LICENSE` in this folder) — Copyright (c) 2024 Dylan Tarre
- **Vendored:** July 2026, unmodified `SKILL.md` files.

## What's here (why it was picked)

| Skill | Why |
|---|---|
| `squash-stretch-mastery` … `appeal-mastery` (12) | The core 12 principles — the shared vocabulary for the redesign. |
| `css-native`, `frontend-developer` | Our stack: vanilla CSS/JS, no framework. Concrete CSS/keyframe patterns. |
| `joy-delight`, `playfulness-fun`, `excitement-energy` | Energetic celebration language (kiste, streak, level-up, mester). |
| `calm-relaxation` | The **calm tier** — wellness/breathing (quick-start timer, restitusjon). |
| `fitness-wellness` | Our domain: match motion energy to activity intensity, celebrate progress, never shame. |
| `buttons-ctas`, `notifications-toasts`, `loaders-spinners` | UI-element specifics (press feedback, toasts, loaders). |
| `entrance-animations`, `feedback-indicators`, `state-changes` | Entrance staggers, feedback, content swaps. |
| `motion-sickness`, `performance-optimization` | Reduced-motion (non-negotiable) + transform/opacity-only performance. |
| `micro-interactions` | Small, felt-not-noticed polish. |

## How to invoke

Reference a skill in conversation, e.g. *"Use animation-principles:css-native"* or
*"apply animation-principles:joy-delight to this celebration"*. Each skill's
`SKILL.md` carries `name`/`description` frontmatter used for discovery.
