# skillpm-skill

An [Agent Skill](https://agentskills.io) that teaches AI agents how to manage other Agent Skills using [skillpm](https://skillpm.dev).

## What this skill does

When loaded by an AI agent (Claude, Codex, Cursor, Gemini CLI, etc.), this skill teaches the agent how to:

- **Install skills** from npm with full dependency resolution
- **Publish skills** to npmjs.org with spec validation
- **Scaffold new skills** with the correct directory structure
- **Wire skills** into agent directories and configure MCP servers
- **Wrap existing skills** for npm distribution

## Install

```bash
npx skillpm install skillpm-skill
```

Or with npm directly:

```bash
npm install skillpm-skill
```

## License

MIT
