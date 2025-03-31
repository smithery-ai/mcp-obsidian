# Obsidian Model Context Protocol

[![smithery badge](https://smithery.ai/badge/mcp-obsidian)](https://smithery.ai/protocol/mcp-obsidian)
[<img alt="Install in VS Code" src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF">](https://vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522obsidian%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522%2540modelcontextprotocol%252Fserver-obsidian%2522%255D%257D)
[<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522obsidian%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522%2540modelcontextprotocol%252Fserver-obsidian%2522%255D%257D)

This is a connector to allow Claude Desktop (or any MCP client) to read and search any directory containing Markdown notes (such as an Obsidian vault).

## Installation

Make sure Claude Desktop and `npm` is installed.

### Installing via Smithery

To install Obsidian Model Context Protocol for Claude Desktop automatically via [Smithery](https://smithery.ai/protocol/mcp-obsidian):

```bash
npx @smithery/cli install mcp-obsidian --client claude
```

Then, restart Claude Desktop and you should see the following MCP tools listed:

![image](./images/mcp-tools.png)

### Installing in VS Code

For the quickest installation, use the "Install Server" buttons at the top of this README.

For manual installation, you can either:

1. Use the VS Code CLI:

   VS Code (Stable):

   ```bash
   code --add-mcp '{"name":"obsidian","command":"npx","args":["-y","@modelcontextprotocol/server-obsidian"]}'
   ```

   VS Code Insiders:

   ```bash
   code-insiders --add-mcp '{"name":"obsidian","command":"npx","args":["-y","@modelcontextprotocol/server-obsidian"]}'
   ```

2. Add to VS Code settings:
   - Open VS Code
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Open User Settings (JSON)" and select it
   - Add the following to your settings:
   ```json
   {
     "mcp.servers": {
       "obsidian": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-obsidian"]
       }
     }
   }
   ```
