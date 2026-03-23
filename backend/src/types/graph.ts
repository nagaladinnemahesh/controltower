// All possible node labels in CBS knowledge graph
export type NodeLabel =
  | "ITAsset"
  | "Application"
  | "Capability"
  | "Process"
  | "Service"
  | "SLA"
  | "CustomerSegment"
  | "RegulatoryObligation"
  | "Regulator"
  | "TransactionType"
  | "RevenueStream";

// All possible node statuses
export type NodeStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "FAILED";

// All possible relationship types
export type RelationshipType =
  | "SUPPORTS"
  | "ENABLES"
  | "SERVES"
  | "DELIVERS"
  | "FULFILLS"
  | "BELONGS_TO"
  | "GOVERNS"
  | "REPORTED_TO"
  | "PROCESSES"
  | "GENERATES";

// Base shape of every node in graph
export interface GraphNode {
  id: string;
  name: string;
  label: NodeLabel;
  status: NodeStatus;
  detail: string;
}

// Shape of a relationship between two nodes
export interface GraphRelationship {
  from: string;
  to: string;
  type: RelationshipType;
}

// Shape of an impact analysis result
// Contains the affected node and how many hops away it is from the source
export interface ImpactedNode {
  node: GraphNode;
  hops: number;
  path: string[];
}

// Full impact analysis response
export interface ImpactAnalysis {
  sourceNode: GraphNode;
  totalImpacted: number;
  impactedNodes: ImpactedNode[];
}
