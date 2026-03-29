import axios from "axios";

// base axios instance pointing to fastify backend
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// graph api
export const getAllNodes = async () => {
  const res = await api.get("/api/graph/nodes");
  return res.data;
};

export const getAllRelationships = async () => {
  const res = await api.get("/api/graph/relationships");
  return res.data;
};
export const getImpactAnalysis = async (nodeId: string) => {
  const res = await api.get(`/api/graph/impact/${nodeId}`);
  return res.data;
};

// incidents api
export const getAllIncidents = async () => {
  const res = await api.get("/api/incidents");
  return res.data;
};

export const getOpenIncidents = async () => {
  const res = await api.get("/api/incidents/open");
  return res.data;
};

export const createIncident = async (body: {
  affected_node_id: string;
  severity: string;
  description: string;
}) => {
  const res = await api.post("/api/incidents", body);
  return res.data;
};

// agent api
export const analyzeIncident = async (incidentId: string) => {
  const res = await api.post(`/api/agent/analyze/${incidentId}`);
  return res.data;
};

export default api;
