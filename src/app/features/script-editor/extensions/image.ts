import { Node } from '@domternal/core';
import type { CommandProps } from '@domternal/core';

export interface ImageOptions {
  src?: string;
  alt?: string;
  title?: string;
}

export const Image = Node.create({
  name: 'image',
  inline: true,
  group: 'inline',
  draggable: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes];
  },

  addCommands() {
    return {
      setImage: (options: ImageOptions = {}) =>
        ({ commands, dispatch }: CommandProps): boolean => {
          let src = options.src;
          if (!src) {
            // Dry-run (editor.can()) must not open a dialog — just report availability.
            if (!dispatch) return true;
            const prompted = window.prompt('Image URL:');
            if (!prompted) return false;
            src = prompted;
          }
          return commands.insertContent({
            type: this.name,
            attrs: { ...options, src },
          });
        },
    };
  },

  addToolbarItems() {
    return [
      {
        type: 'button',
        name: 'image',
        command: 'setImage',
        icon: 'image',
        label: 'Image',
        group: 'insert',
        priority: 20,
      },
    ];
  },
});
