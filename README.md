# Discord AI Bot

A production-ready Discord bot built with **discord.js v14** featuring AI-powered chat (Claude / OpenAI), 24/7 voice, XP/level system, daily rewards, moderation, anti-spam, and welcome messages.

---

## Features

| Category | Feature |
|---|---|
| 🤖 AI | Claude (Anthropic) or OpenAI replies on mention |
| 🔊 Voice | 24/7 voice channel with exponential-backoff auto-reconnect |
| ✨ XP | Per-message XP gain (rate-limited), level-up announcements |
| 🎁 Daily | Daily XP reward with 24 h cooldown |
| 🏆 Leaderboard | Top 10 XP earners |
| 👋 Welcome | Rich embed on member join |
| 🔇 Moderation | `/kick`, `/ban`, `/mute` (timeout) |
| 🛡️ Anti-spam | Auto-timeout users who spam |
| 🎵 Soundboard | Play local audio clips in voice |
| 📝 Logs | Winston file + console logging |

---

## Quick Start

### 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/discord-ai-bot.git
cd discord-ai-bot
npm install
```

### 2 — Create your `.env` file

```bash
cp .env.example .env
```

Then open `.env` and fill in your values (see [Configuration](#configuration) below).

### 3 — Deploy slash commands

```bash
npm run deploy
```

> Set `GUILD_ID` in `.env` for instant guild-scoped deployment during development.
> Leave it blank for global deployment (takes up to 1 hour).

### 4 — Start the bot

```bash
npm start          # production
npm run dev        # development (auto-restart with nodemon)
```

---

## Creating a Discord Bot

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name
3. Go to **Bot** tab → click **Add Bot**
4. Under **Token** click **Reset Token** and copy it → paste as `DISCORD_TOKEN` in `.env`
5. Copy the **Application ID** → paste as `CLIENT_ID` in `.env`
6. Under **Privileged Gateway Intents** enable:
   - **Server Members Intent**
   - **Message Content Intent**

### Invite the bot to your server

Replace `YOUR_CLIENT_ID` and open this URL in your browser:

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot+applications.commands
```

Permission value `8` = Administrator. For a least-privilege invite use the [Permission Calculator](https://discordapi.com/permissions.html) and select: `Send Messages`, `Read Message History`, `Embed Links`, `Connect`, `Speak`, `Mute Members`, `Kick Members`, `Ban Members`, `Moderate Members`.

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from Developer Portal |
| `CLIENT_ID` | ✅ | Application / bot ID |
| `GUILD_ID` | | Guild ID for instant command deploy during dev |
| `ANTHROPIC_API_KEY` | one of these | Claude API key |
| `OPENAI_API_KEY` | one of these | OpenAI API key |
| `AI_PROVIDER` | | `anthropic` (default) or `openai` |
| `WELCOME_CHANNEL_ID` | | Channel ID for welcome embeds |
| `AI_CHANNEL_ID` | | Channel where bot replies to **all** messages (not just mentions) |
| `LOG_LEVEL` | | `error` / `warn` / `info` (default) / `debug` |

---

## Slash Commands

| Command | Description |
|---|---|
| `/join` | Join your current voice channel (stays 24/7) |
| `/leave` | Disconnect from voice |
| `/ask <question>` | Ask the AI a question |
| `/rank [user]` | Show XP rank and level |
| `/leaderboard` | Top 10 XP earners |
| `/daily` | Claim daily XP reward (24 h cooldown) |
| `/kick <user> [reason]` | Kick a member (requires Kick Members) |
| `/ban <user> [reason] [days]` | Ban a member (requires Ban Members) |
| `/mute <user> <minutes> [reason]` | Timeout a member (requires Moderate Members) |
| `/soundboard [sound]` | Play a sound in voice / list available sounds |

---

## Adding Sounds (Soundboard)

1. Create a `sounds/` folder at the project root
2. Drop `.mp3`, `.ogg`, or `.wav` files in it
3. Use `/soundboard` to list them, `/soundboard <name>` to play one

---

## Project Structure

```
.
├── index.js                    # Entry point
├── src/
│   ├── commands/
│   │   ├── ai/         ask.js
│   │   ├── fun/        soundboard.js
│   │   ├── moderation/ ban.js  kick.js  mute.js
│   │   ├── social/     daily.js  leaderboard.js  rank.js
│   │   └── voice/      join.js  leave.js
│   ├── events/
│   │   ├── guildMemberAdd.js
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   ├── ready.js
│   │   └── voiceStateUpdate.js
│   ├── services/
│   │   ├── aiService.js        # Claude / OpenAI integration
│   │   ├── antiSpamService.js  # Spam detection + auto-timeout
│   │   ├── voiceService.js     # Voice connection + auto-reconnect
│   │   └── xpService.js        # XP / level system
│   └── utils/
│       ├── dataStore.js        # Atomic JSON persistence
│       ├── deploy-commands.js  # Slash command deployer
│       ├── embeds.js           # Embed helpers
│       └── logger.js           # Winston logger
├── data/                       # Runtime JSON (git-ignored)
├── logs/                       # Log files (git-ignored)
├── .env.example
├── .gitignore
└── package.json
```

---

## Deployment

### Railway / Render / Fly.io / VPS

1. Push repo to GitHub
2. Connect the repo to your hosting provider
3. Add env vars via the dashboard (never commit `.env`)
4. Set start command to `npm start`

### PM2 (VPS)

```bash
npm install -g pm2
pm2 start index.js --name discord-bot
pm2 save
pm2 startup
```

---

## Security Notes

- **Never** commit your `.env` file — it's in `.gitignore`
- Rotate your bot token immediately if it's ever exposed
- The bot uses `setDefaultMemberPermissions` on moderation commands so only users with the right server permissions can invoke them
- Anti-spam module auto-timeouts spammers; admins are always exempt

---

## License

MIT
