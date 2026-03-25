"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
      <p className="text-gray-500">Loading graph...</p>
    </div>
  ),
});

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

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  highlightedNodes?: string[];
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
  onNodeClick,
}: KnowledgeGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  // Build graph data ONCE from relationships only
  // This never changes so the graph never restarts
  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        label: n.label,
        status: n.status,
        detail: n.detail,
      })),
      links: relationships.map((r) => ({
        source: r.from,
        target: r.to,
        type: r.type,
      })),
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [relationships],
  ); // Only rebuild when relationships change — NOT when nodes change

  // When node statuses change, update them directly on the graph
  // without triggering a full re-render
  useEffect(() => {
    if (!fgRef.current) return;
    // const graphNodes = fgRef.current.graphData().nodes;
    const graphNodes = nodes;
    graphNodes.forEach((gNode: any) => {
      const updated = nodes.find((n) => n.id === gNode.id);
      if (updated) {
        gNode.status = updated.status;
      }
    });
    // Trigger a re-paint without restarting simulation
    // fgRef.current.refresh();
  }, [nodes]);

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: 500,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleNodeClick = useCallback(
    (node: any) => {
      const fullNode = nodes.find((n) => n.id === node.id);
      if (fullNode) {
        setSelectedNode(fullNode);
        onNodeClick?.(fullNode);
      }
    },
    [nodes, onNodeClick],
  );

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
      </div>

      {/* Force Graph */}
      <div ref={containerRef} className="w-full">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#111827"
          nodeLabel={(node: any) =>
            `${node.name}\n${node.label} — ${node.status}`
          }
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isHighlighted = highlightedNodes.includes(node.id);
            const radius = isHighlighted ? 8 : 5;

            // Outer ring — label color
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
            ctx.fillStyle = labelColors[node.label] || "#6b7280";
            ctx.fill();

            // Inner fill — status color
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = statusColors[node.status] || "#6b7280";
            ctx.fill();

            // White ring for highlighted nodes
            if (isHighlighted) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            // Label
            const fontSize = Math.max(8 / globalScale, 3);
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = isHighlighted ? "#ffffff" : "#9ca3af";
            ctx.fillText(node.name, node.x, node.y + radius + 3);
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={() => "#374151"}
          linkWidth={1}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
        />
      </div>

      {/* Selected node panel */}
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
