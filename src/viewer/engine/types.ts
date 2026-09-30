export type ModelIdMap = Record<string, Set<number>>;

export interface TreeNode {
  key: string;
  modelId: string;
  localId: number | null;
  category: string | null;
  name: string;
  children: TreeNode[];
}

export interface PropertyEntry {
  name: string;
  value: string;
}

export interface PropertyGroup {
  name: string;
  entries: PropertyEntry[];
}

export interface ElementInfo {
  modelId: string;
  localId: number;
  category: string;
  guid: string | null;
  name: string;
  attributes: PropertyEntry[];
  groups: PropertyGroup[];
}

export interface StoreyInfo {
  key: string;
  modelId: string;
  localId: number;
  name: string;
  elevation: number | null;
  itemIds: number[];
}

export interface CategoryInfo {
  category: string;
  count: number;
}

export interface LoadProgress {
  stage: "download" | "parse" | "geometry" | "fragments" | "done";
  percent: number;
  label: string;
}

export interface ModelStats {
  elements: number;
  categories: number;
  storeys: number;
  schema: string | null;
}
