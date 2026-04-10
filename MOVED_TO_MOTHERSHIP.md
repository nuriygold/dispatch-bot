This folder is now legacy/reference.

Primary app location:
- `/Users/claw/claude/outputs/mothership`

Recommended structure:
- `mothership/` is the main product repo
- dispatch functionality lives inside `mothership` as native app code
- this `dispatch-bot/` folder is only for historical reference or salvage work

Why:
- the live command center, Vercel deploy, Prisma schema, and OpenClaw wiring now live in `mothership`
- keeping `mothership` as the top-level project avoids the confusing "product-inside-feature" layout

If you are about to make new changes, start in:
- `/Users/claw/claude/outputs/mothership`
