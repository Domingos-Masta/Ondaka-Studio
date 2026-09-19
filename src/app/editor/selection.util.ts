/**
 * Domternal is ProseMirror-based. These helpers work against a ProseMirror
 * EditorView instance, which Domternal exposes via its component instance.
 * If a particular Domternal version doesn't expose `view`, fall back to the
 * DOM Range API in the caller.
 */

export interface EditorSelection {
  text: string;
  from: number;
  to: number;
}

interface EditorViewLike {
  state: {
    selection: { from: number; to: number };
    doc: {
      textBetween(from: number, to: number, blockSeparator?: string): string;
      content: { size: number };
    };
    tr: {
      replaceWith(from: number, to: number, node: unknown): unknown;
    };
    schema: { text(input: string): unknown };
  };
  dispatch(tr: unknown): void;
  focus(): void;
}

export function getEditorSelection(view: EditorViewLike | null | undefined): EditorSelection | null {
  if (!view) return null;
  const { from, to } = view.state.selection;
  if (from === to) return null;
  return { text: view.state.doc.textBetween(from, to, '\n'), from, to };
}

export function replaceEditorSelection(view: EditorViewLike, replacement: string): void {
  const { from, to } = view.state.selection;
  if (from === to) return;
  const tr = view.state.tr.replaceWith(from, to, view.state.schema.text(replacement));
  view.dispatch(tr);
  view.focus();
}