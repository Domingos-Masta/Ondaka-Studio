import type { ProjectType, SceneRole, VideoOrientation } from './project.model';

export type TemplateCategory = 'youtube-video' | 'instagram-reels' | 'tiktok-video' | 'youtube-short';

export interface TemplateCategoryInfo {
  id: TemplateCategory;
  label: string;
  icon: string;
  orientation: VideoOrientation;
  projectType: ProjectType;
}

export const TEMPLATE_CATEGORIES: TemplateCategoryInfo[] = [
  { id: 'youtube-video', label: 'YouTube Video', icon: '▶️', orientation: 'landscape', projectType: 'youtube-series' },
  { id: 'youtube-short', label: 'YouTube Short', icon: '📲', orientation: 'portrait', projectType: 'reels' },
  { id: 'instagram-reels', label: 'Instagram Reels', icon: '📸', orientation: 'portrait', projectType: 'reels' },
  { id: 'tiktok-video', label: 'TikTok Video', icon: '🎵', orientation: 'portrait', projectType: 'reels' },
];

export function templateCategoryInfo(id: TemplateCategory): TemplateCategoryInfo {
  return TEMPLATE_CATEGORIES.find((c) => c.id === id) ?? TEMPLATE_CATEGORIES[0]!;
}

export interface TemplateScene {
  title: string;
  role: SceneRole;
  /** Explains the purpose of this scene to the writer. */
  description: string;
  targetDurationSec: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  orientation: VideoOrientation;
  scenes: TemplateScene[];
  builtin: boolean;
  createdAt: string;
}
