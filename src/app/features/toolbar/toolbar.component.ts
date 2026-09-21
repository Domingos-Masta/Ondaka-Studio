// src/app/features/toolbar/toolbar.component.ts
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChaptersDialogService } from '../../core/services/chapters-dialog/chapters-dialog.service';
import { ExportService } from '../../core/services/export/export.service';
import { LayoutService } from '../../core/services/layout/layout.service';
import { PresenterService } from '../../core/services/presenter/presenter.service';
import { ProjectIoService } from '../../core/services/project-io/project-io.service';
import { ProjectStore } from '../../core/services/project/project.store';
import { ImportDialogComponent } from '../../shared/components/import-dialog/import-dialog.component';
import { TitleToScriptDialogComponent } from '../../shared/components/title-to-script-dialog/title-to-script-dialog.component';
import { SettingsDialogComponent } from '../../shared/components/settings-dialog/settings-dialog.component';


@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [FormsModule, SettingsDialogComponent, ImportDialogComponent, TitleToScriptDialogComponent],
  template: `
    <header class="h-12 flex items-center gap-3 px-4 bg-surface-1 border-b border-surface-3 select-none">
      <img class="app-icon" src="assets/icons/ondaka-icon.svg" alt="Ondaka Studio" title="Ondaka Studio" />

      <div class="w-px h-5 bg-surface-3"></div>

            <button class="icon-btn" (click)="toggleLeft.emit()"
              [class.active]="!layout.leftOpen()"
              aria-label="Toggle scenes panel"
              [title]="layout.leftOpen() ? 'Collapse scenes' : 'Show scenes'">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="2" width="14" height="12" rx="1.5"/>
          <line x1="6" y1="2" x2="6" y2="14"/>
        </svg>
      </button>

      <button class="icon-btn" (click)="toggleRight.emit()"
              [class.active]="!layout.rightOpen()"
              aria-label="Toggle timing panel"
              [title]="layout.rightOpen() ? 'Collapse timing panel' : 'Show timing panel'">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="2" width="14" height="12" rx="1.5"/>
          <line x1="10" y1="2" x2="10" y2="14"/>
        </svg>
      </button>

      <button class="icon-btn" (click)="layout.toggleAll()" aria-label="Toggle both panels" title="Toggle both panels (⌘.)">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="4,4 1,8 4,12"/>
          <polyline points="12,4 15,8 12,12"/>
        </svg>
      </button>

      <div class="w-px h-5 bg-surface-3"></div>

      <button class="icon-btn" (click)="io.newProject()" aria-label="New project" title="New project">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h10l6 6v10H4zM14 4v6h6M12 13v6M9 16h6"/></svg>
      </button>
      <button class="icon-btn" (click)="io.open()" aria-label="Open project" title="Open project">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3zM3 7V5h7l2 2"/></svg>
      </button>
      <button class="icon-btn" (click)="io.save()" aria-label="Save project" title="Save project">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7"/></svg>@if (io.isDirty()) {<span class="dirty-dot"></span>}
      </button>
      <button class="icon-btn" (click)="io.saveAs()" aria-label="Save project as" title="Save project as">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l3 3v15H5zM8 3v6h8V3M12 13v6M9 16l3 3 3-3"/></svg>
      </button>

      <button class="icon-btn" (click)="showTitleToScript.set(true)" aria-label="Generate script" title="Generate script">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/></svg>
      </button>
      <button class="icon-btn" (click)="showImport.set(true)" aria-label="Import script" title="Import TXT or DOCX">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4M5 14v6h14v-6"/></svg>
      </button>
      <button class="icon-btn" (click)="showSettings.set(true)" aria-label="Settings" title="Settings">
        <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12H2m20 0h-2M12 4V2m0 20v-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"/></svg>
      </button>
      @if (showSettings()) { <app-settings-dialog (toClose)="showSettings.set(false)" /> }
      @if (showTitleToScript()) { <app-title-to-script-dialog (toClose)="showTitleToScript.set(false)" /> }
      @if (showImport()) { <app-import-dialog (toClose)="showImport.set(false)" /> }

      <div class="w-px h-5 bg-surface-3"></div>

      <input class="bg-transparent text-sm px-2 py-1 rounded hover:bg-surface-2
                    focus:bg-surface-2 outline-none w-48 min-w-0"
             [(ngModel)]="title"
             (ngModelChange)="store.patch({ title: $event })"
             placeholder="Project title" />

      <div class="ml-auto flex items-center gap-2">
        <button class="icon-btn" (click)="store.fitScriptsToTimeline()" aria-label="Fit time to script" title="Fit time to script">
          <span class="icon-text">↔</span>
        </button>
        <button class="icon-btn" (click)="presenter.show()" aria-label="Present" title="Present">
          <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H4zM8 20h8M12 16v4M9 8l6 2-6 2z"/></svg>
        </button>
        <button class="icon-btn" (click)="chapters.show()" aria-label="Chapters" title="Chapters">
          <span class="icon-text">☷</span>
        </button>
        <button class="icon-btn primary" (click)="exportCsv()" aria-label="Export plan" title="Export plan">
          <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12M8 12l4 4 4-4M5 20h14"/></svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
  @reference "../../../styles.scss";
    .app-icon    { @apply h-7 w-7 rounded-md shrink-0; }
    .icon-btn    { @apply relative h-8 w-8 shrink-0 rounded text-zinc-400 hover:bg-surface-2 hover:text-zinc-200 transition; }
    .icon-btn.active { @apply bg-accent/20 text-accent; }
    .icon-btn.primary { @apply bg-accent text-white hover:bg-accent-hover; }
    .toolbar-icon { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .dirty-dot   { @apply absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent; }
    .icon-btn::after { content: attr(title); position: absolute; z-index: 100; top: calc(100% + 8px); left: 50%; display: none; transform: translateX(-50%); white-space: nowrap; border-radius: 4px; background: #18181b; padding: 5px 7px; color: #f4f4f5; font-size: 11px; font-weight: 400; pointer-events: none; box-shadow: 0 4px 12px rgb(0 0 0 / 35%); }
    .icon-btn:hover::after { display: block; }
  `],
})
export class ToolbarComponent {
  readonly toggleLeft = output<void>();
  readonly toggleRight = output<void>();

  readonly store = inject(ProjectStore);
  readonly io = inject(ProjectIoService);
  readonly presenter = inject(PresenterService);
  readonly chapters = inject(ChaptersDialogService);
  readonly layout = inject(LayoutService);
  private exporter = inject(ExportService);

  readonly showSettings = signal(false);
  readonly showTitleToScript = signal(false);
  readonly showImport = signal(false);

  constructor() {
    if (typeof window !== 'undefined' && window.api?.onMenuAction) {
      window.api.onMenuAction(action => this.handleMenuAction(action));
    }
  }

  private handleMenuAction(action: string): void {
    switch (action) {
      case 'new': this.io.newProject(); break;
      case 'open': void this.io.open(); break;
      case 'save': void this.io.save(); break;
      case 'saveAs': void this.io.saveAs(); break;
      case 'generate': this.showTitleToScript.set(true); break;
      case 'import': this.showImport.set(true); break;
      case 'settings': this.showSettings.set(true); break;
      case 'present': this.presenter.show(); break;
      case 'chapters': this.chapters.show(); break;
      case 'export': void this.exportCsv(); break;
      case 'fitTime': this.store.fitScriptsToTimeline(); break;
    }
  }

  get title() { return this.store.project().title; }
  async exportCsv() { await this.exporter.exportSceneCsv(); }
}