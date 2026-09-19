import type { Node as PMNode } from '@domternal/pm/model';
import { TextSelection } from '@domternal/pm/state';
import type { EditorState, Transaction } from '@domternal/pm/state';
import type { EditorView, ViewMutationRecord } from '@domternal/pm/view';
import {
  CellSelection,
  TableView,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  cellAround,
  deleteColumn,
  deleteRow,
  deleteTable,
  mergeCells,
  splitCell,
} from '@domternal/pm/tables';

type TableCommand = (state: EditorState, dispatch: (tr: Transaction) => void) => boolean;

const svg = (content: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;

const toolbarIcons = {
  addRowAbove: svg('<path d="M12 19V7"/><path d="m5 12 7-7 7 7"/><path d="M5 4h14"/>'),
  addRowBelow: svg('<path d="M12 5v12"/><path d="m19 12-7 7-7-7"/><path d="M5 20h14"/>'),
  addColLeft: svg('<path d="M19 12H7"/><path d="m12 5-7 7 7 7"/><path d="M4 5v14"/>'),
  addColRight: svg('<path d="M5 12h12"/><path d="m12 5 7 7-7 7"/><path d="M20 5v14"/>'),
  deleteRow: svg('<path d="M5 12h14"/><path d="m7 8 10 8"/><path d="M17 8 7 16"/>'),
  deleteCol: svg('<path d="M12 5v14"/><path d="m8 7 8 10"/><path d="m16 7-8 10"/>'),
  merge: svg('<path d="M4 5v14"/><path d="M20 5v14"/><path d="m4 8 5 4-5 4"/><path d="m20 8-5 4 5 4"/>'),
  split: svg('<path d="M4 5v14"/><path d="M20 5v14"/><path d="m9 8-5 4 5 4"/><path d="m15 8 5 4-5 4"/>'),
  deleteTable: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
};

interface ToolbarButtonSpec {
  icon: string;
  title: string;
  run: TableCommand;
}

/**
 * In-page table controls: wraps the standard prosemirror-tables TableView
 * (colgroup + column resize handles) in a `.dm-table-container` and adds a
 * floating toolbar with row/column operations.
 */
export class ScriptWriterTableView extends TableView {
  private readonly editorView: EditorView;
  private readonly container: HTMLDivElement;
  private readonly toolbar: HTMLDivElement;
  private hovered = false;

  constructor(node: PMNode, defaultCellMinWidth: number, view: EditorView) {
    super(node, defaultCellMinWidth);
    this.editorView = view;

    this.container = document.createElement('div');
    this.container.className = 'dm-table-container';
    // Move the .tableWrapper (super.dom) inside the container.
    this.container.appendChild(this.dom);

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'dm-table-cell-toolbar';
    this.toolbar.style.position = 'absolute';
    this.toolbar.style.top = '6px';
    this.toolbar.style.right = '6px';
    this.toolbar.style.display = 'none';

    const buttons: ToolbarButtonSpec[] = [
      { icon: toolbarIcons.addRowAbove, title: 'Add row above', run: addRowBefore },
      { icon: toolbarIcons.addRowBelow, title: 'Add row below', run: addRowAfter },
      { icon: toolbarIcons.addColLeft, title: 'Add column left', run: addColumnBefore },
      { icon: toolbarIcons.addColRight, title: 'Add column right', run: addColumnAfter },
      { icon: toolbarIcons.deleteRow, title: 'Delete row', run: deleteRow },
      { icon: toolbarIcons.deleteCol, title: 'Delete column', run: deleteColumn },
      { icon: toolbarIcons.merge, title: 'Merge cells', run: mergeCells },
      { icon: toolbarIcons.split, title: 'Split cell', run: splitCell },
      { icon: toolbarIcons.deleteTable, title: 'Delete table', run: deleteTable },
    ];

    for (const spec of buttons) {
      this.toolbar.appendChild(this.createButton(spec));
    }

    this.container.appendChild(this.toolbar);

    this.container.addEventListener('mouseenter', this.onEnter);
    this.container.addEventListener('mouseleave', this.onLeave);

    // The node's root DOM element is now the container.
    this.dom = this.container;
  }

  private createButton(spec: ToolbarButtonSpec): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dm-table-cell-toolbar-btn';
    button.innerHTML = spec.icon;
    button.title = spec.title;
    button.setAttribute('aria-label', spec.title);

    // Keep the editor selection intact while clicking the button.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      this.runCommand(spec.run);
    });

    return button;
  }

  private runCommand(command: TableCommand): void {
    const view = this.editorView;
    // prosemirror-tables commands throw when the selection is not on a cell
    // (e.g. cursor just outside the table, or the table node itself selected).
    if (!this.hasCellSelection(view.state)) {
      const pos = this.firstCellPos();
      if (pos != null) {
        view.dispatch(
          view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos))),
        );
      }
    }
    try {
      command(view.state, view.dispatch);
    } catch {
      // Selection could not be resolved to a table cell — ignore the click.
    }
  }

  private hasCellSelection(state: EditorState): boolean {
    const selection = state.selection;
    if (selection instanceof CellSelection) return true;
    return cellAround(selection.$head) != null;
  }

  private tablePos(): number | null {
    let found: number | null = null;
    this.editorView.state.doc.descendants((node, pos) => {
      if (found == null && node === this.node) found = pos;
    });
    return found;
  }

  private firstCellPos(): number | null {
    const pos = this.tablePos();
    if (pos == null) return null;
    const row = this.editorView.state.doc.nodeAt(pos)?.firstChild ?? null;
    if (!row || row.childCount === 0) return null;
    // table (pos) → first row (pos + 1) → first cell (pos + 2)
    return pos + 2;
  }

  private refresh(): void {
    this.toolbar.style.display = this.hovered ? 'flex' : 'none';
  }

  private readonly onEnter = (): void => {
    this.hovered = true;
    this.refresh();
  };

  private readonly onLeave = (): void => {
    this.hovered = false;
    this.refresh();
  };

  update(node: PMNode): boolean {
    return super.update(node);
  }

  ignoreMutation(record: ViewMutationRecord): boolean {
    const target = record.target;
    if (target instanceof HTMLElement && this.toolbar.contains(target)) {
      return true;
    }
    return super.ignoreMutation(record);
  }

  stopEvent(event: Event): boolean {
    return event.target instanceof HTMLElement && this.toolbar.contains(event.target);
  }

  destroy(): void {
    this.container.removeEventListener('mouseenter', this.onEnter);
    this.container.removeEventListener('mouseleave', this.onLeave);
  }
}
