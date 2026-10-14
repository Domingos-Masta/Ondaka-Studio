import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveService } from './autosave.service';
import { ProjectStore } from '../project/project.store';
import { TabsService } from '../tabs/tabs.service';
import { SettingsService } from '../settings/settings.service';

describe('AutosaveService', () => {
  const saveProject = vi.fn().mockResolvedValue('saved');
  /** Titles written so far — stale service instances from earlier tests may also report. */
  const writtenTitles = () => saveProject.mock.calls.map(call => (call[0] as { title: string }).title);

  beforeEach(() => {
    vi.useFakeTimers();
    saveProject.mockClear();
    (window as unknown as { api: unknown }).api = { saveProject, settings: { patch: vi.fn().mockResolvedValue({}) } };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes every open tab after the debounce interval', async () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(ProjectStore);
    const tabs = TestBed.inject(TabsService);
    TestBed.inject(AutosaveService);
    tabs.addTab();

    store.patch({ title: 'Draft A' });
    TestBed.tick();
    saveProject.mockClear();
    await vi.advanceTimersByTimeAsync(1000);

    expect(saveProject).toHaveBeenCalledTimes(2);
    expect(writtenTitles()).toContain('Draft A');
  });

  it('does not write anything while autosave is disabled', async () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(ProjectStore);
    const settings = TestBed.inject(SettingsService);
    TestBed.inject(AutosaveService);
    await settings.patch({ autosave: { enabled: false, debounceMs: 400 } });

    saveProject.mockClear();
    store.patch({ title: 'Draft B' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(5000);

    expect(saveProject).not.toHaveBeenCalled();
  });

  it('flushes pending work when the window loses focus', async () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(ProjectStore);
    TestBed.inject(AutosaveService);
    store.patch({ title: 'Draft C' });
    TestBed.tick();

    saveProject.mockClear();
    window.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(0);

    expect(writtenTitles()).toContain('Draft C');
  });

  it('serializes writes so a draft cannot be half-written', async () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(ProjectStore);
    const settings = TestBed.inject(SettingsService);
    const tabs = TestBed.inject(TabsService);
    TestBed.inject(AutosaveService);
    await settings.patch({ autosave: { enabled: true, debounceMs: 100 } });
    tabs.addTab();

    let inFlight = 0;
    let overlapped = false;
    saveProject.mockImplementation(async () => {
      inFlight += 1;
      if (inFlight > 1) overlapped = true;
      await new Promise(resolve => setTimeout(resolve, 10));
      inFlight -= 1;
      return 'saved';
    });

    store.patch({ title: 'Draft E' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);

    expect(saveProject).toHaveBeenCalledTimes(2);
    expect(overlapped).toBe(false);
  });


});
