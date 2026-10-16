---
version: 1
slug: "apps-client-src"
primary_target: "apps/client/src"
related_targets: ["packages/ui/src"]
---

# Surface brief: MOPSCORD web client (whole app shell)

Scope: the whole web client (`apps/client/src`, primitives in `packages/ui/src`). Mode: Operate.
Audience: a small friends group on PCs, evenings, app beside a game. Task: see who is around, join voice, talk, text in bursts.
Constraints: incumbent three-column layout and behavior stay; English and Russian; stay mergeable with upstream; reduced motion respected.
Memorable moment: the speaking ring and live voice rows, people visibly present.
Unresolved: home "Lounge" content order; light theme (not planned).

## Direction contract

THESIS: Presence is the hero of a voice-first chat; refuses the stock shadcn Discord clone of grey boxes, borrowed blurple and hover-only state.
OWN-WORLD: The original neutral greys and white highlights in tonal layers, one muted dark teal only for speaking and the live voice channel; pill controls, 12px inputs and menus, 16px tiles; Onest with JetBrains Mono numbers; soft per-person avatar tones; lucide icons.
STORY: Open it, see who is in voice, join in one click, always know you are heard.
FIRST VIEWPORT: Sidebar with server, channels, live voice rows with avatars, voice panel, user bar; center channel or call stage with a docked call bar always visible; members right. Primary action is join or leave voice.
FORM: user-pinned evolution of the incumbent minimal material world, no roll, seed key none (pinned).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
