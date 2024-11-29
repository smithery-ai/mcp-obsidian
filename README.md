# Obsidian Model Context Protocol

This is a connector to allow Claude Desktop (or any MCP client) to read and search an Obsidian vault. This will also work for any Markdown directory.

## Installation
Make sure Claude Desktop is installed.

Then, simply modify your Claude Desktop config locationed here:

`~/Library/Application\ Support/Claude/claude_desktop_config.json`

If you don't have this config, you can create an empty file at this location.

Add the following to the `mcpServers` array, replacing `<path-to-your-vault>` with the path to your Obsidian vault.

```json
{
    "mcpServers": {
        "obsidian": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-obsidian",
                "<path-to-your-vault>"
            ]
        }
    }
}
```

Then, start Claude Desktop and you should see the following MCP tools listed:

![image](./images/mcp-tools.png)