# NGO Factory

A small non-profit platform where local NGOs submit AI projects for their community. Each project is refined, estimated, funded and delivered through public gates. Built with SvelteKit for the Qodo Software Factory Hackathon.

Read [SPEC.md](SPEC.md) for what it does and [AGENTS.md](AGENTS.md) for how agents and humans work on it.

Funding and project data are simulated in this build.

## Run it

```bash
npm install
npm run dev
```

## Verify it

```bash
npm run check && npm run lint && npm test && npm run build
```

## Optional: Qodo tools for your coding agent

`.mcp.json` connects the Qodo managed tools to an MCP-capable coding agent such as Claude Code. This needs a Qodo account and an API key, which may incur costs. The app and its tests do not need it.

Put the key in Claude Code's local settings for this project, `.claude/settings.local.json`. `.gitignore` keeps that file out of git. Never put the key in any other file in the repo.

```json
{
	"env": {
		"QODO_API_KEY": "paste-your-key-here"
	}
}
```

Then restart your agent. It asks you to approve the project's MCP server the first time.

This setup is tested in a Claude Code terminal session, not in the desktop app. Check it with `/mcp` inside a running session. `claude mcp list` still reports a missing `QODO_API_KEY` with this setup, so do not rely on it. You can also export `QODO_API_KEY` in your shell instead.
