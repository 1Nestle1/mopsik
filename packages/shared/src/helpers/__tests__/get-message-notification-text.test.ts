import { describe, expect, test } from 'bun:test';
import { getMessageNotificationText } from '../get-message-notification-text';

describe('getMessageNotificationText', () => {
  test('should name the author and the channel', () => {
    expect(
      getMessageNotificationText({
        authorName: 'Pug',
        channelName: 'general',
        isDm: false,
        plainText: 'hello'
      })
    ).toEqual({ title: 'Pug · #general', body: 'hello' });
  });

  test('should name only the author in a dm', () => {
    const { title } = getMessageNotificationText({
      authorName: 'Pug',
      channelName: 'dm-1-2',
      isDm: true,
      plainText: 'hi'
    });

    expect(title).toBe('Pug');
  });

  test('should show a clip for a message with only files', () => {
    const { body } = getMessageNotificationText({
      authorName: 'Pug',
      channelName: 'general',
      isDm: false,
      plainText: '  '
    });

    expect(body).toBe('📎');
  });

  test('should cut a long message short', () => {
    const { body } = getMessageNotificationText({
      authorName: 'Pug',
      channelName: 'general',
      isDm: false,
      plainText: 'a'.repeat(1000)
    });

    expect(body.length).toBe(241);
    expect(body.endsWith('…')).toBe(true);
  });
});
