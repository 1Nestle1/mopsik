# MOPSCORD improvement plan

Our fork of [Sharkord](https://github.com/sharkord/sharkord). Started 2026-10-15, replanned 2026-10-16.

**Main goal:** stable, high quality voice chat for our friends group. Product brief: [PRODUCT.md](PRODUCT.md).

**Where the work lives:** branch `mopscord`, made from the `v0.0.27` release, pushed to [1Nestle1/mopsik](https://github.com/1Nestle1/mopsik) (public, so no server details or secrets in the repo).

**On the server:** deployed 2026-10-15 20:03 UTC by swapping the binary of the `sharkord` systemd service. The previous stock 0.0.27 binary and a copy of the data folder are in `/opt/sharkord_backup_pre_mopscord`. To roll back: stop `sharkord`, copy that binary back to `/opt/sharkord/sharkord`, start it. No database changes, so the data works with either.

**Languages:** English and Russian only. The other locales stay in the code but are not maintained; new text falls back to English there.

## Order of work

| # | What | Status |
|---|------|--------|
| 1 | Voice stability (stuck-in-channel bug, auto-repair, crash restart) | **Done (local)** |
| 2 | **UI revamp**: minimal, material-like, with spice in voice and motion | **Done (local)** |
| 3 | Right-click user menu and moderation | 3a done, 3b paused |
| 4 | **Streaming**: better browser sharing, OBS ingest, then the small app | **Now** |
| 5 | Ideas backlog, ranked | Next, one at a time |

Sizes: **S** = an evening, **M** = a few sessions, **L** = a bigger project.

---

## 1. Voice stability: done (local)

- **1.1 Stuck in channel** ([#849](https://github.com/sharkord/sharkord/issues/849)):
  - Voice now belongs to the connection that joined it, and a new connection takes over a stale session.
  - The app rejoins by itself after a reconnect or server restart.
  - Tested, and verified live.
- **1.2 Auto-repair after network blips:**
  - Broken media connections are repaired in place ("ICE restart"); a full rejoin is the last resort.
  - Tested; needs a real network test on the server (toggle Wi-Fi during a call).
- **1.3 Crash restart:** the server exits with an error code when the media process dies, so Docker restarts it.
- **Server checklist:**
  - `webRtc.announcedAddress` must be the public IP, not a domain.
  - Open port 40000 UDP + TCP.
  - Run Docker with `--restart unless-stopped`.

---

## 2. UI revamp: done (local)

Based on the design critique (23/40) and your direction: keep it minimal and material-like, and put the spice in **voice and presence** and in **motion and small details**. Built code-first and checked in the real app.

### Direction

- **Scene:** friends in a dim room in the evening, the app next to a game. So it stays dark.
- **Color (changed 2026-10-15 at your request):**
  - The original neutral greys and white highlights stay, lifted a few steps so nothing is near-black. The chat is lighter than the sidebars.
  - The only color is a muted, darker teal (`live`), used just for who is speaking and the voice channel you are live in.
  - Status colors are named tokens: danger, warning, live.
- **Surfaces:** material-style tonal layers (ground, sidebar, cards) instead of borders and shadows. Hover and press use soft state layers.
- **Shape:** pill buttons, chips and badges; 12px inputs and menus; 16px cards, tiles and dialogs; round avatars.
- **Type:** Onest, a friendly UI font with full Cyrillic, plus JetBrains Mono for numbers and stats.
- **Motion:** quick ease-out transitions. The signature moment is the speaking ring, which breathes with each person's voice. Everything turns still when "reduce motion" is on.
- **Avatars:** colored by person, instead of grey letters (upstream [#867](https://github.com/sharkord/sharkord/issues/867)).

### Steps

| Step | What | Status |
|------|------|--------|
| R0 | Failed-microphone state (critique P0): amber status, notice with Try again / Devices, warning on mic buttons and your row, toast | **Done (local)**, en + ru, tested |
| R1 | Foundation: color and surface tokens, fonts, shape rules for buttons, inputs and badges, focus ring, reduced motion, themed scrollbars and selection | **Done (local)** |
| R2 | Shell: sidebar and channel rows (unread as a bold name, filled badge only for mentions), voice panel, user bar, top bar | **Done (local)** |
| R3 | Voice: call stage and tiles (names always visible, speaking ring), a docked call bar that's always visible, translated labels | **Done (local)** |
| R4 | Chat: message hover layers, visible mention highlight, reactions, composer, day dividers ("Today", "Yesterday", dates), timestamps without seconds | **Done (local)** |
| R5 | Home "Lounge" instead of a black screen: greeting, search, who is in voice with one-click join, unread channels to catch up on, who is online | **Done (local)**, en + ru, tested |
| R6 | Settings, dialogs, login: tonal surfaces without hairlines, settings sidebar like the channel list, image pickers as tiles (they had turned into pills), filled Connect button, phone-width login, compact search | **Done (local)** |
| R7 | Keyboard and screen readers: Enter and Space open channels and member cards, focus rings on icon buttons, message actions show while focus is inside a message, names on the icon buttons people use daily, voice status announced, typing line translated | **Done (local)**, en + ru, tested |

Left for later: about 20 unnamed icon buttons in admin screens (roles, emojis, invites, plugins), and moving between messages with the arrow keys.

---

## 3. Right-click user menu and moderation: now, M + M

One menu everywhere a user appears: member list, message author, voice row, voice tile. It also opens from the keyboard.

1. Profile, Send message, Mention
2. Volume (up to 200%), Mute for me
3. *(moderators)* Server mute, Server deafen, Move to ▸, Disconnect from voice
4. *(moderators)* Roles ▸ (checkboxes)
5. *(moderators, in red, after a separator)* Timeout, Kick, Ban

**Rules:**
- Items you can't use say why.
- Reversible actions get an Undo toast.

**Step 3a, done (local), en + ru, tested:** one right-click menu on member rows, voice rows, voice tiles and message avatars. It has the volume slider when the person is in your call, Direct message, Move to ▸, Roles ▸ (checkboxes), Moderation view, Kick (says "offline" when it can't be used) and Ban. Kick, ban, direct message and move now share one implementation with the moderation view, the profile card and drag to move.

**Step 3b, in progress:**
- **Disconnect from voice: done (local), tested.** New server route, allowed with the Move members permission. It can't reach into DM calls or channels the moderator can't see, and can't be used on the server owner. The person's app ends the call cleanly instead of auto-rejoining.
- **Next:** Server mute / deafen (enforced on the server), Timeout (needs a database change), Mention, and volume above 100% (needs Web Audio gain instead of the audio element's volume).

**New server work:**
- Server mute / deafen, enforced on the server.
- Disconnect from voice.
- Timeout (needs a database change).
- Permissions for these.

---

## 4. Streaming: now

**Why browser sharing alone is not enough:**
- The browser always marked shared video as "detail" (text), so under load it kept the resolution and dropped frames. That is the wrong trade for games and movies, and fits the 1 fps reports ([#752](https://github.com/sharkord/sharkord/issues/752), [#519](https://github.com/sharkord/sharkord/issues/519)).
- Browsers can't capture one app's sound, can't hook a fullscreen game, and slow down when the window loses focus. OBS (or a small app) has none of these problems.

**What we have to build on:**
- The server already accepts VP8, VP9, H.264 (Baseline and High) and AV1 video with Opus audio.
- Streams from outside a browser already show as cards in a call ("external streams").
- Everything can reuse the media port 40000 that is already open, with signalling through nginx on 443. No new firewall rules on the shared server.

**Steps:**
- **4.1 Screen share modes (browser, nothing to install), S: done (local), en + ru, tested.** Checked in the app: a Motion share goes out as H.264 with the frame rate kept.
  - "Optimize for": **Motion** (games, video: keeps the frame rate, lowers sharpness under load) or **Detail** (text, code: keeps it sharp, may lower the frame rate). Motion is the default.
  - Quality presets: Smooth 720p60, Sharp 1080p30, Best 1080p60, plus the existing manual settings.
  - Auto codec picks H.264 for Motion, which most graphics cards encode in hardware, so less CPU and fewer dropped frames.
- **4.2 OBS ingest over WHIP (server), M to L: done (local), tested end to end** (a browser WHIP client streamed into a call and a viewer saw it play):
  - WHIP is the standard way for OBS 30+ to push a WebRTC stream: one HTTPS request with an SDP offer.
  - New server endpoint `/whip`. The stream goes into the voice channel you are in, as a card titled with your name, with sub-second delay for viewers.
  - Personal stream key in User settings → Streaming (regenerate any time). Needs the Share screen permission.
  - SDP handling with `sdp-transform` (already a dependency). The official `mediasoup-sdp-bridge` was never published to npm (the name there is a security placeholder), so we don't use it.
  - Server upload ≈ stream bitrate × viewers: 6 Mbps × 5 friends = 30 Mbps.
- **4.3 OBS guide, S: done (local), en + ru.** Settings page shows the URL and key, with a short "Set up OBS" guide (Service: WHIP, x264 or NVENC, Opus audio, CBR). Works on day one.
- **4.4 "MOPSCORD Stream" small app, L:**
  - First a single GStreamer command proves it: window capture, that app's sound only (Windows 11), GPU H.264 encoding, sent to the same `/whip` endpoint.
  - Then a tiny Tauri window: pick an app, Start / Stop. Could later grow into a desktop client with global push-to-talk.
- **4.5 Going live, S to M:** LIVE badge in the sidebar and Lounge, a "started streaming, Watch" toast, theater mode, stream audio muted until you click (upstream [#749](https://github.com/sharkord/sharkord/issues/749)), hide everyone's video (upstream [#123](https://github.com/sharkord/sharkord/issues/123)).
- **4.6 Watch party (optional), M:** everyone plays the same YouTube link in sync.

---

## 5. Ideas backlog, ranked

Ranked by value for a friends group divided by effort, voice first. Upstream votes in brackets.

**Core quality (small to medium):**
1. **Merge upstream push-to-talk and hotkeys** ([#875](https://github.com/sharkord/sharkord/pull/875)) and the new plugin SDK: **done (local)**. It came with server mute (shown as an amber mic), plugin storage, and the Bridge tray app for push-to-talk while in a game. Merged before our own migration so drizzle applies upstream's 0036 and 0037 first.
2. **Volume up to 200% per person** (+9, [#201](https://github.com/sharkord/sharkord/issues/201)): Web Audio gain instead of the audio element's volume. S to M
3. **Server mute in the right-click menu** (upstream added server mute for plugins, so this is mostly UI), then deafen and timeout. M
4. **Custom status and a voice channel status** (+8, [#242](https://github.com/sharkord/sharkord/issues/242)): "In a match", "AFK", or "Dota 2" shown on the room. M
5. **Basic Markdown** (+15, [#401](https://github.com/sharkord/sharkord/issues/401)): check what the editor already supports, fill the gaps. S to M
6. **Nightly backup of Sharkord's data on the server** with a week of copies. S, needs the server owner's OK

**Fun and presence (the spice):**
7. **Soundboard**: short clips played into the call by the server, so everyone hears them in sync. M
8. **Voice messages in chat** (+5, [#771](https://github.com/sharkord/sharkord/issues/771)). M
9. **Phone notifications** for mentions and DMs (web push, works with the site on the home screen). M
10. **GIF picker** through our own server, since outside services are often blocked in Russia. M
11. **Desktop app** with global push-to-talk (a browser can't see keys while you're in a game). Shares a codebase with 4.4. L

**Smaller polish:** chat timestamps that show only the time, a DM header with the person's name, "Standard" noise suppression by default, per-channel bitrate, search with SQLite full-text search.

## Testing on other devices (Wi-Fi)

Set `announcedAddress` under `[webRtc]` in `apps/server/data/config.ini` to this PC's Wi-Fi address and restart the dev server. Phones and laptops on the same Wi-Fi then open `http://<address>:5173`. Text, the Lounge and listening in voice work over plain http. Browsers only give the microphone to secure sites, so to talk from another device either enable Chrome's "Insecure origins treated as secure" flag for that address, or set up HTTPS.

## Decisions still open

1. What is the server's upload bandwidth? (It runs the plain binary under systemd.)
2. Should fixes that help everyone (1.1, 1.2) also go upstream as pull requests?
3. Commit and push after each finished item?
