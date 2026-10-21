// the server posts to whatever address a browser hands it, so only the browsers' own push
// services are accepted. anything else would let any user aim the server at an internal host
const PUSH_SERVICE_HOSTS = [
  // chrome, edge on android, opera, brave, samsung internet
  'fcm.googleapis.com',
  // firefox
  'updates.push.services.mozilla.com',
  // edge on windows
  'notify.windows.com',
  // safari and installed web apps on ios
  'push.apple.com'
];

const isAllowedPushEndpoint = (endpoint: string) => {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' || url.port !== '') return false;

  const host = url.hostname.toLowerCase();

  return PUSH_SERVICE_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
};

export { isAllowedPushEndpoint };
