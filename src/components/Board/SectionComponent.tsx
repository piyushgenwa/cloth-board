import { useState, useCallback, useRef } from "react";
import type { Section } from "../../types";
import { useBoardStore } from "../../stores/boardStore";

interface SectionComponentProps {
  section: Section;
  zoom: number;
  onDragStart: (e: React.MouseEvent, id: string) => void;
}

const SECTION_COLORS = [
  "#f0f9ff", // blue-50
  "#fef3c7", // amber-100
  "#dcfce7", // green-100
  "#fce7f3", // pink-100
  "#ede9fe", // violet-100
  "#fff7ed", // orange-50
  "#f0fdf4", // green-50
  "#fdf2f8", // pink-50
];

export function SectionComponent({
  section,
  zoom,
  onDragStart,
}: SectionComponentProps) {
  const {
    removeSection,
    updateSectionTitle,
    updateSectionColor,
    updateSectionSize,
    toggleSectionCollapsed,
    selectedIds,
    toggleSelected,
    clearSelection,
  } = useBoardStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [, setIsResizing] = useState(false);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const isSelected = selectedIds.includes(section.id);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        (e.target as HTMLElement).closest(".section-header") &&
        !(e.target as HTMLElement).closest("button") &&
        !(e.target as HTMLElement).closest("input")
      ) {
        e.stopPropagation();
        if (e.shiftKey || e.metaKey) {
          toggleSelected(section.id);
        } else if (!isSelected) {
          clearSelection();
          toggleSelected(section.id);
        }
        onDragStart(e, section.id);
      }
    },
    [section.id, isSelected, toggleSelected, clearSelection, onDragStart]
  );

  const handleTitleSubmit = useCallback(() => {
    updateSectionTitle(section.id, editTitle || "Untitled Section");
    setIsEditingTitle(false);
  }, [section.id, editTitle, updateSectionTitle]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: section.size.width,
        startH: section.size.height,
      };

      const handleResizeMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = (moveEvent.clientX - resizeRef.current.startX) / zoom;
        const dy = (moveEvent.clientY - resizeRef.current.startY) / zoom;
        updateSectionSize(section.id, {
          width: Math.max(200, resizeRef.current.startW + dx),
          height: Math.max(100, resizeRef.current.startH + dy),
        });
      };

      const handleResizeEnd = () => {
        setIsResizing(false);
        resizeRef.current = null;
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };

      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    },
    [section.id, section.size, zoom, updateSectionSize]
  );

  return (
    <div
      className="absolute rounded-xl select-none"
      style={{
        left: section.position.x,
        top: section.position.y,
        width: section.size.width,
        height: section.collapsed ? "auto" : section.size.height,
        backgroundColor: section.color,
        border: isSelected
          ? "2px solid #3b82f6"
          : "2px dashed rgba(0,0,0,0.15)",
        zIndex: 1,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="section-header flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionCollapsed(section.id);
            }}
            className="text-gray-500 hover:text-gray-700 shrink-0"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: section.collapsed
                  ? "rotate(-90deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isEditingTitle ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setEditTitle(section.title);
                  setIsEditingTitle(false);
                }
              }}
              className="text-sm font-semibold bg-white/50 px-2 py-0.5 rounded border border-gray-300 outline-none focus:border-blue-400 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm font-semibold text-gray-700 truncate cursor-text"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditTitle(section.title);
                setIsEditingTitle(true);
              }}
            >
              {section.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Color picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: section.color }}
              title="Change color"
            />
            {showColorPicker && (
              <div className="absolute top-7 right-0 bg-white rounded-lg shadow-lg p-2 flex gap-1 z-50">
                {SECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSectionColor(section.id, color);
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        color === section.color ? "#3b82f6" : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeSection(section.id);
            }}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Delete section"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Resize handle */}
      {!section.collapsed && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
          style={{ zIndex: 2 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className="text-gray-400"
          >
            <path
              d="M14 14L8 14M14 14L14 8M14 14L6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
