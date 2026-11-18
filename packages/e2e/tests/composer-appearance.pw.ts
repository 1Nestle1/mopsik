import { TestId } from '@sharkord/shared';
import path from 'node:path';
import { expect, loginAs, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { messageByText, messageItems } from './helpers/messages';

test('Enter sends a GIF and draft after Shift+Enter adds a line', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await expect(messageItems(page).first()).toBeVisible();

  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);
  const content = `Composer check ${Date.now()}`;
  await editor.fill(content);
  await editor.press('Shift+Enter');
  await expect(editor.locator('br.hard-break')).toHaveCount(1);
  await expect(messageByText(page, content)).toHaveCount(0);

  await page.getByRole('button', { name: 'Add a GIF' }).click();
  await page
    .getByRole('textbox', { name: 'Search reaction GIFs' })
    .fill('hello');
  await page.getByRole('button', { name: 'Add Hello' }).click();

  const preview = editor.getByRole('img', { name: 'Hello' });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveJSProperty('naturalWidth', 208);
  await expect(editor).toBeFocused();
  await editor.press('Enter');

  const sent = messageByText(page, content);
  await expect(sent).toHaveCount(1);
  await expect(sent.getByRole('img', { name: 'Hello' })).toBeVisible();
  await expect(editor).toHaveText('');
});

test('appearance persists and System follows live color preference', async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await loginAs(page, 'testowner', 'password123');
  await page.getByTestId(TestId.USER_SETTINGS_TRIGGER).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();

  const root = page.locator('html');
  const settingsTitle = page.getByRole('heading', { name: 'User Settings' });
  const getSettingsBackground = () =>
    settingsTitle.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--background').trim()
    );
  const darkBackground = await getSettingsBackground();
  await page.getByText('Light', { exact: true }).click();
  await expect(root).toHaveClass(/\blight\b/);
  expect(await getSettingsBackground()).not.toBe(darkBackground);
  await page.reload();
  await expect(root).toHaveClass(/\blight\b/);

  await loginAs(page, 'testowner', 'password123');
  await page.getByTestId(TestId.USER_SETTINGS_TRIGGER).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByText('System', { exact: true }).click();
  await expect(root).toHaveClass(/\bdark\b/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveClass(/\blight\b/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('System', { exact: true })).toBeVisible();
  const settingsOwnViewport = await page.evaluate(() =>
    Boolean(
      document.elementFromPoint(window.innerWidth - 4, 100)?.closest('#portal')
    )
  );
  expect(settingsOwnViewport).toBe(true);
});

test('bookmarks and imports GIFs into a searchable local library', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  const trigger = page.getByRole('button', { name: 'Add a GIF' });
  const picker = page.getByRole('dialog', { name: 'Add a GIF' });
  const saved = picker.getByRole('button', { name: 'My GIFs', exact: true });
  await trigger.click();
  await picker.getByRole('button', { name: 'Save Hello to My GIFs' }).click();
  await saved.click();
  await expect(page.getByRole('button', { name: 'Add Hello' })).toBeVisible();

  const gifPath = path.resolve(
    '../../apps/client/public/reaction-gifs/celebrate.gif'
  );
  await page.getByLabel('Import GIF', { exact: true }).setInputFiles(gifPath);
  await expect(
    page.getByRole('button', { name: 'Add celebrate', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Play previews' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause previews' })
  ).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await trigger.click();
  await saved.click();
  const search = page.getByRole('textbox', { name: 'Search my GIFs' });
  await search.fill('celebr');
  await expect(page.getByRole('button', { name: 'Add Hello' })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Add celebrate', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Send', exact: true })
  ).toBeEnabled();
  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);
  const content = `Local GIF check ${Date.now()}`;
  await editor.fill(content);
  await editor.press('Enter');
  const sent = messageByText(page, content);
  await expect(sent).toBeVisible();
  await expect(
    sent.getByRole('link', { name: /celebrate\.gif/ })
  ).toBeVisible();
  await sent
    .getByRole('button', { name: 'Save celebrate.gif to My GIFs' })
    .click();
  await expect(
    page.getByText('Saved to My GIFs', { exact: true })
  ).toBeVisible();

  await trigger.click();
  await saved.click();
  await search.fill('hello');
  await page.getByRole('button', { name: 'Remove Hello from My GIFs' }).click();
  await expect(page.getByText('No GIFs found.')).toBeVisible();
});

test('saves nickname styling and applies it to chat and members', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await page.getByTestId(TestId.USER_SETTINGS_TRIGGER).click();
  const effect = page.getByLabel('Nickname effect');
  await effect.selectOption('gradient');
  await expect(page.locator('#portal [data-effect="gradient"]')).toHaveText(
    'Test Owner'
  );
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(
    0
  );
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(
    page
      .getByTestId(TestId.MEMBER_ITEM)
      .filter({ hasText: 'Test Owner' })
      .locator('[data-effect="gradient"]')
  ).toBeVisible();
  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);
  const content = `Nickname check ${Date.now()}`;
  await editor.fill(content);
  await editor.press('Enter');
  await expect(messageByText(page, content)).toBeVisible();
  await expect(
    page
      .getByText('Test Owner', { exact: true })
      .and(page.locator('[data-effect="gradient"]'))
      .first()
  ).toBeVisible();
});
