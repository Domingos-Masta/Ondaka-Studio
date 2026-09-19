// src/app/core/services/chapters-dialog.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChaptersDialogService {
  readonly isOpen = signal(false);
  show() { this.isOpen.set(true); }
  hide() { this.isOpen.set(false); }
}