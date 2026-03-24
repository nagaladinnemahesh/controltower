import { FastifyInstance } from "fastify";
import {
  createIncident,
  getAllIncidents,
  getIncidentById,
  getOpenIncidents,
  updateIncidentStatus,
} from "./incidents.service";
import { getNodeById } from "../assets/graph.service";
import { CreateIncidentBody } from "../../types/graph";

export default async function incidentRoutes(app: FastifyInstance) {
  //POST /api/incidents - creates a new incident, this is what simulator will call
  app.post<{ Body: CreateIncidentBody }>("/", async (request, reply) => {
    const { affected_node_id, severity, description } = request.body;

    // first verify the node exists in graph
    const node = await getNodeById(app.neo4j, affected_node_id);
    if (!node) {
      return reply.status(404).send({
        error: `Node ${affected_node_id} not found in knowledge graph`,
      });
    }

    //create incident with node's name
    const incident = await createIncident(app.pg, request.body, node.name);

    //update the node status in neo4j to reflect the incident
    await app.neo4j
      .session()
      .run("MATCH (n {id: $id}) SET n.status = $status", {
        id: affected_node_id,
        status:
          severity === "CRITICAL"
            ? "FAILED"
            : severity === "HIGH"
              ? "CRITICAL"
              : "DEGRADED",
      });

    reply.status(201).send(incident);
  });

  // GET /api/incidents - returns all incidents
  app.get("/", async (request, reply) => {
    const incidents = await getAllIncidents(app.pg);
    return { count: incidents.length, incidents };
  });

  // GET /api/incidents/open - returns only open and in-progress incidents
  app.get("/open", async (request, reply) => {
    const incidents = await getOpenIncidents(app.pg);
    return { count: incidents.length, incidents };
  });

  // GET /api/incidents/:id - returns a single incident by id
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const incident = await getIncidentById(app.pg, request.params.id);
    if (!incident) {
      return reply.status(404).send({
        error: `Incident ${request.params.id} not found`,
      });
    }
    return incident;
  });

  // PATCH /api/incidents/:id/status - updates incident status, used by AI agent to mark as resolved
  app.patch<{
    Params: { id: string };
    Body: { status: string; resolution?: string };
  }>("/:id/status", async (request, reply) => {
    const { status, resolution } = request.body;
    const incident = await updateIncidentStatus(
      app.pg,
      request.params.id,
      status,
      resolution,
    );
    if (!incident) {
      return reply.status(404).send({
        error: `Incident ${request.params.id} not found`,
      });
    }

    // if resolved, also reset node status back to healthy in neo4j
    if (status === "RESOLVED") {
      await app.neo4j
        .session()
        .run("MATCH (n {id: $id}) SET n.status = $status", {
          id: incident.affected_node_id,
          status: "HEALTHY",
        });
    }

    return incident;
  });
}
