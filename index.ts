#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import fs from "fs/promises"
import path from "path"
import os from "os"
import * as fsSync from "fs"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

// Maximum number of search results to return
const SEARCH_LIMIT = 200

// Command line argument parsing
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Usage: mcp-obsidian <vault-directory>")
  process.exit(1)
}

// Normalize all paths consistently
function normalizePath(p: string): string {
  return path.normalize(p)
}

function expandHome(filepath: string): string {
  if (filepath.startsWith("~/") || filepath === "~") {
    return path.join(os.homedir(), filepath.slice(1))
  }
  return filepath
}

// Store allowed directories in normalized form
const initialDir   = normalizePath(path.resolve(expandHome(args[0])));
const canonicalDir = normalizePath(fsSync.realpathSync(initialDir));

const vaultDirectories =
  initialDir === canonicalDir
    ? [initialDir]                 // no symlink → single entry
    : [initialDir, canonicalDir];

// Validate that all directories exist and are accessible
await Promise.all(
  args.map(async (dir) => {
    try {
      const stats = await fs.stat(dir)
      if (!stats.isDirectory()) {
        console.error(`Error: ${dir} is not a directory`)
        process.exit(1)
      }
    } catch (error) {
      console.error(`Error accessing directory ${dir}:`, error)
      process.exit(1)
    }
  })
)

// Security utilities
async function validatePath(requestedPath: string): Promise<string> {
  // Ignore hidden files/directories starting with "."
  const pathParts = requestedPath.split(path.sep)
  if (pathParts.some((part) => part.startsWith("."))) {
    throw new Error("Access denied - hidden files/directories not allowed")
  }

  const expandedPath = expandHome(requestedPath)
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(process.cwd(), expandedPath)

  const normalizedRequested = normalizePath(absolute)

  // Check if path is within allowed directories
  const isAllowed = vaultDirectories.some((dir) =>
    normalizedRequested.startsWith(dir)
  )
  if (!isAllowed) {
    throw new Error(
      `Access denied - path outside allowed directories: ${absolute} not in ${vaultDirectories.join(
        ", "
      )}`
    )
  }

  // Handle symlinks by checking their real path
  try {
    const realPath = await fs.realpath(absolute)
    const normalizedReal = normalizePath(realPath)
    const isRealPathAllowed = vaultDirectories.some((dir) =>
      normalizedReal.startsWith(dir)
    )
    if (!isRealPathAllowed) {
      throw new Error(
        "Access denied - symlink target outside allowed directories"
      )
    }
    return realPath
  } catch (error) {
    // For new files that don't exist yet, verify parent directory
    const parentDir = path.dirname(absolute)
    try {
      const realParentPath = await fs.realpath(parentDir)
      const normalizedParent = normalizePath(realParentPath)
      const isParentAllowed = vaultDirectories.some((dir) =>
        normalizedParent.startsWith(dir)
      )
      if (!isParentAllowed) {
        throw new Error(
          "Access denied - parent directory outside allowed directories"
        )
      }
      return absolute
    } catch {
      throw new Error(`Parent directory does not exist: ${parentDir}`)
    }
  }
}

// Schema definitions
const ReadNotesArgsSchema = z.object({
  paths: z.array(z.string()),
})

const SearchNotesArgsSchema = z.object({
  query: z.string(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = any

// Server setup
const server = new Server(
  {
    name: "mcp-obsidian",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

/**
 * Search for notes in the allowed directories that match the query.
 * @param query - The query to search for.
 * @returns An array of relative paths to the notes (from root) that match the query.
 */
async function searchNotes(query: string): Promise<string[]> {
  const results: string[] = []

  async function search(basePath: string, currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      try {
        // Validate each path before processing
        await validatePath(fullPath)

        let matches = entry.name.toLowerCase().includes(query.toLowerCase())
        try {
          matches =
            matches ||
            new RegExp(query.replace(/[*]/g, ".*"), "i").test(entry.name)
        } catch {
          // Ignore invalid regex
        }

        if (entry.name.endsWith(".md") && matches) {
          // Turn into relative path
          results.push(fullPath.replace(basePath, ""))
        }

        if (entry.isDirectory()) {
          await search(basePath, fullPath)
        }
      } catch (error) {
        // Skip invalid paths during search
        continue
      }
    }
  }

  await Promise.all(vaultDirectories.map((dir) => search(dir, dir)))
  return results
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_notes",
        description:
          "Read the contents of multiple notes. Each note's content is returned with its " +
          "path as a reference. Failed reads for individual notes won't stop " +
          "the entire operation. Reading too many at once may result in an error.",
        inputSchema: zodToJsonSchema(ReadNotesArgsSchema) as ToolInput,
        annotations: {
          title: "Read Notes",
          readOnlyHint: true,
        },
      },
      {
        name: "search_notes",
        description:
          "Searches for a note by its name. The search " +
          "is case-insensitive and matches partial names. " +
          "Queries can also be a valid regex. Returns paths of the notes " +
          "that match the query.",
        inputSchema: zodToJsonSchema(SearchNotesArgsSchema) as ToolInput,
        annotations: {
          title: "Search Notes",
          readOnlyHint: true,
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    switch (name) {
      case "read_notes": {
        const parsed = ReadNotesArgsSchema.safeParse(args)
        if (!parsed.success) {
          throw new Error(`Invalid arguments for read_notes: ${parsed.error}`)
        }
        const results = await Promise.all(
          parsed.data.paths.map(async (filePath: string) => {
            try {
              const validPath = await validatePath(
                path.join(vaultDirectories[0], filePath)
              )
              const content = await fs.readFile(validPath, "utf-8")
              return `${filePath}:\n${content}\n`
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error)
              return `${filePath}: Error - ${errorMessage}`
            }
          })
        )
        return {
          content: [{ type: "text", text: results.join("\n---\n") }],
        }
      }
      case "search_notes": {
        const parsed = SearchNotesArgsSchema.safeParse(args)
        if (!parsed.success) {
          throw new Error(`Invalid arguments for search_notes: ${parsed.error}`)
        }
        const results = await searchNotes(parsed.data.query)

        const limitedResults = results.slice(0, SEARCH_LIMIT)
        return {
          content: [
            {
              type: "text",
              text:
                (limitedResults.length > 0
                  ? limitedResults.join("\n")
                  : "No matches found") +
                (results.length > SEARCH_LIMIT
                  ? `\n\n... ${
                      results.length - SEARCH_LIMIT
                    } more results not shown.`
                  : ""),
            },
          ],
        }
      }
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    }
  }
})

// Start server
async function runServer() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("MCP Obsidian Server running on stdio")
  console.error("Allowed directories:", vaultDirectories)
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error)
  process.exit(1)
})
