// src/app/core/services/presenter.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PresenterService {
  readonly isOpen = signal(false);
  show() { this.isOpen.set(true); }
  hide() { this.isOpen.set(false); }
}