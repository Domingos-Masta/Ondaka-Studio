import { Node } from '@domternal/core';
import type { Command, CommandProps, JSONContent } from '@domternal/core';
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  mergeCells,
  setCellAttr,
  splitCell,
  tableEditing,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
} from '@domternal/pm/tables';
import { ScriptWriterTableView } from './table-view';

export interface InsertTableOptions {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
}

/** Wraps a prosemirror-tables command (state, dispatch?) into a domternal command factory. */
const asCommand =
  (fn: (state: CommandProps['state'], dispatch: CommandProps['dispatch']) => boolean) =>
  (): Command =>
  ({ state, dispatch }: CommandProps): boolean => {
    try {
      return fn(state, dispatch);
    } catch {
      return false;
    }
  };

type DomCommands = Record<string, (...args: never[]) => Command>;

export const Table = Node.create({
  name: 'table',
  group: 'block',
  content: 'tableRow+',
  tableRole: 'table',
  isolating: true,

  parseHTML() {
    return [{ tag: 'table' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'tableWrapper' },
      ['table', { ...HTMLAttributes, 'data-type': this.name }, ['tbody', 0]],
    ];
  },

  addCommands() {
    const cell = (type: string): JSONContent => ({ type, content: [{ type: 'paragraph' }] });

    return {
      insertTable: (options: InsertTableOptions = {}) =>
        ({ commands, dispatch }: CommandProps): boolean => {
          let { rows, cols } = options;
          const withHeaderRow = options.withHeaderRow ?? true;

          if (rows == null || cols == null) {
            // Dry-run (editor.can()) must not open a dialog — just report availability.
            if (!dispatch) return true;

            const input = window.prompt('Table size (rows × columns):', '3×3');
            if (!input) return false;

            const match = /^\s*(\d+)\s*[x×,]\s*(\d+)\s*$/i.exec(input);
            if (match) {
              rows = Math.min(50, Math.max(1, parseInt(match[1], 10)));
              cols = Math.min(50, Math.max(1, parseInt(match[2], 10)));
            } else {
              rows = 3;
              cols = 3;
            }
          }

          const content: JSONContent[] = Array.from({ length: rows }, (_, rowIndex) => ({
            type: 'tableRow',
            content: Array.from({ length: cols }, () =>
              cell(withHeaderRow && rowIndex === 0 ? 'tableHeader' : 'tableCell'),
            ),
          }));

          return commands.insertContent({ type: this.name, content });
        },

      deleteTable: asCommand(deleteTable),
      addColumnBefore: asCommand(addColumnBefore),
      addColumnAfter: asCommand(addColumnAfter),
      deleteColumn: asCommand(deleteColumn),
      addRowBefore: asCommand(addRowBefore),
      addRowAfter: asCommand(addRowAfter),
      deleteRow: asCommand(deleteRow),
      mergeCells: asCommand(mergeCells),
      splitCell: asCommand(splitCell),
      toggleHeaderRow: asCommand(toggleHeaderRow),
      toggleHeaderColumn: asCommand(toggleHeaderColumn),
      toggleHeaderCell: asCommand(toggleHeaderCell),
      goToNextCell: asCommand(goToNextCell(1)),
      goToPreviousCell: asCommand(goToNextCell(-1)),
      setCellAttr: (name: string, value: unknown) => asCommand(setCellAttr(name, value)),
      fixTables: (): Command =>
        ({ state, dispatch }: CommandProps): boolean => {
          const tr = fixTables(state);
          if (!tr) return false;
          dispatch?.(tr);
          return true;
        },
    } as unknown as DomCommands;
  },

  addKeyboardShortcuts() {
    const editor = this.editor;
    return {
      Tab: () => {
        const commands = editor?.commands;
        if (!commands) return false;
        if (commands['goToNextCell']?.()) return true;
        if (commands['addRowAfter']?.()) {
          commands['goToNextCell']?.();
          return true;
        }
        return false;
      },
      'Shift-Tab': () => editor?.commands?.['goToPreviousCell']?.() ?? false,
    };
  },

  addProseMirrorPlugins() {
    return [
      columnResizing({ View: ScriptWriterTableView, lastColumnResizable: true }),
      tableEditing(),
    ];
  },

  addToolbarItems() {
    return [
      {
        type: 'dropdown',
        name: 'table',
        icon: 'table',
        label: 'Table',
        group: 'insert',
        priority: 40,
        items: [
          {
            type: 'button',
            name: 'table-insert-custom',
            command: 'insertTable',
            icon: 'table',
            label: 'Insert table…',
          },
          {
            type: 'button',
            name: 'table-insert-2x2',
            command: 'insertTable',
            commandArgs: [{ rows: 2, cols: 2 }],
            icon: 'table',
            label: 'Insert 2×2',
          },
          {
            type: 'button',
            name: 'table-insert-3x3',
            command: 'insertTable',
            commandArgs: [{ rows: 3, cols: 3 }],
            icon: 'table',
            label: 'Insert 3×3',
          },
          {
            type: 'button',
            name: 'table-insert-4x4',
            command: 'insertTable',
            commandArgs: [{ rows: 4, cols: 4 }],
            icon: 'table',
            label: 'Insert 4×4',
          },
          {
            type: 'button',
            name: 'table-insert-5x5',
            command: 'insertTable',
            commandArgs: [{ rows: 5, cols: 5 }],
            icon: 'table',
            label: 'Insert 5×5',
          },
        ],
      },
    ];
  },
});

export const TableRow = Node.create({
  name: 'tableRow',
  content: '(tableCell | tableHeader)*',
  tableRole: 'row',

  parseHTML() {
    return [{ tag: 'tr' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['tr', HTMLAttributes, 0];
  },
});

/** Attributes shared by table cells (required by prosemirror-tables). */
const cellAttributes = () => ({
  colspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => {
      const value = parseInt(element.getAttribute('colspan') ?? '1', 10);
      return Number.isFinite(value) && value > 0 ? value : 1;
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      typeof attributes.colspan === 'number' && attributes.colspan > 1
        ? { colspan: attributes.colspan }
        : {},
  },
  rowspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => {
      const value = parseInt(element.getAttribute('rowspan') ?? '1', 10);
      return Number.isFinite(value) && value > 0 ? value : 1;
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      typeof attributes.rowspan === 'number' && attributes.rowspan > 1
        ? { rowspan: attributes.rowspan }
        : {},
  },
  colwidth: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const colwidth = element.getAttribute('data-colwidth');
      return colwidth ? colwidth.split(',').map((n) => parseInt(n, 10)) : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const colwidth = attributes.colwidth;
      return Array.isArray(colwidth) && colwidth.length > 0
        ? { 'data-colwidth': colwidth.join(',') }
        : {};
    },
  },
});

export const TableHeader = Node.create({
  name: 'tableHeader',
  content: 'block+',
  tableRole: 'header_cell',

  addAttributes() {
    return cellAttributes();
  },

  parseHTML() {
    return [{ tag: 'th' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['th', HTMLAttributes, 0];
  },
});

export const TableCell = Node.create({
  name: 'tableCell',
  content: 'block+',
  tableRole: 'cell',

  addAttributes() {
    return cellAttributes();
  },

  parseHTML() {
    return [{ tag: 'td' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['td', HTMLAttributes, 0];
  },
});
