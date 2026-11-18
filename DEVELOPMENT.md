# Development

## Requirements

- [Bun](https://bun.sh/)
- [Tmux](https://github.com/tmux/tmux) (optional)

## Setup

1. Clone the repository.
2. Run `bun install`.
3. Start the app:
   - With tmux: `./start.sh`
   - Without tmux: run `bun dev` in both `apps/client` and `apps/server`

Development data is stored in `apps/server/data`, including the database and uploaded files.
Delete that folder if you want a clean reset.

## Mock data

To start from a server that looks used rather than empty, stop the dev server and run:

```bash
cd apps/server
bun run seed:mock
```

It **wipes `apps/server/data`** and rebuilds it: users, roles, categories, text and voice
channels, a private channel, messages spread over weeks with replies, threads, reactions and
pins, plus a few direct messages. Log in as `admin` with `password123`; every mock user shares
that password, and `useToken("dev")` still claims ownership.

It also creates a `#counting` channel holding 10,000 messages numbered `0` to `9999`, oldest
first, so scrolling, pagination and jump-to-message can be checked against a message that says
exactly where you are. Authors and timestamps alternate between runs of the same person seconds
apart, which the client draws as one group, and switches or longer gaps, which it draws
separately.

`--size small|medium|large` changes the volume (large is 25k messages, for pagination and
search), `--seed <number>` changes the cast, and `--counting <n>` resizes the numbered channel
(`0` skips it). The same seed always produces the same server.

## GIF sources

MOPSCORD ships six original pixel-art shark reactions in `apps/client/public/reaction-gifs`.
The built-in library is available on its own domain without API credentials.
My GIFs stores bookmarked reactions and imported GIF files in IndexedDB for the signed-in user on
that browser. Local files use the regular attachment upload when selected from the library.

On deployments that allow direct browser requests to third parties, configure
`VITE_GIPHY_API_KEY` or `VITE_KLIPY_API_KEY` in an untracked `apps/client/.env.local`
before building the client. Use browser API keys, which Vite includes in the public bundle.
Each configured provider gets its own search tab. With both keys unset, the picker uses only
the built-in library and third-party GIFs in chat display their text descriptions.
The GIPHY attribution images come from the [official GIPHY brand kit](https://developers.giphy.com/docs/api/quick-start-guide/#attribution).

## Testing

To run tests, use the following command:

```bash
bun run test
```

(if you only run `bun test` it's gonna fail, you NEED to run `bun run test`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.
