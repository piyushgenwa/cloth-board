import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  ClothingItem,
  Section,
  Position,
  Size,
  Tool,
  ScrapedData,
} from "../types";

const STORAGE_KEY = "clothing-board-state";

interface BoardStore {
  // Board state
  items: ClothingItem[];
  sections: Section[];
  zoom: number;
  pan: Position;
  selectedIds: string[];
  boardName: string;
  activeTool: Tool;

  // UI state
  isAddItemModalOpen: boolean;
  isLoading: boolean;

  // Actions - Items
  addItem: (data: ScrapedData, url: string, position: Position) => void;
  removeItem: (id: string) => void;
  updateItemPosition: (id: string, position: Position) => void;
  updateItemSize: (id: string, size: Size) => void;
  assignItemToSection: (itemId: string, sectionId: string | null) => void;

  // Actions - Sections
  addSection: (position: Position) => void;
  removeSection: (id: string) => void;
  updateSectionPosition: (id: string, position: Position) => void;
  updateSectionSize: (id: string, size: Size) => void;
  updateSectionTitle: (id: string, title: string) => void;
  updateSectionColor: (id: string, color: string) => void;
  toggleSectionCollapsed: (id: string) => void;

  // Actions - Board
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setActiveTool: (tool: Tool) => void;
  setBoardName: (name: string) => void;

  // Actions - UI
  setAddItemModalOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

function loadState(): Partial<BoardStore> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        items: parsed.items || [],
        sections: parsed.sections || [],
        zoom: parsed.zoom || 1,
        pan: parsed.pan || { x: 0, y: 0 },
        boardName: parsed.boardName || "My Clothing Board",
      };
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

const initialState = loadState();

export const useBoardStore = create<BoardStore>((set, get) => ({
  // Initial state
  items: initialState.items || [],
  sections: initialState.sections || [],
  zoom: initialState.zoom || 1,
  pan: initialState.pan || { x: 0, y: 0 },
  selectedIds: [],
  boardName: initialState.boardName || "My Clothing Board",
  activeTool: "select",
  isAddItemModalOpen: false,
  isLoading: false,

  // Item actions
  addItem: (data, url, position) => {
    const item: ClothingItem = {
      id: uuidv4(),
      url,
      title: data.title,
      price: data.price,
      currency: data.currency,
      imageUrl: data.imageUrl,
      store: data.store,
      sizes: data.sizes,
      colors: data.colors,
      description: data.description,
      position,
      size: { width: 220, height: 300 },
      sectionId: null,
      createdAt: Date.now(),
    };
    set((state) => ({ items: [...state.items, item] }));
    get().saveToLocalStorage();
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
    get().saveToLocalStorage();
  },

  updateItemPosition: (id, position) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, position } : item
      ),
    }));
    get().saveToLocalStorage();
  },

  updateItemSize: (id, size) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, size } : item
      ),
    }));
    get().saveToLocalStorage();
  },

  assignItemToSection: (itemId, sectionId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, sectionId } : item
      ),
    }));
    get().saveToLocalStorage();
  },

  // Section actions
  addSection: (position) => {
    const section: Section = {
      id: uuidv4(),
      title: "New Section",
      position,
      size: { width: 400, height: 300 },
      color: "#f0f9ff",
      collapsed: false,
      createdAt: Date.now(),
    };
    set((state) => ({ sections: [...state.sections, section] }));
    get().saveToLocalStorage();
  },

  removeSection: (id) => {
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
      items: state.items.map((item) =>
        item.sectionId === id ? { ...item, sectionId: null } : item
      ),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
    get().saveToLocalStorage();
  },

  updateSectionPosition: (id, position) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, position } : s
      ),
    }));
    get().saveToLocalStorage();
  },

  updateSectionSize: (id, size) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, size } : s
      ),
    }));
    get().saveToLocalStorage();
  },

  updateSectionTitle: (id, title) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, title } : s
      ),
    }));
    get().saveToLocalStorage();
  },

  updateSectionColor: (id, color) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, color } : s
      ),
    }));
    get().saveToLocalStorage();
  },

  toggleSectionCollapsed: (id) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, collapsed: !s.collapsed } : s
      ),
    }));
    get().saveToLocalStorage();
  },

  // Board actions
  setZoom: (zoom) => {
    const clamped = Math.min(Math.max(zoom, 0.1), 3);
    set({ zoom: clamped });
    get().saveToLocalStorage();
  },

  setPan: (pan) => {
    set({ pan });
    get().saveToLocalStorage();
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  toggleSelected: (id) => {
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setBoardName: (name) => {
    set({ boardName: name });
    get().saveToLocalStorage();
  },

  // UI actions
  setAddItemModalOpen: (open) => set({ isAddItemModalOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),

  // Persistence
  saveToLocalStorage: () => {
    const state = get();
    const data = {
      items: state.items,
      sections: state.sections,
      zoom: state.zoom,
      pan: state.pan,
      boardName: state.boardName,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or unavailable
    }
  },

  loadFromLocalStorage: () => {
    const loaded = loadState();
    if (loaded.items || loaded.sections) {
      set({
        items: loaded.items || [],
        sections: loaded.sections || [],
        zoom: loaded.zoom || 1,
        pan: loaded.pan || { x: 0, y: 0 },
        boardName: loaded.boardName || "My Clothing Board",
      });
    }
  },
}));
