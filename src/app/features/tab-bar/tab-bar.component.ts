// src/app/features/tab-bar/tab-bar.component.ts
import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { DocumentTab } from '../../core/models/document.model';
import { TabsService } from '../../core/services/tabs/tabs.service';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-bar" role="tablist" aria-label="Open scripts">
      <div class="tab-strip">
        @for (tab of tabs.tabs(); track tab.id) {
          <div class="tab"
               role="tab"
               [class.active]="tab.id === tabs.activeId()"
               [attr.aria-selected]="tab.id === tabs.activeId()"
               [title]="tab.filePath ?? tabs.label(tab)"
               (click)="tabs.activate(tab.id)"
               (auxclick)="onAuxClick($event, tab.id)">
            @if (tabs.isDirty(tab)) {
              <span class="dirty-dot" aria-label="Unsaved changes"></span>
            }
            <span class="tab-label">{{ tabs.label(tab) }}</span>
            <button class="tab-close"
                    type="button"
                    [attr.aria-label]="'Close ' + tabs.label(tab)"
                    (click)="close($event, tab.id)">✕</button>
          </div>
        }
      </div>

      <button class="new-tab" type="button" (click)="newTab()"
              aria-label="New script tab" title="New script tab (⌘T)">+</button>
    </div>
  `,
  styles: [`
    @reference "../../../styles.scss";
    .tab-bar     { @apply flex h-9 shrink-0 items-stretch border-b border-surface-3 bg-surface-1 select-none; }
    .tab-strip   { @apply flex min-w-0 flex-1 items-stretch overflow-x-auto; }
    .tab         { @apply flex min-w-0 max-w-56 shrink-0 cursor-pointer items-center gap-1.5 border-r border-surface-3 px-3 text-xs text-zinc-400 hover:bg-surface-2; }
    .tab.active  { @apply bg-surface-0 text-zinc-100 shadow-[inset_0_-2px_0_0_var(--color-accent)]; }
    .tab-label   { @apply truncate; }
    .tab-close   { @apply rounded px-1 text-[10px] leading-none text-zinc-500 opacity-0 transition hover:bg-surface-3 hover:text-zinc-100; }
    .tab:hover .tab-close, .tab.active .tab-close { @apply opacity-100; }
    .dirty-dot   { @apply h-1.5 w-1.5 shrink-0 rounded-full bg-accent; }
    .new-tab     { @apply flex w-9 shrink-0 items-center justify-center text-base text-zinc-400 transition hover:bg-surface-2 hover:text-zinc-100; }
  `],
})
export class TabBarComponent {
  readonly tabs = inject(TabsService);

  /** Electron delivers these through the application menu; the browser needs its own keys. */
  private readonly useMenuAccelerators = typeof window !== 'undefined' && !!window.api?.onMenuAction;

  constructor() {
    if (typeof window !== 'undefined' && window.api?.onMenuAction) {
      window.api.onMenuAction(action => this.handleMenuAction(action));
    }
  }

  @HostListener('window:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if (this.useMenuAccelerators || !(event.metaKey || event.ctrlKey)) return;
    if (event.key === 't') {
      event.preventDefault();
      this.newTab();
    } else if (event.altKey && event.key === 'ArrowRight') {
      this.tabs.next();
    } else if (event.altKey && event.key === 'ArrowLeft') {
      this.tabs.prev();
    }
  }

  newTab(): void {
    this.tabs.addTab();
  }

  close(event: Event, id: string): void {
    event.stopPropagation();
    this.tabs.close(id);
  }

  onAuxClick(event: MouseEvent, id: string): void {
    if (event.button === 1) this.tabs.close(id);
  }

  private handleMenuAction(action: string): void {
    switch (action) {
      case 'newTab': this.tabs.addTab(); break;
      case 'closeTab': this.closeActive(); break;
      case 'nextTab': this.tabs.next(); break;
      case 'prevTab': this.tabs.prev(); break;
      default: break;
    }
  }

  private closeActive(): void {
    const active: DocumentTab | null = this.tabs.active();
    if (active) this.tabs.close(active.id);
  }
}
