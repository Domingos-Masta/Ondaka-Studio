import { Node } from '@domternal/core';
import type { CommandProps } from '@domternal/core';
import type { Node as PMNode } from '@domternal/pm/model';
import type { EditorView, NodeView } from '@domternal/pm/view';

class DetailsView implements NodeView {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement;

  private readonly button: HTMLButtonElement;
  private readonly view: EditorView;
  private readonly getPos: () => number | undefined;
  private open: boolean;

  constructor(node: PMNode, view: EditorView, getPos: () => number | undefined) {
    this.view = view;
    this.getPos = getPos;
    this.open = (node.attrs['open'] as boolean | undefined) ?? true;

    this.dom = document.createElement('div');
    this.dom.setAttribute('data-type', 'details');
    this.dom.classList.toggle('is-open', this.open);

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Toggle details');
    this.button.addEventListener('click', this.toggle);

    this.contentDOM = document.createElement('div');
    this.dom.append(this.button, this.contentDOM);
  }

  private toggle = (): void => {
    const pos = this.getPos();
    if (pos == null) return;
    const node = this.view.state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'details') return;
    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        open: !(node.attrs['open'] as boolean),
      }),
    );
  };

  update(node: PMNode): boolean {
    if (node.type.name !== 'details') return false;
    const open = (node.attrs['open'] as boolean | undefined) ?? true;
    if (open !== this.open) {
      this.open = open;
      this.dom.classList.toggle('is-open', open);
      const content = this.contentDOM.querySelector<HTMLElement>('[data-details-content]');
      content?.toggleAttribute('hidden', !open);
    }
    return false;
  }

  stopEvent(event: Event): boolean {
    return event.target === this.button;
  }

  destroy(): void {
    this.button.removeEventListener('click', this.toggle);
  }
}

export const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'detailsSummary detailsContent',

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-open') !== 'false',
        renderHTML: (attributes) => ({ 'data-open': attributes.open ? 'true' : 'false' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="details"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'details' }, 0];
  },

  addNodeView() {
    return (node, view, getPos) => new DetailsView(node, view, getPos);
  },

  addCommands() {
    return {
      setDetails: () =>
        ({ commands }: CommandProps): boolean =>
          commands.insertContent({
            type: this.name,
            content: [
              { type: 'detailsSummary', content: [{ type: 'text', text: 'Details' }] },
              { type: 'detailsContent', content: [{ type: 'paragraph' }] },
            ],
          }),
    };
  },

  addToolbarItems() {
    return [
      {
        type: 'button',
        name: 'details',
        command: 'setDetails',
        icon: 'caretCircleRight',
        label: 'Details',
        group: 'insert',
        priority: 30,
      },
    ];
  },
});

export const DetailsSummary = Node.create({
  name: 'detailsSummary',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'summary' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', HTMLAttributes, 0];
  },
});

export const DetailsContent = Node.create({
  name: 'detailsContent',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div[data-details-content]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-details-content': '' }, 0];
  },
});
