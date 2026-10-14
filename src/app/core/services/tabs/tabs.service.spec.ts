import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TabsService } from './tabs.service';
import { ProjectStore, blankProject } from '../project/project.store';
import { SelectionService } from '../selection/selection.service';
import { OrganizeService } from '../organize/organize.service';

describe('TabsService', () => {
  let tabs: TabsService;
  let store: ProjectStore;
  let selection: SelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    tabs = TestBed.inject(TabsService);
    store = TestBed.inject(ProjectStore);
    selection = TestBed.inject(SelectionService);
    TestBed.inject(OrganizeService);
  });

  it('starts with a single tab bound to the store project', () => {
    expect(tabs.tabs()).toHaveLength(1);
    expect(tabs.active()?.project.id).toBe(store.project().id);
  });

  it('opens documents in their own tab and keeps them independent', () => {
    const first = store.project();
    store.patch({ title: 'Script A' });

    const other = blankProject({ title: 'Script B' });
    tabs.openDocument(other, null, false);

    expect(tabs.tabs()).toHaveLength(2);
    expect(store.project().title).toBe('Script B');

    tabs.activate(tabs.tabs()[0].id);
    expect(store.project().title).toBe('Script A');
    expect(store.project().id).toBe(first.id);

    tabs.activate(tabs.tabs()[1].id);
    expect(store.project().title).toBe('Script B');
  });

  it('reuses an untouched tab instead of piling up empty ones', () => {
    tabs.openDocument(blankProject({ title: 'Opened' }), '/tmp/opened.swproj', true);

    expect(tabs.tabs()).toHaveLength(1);
    expect(tabs.active()?.filePath).toBe('/tmp/opened.swproj');
  });

  it('tracks dirty state per tab against the saved revision', () => {
    tabs.markSaved('/tmp/a.swproj');
    expect(tabs.isDirty(tabs.active())).toBe(false);

    store.patch({ title: 'Edited' });
    expect(tabs.isDirty(tabs.active())).toBe(true);

    tabs.markSaved('/tmp/a.swproj');
    expect(tabs.isDirty(tabs.active())).toBe(false);
  });

  it('restores the selected scene of the tab it switches back to', () => {
    const first = store.addScene('point');
    expect(selection.selectedId()).toBe(first.id);

    tabs.addTab();
    expect(store.scenes()).toHaveLength(0);

    tabs.activate(tabs.tabs()[0].id);
    expect(store.scenes()).toHaveLength(1);
    expect(selection.selectedId()).toBe(first.id);
  });

  it('closes a tab and activates a neighbour, keeping at least one tab', () => {
    tabs.addTab();

    tabs.close(tabs.tabs()[1].id);
    expect(tabs.tabs()).toHaveLength(1);

    tabs.close(tabs.tabs()[0].id);
    expect(tabs.tabs()).toHaveLength(1);
    expect(store.project().scenes).toHaveLength(0);
  });

  it('cycles through tabs with next/prev', () => {
    tabs.addTab();
    tabs.addTab();
    expect(tabs.tabs()).toHaveLength(3);

    const activeId = tabs.activeId();
    tabs.next();
    expect(tabs.activeId()).not.toBe(activeId);
    tabs.prev();
    expect(tabs.activeId()).toBe(activeId);
  });

  it('labels tabs from the project title', () => {
    store.patch({ title: 'Release video' });
    tabs.captureActive();

    expect(tabs.label(tabs.active()!)).toBe('Release video');
  });
});
