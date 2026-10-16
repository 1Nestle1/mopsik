---
target: Sharkord web client UI (apps/client/src)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\Artyom\\Documents\\VS\\MOPSCORDFRFR\\apps\\client\\src"
timestamp: 2026-10-15T01-17-18Z
slug: apps-client-src
---
Method: dual-agent (A: ad167f45ea058b588 · B: a6195220eb707df03)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | A dead microphone still shows green "Voice connected" and green mic icons; the error is only logged (voice-provider/index.tsx:675-679) |
| 2 | Match System / Real World | 3 | Mostly plain chat words; jargon leaks: "Identity" on login, "start a meeting", RTT/transport stats, RNNoise/DTLN names |
| 3 | User Control and Freedom | 3 | Esc and cancel work; leaving voice drops you on an empty screen, changing devices needs a rejoin |
| 4 | Consistency and Standards | 2 | Same action, different names ("Turn on camera" vs "Start Video"); "Disconnect" means leave voice and leave server; call controls hard-coded English |
| 5 | Error Prevention | 3 | Confirmations on delete/kick/ban, HTTP warning; default noise suppression is the experimental one |
| 6 | Recognition Rather Than Recall | 2 | Tile names, call bar and message actions only on hover; DM header doesn't name the person |
| 7 | Flexibility and Efficiency | 2 | A few shortcuts; no quick switcher, no push-to-talk (upstream has it unreleased), no keybinds |
| 8 | Aesthetic and Minimalist Design | 2 | 99+ pill on almost every channel drowns mentions; ~15 voice controls with duplicates; two stacked headers |
| 9 | Error Recovery | 2 | Voice "Connection failed" offers only Disconnect, no Retry; login error under the wrong field |
| 10 | Help and Documentation | 2 | Good inline help on noise suppression; no shortcut list or help entry point |
| **Total** | | **23/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: a stock shadcn Discord clone with a few authored moments. Default shadcn "neutral" theme, no custom font, Discord's own colors (#5865f2 banner, #ec4245 hang-up), grey one-letter avatars. Authored: shark login, waveform icon on live voice channels, three-level speaking glow, voice reactions, reconnect overlay. Biggest miss: the voice stage is a grey box; nothing shows who is hanging out right now.

Deterministic scan: 3 CLI findings in apps/client/src, 0 in packages/ui/src. gradient-text (debug-info/index.tsx:8) false positive (console banner). bounce-easing typing-dots/index.tsx:10 and index.css:391 intentional, but no reduced-motion fallback anywhere. Browser detector (5 views): real undersized Ctrl+K hint (10px, top-bar/server-search.tsx:34); speaking-ring glow is state (keep, gate motion). False positives: nested-cards (sidebar footer strips), clipped-overflow (app shell), layout-transition (Sonner), flat-type-hierarchy (panel labels), text-occlusion (detector labels). Overlays not visible (assessment tab closed).

## Priority Issues

- [P0] A failed microphone looks like a healthy call. Fix: explicit mic state, red "Mic unavailable" on mute buttons and own row, toast with "Allow microphone"/"Pick device", amber chip when nothing is sent, input meter. Command: /impeccable harden
- [P1] In-call controls hide or get clipped: call bar hidden until hover (controls-bar.tsx:54-56, opt-in setting off by default), stage shrinks to ~188px at narrow widths, tile names hover-only (voice-user-card.tsx:236-243). Fix: docked always-visible bar, minimum stage width, names always shown, translate labels. Command: /impeccable layout
- [P1] Moderation hard to find and no voice moderation: no right-click menu on members, voice right-click only volume, kick behind profile icon + sheet where Kick/Ban/Delete look the same, no server mute/deafen/disconnect/timeout. Fix: one shared right-click user menu with a red separated danger zone. Command: /impeccable shape
- [P1] Keyboard and screen readers break: Enter on a channel does nothing, member rows not focusable, hover-only message actions, 13 aria-labels total, no announcements, faint 1px focus ring. Fix: keyboard sensor, focus-within toolbars, labels, live regions, 2px ring. Command: /impeccable audit
- [P2] Blank home and borrowed palette: empty panel after login and after leaving voice, unread pills everywhere, Discord colors. Fix: "Lounge" home (who's in voice, mentions, resume), mention-only badges, own accent + semantic tokens. Command: /impeccable onboard then /impeccable colorize

## Persona Red Flags

Alex: Ctrl+K is search not a switcher; no channel keys, no push-to-talk; device change needs rejoin; volume max 100%; kick takes 3 clicks plus hunting.
Sam: no keyboard channel switching; member rows unfocusable; call bar and message actions mouse-only; unnamed icon buttons; color-only speaking/muted state; endless animations, no reduced motion.
Casey: nothing to tap on landing (swipe-only nav); mute hidden in off-screen drawer while reading during a call; no search below 1024px; hover-dependent controls.

## Minor Observations

- "Members — 16" em dash violates the project's own AGENTS.md (i18n/locales/en/sidebar.json:62)
- Hard-coded English in call controls (controls-bar.tsx:102,114; voice/index.tsx:127)
- Mention highlight ~5% tint, border has no width (message.tsx:90)
- Timestamps jump to full date with seconds after 24h, no day dividers
- Dark mode forced (server-view/index.tsx:85), no theme toggle
- Raw "offline" status untranslated
- Composer emoji/attach/send buttons unlabeled

## Questions to Consider

- What if home were the voice lobby instead of a blank panel?
- If voice is the product, why is a friend a grey "A" in a grey box?
- Should moderation be a place (side sheet) or a gesture (right-click anywhere)?
- What would Sharkord look like owning one color and one shape instead of Discord's?
