import type { ReactNode } from "react";
import { useBoardStore } from "../../stores/boardStore";
import type { Tool } from "../../types";

export function Toolbar() {
  const {
    zoom,
    setZoom,
    setPan,
    activeTool,
    setActiveTool,
    setAddItemModalOpen,
    addSection,
    boardName,
    setBoardName,
    items,
    sections,
  } = useBoardStore();

  const handleZoomIn = () => setZoom(zoom + 0.1);
  const handleZoomOut = () => setZoom(zoom - 0.1);
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleAddSection = () => {
    // Add section at center of current view
    addSection({ x: 100, y: 100 });
  };

  const tools: { id: Tool; label: string; icon: ReactNode }[] = [
    {
      id: "select",
      label: "Select",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      ),
    },
    {
      id: "pan",
      label: "Pan",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 11V6a2 2 0 00-4 0v3M14 10V4a2 2 0 00-4 0v7M10 10.5V5a2 2 0 00-4 0v9" />
          <path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.5-.5-5.5-2.5L4 17" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm">
      {/* Left: Board name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-blue-500"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M3 9h18M9 3v18"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.3"
            />
          </svg>
          <input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none hover:bg-gray-50 focus:bg-gray-50 px-2 py-1 rounded max-w-48"
          />
        </div>
        <span className="text-xs text-gray-400">
          {items.length} items &middot; {sections.length} sections
        </span>
      </div>

      {/* Center: Tools */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-2 rounded-md transition-colors ${
              activeTool === tool.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Add Section */}
        <button
          onClick={handleAddSection}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title="Add Section"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>

        {/* Add Item */}
        <button
          onClick={() => setAddItemModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          title="Zoom out"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <span className="text-xs text-gray-600 font-mono w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          title="Zoom in"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors text-xs"
          title="Fit to screen"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
