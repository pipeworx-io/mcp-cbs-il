# mcp-cbs-il

Israel Central Bureau of Statistics (CBS / הלשכה המרכזית לסטטיסטיקה) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `catalog_browse` | Browse the CBS time-series catalog. With no subject_id, returns the top-level subjects (Foreign Trade, Population, Balance of Payments, Consumer Price Index, etc.) — each with a numeric path id. Pass that id back as subject_id to drill into a subject's full set of leaf series paths. The catalog is hierarchical; each catalog entry has a 'path' breadcrumb array and a 'name'. Use this to discover what's available before calling get_series_data. |
| `get_series_data` | Fetch the actual time-series observations for a CBS series by its numeric series id (the leaf id found via catalog_browse). Returns metadata (subject path, unit, prices, last update) plus an array of observations with TimePeriod (e.g. "2026-04") and Value. Covers Israeli economic and demographic statistics. Optionally filter by start_period / end_period (YYYY-MM or YYYY). |
| `index_catalog` | List the official CBS price-index catalog tree: chapters (Consumer Price Index, Wholesale Price Index, Housing Price Index, etc.) and their codes. Each code has a numeric codeId used by get_index_data. Use this to find the index code you want (e.g. 120010 = Consumer Price Index - General). |
| `get_index_data` | Fetch monthly values for a CBS price index by its numeric code (from index_catalog, e.g. 120010 = CPI General). Returns per-month entries with the index value, the monthly percent change (percent) and the year-over-year change (percentYear) — i.e. Israeli inflation. Optionally filter by start_period / end_period (YYYY-MM or YYYY). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "cbs-il": {
      "url": "https://gateway.pipeworx.io/cbs-il/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/cbs-il/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/catalog_browse \
  -H 'Content-Type: application/json' \
  -d '{"subject_id":8}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/catalog_browse`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "cbs-il": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-cbs-il"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-cbs-il
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Cbs Il data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
