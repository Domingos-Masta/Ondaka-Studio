// src/app/core/services/toast.service.ts
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly items = signal<Toast[]>([]);

  show(message: string, kind: Toast['kind'] = 'info', ms = 2600) {
    const id = ++this.seq;
    this.items.update(list => [...list, { id, kind, message }]);
    setTimeout(() => this.items.update(list => list.filter(t => t.id !== id)), ms);
  }

  success(m: string) { this.show(m, 'success'); }
  error(m: string)   { this.show(m, 'error', 4000); }
}