// src/app/core/services/autosave.service.ts
import { Injectable, effect, inject } from '@angular/core';
import { ProjectStore } from '../project/project.store';


@Injectable({ providedIn: 'root' })
export class AutosaveService {
  private store = inject(ProjectStore);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const project = this.store.project();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        (window as any).api.saveProject(project).catch((err:any) => console.error('Autosave failed', err));
      }, 1500);
    });

    window.addEventListener('blur', () => {
      (window as any).api.saveProject(this.store.project()).catch((err:any) => console.error('Autosave failed', err));
    });
  }
}