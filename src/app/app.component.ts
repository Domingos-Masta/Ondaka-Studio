// src/app/app.component.ts
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { SceneListComponent } from './features/scene-list/scene-list.component';
import { ScriptEditorComponent } from './features/script-editor/script-editor.component';
import { TimingPanelComponent } from './features/timing-panel/timing-panel.component';
import { TimelineStripComponent } from './features/timeline-strip/timeline-strip.component';
import { PresenterComponent } from './features/presenter/presenter.component';
import { ToolbarComponent } from './features/toolbar/toolbar.component';
import { ChaptersDialogComponent } from './features/chapters-dialog/chapters-dialog.component';
import { ToastHostComponent } from './features/toast-host/toast-host.component';
import { ChaptersDialogService } from './core/services/chapters-dialog/chapters-dialog.service';
import { LayoutService } from './core/services/layout/layout.service';
import { PresenterService } from './core/services/presenter/presenter.service';
import { SettingsService } from './core/services/settings/settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ToolbarComponent,
    SceneListComponent,
    ScriptEditorComponent,
    TimingPanelComponent,
    TimelineStripComponent,
    PresenterComponent,
    ChaptersDialogComponent,
    ToastHostComponent,
  ],
  template: `
    <div class="h-screen flex flex-col bg-surface-0 text-zinc-200 overflow-hidden">
      <app-toolbar (toggleLeft)="layout.toggle('left')"
                   (toggleRight)="layout.toggle('right')" />

      <div class="flex-1 min-h-0 grid overflow-hidden transition-[grid-template-columns] duration-200"
           [style.grid-template-columns]="layout.gridTemplate()">

        <app-scene-list
          class="min-h-0 min-w-0 overflow-hidden"
          [class.border-r]="layout.leftOpen()"
          [class.border-surface-3]="layout.leftOpen()" />

        <app-script-editor class="min-h-0 min-w-0 overflow-hidden" />

        <app-timing-panel
          class="min-h-0 min-w-0 overflow-hidden"
          [class.border-l]="layout.rightOpen()"
          [class.border-surface-3]="layout.rightOpen()" />
      </div>

      <app-timeline-strip class="border-t border-surface-3" />

      @if (presenter.isOpen()) {
        <app-presenter (toClose)="presenter.hide()" />
      }
      @if (chapters.isOpen()) {
        <app-chapters-dialog (toClose)="chapters.hide()" />
      }
      <app-toast-host />
    </div>
  `,
})
export class AppComponent implements OnInit {
  readonly presenter = inject(PresenterService);
  readonly chapters = inject(ChaptersDialogService);
  readonly layout = inject(LayoutService);
  readonly settings = inject(SettingsService);

  // In AppComponent
  @HostListener('window:keydown', ['$event'])
  onShortcut(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === '.') {
      e.preventDefault();
      this.layout.toggleAll();
    }
  }

  ngOnInit(): void {
    this.settings.load().catch(err => {
      console.error('Failed to load settings:', err);
    });
    // rest of existing init
  }
}