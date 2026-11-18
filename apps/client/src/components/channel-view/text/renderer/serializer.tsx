import { ChannelChip } from '@/components/channel-chip';
import { GifImage } from '@/components/gif-picker/gif-image';
import { SaveGifButton } from '@/components/gif-picker/save-gif-button';
import { RoleMentionChip } from '@/components/role-mention-chip';
import {
  getGifProvider,
  MessageNodeType,
  parseDomCommand
} from '@sharkord/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { MentionOverride } from '../overrides/mention';

const serializer = (domNode: DOMNode, messageId: number) => {
  try {
    if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'gif'
    ) {
      const src = domNode.attribs['data-name'];
      const text = domNode.children
        .map((child) => (child.type === 'text' ? child.data : ''))
        .join('');

      return (
        <span className="relative inline-flex max-w-full items-start gap-1.5 align-middle">
          <GifImage className="message-gif" src={src ?? ''} title={text} />
          {src && getGifProvider(src) === 'library' && (
            <SaveGifButton src={src} title={text} />
          )}
        </span>
      );
    }

    if (domNode instanceof Element && domNode.name === 'command') {
      const command = parseDomCommand(domNode);

      return <CommandOverride command={command} />;
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === MessageNodeType.MENTION &&
      domNode.attribs['data-user-id']
    ) {
      const userId = parseInt(domNode.attribs['data-user-id'], 10);

      if (!Number.isNaN(userId)) {
        return <MentionOverride userId={userId} />;
      }
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === MessageNodeType.ROLE_MENTION &&
      domNode.attribs['data-role-id']
    ) {
      const roleId = parseInt(domNode.attribs['data-role-id'], 10);

      if (!Number.isNaN(roleId)) {
        return <RoleMentionChip roleId={roleId} />;
      }
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === MessageNodeType.CHANNEL_REFERENCE &&
      domNode.attribs['data-channel-id']
    ) {
      const channelId = parseInt(domNode.attribs['data-channel-id'], 10);

      if (!Number.isNaN(channelId)) {
        return <ChannelChip channelId={channelId} />;
      }
    }
  } catch (error) {
    console.error(`Error parsing DOM node for message ID ${messageId}:`, error);
  }

  return undefined;
};

export { serializer };
