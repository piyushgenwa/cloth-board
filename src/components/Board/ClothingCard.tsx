import { useState, useCallback } from "react";
import type { ClothingItem } from "../../types";
import { useBoardStore } from "../../stores/boardStore";

interface ClothingCardProps {
  item: ClothingItem;
  zoom: number;
  onDragStart: (e: React.MouseEvent, id: string) => void;
}

export function ClothingCard({ item, onDragStart }: ClothingCardProps) {
  const { removeItem, selectedIds, toggleSelected, clearSelection } =
    useBoardStore();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedIds.includes(item.id);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey || e.metaKey) {
        toggleSelected(item.id);
      } else if (!isSelected) {
        clearSelection();
        toggleSelected(item.id);
      }
      onDragStart(e, item.id);
    },
    [item.id, isSelected, toggleSelected, clearSelection, onDragStart]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeItem(item.id);
    },
    [item.id, removeItem]
  );

  const handleVisit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(item.url, "_blank", "noopener,noreferrer");
    },
    [item.url]
  );

  return (
    <div
      className="absolute bg-white rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-shadow hover:shadow-xl select-none"
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        zIndex: isSelected ? 20 : 10,
        border: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative w-full h-44 overflow-hidden rounded-t-xl bg-gray-100">
        {item.imageUrl && !imageError ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Hover overlay with actions */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/20 flex items-start justify-end p-2 gap-1">
            <button
              onClick={handleVisit}
              className="bg-white/90 hover:bg-white text-gray-700 rounded-lg p-1.5 text-xs shadow-sm"
              title="Visit product page"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500/90 hover:bg-red-500 text-white rounded-lg p-1.5 text-xs shadow-sm"
              title="Remove item"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 mb-1">{item.store}</p>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-900">
            {item.price}
          </span>
          {item.sizes.length > 0 && (
            <span className="text-xs text-gray-400">
              {item.sizes.length} sizes
            </span>
          )}
        </div>
        {item.colors.length > 0 && (
          <div className="flex gap-1 mt-2">
            {item.colors.slice(0, 5).map((color) => (
              <span
                key={color}
                className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600"
              >
                {color}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
