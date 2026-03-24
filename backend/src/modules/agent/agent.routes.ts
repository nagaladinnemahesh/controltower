import { FastifyInstance } from "fastify";
import { runAgent } from "./agent.service";
import { request } from "node:http";

export default async function agentRoutes(app: FastifyInstance) {
  //POST /api/agent/analyze/:incidentId - triggers ai agent to analyze an incident
  app.post<{ Params: { incidentId: string } }>(
    "/analyze/:incidentId",
    async (request, reply) => {
      const { incidentId } = request.params;

      app.log.info(`Agent analyzing incident: ${incidentId}`);

      const recommendation = await runAgent(incidentId, app.neo4j, app.pg);

      return {
        incidentId,
        recommendation,
      };
    },
  );
}
