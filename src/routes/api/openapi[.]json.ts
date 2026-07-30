import { createFileRoute } from "@tanstack/react-router";
import {
  agentOpenApiSpec,
  jsonOk,
  requestOrigin,
} from "@/lib/merch/agent-orders.server";

export const Route = createFileRoute("/api/openapi.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const spec = agentOpenApiSpec(requestOrigin(request));
        return jsonOk(spec);
      },
    },
  },
});
