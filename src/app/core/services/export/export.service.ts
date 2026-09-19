// src/app/core/services/export.service.ts
import { Injectable, inject } from '@angular/core';
import { ProjectStore } from '../project/project.store';
import { TimingService } from '../timing/timing.service';


@Injectable({ providedIn: 'root' })
export class ExportService {
  private store = inject(ProjectStore);
  private timing = inject(TimingService);

  async saveProject() {
    const project = this.store.project();
    await (window as any).api.saveProject(project);
  }

  async exportSceneCsv() {
    const rows: string[][] = [
      ['Scene', 'Role', 'Start TC', 'Duration', 'Title', 'Notes'],
    ];
    let t = 0;
    for (const s of this.store.scenes()) {
      rows.push([
        String(s.order + 1),
        s.role,
        this.timing.toTimecode(t),
        this.timing.toTimecode(s.targetDurationSec),
        s.title,
        s.notes.replace(/[\r\n]+/g, ' '),
      ]);
      t += s.targetDurationSec;
    }
    const csv = rows.map(r => r.map(this.escapeCsv).join(',')).join('\n');
    await (window as any).api.saveTextFile({
      suggestedName: `${this.slug()}-plan.csv`,
      content: csv,
    });
  }

  async exportChapters() {
    const lines: string[] = ['0:00 Intro'];
    let t = 0;
    for (const s of this.store.scenes()) {
      if (s.role === 'hook' || s.role === 'intro') { t += s.targetDurationSec; continue; }
      t += s.targetDurationSec;
      const m = Math.floor(t / 60);
      const sec = String(t % 60).padStart(2, '0');
      lines.push(`${m}:${sec} ${s.title}`);
    }
    await (window as any).api.saveTextFile({
      suggestedName: `${this.slug()}-chapters.txt`,
      content: lines.join('\n'),
    });
  }

  private escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  private slug() {
    return String(this.store.project().title ?? 'untitled')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
  }
}