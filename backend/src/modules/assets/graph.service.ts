import { Driver } from "neo4j-driver";
import {
  GraphNode,
  NodeLabel,
  ImpactedNode,
  ImpactAnalysis,
  GraphRelationship,
  RelationshipType,
} from "../../types/graph";

// get all nodes in the graph
export async function getAllNodes(driver: Driver): Promise<GraphNode[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      "MATCH (n) WHERE n.id IS NOT NULL RETURN n.id as id, n.name as name, n.status as status, n.detail as detail, labels(n) as labels ORDER BY n.id",
    );

    // console.log("total records:", result.records.length);
    // console.log(
    //   "first record:",
    //   JSON.stringify(result.records[0]?.get("n"), null, 2),
    // );
    return result.records.map((record) => {
      //   const node = record.get("n");
      //   if (!node?.properties?.id) {
      //     console.log(
      //       `Bad record at index ${index}:`,
      //       JSON.stringify(node, null, 2),
      //     );
      //   }
      return {
        id: record.get("id"),
        name: record.get("name"),
        label: record.get("labels")[0] as NodeLabel,
        status: record.get("status"),
        detail: record.get("detail"),
      };
    });
  } finally {
    await session.close();
  }
}

// Get all relationships for graph visualization
export async function getAllRelationships(
  driver: Driver,
): Promise<GraphRelationship[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (a)-[r]->(b) 
       WHERE a.id IS NOT NULL AND b.id IS NOT NULL
       RETURN a.id as from, b.id as to, type(r) as type`,
    );
    return result.records.map((record) => ({
      from: record.get("from"),
      to: record.get("to"),
      type: record.get("type") as RelationshipType,
    }));
  } finally {
    await session.close();
  }
}

// get a single node by id
export async function getNodeById(
  driver: Driver,
  id: string,
): Promise<GraphNode | null> {
  const session = driver.session();
  try {
    const result = await session.run(
      "MATCH (n { id: $id }) RETURN n.id as id, n.name as name, n.status as status, n.detail as detail, labels(n) as labels",
      { id },
    );
    if (result.records.length == 0) return null;
    const record = result.records[0];
    return {
      id: record.get("id"),
      name: record.get("name"),
      label: record.get("labels")[0] as NodeLabel,
      status: record.get("status"),
      detail: record.get("detail"),
    };
  } finally {
    await session.close();
  }
}

// get all nodes by label ex: "IT ASSET"
export async function getAllNodesByLabel(
  driver: Driver,
  label: NodeLabel,
): Promise<GraphNode[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (n:${label}) RETURN n.id as id, n.name as name, n.status as status, n.detail as detail, labels(n) as labels ORDER BY n.id`,
    );
    return result.records.map((record) => {
      //   const node = record.get("n");
      return {
        id: record.get("id"),
        name: record.get("name"),
        label: record.get("labels")[0] as NodeLabel,
        status: record.get("status"),
        detail: record.get("detail"),
      };
    });
  } finally {
    await session.close();
  }
}

// get ful blast radius from a node
// traverses from source node returns every impacted node
export async function getImpactAnalysis(
  driver: Driver,
  id: string,
): Promise<ImpactAnalysis | null> {
  const session = driver.session();
  try {
    // get the source node
    const sourceResult = await session.run(
      "MATCH (n { id: $id }) RETURN n.id as id, n.name as name, n.status as status, n.detail as detail, labels(n) as labels",
      { id },
    );
    if (sourceResult.records.length === 0) return null;
    const sourceRecord = sourceResult.records[0];
    const source: GraphNode = {
      id: sourceRecord.get("id"),
      name: sourceRecord.get("name"),
      label: sourceRecord.get("labels")[0] as NodeLabel,
      status: sourceRecord.get("status"),
      detail: sourceRecord.get("detail"),
    };
    // now traverse all outgoing paths from this node
    const impactResult = await session.run(
      `MATCH path = (source { id: $id })-[*1..10]->(impacted)
   WHERE source <> impacted
   RETURN DISTINCT impacted.id as id,
          impacted.name as name,
          impacted.status as status,
          impacted.detail as detail,
          labels(impacted) as labels,
          min(length(path)) as hops,
          [n in nodes(path) | n.name] as pathNames,
          [n in nodes(path) | n.id] as pathIds
   ORDER BY hops`,
      { id },
    );

    const impactedNodes: ImpactedNode[] = impactResult.records.map(
      (record) => ({
        node: {
          id: record.get("id"),
          name: record.get("name"),
          label: record.get("labels")[0] as NodeLabel,
          status: record.get("status"),
          detail: record.get("detail"),
        },
        hops: record.get("hops").toNumber(),
        path: record.get("pathNames") as string[],
        pathIds: record.get("pathIds") as string[],
      }),
    );

    return {
      sourceNode: source,
      totalImpacted: impactedNodes.length,
      impactedNodes,
    };
  } finally {
    await session.close();
  }
}
