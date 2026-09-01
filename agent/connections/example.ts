import { defineMcpClientConnection } from "eve/connections";

/**
 * MCP connection named `example` from the filename.
 *
 * Point EXAMPLE_MCP_URL at a Streamable HTTP or SSE MCP server before using
 * this. `tools.allow` is empty so the model cannot call remote tools until you
 * list them. For end-user OAuth, use `connect("connector-uid")` from
 * `@vercel/connect/eve`.
 */
export default defineMcpClientConnection({
  url: process.env.EXAMPLE_MCP_URL ?? "http://127.0.0.1:9/mcp",
  description:
    "Optional example MCP connection. Ignore it unless EXAMPLE_MCP_URL is configured.",
  tools: { allow: [] },
});
