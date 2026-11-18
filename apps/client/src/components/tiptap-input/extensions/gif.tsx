import { GifImage } from '@/components/gif-picker/gif-image';
import { getGifProvider } from '@sharkord/shared';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import { memo } from 'react';

const GifNodeView = memo(({ node }: NodeViewProps) => (
  <NodeViewWrapper as="span">
    <GifImage
      className="message-gif"
      src={node.attrs.src}
      title={node.attrs.title}
    />
  </NodeViewWrapper>
));

const Gif = Node.create({
  name: 'gif',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes: () => ({ src: { default: '' }, title: { default: '' } }),
  parseHTML: () => [
    {
      tag: 'span[data-type="gif"]',
      getAttrs: (element) => {
        const src = element.getAttribute('data-name');
        if (!src || !getGifProvider(src)) return false;

        return { src, title: element.textContent ?? '' };
      }
    }
  ],
  renderHTML: ({ node }) => [
    'span',
    { 'data-type': 'gif', 'data-name': node.attrs.src },
    node.attrs.title
  ],
  renderText: ({ node }) => node.attrs.title,
  addNodeView: () => ReactNodeViewRenderer(GifNodeView)
});

export { Gif };
