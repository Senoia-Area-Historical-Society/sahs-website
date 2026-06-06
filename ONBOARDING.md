# Welcome to SAHS Dev

## How We Use Claude

Based on Jeremy's usage over the last 30 days:

Work Type Breakdown:
  _TODO — not enough sessions yet to show a breakdown_

Top Skills & Commands:
  _None recorded yet_

Top MCP Servers:
  GitHub  ████████████████░░░░  4 calls

## Your Setup Checklist

### Codebases
- [ ] sahs-archive-app — https://github.com/senoia-area-historical-society/sahs-archive-app
- [ ] sahs-website — https://github.com/senoia-area-historical-society/sahs-website

### MCP Servers to Activate
- [ ] **GitHub** — browse repos, open PRs, read CI results, leave review comments — all without leaving Claude. Access is already granted via the shared GitHub org; just connect when prompted.
- [ ] **Google Drive** — search and read files across the shared SAHS Google Drive. Sign in with your `@senoiahistory.com` account.
- [ ] **Google Calendar** — query and create calendar events. Same sign-in.
- [ ] **Gmail** — search threads and draft replies. Same sign-in.

### Skills to Know About
- `/init` — scans a codebase and writes a `CLAUDE.md` so Claude understands the project layout before you start
- `/review` — reviews the current diff for bugs and cleanup opportunities; pass `--fix` to have Claude apply the findings
- `/run` — launches the app and lets Claude observe it directly so it can verify a change actually works

## Team Tips

- If you hit any authentication issues (Google sign-in, Firebase, GitHub), ping Jeremy before spending time debugging — some of these touch shared org settings and are faster to sort out together.

## Get Started

Clone the archive app, open it in Claude Code, and run `/init`. Claude will scan the codebase and generate a `CLAUDE.md` that explains the project layout — it's the fastest way to get oriented before making any changes.

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
