export interface SceneBlock {
  id: string;
  title: string;
  color: string;
  sceneIds: string[];
  collapsed: boolean;
}

export const BLOCK_PALETTE = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const;