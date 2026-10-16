# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A small group of friends who hang out in voice for hours, usually while gaming or watching something together. They use it mostly in desktop browsers on their PCs, often with the app beside a game or video. The owner self-hosts the server and moderates it.

## Product Purpose

MOPSCORD is the group's own Discord-like place, self-hosted and private: voice channels with webcam and screen share, text channels, threads, DMs, roles and plugins. Success means voice never breaks or lies about its state, and anyone can see at a glance who is around and join them in one click.

## Positioning

A self-hosted fork of the open-source Sharkord, owned by the people who use it. It puts voice stability and quality ahead of feature count, and adds what this group needs (stream-to-watch-together, moderation from a right-click) on top of upstream.

## Operating Context

- Long evening voice sessions, the app running next to a game or a video on the same PC.
- Usually a dark room; the app is often a side window or on a second monitor.
- Short text bursts between voice sessions; mentions and DMs matter more than reading history.

## Capabilities and Constraints

- Web client: React 19, Tailwind 4, shadcn-style primitives in `packages/ui`, lucide icons. Server: Bun, tRPC, SQLite, mediasoup.
- Languages: English and Russian only. Other locales stay in the code but are not maintained; they fall back to English.
- Must stay mergeable with upstream Sharkord: prefer token and component-level changes and plugins over rewrites.
- Planned, not built yet: right-click user moderation menu, WHIP stream ingest plugin and a small streaming app.

## Brand Commitments

- Visual: keep a minimalistic, material-like feel and add "a little spice", mostly in voice and presence, and in motion and small details (user, 2026-10-15).
- Color: keep the original neutral greys and white highlights; a brighter accent was rejected as too bright. The only color is a muted, dark teal for who is speaking and the live voice channel (user, 2026-10-15).
- The shark logo is the current mark. No other binding brand commitments.

## Product Principles

1. Voice is the product: anything that shows or affects a call is first-class and must tell the truth.
2. Presence over notifications: show who is around right now and make joining one click.
3. Calm by default, alive when people talk.
4. Stay close to upstream, so fixes and updates keep flowing.
5. Russian and English are both first-class.
