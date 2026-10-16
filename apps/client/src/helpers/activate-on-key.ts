import type { KeyboardEvent } from 'react';

// a div with role=button is focusable but, unlike a real button, browsers do not click it on
// enter or space. rows stay divs where they host drag handles or plugin controls of their own
export const activateOnKey = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  // a control inside the row handles its own keys
  if (event.target !== event.currentTarget) return;

  event.preventDefault();
  event.currentTarget.click();
};
