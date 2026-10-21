// a push payload has to stay under about 4 kb once encrypted, and an os toast shows a few
// lines anyway
const MAX_BODY_LENGTH = 240;

// the tab and the service worker both show these, and a service worker has no translations,
// so the text is built from names and symbols instead of words
const getMessageNotificationText = ({
  authorName,
  channelName,
  isDm,
  plainText
}: {
  authorName: string;
  channelName: string | undefined;
  isDm: boolean;
  plainText: string;
}) => {
  const title =
    isDm || !channelName ? authorName : `${authorName} · #${channelName}`;
  const text = plainText.trim();

  if (!text) return { title, body: '📎' };

  const body =
    text.length > MAX_BODY_LENGTH ? `${text.slice(0, MAX_BODY_LENGTH)}…` : text;

  return { title, body };
};

export { getMessageNotificationText };
