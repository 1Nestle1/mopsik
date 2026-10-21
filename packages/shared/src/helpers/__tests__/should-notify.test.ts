import { describe, expect, test } from 'bun:test';
import { shouldNotify, type TNotificationPreferences } from '../should-notify';

const NONE: TNotificationPreferences = {
  all: false,
  mentions: false,
  dms: false,
  replies: false
};

const PLAIN = { isDm: false, isMentioned: false, isReplyToOwnMessage: false };

describe('shouldNotify', () => {
  test('should stay quiet with every switch off', () => {
    expect(shouldNotify(NONE, PLAIN)).toBe(false);
    expect(shouldNotify(NONE, { ...PLAIN, isMentioned: true })).toBe(false);
    expect(shouldNotify(NONE, { ...PLAIN, isDm: true })).toBe(false);
  });

  test('should notify about every channel message with all on', () => {
    expect(shouldNotify({ ...NONE, all: true }, PLAIN)).toBe(true);
  });

  test('should notify about a mention with only mentions on', () => {
    const preferences = { ...NONE, mentions: true };

    expect(shouldNotify(preferences, { ...PLAIN, isMentioned: true })).toBe(
      true
    );
    expect(shouldNotify(preferences, PLAIN)).toBe(false);
  });

  test('should notify about a reply with mentions on as well', () => {
    const preferences = { ...NONE, mentions: true, replies: true };

    expect(
      shouldNotify(preferences, { ...PLAIN, isReplyToOwnMessage: true })
    ).toBe(true);
  });

  test('should let a dm follow only the dm switch', () => {
    const everythingButDms = {
      all: true,
      mentions: true,
      dms: false,
      replies: true
    };

    expect(
      shouldNotify(everythingButDms, {
        isDm: true,
        isMentioned: true,
        isReplyToOwnMessage: true
      })
    ).toBe(false);
    expect(shouldNotify({ ...NONE, dms: true }, { ...PLAIN, isDm: true })).toBe(
      true
    );
  });
});
