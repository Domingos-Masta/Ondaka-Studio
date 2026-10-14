import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TabBarComponent } from './tab-bar.component';
import { TabsService } from '../../core/services/tabs/tabs.service';
import { ProjectStore } from '../../core/services/project/project.store';

describe('TabBarComponent', () => {
  let fixture: ComponentFixture<TabBarComponent>;
  let tabs: TabsService;
  let store: ProjectStore;

  const root = () => fixture.nativeElement as HTMLElement;
  const tabElements = () => root().querySelectorAll('.tab');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabBarComponent] });
    tabs = TestBed.inject(TabsService);
    store = TestBed.inject(ProjectStore);
    fixture = TestBed.createComponent(TabBarComponent);
    fixture.detectChanges();
  });

  it('renders one tab per open script', () => {
    expect(tabElements()).toHaveLength(1);

    tabs.addTab();
    fixture.detectChanges();

    expect(tabElements()).toHaveLength(2);
  });

  it('adds a workspace from the + button', () => {
    root().querySelector<HTMLButtonElement>('.new-tab')!.click();
    fixture.detectChanges();

    expect(tabElements()).toHaveLength(2);
    expect(tabElements()[1].classList.contains('active')).toBe(true);
  });

  it('switches the active tab when a tab is clicked', () => {
    store.patch({ title: 'First' });
    tabs.addTab();
    store.patch({ title: 'Second' });
    fixture.detectChanges();

    const first = tabElements()[0] as HTMLElement;
    first.click();
    fixture.detectChanges();

    expect(first.classList.contains('active')).toBe(true);
    expect(store.project().title).toBe('First');
  });

  it('marks a tab with unsaved changes', () => {
    tabs.markSaved('/tmp/script.swproj');
    fixture.detectChanges();
    expect(root().querySelector('.dirty-dot')).toBeNull();

    store.patch({ title: 'Edited after save' });
    fixture.detectChanges();

    expect(root().querySelector('.dirty-dot')).not.toBeNull();
  });

  it('closes a tab from its close button', () => {
    tabs.addTab();
    fixture.detectChanges();

    root().querySelectorAll<HTMLButtonElement>('.tab-close')[1].click();
    fixture.detectChanges();

    expect(tabElements()).toHaveLength(1);
  });
});
