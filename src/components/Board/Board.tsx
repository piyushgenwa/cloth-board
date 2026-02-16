import { useRef, useCallback, useEffect, useState } from "react";
import { useBoardStore } from "../../stores/boardStore";
import { ClothingCard } from "./ClothingCard";
import { SectionComponent } from "./SectionComponent";

export function Board() {
  const {
    items,
    sections,
    zoom,
    pan,
    setZoom,
    setPan,
    activeTool,
    clearSelection,
    selectedIds,
    updateItemPosition,
    updateSectionPosition,
    addSection,
  } = useBoardStore();

  const boardRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });

  const isDragging = useRef(false);
  const dragId = useRef<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  );

  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const sectionStart = useRef({ x: 0, y: 0 });
  const [sectionPreview, setSectionPreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Convert screen coordinates to board coordinates
  const screenToBoard = useCallback(
    (screenX: number, screenY: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left - pan.x) / zoom,
        y: (screenY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Handle wheel for zoom
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(zoom + delta, 0.1), 3);

        // Zoom toward cursor position
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scale = newZoom / zoom;
        const newPanX = mouseX - (mouseX - pan.x) * scale;
        const newPanY = mouseY - (mouseY - pan.y) * scale;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // Pan
        setPan({
          x: pan.x - e.deltaX,
          y: pan.y - e.deltaY,
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom, pan, setZoom, setPan]);

  // Handle board mouse down for panning or section creation
  const handleBoardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only react to direct board clicks
      if (e.target !== boardRef.current && e.target !== boardRef.current?.firstChild) {
        return;
      }

      if (activeTool === "section") {
        // Start creating a section
        const boardPos = screenToBoard(e.clientX, e.clientY);
        sectionStart.current = boardPos;
        setIsCreatingSection(true);
        setSectionPreview({
          x: boardPos.x,
          y: boardPos.y,
          w: 0,
          h: 0,
        });
        return;
      }

      clearSelection();

      // Start panning (middle click, space+click, or pan tool)
      if (e.button === 1 || activeTool === "pan") {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panStartOffset.current = { x: pan.x, y: pan.y };
        e.preventDefault();
      }
    },
    [activeTool, clearSelection, pan, screenToBoard]
  );

  // Handle item/section drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      isDragging.current = true;
      dragId.current = id;
      dragStart.current = { x: e.clientX, y: e.clientY };

      // Store starting positions of all selected items
      dragStartPositions.current.clear();
      const allIds = selectedIds.includes(id) ? selectedIds : [id];
      for (const selectedId of allIds) {
        const item = items.find((i) => i.id === selectedId);
        const section = sections.find((s) => s.id === selectedId);
        if (item) {
          dragStartPositions.current.set(selectedId, { ...item.position });
        } else if (section) {
          dragStartPositions.current.set(selectedId, { ...section.position });
        }
      }
    },
    [selectedIds, items, sections]
  );

  // Handle global mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning.current) {
        setPan({
          x: panStartOffset.current.x + (e.clientX - panStart.current.x),
          y: panStartOffset.current.y + (e.clientY - panStart.current.y),
        });
        return;
      }

      if (isCreatingSection) {
        const boardPos = screenToBoard(e.clientX, e.clientY);
        const x = Math.min(sectionStart.current.x, boardPos.x);
        const y = Math.min(sectionStart.current.y, boardPos.y);
        const w = Math.abs(boardPos.x - sectionStart.current.x);
        const h = Math.abs(boardPos.y - sectionStart.current.y);
        setSectionPreview({ x, y, w, h });
        return;
      }

      if (isDragging.current && dragId.current) {
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;

        for (const [id, startPos] of dragStartPositions.current) {
          const newPos = {
            x: startPos.x + dx,
            y: startPos.y + dy,
          };
          const isItem = items.some((i) => i.id === id);
          if (isItem) {
            updateItemPosition(id, newPos);
          } else {
            updateSectionPosition(id, newPos);
          }
        }
      }
    };

    const handleMouseUp = () => {
      isPanning.current = false;
      isDragging.current = false;
      dragId.current = null;

      if (isCreatingSection && sectionPreview) {
        if (sectionPreview.w > 50 && sectionPreview.h > 50) {
          // Create a section at the drawn area
          const store = useBoardStore.getState();
          const section = {
            id: crypto.randomUUID(),
            title: "New Section",
            position: { x: sectionPreview.x, y: sectionPreview.y },
            size: { width: sectionPreview.w, height: sectionPreview.h },
            color: "#f0f9ff",
            collapsed: false,
            createdAt: Date.now(),
          };
          store.sections.push(section);
          useBoardStore.setState({ sections: [...store.sections] });
          store.saveToLocalStorage();
        }
        setIsCreatingSection(false);
        setSectionPreview(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    zoom,
    items,
    sections,
    updateItemPosition,
    updateSectionPosition,
    setPan,
    isCreatingSection,
    sectionPreview,
    screenToBoard,
    addSection,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const store = useBoardStore.getState();
        for (const id of store.selectedIds) {
          store.removeItem(id);
          store.removeSection(id);
        }
      }

      if (e.key === "Escape") {
        clearSelection();
      }

      // V for select tool
      if (e.key === "v") {
        useBoardStore.getState().setActiveTool("select");
      }
      // H for pan tool
      if (e.key === "h") {
        useBoardStore.getState().setActiveTool("pan");
      }
      // S for section tool
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        useBoardStore.getState().setActiveTool("section");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection]);

  return (
    <div
      ref={boardRef}
      className="w-full h-full bg-gray-50 overflow-hidden relative"
      style={{
        cursor:
          activeTool === "pan"
            ? "grab"
            : activeTool === "section"
              ? "crosshair"
              : "default",
      }}
      onMouseDown={handleBoardMouseDown}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, #d1d5db 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          opacity: 0.5,
        }}
      />

      {/* Transform container */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Sections (render behind items) */}
        {sections.map((section) => (
          <SectionComponent
            key={section.id}
            section={section}
            zoom={zoom}
            onDragStart={handleDragStart}
          />
        ))}

        {/* Clothing items */}
        {items.map((item) => (
          <ClothingCard
            key={item.id}
            item={item}
            zoom={zoom}
            onDragStart={handleDragStart}
          />
        ))}

        {/* Section creation preview */}
        {sectionPreview && (
          <div
            className="absolute border-2 border-blue-400 bg-blue-50/50 rounded-lg pointer-events-none"
            style={{
              left: sectionPreview.x,
              top: sectionPreview.y,
              width: sectionPreview.w,
              height: sectionPreview.h,
            }}
          />
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && sections.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-20">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mx-auto text-gray-400"
              >
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-1">
              Your clothing board is empty
            </h3>
            <p className="text-sm text-gray-400">
              Click "Add Item" to paste a product URL, or press S to draw a
              section
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
