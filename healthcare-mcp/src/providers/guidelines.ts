// Clinical Guidelines Provider - PubMed E-utilities API
import { fetchJson, buildQueryString } from "../utils/http.js";
import type { ToolCallResult, McpToolDefinition } from "../mcp/types.js";

const PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

// Response types
interface ESearchResult {
  esearchresult: {
    count: string;
    idlist: string[];
    querytranslation?: string;
  };
}

interface ESummaryResult {
  result: {
    uids: string[];
    [pmid: string]: {
      uid: string;
      pubdate: string;
      source: string;
      title: string;
      authors?: Array<{ name: string }>;
      fulljournalname?: string;
      volume?: string;
      issue?: string;
      pages?: string;
      elocationid?: string;
      pubtype?: string[];
      articleids?: Array<{ idtype: string; value: string }>;
    } | string[];
  };
}

interface EFetchResult {
  PubmedArticleSet?: {
    PubmedArticle?: Array<{
      MedlineCitation?: {
        PMID?: { _: string };
        Article?: {
          ArticleTitle?: string;
          Abstract?: {
            AbstractText?: string | Array<{ _: string; Label?: string }>;
          };
          AuthorList?: {
            Author?: Array<{
              LastName?: string;
              ForeName?: string;
              Initials?: string;
            }>;
          };
        };
      };
    }>;
  };
}

// Tool definitions
export const searchGuidelinesTool: McpToolDefinition = {
  name: "search_guidelines",
  description: "Search PubMed for clinical practice guidelines on medical conditions, treatments, or procedures. Returns guideline titles, sources, and publication details.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Medical condition, treatment, or topic to search guidelines for",
      },
      specialty: {
        type: "string",
        description: "Medical specialty to filter by (e.g., 'cardiology', 'oncology', 'pediatrics')",
      },
      years: {
        type: "number",
        description: "Limit to guidelines from the last N years (default: 5)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 25)",
      },
    },
    required: ["query"],
  },
};

export const guidelineSummaryTool: McpToolDefinition = {
  name: "guideline_summary",
  description: "Get detailed summary and abstract of a specific clinical guideline by its PubMed ID (PMID).",
  inputSchema: {
    type: "object",
    properties: {
      pmid: {
        type: "string",
        description: "PubMed ID of the guideline to retrieve",
      },
    },
    required: ["pmid"],
  },
};

// Helper to build guideline-specific search query
function buildGuidelineQuery(query: string, specialty?: string, years?: number): string {
  // Add guideline-specific terms to improve relevance
  const guidelineTerms = [
    "practice guideline[pt]",
    "guideline[pt]",
    "consensus[tiab]",
    "recommendation[tiab]",
  ].join(" OR ");

  let searchQuery = `(${query}) AND (${guidelineTerms})`;

  if (specialty) {
    searchQuery += ` AND ${specialty}[mh]`;
  }

  if (years) {
    const minYear = new Date().getFullYear() - years;
    searchQuery += ` AND ${minYear}:3000[dp]`;
  }

  return searchQuery;
}

// Tool handlers
export async function searchGuidelinesHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const query = String(args.query);
  const specialty = args.specialty as string | undefined;
  const years = Number(args.years) || 5;
  const limit = Math.min(Number(args.limit) || 10, 25);

  const searchQuery = buildGuidelineQuery(query, specialty, years);

  // First, search for PMIDs
  const searchUrl = `${PUBMED_BASE}/esearch.fcgi${buildQueryString({
    db: "pubmed",
    term: searchQuery,
    retmax: limit,
    retmode: "json",
    sort: "relevance",
  })}`;

  try {
    const searchResponse = await fetchJson<ESearchResult>(searchUrl);
    const pmids = searchResponse.data.esearchresult?.idlist || [];

    if (pmids.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No clinical guidelines found for "${query}". Try broader search terms or increase the year range.`,
        }],
      };
    }

    // Get summaries for found PMIDs
    const summaryUrl = `${PUBMED_BASE}/esummary.fcgi${buildQueryString({
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
    })}`;

    const summaryResponse = await fetchJson<ESummaryResult>(summaryUrl);
    const results = summaryResponse.data.result;

    const formatted = pmids.map((pmid, idx) => {
      const article = results[pmid];
      if (!article || Array.isArray(article)) return "";

      const authors = article.authors?.slice(0, 3).map((a) => a.name).join(", ") || "N/A";
      const doi = article.articleids?.find((id) => id.idtype === "doi")?.value;

      let text = `### ${idx + 1}. ${article.title}\n`;
      text += `**PMID:** ${pmid}\n`;
      text += `**Source:** ${article.fulljournalname || article.source}\n`;
      text += `**Published:** ${article.pubdate}\n`;
      text += `**Authors:** ${authors}${article.authors && article.authors.length > 3 ? " et al." : ""}\n`;
      if (article.pubtype?.length) {
        text += `**Type:** ${article.pubtype.join(", ")}\n`;
      }
      if (doi) {
        text += `**DOI:** https://doi.org/${doi}\n`;
      }
      text += `**PubMed:** https://pubmed.ncbi.nlm.nih.gov/${pmid}/\n`;

      return text;
    }).filter(Boolean);

    const totalCount = searchResponse.data.esearchresult?.count || pmids.length;

    return {
      content: [{
        type: "text",
        text: `# Clinical Guidelines: "${query}"\n\nFound ${totalCount} guidelines (showing ${pmids.length}):\n${specialty ? `Specialty filter: ${specialty}\n` : ""}Last ${years} years\n\n${formatted.join("\n---\n\n")}\n\n---\n*Use guideline_summary with a PMID to get the full abstract and details.*`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error searching guidelines: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

export async function guidelineSummaryHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const pmid = String(args.pmid);

  // Get detailed article info including abstract
  const fetchUrl = `${PUBMED_BASE}/efetch.fcgi${buildQueryString({
    db: "pubmed",
    id: pmid,
    retmode: "xml",
    rettype: "abstract",
  })}`;

  // Also get summary for metadata
  const summaryUrl = `${PUBMED_BASE}/esummary.fcgi${buildQueryString({
    db: "pubmed",
    id: pmid,
    retmode: "json",
  })}`;

  try {
    // Fetch both in parallel
    const [abstractResponse, summaryResponse] = await Promise.all([
      fetch(fetchUrl, {
        headers: { "User-Agent": "Healthcare-MCP-Server/1.0.0" },
      }),
      fetchJson<ESummaryResult>(summaryUrl),
    ]);

    const abstractXml = await abstractResponse.text();
    const summary = summaryResponse.data.result?.[pmid];

    if (!summary || Array.isArray(summary)) {
      return {
        content: [{
          type: "text",
          text: `Article not found with PMID: ${pmid}`,
        }],
        isError: true,
      };
    }

    // Parse abstract from XML (simple regex extraction)
    const abstractMatch = abstractXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi);
    let abstract = "No abstract available.";
    
    if (abstractMatch) {
      abstract = abstractMatch
        .map((match) => {
          const labelMatch = match.match(/Label="([^"]+)"/);
          const textMatch = match.match(/>([^<]+)</);
          const label = labelMatch ? `**${labelMatch[1]}:** ` : "";
          const text = textMatch ? textMatch[1].trim() : "";
          return label + text;
        })
        .join("\n\n");
    }

    const authors = summary.authors?.map((a) => a.name).join(", ") || "N/A";
    const doi = summary.articleids?.find((id) => id.idtype === "doi")?.value;

    let text = `# ${summary.title}\n\n`;
    text += `**PMID:** ${pmid}\n`;
    text += `**Journal:** ${summary.fulljournalname || summary.source}\n`;
    text += `**Published:** ${summary.pubdate}\n`;
    if (summary.volume) {
      text += `**Citation:** ${summary.volume}`;
      if (summary.issue) text += `(${summary.issue})`;
      if (summary.pages) text += `:${summary.pages}`;
      text += "\n";
    }
    text += `**Authors:** ${authors}\n`;
    if (summary.pubtype?.length) {
      text += `**Article Type:** ${summary.pubtype.join(", ")}\n`;
    }
    if (doi) {
      text += `**DOI:** https://doi.org/${doi}\n`;
    }
    text += `**PubMed Link:** https://pubmed.ncbi.nlm.nih.gov/${pmid}/\n`;
    text += `\n## Abstract\n\n${abstract}\n`;

    return {
      content: [{
        type: "text",
        text,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching guideline: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
