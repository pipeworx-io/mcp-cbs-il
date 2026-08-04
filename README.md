# mcp-cbs-il

Israel Central Bureau of Statistics (CBS / הלשכה המרכזית לסטטיסטיקה) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Cbs Il data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
