# ALISHA — Pink AI Companion 🐼

A working lightweight responsive web chat inspired by your screenshot. No build tools, no npm packages, no downloaded AI model for visitors.

## Features
- Pink/lavender ALISHA interface with dark sidebar, conversation history and quick prompts
- Animated **3D-style CSS panda**: floating, waving, hiding / peekaboo, lip movements when reading
- Spoken AI replies using your visitor's browser `speechSynthesis` voices (enabled by default)
- Optional speech-to-text using supported browsers
- Conversation history saved to **each browser's localStorage**, with delete controls
- API key only in your server `.env` file, never sent to a visitor's browser
- Works with OpenRouter free-model auto-routing, or Groq fast model inference
- Responsive on phones and desktops
- Node.js built-in HTTP server, with no third-party dependencies

## Windows setup (easy)
1. Install Node.js LTS from https://nodejs.org/ (Node 20+).
2. Extract ZIP, open `alisha-pink` folder.
3. Copy `.env.example` and rename the copy to `.env` (keep `.env.example`).
4. Make a free account at https://openrouter.ai/ and create an API key at https://openrouter.ai/settings/keys.
5. In `.env` replace `replace_with_your_key` after `OPENROUTER_API_KEY=` with your actual key. Keep `AI_PROVIDER=openrouter` and `OPENROUTER_MODEL=openrouter/free`.
6. Open Command Prompt **inside the project folder**, run: `node server.js` (or `npm start`).
7. In your browser visit **http://localhost:3000**. Type a message. The panda will read responses when voice is enabled.

For an optional faster provider: change `AI_PROVIDER=groq`, set `GROQ_API_KEY=...` and `GROQ_MODEL=openai/gpt-oss-20b` in `.env`. Get a free developer key from https://console.groq.com/keys; availability and rate limits may vary.

## Hosting (users never download AI models)
Deploy this project to a web host that **supports Node.js server processes**; set the same environment variables in its secret/environment settings. Use your host's assigned `PORT` if required. Point your domain to that deployment and use HTTPS. Do NOT put `.env` on GitHub or in `/public`. GitHub Pages alone won't run this backend; static frontend hosting needs a separate Node backend and API routing.

### Zero-cost reality check
Free AI is rate-limited, not unlimited. OpenRouter's `openrouter/free` uses eligible free models; as of November 2026 its free-tier default was 50 requests/day and 20 requests/minute, subject to change. Free server hosting also has quotas and may sleep. A busy public site eventually needs funded capacity. ALISHA is the user-facing persona; the underlying AI is an external model.

## Files
- `server.js`: HTTP static files, provider calls, key protection, simple rate limiting, persona prompt.
- `public/index.html`: layout and interface.
- `public/styles.css`: pink design, responsive styling, panda animations.
- `public/app.js`: chat, history, panda behaviors, speech, settings.
- `.env.example`: environment template.

## Important limits / next steps
This MVP is text chat, not every ChatGPT feature. It has no account login, global sync, file/image understanding, live web-search agent, real Unreal Engine model or true 3D geometry. Its panda is drawn and shaded entirely in CSS for fast loading, so it is **3D-style**, not a real imported 3D asset. Speech voices depend on the visitor's device/browser and may vary; speak recognition similarly depends on browser support. AI chats go to your provider and should not be described as end-to-end private. For public launch, add authenticated accounts, secure persistent server-side storage, stronger abuse/budget controls, user-facing privacy policy and content safety checks.

## Testing without API key
The site layout works immediately. `/api/status` shows not connected; sending prompts reports a clear setup message until a valid key is configured.
