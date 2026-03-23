import { Pool } from "pg";
import { Incident, CreateIncidentBody } from "../../types/graph";
import { resultTransformers } from "neo4j-driver";

// create new incident - called when monitoring alert comes
export async function createIncident(
  pg: Pool,
  body: CreateIncidentBody,
  nodeName: string,
): Promise<Incident> {
  const result = await pg.query<Incident>(
    `INSERT INTO incidents
          (affected_node_id, affected_node_name, severity, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
    [body.affected_node_id, nodeName, body.severity, body.description],
  );
  return result.rows[0];
}

// get all incidents - most recent first
export async function getAllIncidents(pg: Pool): Promise<Incident[]> {
  const result = await pg.query<Incident>(
    "SELECT * FROM incidents ORDER BY created_at DESC",
  );
  return result.rows;
}

// get a single incident by id
export async function getIncidentById(
  pg: Pool,
  id: string,
): Promise<Incident | null> {
  const result = await pg.query<Incident>(
    "SELECT * FROM incidents WHERE id = $1",
    [id],
  );
  return result.rows[0] || null;
}

// get all open incidents
export async function getOpenIncidents(pg: Pool): Promise<Incident[]> {
  const result = await pg.query<Incident>(
    `SELECT * FROM incidents
        WHERE status IN ('OPEN', 'IN_PROGRESS)
        ORDER BY created_at DESC`,
  );
  return result.rows;
}

// udate incident status
export async function updateIncidentStatus(
  pg: Pool,
  id: string,
  status: string,
  resolution?: string,
): Promise<Incident | null> {
  const result = await pg.query<Incident>(
    `UPDATE incidents
    SET status = $1,
        resolution = $2,
        resolved_at = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE NULL END
        WHERE id = $3
        RETURNING *`,
    [status, resolution || null, id],
  );
  return result.rows[0] || null;
}

// update AI recommendation on a incident - called by ai agent after analysing blast radius
export async function updateAiRecommendation(
  pg: Pool,
  id: string,
  recommendation: string,
): Promise<Incident | null> {
  const result = await pg.query<Incident>(
    `UPDATE incidents
        SET ai_recommendation = $1,
            status = 'IN_PROGRESS'
        WHERE id = $2
        RETURNING *`,
    [recommendation, id],
  );
  return result.rows[0] || null;
}
