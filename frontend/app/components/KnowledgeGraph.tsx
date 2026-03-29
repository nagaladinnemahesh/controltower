"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape from "cytoscape";

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

interface ImpactPath {
  nodeIds: string[];
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  highlightedNodes?: string[];
  impactPaths?: ImpactPath[];
  sourceNodeId?: string;
  onNodeClick?: (node: GraphNode) => void;
}

const statusColors: Record<string, string> = {
  HEALTHY: "#22c55e",
  DEGRADED: "#eab308",
  CRITICAL: "#f97316",
  FAILED: "#ef4444",
};

const labelColors: Record<string, string> = {
  ITAsset: "#ef4444",
  Application: "#f97316",
  Capability: "#eab308",
  Process: "#22c55e",
  Service: "#06b6d4",
  SLA: "#3b82f6",
  CustomerSegment: "#8b5cf6",
  RegulatoryObligation: "#ec4899",
  Regulator: "#f43f5e",
  TransactionType: "#14b8a6",
  RevenueStream: "#84cc16",
};

export default function KnowledgeGraph({
  nodes,
  relationships,
  highlightedNodes = [],
  impactPaths = [],
  sourceNodeId,
  onNodeClick,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const hasBlastRadius = highlightedNodes.length > 0;

  // Build blast edges set from impact paths
  const blastEdgeSet = new Set<string>();
  impactPaths.forEach(({ nodeIds }) => {
    for (let i = 0; i < nodeIds.length - 1; i++) {
      blastEdgeSet.add(`${nodeIds[i]}->${nodeIds[i + 1]}`);
    }
  });

  // Initialize Cytoscape once on mount
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Destroy previous instance if exists
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        // Nodes
        ...nodes.map((n) => ({
          data: {
            id: n.id,
            name: n.name,
            label: n.label,
            status: n.status,
            detail: n.detail,
          },
        })),
        // Edges
        ...relationships.map((r, i) => ({
          data: {
            id: `e${i}`,
            source: r.from,
            target: r.to,
            type: r.type,
          },
        })),
      ],
      style: [
        // Default node style
        {
          selector: "node",
          style: {
            "background-color": (ele: any) =>
              statusColors[ele.data("status")] || "#6b7280",
            "border-color": (ele: any) =>
              labelColors[ele.data("label")] || "#6b7280",
            "border-width": 3,
            label: "data(name)",
            color: "#9ca3af",
            "font-size": "10px",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 4,
            width: 20,
            height: 20,
          } as any,
        },
        // Default edge style
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#1f2937",
            "target-arrow-color": "#1f2937",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.8,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 80,
        edgeElasticity: () => 100,
        padding: 30,
        randomize: false,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Click handler
    cy.on("tap", "node", (event) => {
      const nodeData = event.target.data();
      console.log("Node clicked:", nodeData.id, nodeData.name);
      const fullNode = nodes.find((n) => n.id === nodeData.id);
      if (fullNode) {
        setSelectedNode(fullNode);
        onNodeClick?.(fullNode);
      }
    });

    // Hover effects
    cy.on("mouseover", "node", (event) => {
      event.target.style({
        "border-width": 5,
        "font-size": "12px",
        color: "#ffffff",
      });
    });

    cy.on("mouseout", "node", (event) => {
      event.target.style({
        "border-width": 3,
        "font-size": "10px",
        color: "#9ca3af",
      });
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, relationships.length]);

  // Update node statuses without reinitializing
  useEffect(() => {
    if (!cyRef.current) return;
    nodes.forEach((node) => {
      const cyNode = cyRef.current!.$(`#${node.id}`);
      if (cyNode.length > 0) {
        cyNode.data("status", node.status);
        cyNode.style(
          "background-color",
          statusColors[node.status] || "#6b7280",
        );
      }
    });
  }, [nodes]);

  // Update blast radius visualization
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    // Reset all styles first
    cy.nodes().style({
      width: 20,
      height: 20,
      opacity: 1,
      "border-width": 3,
      color: "#9ca3af",
      "font-size": "10px",
      "font-weight": "normal",
    });
    cy.edges().style({
      width: 1,
      "line-color": "#1f2937",
      "target-arrow-color": "#1f2937",
      opacity: 1,
    });

    if (!hasBlastRadius) return;

    // Dim all nodes and edges first
    cy.nodes().style({ opacity: 0.2 });
    cy.edges().style({ opacity: 0.1 });

    // Highlight source node
    if (sourceNodeId) {
      cy.$(`#${sourceNodeId}`).style({
        width: 40,
        height: 40,
        opacity: 1,
        "border-color": "#ef4444",
        "border-width": 6,
        color: "#ffffff",
        "font-size": "13px",
        "font-weight": "bold",
      });
    }

    // Highlight impacted nodes
    highlightedNodes.forEach((nodeId) => {
      if (nodeId === sourceNodeId) return;
      cy.$(`#${nodeId}`).style({
        width: 28,
        height: 28,
        opacity: 1,
        "border-color": "#f97316",
        "border-width": 4,
        color: "#fdba74",
        "font-size": "11px",
      });
    });

    // Highlight blast radius edges
    cy.edges().forEach((edge) => {
      const src = edge.data("source");
      const tgt = edge.data("target");
      if (blastEdgeSet.has(`${src}->${tgt}`)) {
        edge.style({
          width: 3,
          "line-color": "#ef4444",
          "target-arrow-color": "#ef4444",
          opacity: 1,
        });
      }
    });
  }, [highlightedNodes, impactPaths, sourceNodeId, hasBlastRadius]);

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Label legend */}
      <div className="flex flex-wrap gap-3 p-3 border-b border-gray-700">
        {Object.entries(labelColors).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-400 text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div className="flex gap-4 px-3 py-2 border-b border-gray-700">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-400 text-xs">{status}</span>
          </div>
        ))}
        {hasBlastRadius && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-red-500" />
            <span className="text-red-400 text-xs">Blast Radius Path</span>
          </div>
        )}
      </div>

      {/* Blast radius summary */}
      {hasBlastRadius && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-800/50">
          <p className="text-red-400 text-xs">
            🔴 Blast radius active —
            <span className="font-bold"> {highlightedNodes.length} nodes</span>{" "}
            impacted from <span className="font-bold">{sourceNodeId}</span>
          </p>
        </div>
      )}

      {/* Cytoscape container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: "520px", backgroundColor: "#111827" }}
      />

      {/* Selected node detail */}
      {selectedNode && (
        <div className="p-3 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white font-medium">{selectedNode.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {selectedNode.detail}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {selectedNode.label} · {selectedNode.id}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${statusColors[selectedNode.status]}20`,
                  color: statusColors[selectedNode.status],
                  border: `1px solid ${statusColors[selectedNode.status]}`,
                }}
              >
                {selectedNode.status}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-600 text-xs hover:text-gray-400"
              >
                dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
