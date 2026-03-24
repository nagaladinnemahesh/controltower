import OpenAI from "openai";
import { Driver } from "neo4j-driver";
import { Pool } from "pg";
import { getImpactAnalysis } from "../assets/graph.service";
import {
  getIncidentById,
  updateAiRecommendation,
} from "../incidents/incidents.service";
import { Incident, ImpactAnalysis } from "../../types/graph";

// agent returning shape
export interface AgentRecommendation {
  summary: string;
  severity_assessment: string;
  immediate_actions: string[];
  remediation_steps: string[];
  business_impact: string;
  estimated_resolution: string;
  notify_departments: string[];
}

// structured prompt for LLM
function buildPrompt(incident: Incident, impact: ImpactAnalysis): string {
  // fromatting impacted nodes by label
  const impactByLabel: Record<string, string[]> = {};
  impact.impactedNodes.forEach(({ node }) => {
    if (!impactByLabel[node.label]) {
      impactByLabel[node.label] = [];
    }
    if (!impactByLabel[node.label].includes(node.name)) {
      impactByLabel[node.label].push(node.name);
    }
  });

  const impactSummary = Object.entries(impactByLabel)
    .map(([label, names]) => `${label}: ${names.join(", ")}`)
    .join("\n");

  return `You are an AI operations agent for a Core Banking System (CBS) control tower.
A critical incident has been detected. Analyze the situation and provide a structured response.

INCIDENT DETAILS:
- Affected Node: ${incident.affected_node_name} (ID: ${incident.affected_node_id})
- Severity: ${incident.severity}
- Description: ${incident.description}
- Reported At: ${incident.created_at}

BLAST RADIUS ANALYSIS:
Total nodes impacted: ${impact.totalImpacted}

Impacted components:
${impactSummary}

Based on this information, provide a JSON response with exactly this structure:
{
  "summary": "brief one line summary of the situation",
  "severity_assessment": "assessment of business severity and regulatory risk",
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "remediation_steps": ["step 1", "step 2", "step 3"],
  "business_impact": "description of customer and revenue impact",
  "estimated_resolution": "estimated time to resolve",
  "notify_departments": ["department 1", "department 2"]
}

Respond with ONLY the JSON object. No explanation, no markdown, no code blocks.`;
}

// main agent function - takes an incident, analyzes it, and stores recommendation
export async function runAgent(
  incidentId: string,
  neo4j: Driver,
  pg: Pool,
): Promise<AgentRecommendation> {
  // initialize openAi client
  const openai = new OpenAI();
  // step-1 observe - get incident from postgres
  const incident = await getIncidentById(pg, incidentId);
  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`);
  }

  //step-2 observe - get blast radius from neo4j
  const impact = await getImpactAnalysis(neo4j, incident.affected_node_id);
  if (!impact) {
    throw new Error(`Node ${incident.affected_node_id} not found in graph`);
  }

  // step-3 think - send to openAI with structured prompt
  const prompt = buildPrompt(incident, impact);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI operations agent for a fintech control tower. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2, // low temp = more consistent, focused
    max_tokens: 1000,
  });

  //step 4 Act - parse the response
  const rawResponse = completion.choices[0].message.content || "";

  let recommendation: AgentRecommendation;
  try {
    recommendation = JSON.parse(rawResponse);
  } catch (err) {
    throw new Error(`Agent returned invalid JSON: ${rawResponse}`);
  }

  // step-5 Record - store recommendation in posgres
  await updateAiRecommendation(pg, incidentId, JSON.stringify(recommendation));

  return recommendation;
}
