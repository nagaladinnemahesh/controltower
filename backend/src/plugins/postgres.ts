import fp from "fastify-plugin";
import pg from "pg";
import { FastifyInstance } from "fastify";

const { Pool } = pg;

declare module "fastify" {
  interface FastifyInstance {
    pg: pg.Pool;
  }
}

async function postgresPlugin(app: FastifyInstance) {
  const pool = new Pool({
    connectionString: process.env.PG_URI,
    ssl: { rejectUnauthorized: false }, // for supabase ssl conn
  });

  // connection test
  const client = await pool.connect();
  app.log.info("PostgreSQL connected successfully");
  client.release();

  // attach pool to fastify instance
  app.decorate("pg", pool);

  //close pool when server shuts
  app.addHook("onClose", async () => {
    await pool.end();
    app.log.info("PostgreSQL connection closed");
  });
}

export default fp(postgresPlugin);
