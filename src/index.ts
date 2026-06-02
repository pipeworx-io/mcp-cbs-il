interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Israel Central Bureau of Statistics (CBS / הלשכה המרכזית לסטטיסטיקה) MCP.
 *
 * Keyless public API at https://apis.cbs.gov.il covering Israeli economic,
 * demographic and price statistics. Two data families:
 *
 *   /series — a hierarchical catalog of numbered time-series. Navigate the
 *     tree by subject id, then fetch a leaf series' actual observations by
 *     its numeric series id.
 *   /index  — the official price indices (CPI, etc.), with their own
 *     catalog tree and a dedicated monthly price-data endpoint.
 *
 * The catalog is hierarchical: top-level subjects come from
 * `catalog_browse` (no id), and `catalog_search` returns the deep leaf
 * "paths" (breadcrumb arrays) under a subject. Series content is bilingual:
 * pass lang="en" (default here) for English, "he" for Hebrew.
 */


const BASE = 'https://apis.cbs.gov.il';
const UA = 'pipeworx-mcp-cbs-il/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'catalog_browse',
    description:
      "Browse the CBS time-series catalog. With no subject_id, returns the top-level subjects (Foreign Trade, Population, Balance of Payments, Consumer Price Index, etc.) — each with a numeric path id. Pass that id back as subject_id to drill into a subject's full set of leaf series paths. The catalog is hierarchical; each catalog entry has a 'path' breadcrumb array and a 'name'. Use this to discover what's available before calling get_series_data.",
    inputSchema: {
      type: 'object',
      properties: {
        subject_id: {
          type: 'integer',
          description:
            'Top-level subject id (from a no-arg call, e.g. 8 = Foreign Trade, 2 = Population). Omit to list the top-level subjects.',
        },
        page: { type: 'integer', description: 'Page number for paginated leaf lists (default 1, page size 100).' },
        lang: { type: 'string', enum: ['en', 'he'], description: 'Content language. Default "en".' },
      },
    },
  },
  {
    name: 'get_series_data',
    description:
      'Fetch the actual time-series observations for a CBS series by its numeric series id (the leaf id found via catalog_browse). Returns metadata (subject path, unit, prices, last update) plus an array of observations with TimePeriod (e.g. "2026-04") and Value. Covers Israeli economic and demographic statistics. Optionally filter by start_period / end_period (YYYY-MM or YYYY).',
    inputSchema: {
      type: 'object',
      properties: {
        series_id: { type: 'integer', description: 'Numeric series id, e.g. 1 (foreign-trade deficit).' },
        start_period: { type: 'string', description: 'Earliest period, e.g. "2025-01" or "2024".' },
        end_period: { type: 'string', description: 'Latest period, e.g. "2026-06".' },
        lang: { type: 'string', enum: ['en', 'he'], description: 'Content language. Default "en".' },
      },
      required: ['series_id'],
    },
  },
  {
    name: 'index_catalog',
    description:
      'List the official CBS price-index catalog tree: chapters (Consumer Price Index, Wholesale Price Index, Housing Price Index, etc.) and their codes. Each code has a numeric codeId used by get_index_data. Use this to find the index code you want (e.g. 120010 = Consumer Price Index - General).',
    inputSchema: {
      type: 'object',
      properties: {
        lang: { type: 'string', enum: ['en', 'he'], description: 'Content language. Default "en".' },
      },
    },
  },
  {
    name: 'get_index_data',
    description:
      'Fetch monthly values for a CBS price index by its numeric code (from index_catalog, e.g. 120010 = CPI General). Returns per-month entries with the index value, the monthly percent change (percent) and the year-over-year change (percentYear) — i.e. Israeli inflation. Optionally filter by start_period / end_period (YYYY-MM or YYYY).',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'integer', description: 'Index code, e.g. 120010 (Consumer Price Index - General).' },
        start_period: { type: 'string', description: 'Earliest period, e.g. "2025-01".' },
        end_period: { type: 'string', description: 'Latest period, e.g. "2026-06".' },
        lang: { type: 'string', enum: ['en', 'he'], description: 'Content language. Default "en".' },
      },
      required: ['code'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const lang = (args.lang as string | undefined) === 'he' ? 'he' : 'en';

  switch (name) {
    case 'catalog_browse': {
      const params = new URLSearchParams({ format: 'json', download: 'false', lang });
      const subjectId = args.subject_id;
      if (subjectId === undefined || subjectId === null) {
        // Top-level subjects. id=1 is the special root that lists every subject.
        params.set('id', '1');
        return cbsGet(`/series/catalog/level?${params.toString()}`);
      }
      if (typeof subjectId !== 'number' || !Number.isInteger(subjectId)) {
        throw new Error('Argument "subject_id" must be an integer subject id (from a no-arg catalog_browse call).');
      }
      params.set('id', String(subjectId));
      if (args.page !== undefined) params.set('Page', String(args.page));
      // Leaf paths under a subject live under /catalog/path (paginated, 100/page).
      return cbsGet(`/series/catalog/path?${params.toString()}`);
    }

    case 'get_series_data': {
      const seriesId = args.series_id;
      if (typeof seriesId !== 'number' || !Number.isInteger(seriesId)) {
        throw new Error('Required argument "series_id" must be an integer, e.g. 1. Find ids via catalog_browse.');
      }
      const params = new URLSearchParams({ id: String(seriesId), format: 'json', download: 'false', lang });
      if (typeof args.start_period === 'string' && args.start_period.trim()) params.set('startPeriod', args.start_period.trim());
      if (typeof args.end_period === 'string' && args.end_period.trim()) params.set('endPeriod', args.end_period.trim());
      return cbsGet(`/series/data/list?${params.toString()}`);
    }

    case 'index_catalog': {
      const params = new URLSearchParams({ format: 'json', download: 'false', lang });
      return cbsGet(`/index/catalog/tree?${params.toString()}`);
    }

    case 'get_index_data': {
      const code = args.code;
      if (typeof code !== 'number' || !Number.isInteger(code)) {
        throw new Error('Required argument "code" must be an integer index code, e.g. 120010. Find codes via index_catalog.');
      }
      const params = new URLSearchParams({ id: String(code), format: 'json', download: 'false', lang });
      if (typeof args.start_period === 'string' && args.start_period.trim()) params.set('startPeriod', args.start_period.trim());
      if (typeof args.end_period === 'string' && args.end_period.trim()) params.set('endPeriod', args.end_period.trim());
      return cbsGet(`/index/data/price?${params.toString()}`);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function cbsGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CBS Israel: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
