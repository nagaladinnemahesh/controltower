"use client";

import { useEffect, useState, useCallback } from "react";
import StatsBar from "./components/StatsBar";
import IncidentFeed from "./components/IncidentFeed";
import KnowledgeGraph from "./components/KnowledgeGraph";
import {
  getAllNodes,
  getAllRelationships,
  getAllIncidents,
  analyzeIncident,
} from "./lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface GraphNode {
  id: string;
  name: string;
  label: string;
  status: string;
  detail: string;
}

interface GraphRelationship {
  from: string;
  to: string;
  type: string;
}

interface Incident {
  id: string;
  affected_node_id: string;
  affected_node_name: string;
  severity: string;
  status: string;
  description: string;
  ai_recommendation: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface ImpactPath {
  nodeIds: string[];
}

export default function Dashboard() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [relationships, setRelationships] = useState<GraphRelationship[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [impactPaths, setImpactPaths] = useState<ImpactPath[]>([]);
  const [sourceNodeId, setSourceNodeId] = useState<string | undefined>();
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<
    "HEALTHY" | "DEGRADED" | "CRITICAL"
  >("HEALTHY");

  // Fetch graph structure once — nodes and relationships don't change
  const fetchGraphStructure = useCallback(async () => {
    try {
      const [nodesData, relationshipsData] = await Promise.all([
        getAllNodes(),
        getAllRelationships(),
      ]);
      setNodes(nodesData.nodes);
      setRelationships(relationshipsData.relationships);
    } catch (err) {
      console.error("Failed to fetch graph structure:", err);
    }
  }, []);

  // Fetch live data — node statuses and incidents change frequently
  const fetchLiveData = useCallback(async () => {
    try {
      const [nodesData, incidentsData] = await Promise.all([
        getAllNodes(),
        getAllIncidents(),
      ]);

      // Only update node statuses — prevents graph from restarting
      setNodes((prevNodes) =>
        prevNodes.map((prevNode) => {
          const updated = nodesData.nodes.find(
            (n: GraphNode) => n.id === prevNode.id,
          );
          return updated ? { ...prevNode, status: updated.status } : prevNode;
        }),
      );

      setIncidents(incidentsData.incidents);

      const hasFailedNodes = nodesData.nodes.some(
        (n: GraphNode) => n.status === "FAILED",
      );
      const hasDegradedNodes = nodesData.nodes.some(
        (n: GraphNode) => n.status === "CRITICAL" || n.status === "DEGRADED",
      );

      if (hasFailedNodes) setSystemStatus("CRITICAL");
      else if (hasDegradedNodes) setSystemStatus("DEGRADED");
      else setSystemStatus("HEALTHY");
    } catch (err) {
      console.error("Failed to fetch live data:", err);
    }
  }, []);

  // On mount — load everything once
  useEffect(() => {
    fetchGraphStructure();
    fetchLiveData();
  }, [fetchGraphStructure, fetchLiveData]);

  // Poll only live data every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // Click a node — show blast radius with paths
  const handleNodeClick = useCallback(async (node: GraphNode) => {
    try {
      const impact = await fetch(`${API_URL}/api/graph/impact/${node.id}`).then(
        (r) => r.json(),
      );

      const impactedIds = impact.impactedNodes.map((n: any) => n.node.id);
      setHighlightedNodes([node.id, ...impactedIds]);
      setSourceNodeId(node.id);

      // Extract path edges from each impacted node's pathIds
      const paths = impact.impactedNodes.map((n: any) => ({
        nodeIds: n.pathIds || [],
      }));
      setImpactPaths(paths);
    } catch (err) {
      console.error("Failed to fetch impact:", err);
    }
  }, []);

  // Clear blast radius
  const handleClearBlastRadius = useCallback(() => {
    setHighlightedNodes([]);
    setImpactPaths([]);
    setSourceNodeId(undefined);
  }, []);

  // Run AI agent on incident
  const handleAnalyze = useCallback(
    async (incidentId: string) => {
      setAnalyzing(incidentId);
      try {
        await analyzeIncident(incidentId);
        await fetchLiveData();
      } catch (err) {
        console.error("Agent analysis failed:", err);
      } finally {
        setAnalyzing(null);
      }
    },
    [fetchLiveData],
  );

  // Resolve an incident
  const handleResolve = useCallback(
    async (incidentId: string) => {
      try {
        await fetch(`${API_URL}/api/incidents/${incidentId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "RESOLVED",
            resolution: "Manually resolved from Control Tower dashboard",
          }),
        });
        await fetchLiveData();
      } catch (err) {
        console.error("Failed to resolve:", err);
      }
    },
    [fetchLiveData],
  );

  const openIncidents = incidents.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
  );

  const statusConfig = {
    HEALTHY: { color: "text-green-400", icon: "🟢" },
    DEGRADED: { color: "text-yellow-400", icon: "🟡" },
    CRITICAL: { color: "text-red-400", icon: "🔴" },
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            🏦 CBS Control Tower
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Core Banking System — Risk Impact Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
          <span className="text-gray-400 text-sm">System Status</span>
          <span className={`font-bold ${statusConfig[systemStatus].color}`}>
            {statusConfig[systemStatus].icon} {systemStatus}
          </span>
        </div>
      </div>

      {/* Stats */}
      <StatsBar
        totalNodes={nodes.length}
        totalIncidents={incidents.length}
        openIncidents={openIncidents.length}
      />

      {/* Main Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Knowledge Graph — 2/3 width */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Knowledge Graph</h2>
            <div className="flex items-center gap-3">
              {highlightedNodes.length > 0 && (
                <button
                  onClick={handleClearBlastRadius}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-800 px-2 py-1 rounded transition-colors"
                >
                  ✕ Clear Blast Radius
                </button>
              )}
              <p className="text-gray-500 text-xs">
                Click any node to highlight blast radius
              </p>
            </div>
          </div>
          <KnowledgeGraph
            key={nodes.map((n) => n.status).join(",")}
            nodes={nodes}
            relationships={relationships}
            highlightedNodes={highlightedNodes}
            impactPaths={impactPaths}
            sourceNodeId={sourceNodeId}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* Incident Feed — 1/3 width */}
        <div className="col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Incident Feed</h2>
            <span className="text-xs text-gray-500">Refreshes every 5s</span>
          </div>
          <IncidentFeed
            incidents={incidents}
            onAnalyze={handleAnalyze}
            onResolve={handleResolve}
            analyzing={analyzing}
          />
        </div>
      </div>
    </main>
  );
}
