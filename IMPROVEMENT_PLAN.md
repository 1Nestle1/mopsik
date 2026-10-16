# MOPSCORD improvement plan

Our fork of [Sharkord](https://github.com/sharkord/sharkord). Started 2026-10-15, replanned 2026-10-15.

**Main goal:** stable, high quality voice chat for our friends group. Product brief: [PRODUCT.md](PRODUCT.md).

**Where the work lives:** local branch `mopscord`, made from the `v0.0.27` release. Everything is local only; nothing is committed or pushed yet.

**On the server:** deployed 2026-10-15 20:03 UTC by swapping the binary of the `sharkord` systemd service. The previous stock 0.0.27 binary and a copy of the data folder are in `/opt/sharkord_backup_pre_mopscord`. To roll back: stop `sharkord`, copy that binary back to `/opt/sharkord/sharkord`, start it. No database changes, so the data works with either.

**Languages:** English and Russian only. The other locales stay in the code but are not maintained; new text falls back to English there.

## Order of work

| # | What | Status |
|---|------|--------|
| 1 | Voice stability (stuck-in-channel bug, auto-repair, crash restart) | **Done (local)** |
| 2 | **UI revamp**: minimal, material-like, with spice in voice and motion | **Done (local)** |
| 3 | Right-click user menu and moderation | **Now** |
| 4 | Streaming: WHIP plugin + OBS, then the small "Sharkord Stream" app | After 3 |
| 5 | Remaining voice items (diagnostics, quality settings, push-to-talk from upstream) | Later |

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

## 4. Streaming: after the menu

- **4.1 Browser screen share quick wins:**
  - "Movie / Game" vs "Text" mode, quality presets, prefer H.264.
  - Test the FPS-drop bug ([#752](https://github.com/sharkord/sharkord/issues/752)) on Windows.
- **4.2 WHIP ingest plugin:**
  - Apps like OBS can push a stream into a voice channel with under a second of delay.
  - Each user gets a personal stream key; viewers use the existing player.
  - Check the server's upload bandwidth (≈ bitrate × viewers).
- **4.3 Client app:**
  - **Step A, OBS:** works on day one.
  - **Step B, "Sharkord Stream":** a tiny Windows app (GStreamer + Tauri). Pick a window, app-only audio, GPU encoding, Start/Stop. First prove it with one command line, then wrap it in a UI. **L**
- **4.4 Watch party for links (optional):** everyone plays the same YouTube link in sync.

---

## 5. Later

- Voice diagnostics log line; per-channel bitrate; "Standard" noise suppression as the default.
- Push-to-talk and hotkeys: take them from upstream's `development` branch when released ([#875](https://github.com/sharkord/sharkord/pull/875)).
- Search with SQLite full-text search (FTS5); fix expiring file links ([#852](https://github.com/sharkord/sharkord/issues/852)).
- Spread voice over several CPU cores, only if the server struggles.
- Chat timestamps could show only the time ("1:53 AM") now that day dividers carry the date.
- A DM header that names the person you are talking to.

## Testing on other devices (Wi-Fi)

Set `announcedAddress` under `[webRtc]` in `apps/server/data/config.ini` to this PC's Wi-Fi address and restart the dev server. Phones and laptops on the same Wi-Fi then open `http://<address>:5173`. Text, the Lounge and listening in voice work over plain http. Browsers only give the microphone to secure sites, so to talk from another device either enable Chrome's "Insecure origins treated as secure" flag for that address, or set up HTTPS.

## Decisions still open

1. Does the server run Docker or the plain binary, and what is its upload bandwidth?
2. Should fixes that help everyone (1.1, 1.2) also go upstream as pull requests?
3. Commit each finished item locally on `mopscord`?
