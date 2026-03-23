import neo4j from "neo4j-driver";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// types

interface NodeRow {
  id: string;
  label: string;
  name: string;
  status: string;
  detail: string;
}

interface RelationshipRow {
  from: string;
  to: string;
  type: string;
}

//csv parser - reads csv file and rturns array of objects

function parseCSV(filepath: string): Record<string, string>[] {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim();
    });
    return row;
  });
}

// load nodes
async function loadNodes(session: any, filePath: string) {
  const rows = parseCSV(filePath).map((row) => ({
    id: row["id"],
    label: row["label"],
    name: row["name"],
    status: row["status"],
    detail: row["detail"],
  })) as NodeRow[];
  console.log(`Loading ${rows.length} nodes..`);

  for (const row of rows) {
    // using merge
    const query = `
            MERGE (n: ${row.label}{id: $id})
            SET n.name = $name,
                n.status = $status,
                n.detail = $detail
        `;
    await session.run(query, {
      id: row.id,
      name: row.name,
      status: row.status,
      detail: row.detail,
    });
    console.log(` ${row.label}: ${row.name}`);
  }
}

// load realtions - finds node by id
async function loadRelationships(session: any, filePath: string) {
  const rows = parseCSV(filePath).map((row) => ({
    from: row["from"],
    to: row["to"],
    type: row["type"],
  })) as RelationshipRow[];
  console.log(`\nLoading ${rows.length} relationships...`);

  for (const row of rows) {
    // math finds existing nodes by id
    const query = `
            MATCH (a {id: $from})
            MATCH (b {id: $to})
            MERGE (a)-[r:${row.type}]->(b)
            RETURN type(r) as relationshipType
            `;
    const result = await session.run(query, {
      from: row.from,
      to: row.to,
    });
    console.log(
      `${row.from}-[${row.type}]-> ${row.to} - ${result.records.length} records(s)`,
    );
  }
}

// main
async function loadGraph(dataFolder: string) {
  const driver = neo4j.driver(
    process.env.NEO4J_URI as string,
    neo4j.auth.basic(
      process.env.NEO4J_USER as string,
      process.env.NEO4J_PASSWORD as string,
    ),
  );

  const session = driver.session();

  try {
    console.log(`\n Loading graph from: ${dataFolder}\n`);

    const nodesPath = path.join(dataFolder, "nodes.csv");
    const relationshipsPath = path.join(dataFolder, "relationships.csv");

    await loadNodes(session, nodesPath);
    await loadRelationships(session, relationshipsPath);

    console.log(`\n Graph loaded successfully`);
  } catch (err) {
    console.error(`\n Error loading graph:`, err);
  } finally {
    // always close session and driver when done
    await session.close();
    await driver.close();
  }
}

// entry point

const dataFolder = process.argv[2];

if (!dataFolder) {
  console.error("Please provide a data folder path");
  console.error("Example: ts-node src/config/loadGraph.ts src/config/data/cbs");
  process.exit(1);
}

loadGraph(path.resolve(dataFolder));
