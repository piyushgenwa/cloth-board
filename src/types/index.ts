export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ClothingItem {
  id: string;
  url: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  store: string;
  sizes: string[];
  colors: string[];
  description: string;
  position: Position;
  size: Size;
  sectionId: string | null;
  createdAt: number;
}

export interface Section {
  id: string;
  title: string;
  position: Position;
  size: Size;
  color: string;
  collapsed: boolean;
  createdAt: number;
}

export interface BoardState {
  items: ClothingItem[];
  sections: Section[];
  zoom: number;
  pan: Position;
  selectedIds: string[];
  boardName: string;
}

export interface ScrapedData {
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  store: string;
  sizes: string[];
  colors: string[];
  description: string;
}

export type Tool = "select" | "pan" | "section";
