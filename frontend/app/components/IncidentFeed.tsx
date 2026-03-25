import { formatDistanceToNow } from "date-fns";

interface Incident {
  id: string;
  affected_node_id: string;
  affected_node_name: string;
  severity: string;
  status: string;
  description: string;
  ai_recommendation: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface IncidentFeedProps {
  incidents: Incident[];
  onAnalyze: (incidentId: string) => void;
  onResolve: (incidentId: string) => void;
  analyzing: string | null;
}

// Color mapping for severity badges
const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
};

// Color mapping for status badges
const statusColors: Record<string, string> = {
  OPEN: "text-red-400",
  IN_PROGRESS: "text-yellow-400",
  RESOLVED: "text-green-400",
};

// Status icons
const statusIcons: Record<string, string> = {
  OPEN: "🔴",
  IN_PROGRESS: "🟡",
  RESOLVED: "🟢",
};

export default function IncidentFeed({
  incidents,
  onAnalyze,
  onResolve,
  analyzing,
}: IncidentFeedProps) {
  // Parse AI recommendation from JSON string
  const parseRecommendation = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
      {incidents.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No incidents. System is healthy.
        </div>
      )}

      {incidents.map((incident) => {
        const recommendation = parseRecommendation(incident.ai_recommendation);

        return (
          <div
            key={incident.id}
            className={`rounded-lg p-4 border ${
              incident.status === "RESOLVED"
                ? "bg-gray-800/50 border-gray-700"
                : "bg-gray-800 border-gray-600"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{statusIcons[incident.status]}</span>
                <span className="text-white font-medium">
                  {incident.affected_node_name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColors[incident.severity]}`}
                >
                  {incident.severity}
                </span>
              </div>
              <span className={`text-xs ${statusColors[incident.status]}`}>
                {incident.status}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-400 text-sm mb-2">{incident.description}</p>

            {/* AI Recommendation */}
            {recommendation && (
              <div className="bg-blue-900/30 border border-blue-700/50 rounded p-2 mb-2">
                <p className="text-blue-300 text-xs font-medium mb-1">
                  🤖 AI Analysis
                </p>
                <p className="text-blue-200 text-xs">
                  {recommendation.summary}
                </p>
                {recommendation.immediate_actions?.length > 0 && (
                  <p className="text-blue-300 text-xs mt-1">
                    → {recommendation.immediate_actions[0]}
                  </p>
                )}
                <p className="text-blue-400 text-xs mt-1">
                  ETA: {recommendation.estimated_resolution}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-gray-600 text-xs mb-3">
              {formatDistanceToNow(new Date(incident.created_at), {
                addSuffix: true,
              })}
            </p>

            {/* Action Buttons */}
            {incident.status === "OPEN" && (
              <button
                onClick={() => onAnalyze(incident.id)}
                disabled={analyzing === incident.id}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-blue-400 text-white rounded px-3 py-1.5 transition-colors"
              >
                {analyzing === incident.id
                  ? "🤖 Analyzing..."
                  : "🤖 Run AI Agent"}
              </button>
            )}

            {incident.status === "IN_PROGRESS" && (
              <button
                onClick={() => onResolve(incident.id)}
                className="w-full text-xs bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 transition-colors"
              >
                ✅ Mark Resolved
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
