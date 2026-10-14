import type { VideoProject } from './project.model';

/**
 * One open script. A tab owns everything that makes a workspace: the project
 * itself, the file it is bound to, whether it has unsaved edits and which
 * scene the user was working on.
 */
export interface DocumentTab {
  id: string;
  /** Label shown in the tab bar (the project title). */
  title: string;
  /** Absolute path of the .swproj file, or null when the tab was never saved. */
  filePath: string | null;
  /** `project.updatedAt` at the moment of the last save/open — used for the dirty flag. */
  savedRevision: string;
  /** Dirty state of an inactive tab (the active tab is compared against the live project). */
  isDirty: boolean;
  project: VideoProject;
  selectedSceneId: string | null;
}
