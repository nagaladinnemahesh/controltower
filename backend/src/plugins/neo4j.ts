import fp from "fastify-plugin";
import neo4j, { driver, Driver } from "neo4j-driver";
import { FastifyInstance } from "fastify";
import { appendFile } from "node:fs";

// let typescript know fastify has neo4j
declare module "fastify" {
  interface FastifyInstance {
    neo4j: Driver;
  }
}

async function neo4jPlugin(app: FastifyInstance) {
  const driver = neo4j.driver(
    process.env.NEO4J_URI as string,
    neo4j.auth.basic(
      process.env.NEO4J_USER as string,
      process.env.NEO4J_PASSWORD as string,
    ),
  );

  //verify connection is working
  await driver.verifyConnectivity();
  app.log.info("Neo4j connected successfully");

  app.decorate("neo4j", driver);

  app.addHook("onClose", async () => {
    await driver.close();
    app.log.info("Neo4j connection closed");
  });
}

export default fp(neo4jPlugin);
