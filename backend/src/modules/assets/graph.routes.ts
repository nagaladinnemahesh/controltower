import { FastifyInstance } from "fastify";
import {
  getAllNodes,
  getNodeById,
  getAllNodesByLabel,
  getImpactAnalysis,
  getAllRelationships,
} from "./graph.service";
import { NodeLabel } from "../../types/graph";
import { request } from "node:http";
import { appendFile } from "node:fs";

export default async function graphRoutes(app: FastifyInstance) {
  // GET /api/graph/nodes - return all nodes in graph
  app.get("/nodes", async (request, reply) => {
    const nodes = await getAllNodes(app.neo4j);
    return { count: nodes.length, nodes };
  });

  // GET /api/graph/nodes/:id - returns a single node by id
  app.get<{ Params: { id: string } }>("/nodes/:id", async (request, reply) => {
    const node = await getNodeById(app.neo4j, request.params.id);
    if (!node) {
      return reply
        .status(404)
        .send({ error: `Node ${request.params.id} not found` });
    }
    return node;
  });

  // GET /api/graph/label/:label - returns all nodes of specific label
  app.get<{ Params: { label: string } }>(
    "/label/:label",
    async (request, reply) => {
      const label = request.params.label as NodeLabel;
      const nodes = await getAllNodesByLabel(app.neo4j, label);
      return { count: nodes.length, nodes };
    },
  );

  // GET /api/graph/impact/:id - returns full blast radius
  app.get<{ Params: { id: string } }>("/impact/:id", async (request, reply) => {
    const impact = await getImpactAnalysis(app.neo4j, request.params.id);
    if (!impact) {
      return reply
        .status(404)
        .send({ error: `Node ${request.params.id} not found` });
    }
    return impact;
  });

  // GET /api/graph/relationships
  app.get("/relationships", async (request, reply) => {
    const relationships = await getAllRelationships(app.neo4j);
    return { count: relationships.length, relationships };
  });
}
