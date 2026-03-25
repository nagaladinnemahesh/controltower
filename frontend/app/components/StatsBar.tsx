interface StatsBarProps {
  totalNodes: number;
  totalIncidents: number;
  openIncidents: number;
}

export default function StatsBar({
  totalNodes,
  totalIncidents,
  openIncidents,
}: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Total Nodes</p>
        <p className="text-white text-2xl font-bold">{totalNodes}</p>
        <p className="text-gray-500 text-xs mt-1">CBS Knowledge Graph</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Total Incidents</p>
        <p className="text-white text-2xl font-bold">{totalIncidents}</p>
        <p className="text-gray-500 text-xs mt-1">All time</p>
      </div>

      <div
        className={`rounded-lg p-4 border ${
          openIncidents > 0
            ? "bg-red-900/30 border-red-700"
            : "bg-gray-800 border-gray-700"
        }`}
      >
        <p className="text-gray-400 text-sm">Open Incidents</p>
        <p
          className={`text-2xl font-bold ${
            openIncidents > 0 ? "text-red-400" : "text-green-400"
          }`}
        >
          {openIncidents}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {openIncidents > 0 ? "Requires attention" : "All clear"}
        </p>
      </div>
    </div>
  );
}
