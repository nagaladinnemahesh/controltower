import Fastify from "fastify";
import dotenv from "dotenv";
import neo4jPlugin from "./plugins/neo4j";

dotenv.config();

//fastify instance with built-in logger enabled
const app = Fastify({ logger: true });

//register neo4j plugins
app.register(neo4jPlugin);

app.get("/health", async (request, reply) => {
  return { status: "Ok", message: "Control Tower is running" };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "0.0.0.0";

    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
