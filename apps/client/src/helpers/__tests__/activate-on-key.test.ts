import { describe, expect, mock, test } from 'bun:test';
import type { KeyboardEvent } from 'react';
import { activateOnKey } from '../activate-on-key';

const createKeyEvent = (key: string, fromChild = false) => {
  const click = mock(() => {});
  const preventDefault = mock(() => {});
  const row = { click };
  const event = {
    key,
    currentTarget: row,
    target: fromChild ? {} : row,
    preventDefault
  } as unknown as KeyboardEvent<HTMLElement>;

  return { event, click, preventDefault };
};

describe('activateOnKey', () => {
  test('should click the row on enter', () => {
    const { event, click, preventDefault } = createKeyEvent('Enter');

    activateOnKey(event);

    expect(click).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  test('should click the row on space without scrolling the page', () => {
    const { event, click, preventDefault } = createKeyEvent(' ');

    activateOnKey(event);

    expect(click).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  test('should ignore other keys', () => {
    const { event, click, preventDefault } = createKeyEvent('ArrowDown');

    activateOnKey(event);

    expect(click).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  test('should leave keys pressed on a control inside the row alone', () => {
    const { event, click, preventDefault } = createKeyEvent('Enter', true);

    activateOnKey(event);

    expect(click).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
