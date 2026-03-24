import dotenv from "dotenv";
dotenv.config();

// Simulator makes HTTP calls to our own API
// This mimics what a real monitoring tool would do
const BASE_URL = "http://localhost:3000";

// Predefined incidents for each IT asset
// Each one is a realistic failure scenario based on our ontology
const INCIDENT_SCENARIOS = [
  {
    affected_node_id: "A01",
    severity: "CRITICAL",
    description:
      "Oracle DB Cluster unresponsive. All RAC nodes failing. ASM disk group corruption detected.",
  },
  {
    affected_node_id: "A02",
    severity: "HIGH",
    description:
      "App Server farm degraded. 9 of 12 nodes throwing DB connection pool exhaustion errors.",
  },
  {
    affected_node_id: "A03",
    severity: "HIGH",
    description:
      "Storage Array I/O latency at 8400ms vs 20ms baseline. RAID rebuild in progress.",
  },
  {
    affected_node_id: "A04",
    severity: "MEDIUM",
    description:
      "Teller Terminal network degraded. Terminals running in offline mode with cached data only.",
  },
  {
    affected_node_id: "A05",
    severity: "HIGH",
    description:
      "Message Queue backing up. 48000 unprocessed transactions queued. Consumer lag growing.",
  },
  {
    affected_node_id: "A07",
    severity: "CRITICAL",
    description:
      "CBS Core module unavailable. Account master, GL and transaction posting all down.",
  },
  {
    affected_node_id: "A08",
    severity: "HIGH",
    description:
      "Loan System cannot read customer account data. Creditworthiness checks failing.",
  },
  {
    affected_node_id: "A10",
    severity: "HIGH",
    description:
      "Mobile Backend returning stale data or HTTP 503. Balance API failing for all users.",
  },
  {
    affected_node_id: "A11",
    severity: "HIGH",
    description:
      "Internet Banking Portal down. Account summary, fund transfer and statement features unavailable.",
  },
  {
    affected_node_id: "A12",
    severity: "MEDIUM",
    description:
      "ATM Switch degraded. Cash dispensing functional but balance checks failing across network.",
  },
];

// Helper — sleep for n milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper — pick a random scenario
function randomScenario() {
  const index = Math.floor(Math.random() * INCIDENT_SCENARIOS.length);
  return INCIDENT_SCENARIOS[index];
}

// Helper — make HTTP calls to our API
async function apiCall(method: string, path: string, body?: any): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json() as Promise<any>;
}

// Run one full incident cycle
// Create → Agent analyzes → Resolve
async function runIncidentCycle() {
  const scenario = randomScenario();

  console.log("\n─────────────────────────────────────────");
  console.log(`🚨 INCIDENT DETECTED: ${scenario.affected_node_id}`);
  console.log(`   Severity: ${scenario.severity}`);
  console.log(`   ${scenario.description}`);

  // Step 1 — Create incident
  const incident: any = await apiCall("POST", "/api/incidents", scenario);
  console.log(`\n📋 Incident created: ${incident.id}`);
  console.log(`   Node status → FAILED`);

  // Wait 3 seconds before triggering agent
  await sleep(3000);

  // Step 2 — Trigger AI agent
  console.log("\n🤖 AI Agent analyzing...");
  const agentResult: any = await apiCall(
    "POST",
    `/api/agent/analyze/${incident.id}`,
  );

  if (agentResult.recommendation) {
    console.log(`\n💡 Agent recommendation:`);
    console.log(`   Summary: ${agentResult.recommendation.summary}`);
    console.log(
      `   Actions: ${agentResult.recommendation.immediate_actions[0]}`,
    );
    console.log(`   ETA: ${agentResult.recommendation.estimated_resolution}`);
    console.log(
      `   Notify: ${agentResult.recommendation.notify_departments.join(", ")}`,
    );
  }

  // Wait 5 seconds before resolving
  await sleep(5000);

  // Step 3 — Resolve incident
  console.log("\n✅ Resolving incident...");
  await apiCall("PATCH", `/api/incidents/${incident.id}/status`, {
    status: "RESOLVED",
    resolution: `Auto-remediation completed. ${agentResult.recommendation?.remediation_steps[0] || "Issue resolved."}`,
  });

  console.log(`   Node status → HEALTHY`);
  console.log("─────────────────────────────────────────");
}

// Main loop — runs incidents continuously
async function startSimulator() {
  console.log("🎯 Control Tower Telemetry Simulator Started");
  console.log(`   Target: ${BASE_URL}`);
  console.log("   Press Ctrl+C to stop\n");

  // Run forever until stopped
  while (true) {
    try {
      await runIncidentCycle();
      // Wait 10 seconds between incidents
      console.log("\n⏳ Next incident in 10 seconds...");
      await sleep(10000);
    } catch (err) {
      console.error("Simulator error:", err);
      await sleep(5000);
    }
  }
}

startSimulator();
