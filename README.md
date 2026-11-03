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

Set the key in your environment (never in a file in this repo), then restart your agent:

```bash
export QODO_API_KEY=...
```

The agent asks you to approve the project's MCP server the first time.
