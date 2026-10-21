import webPush, { WebPushError } from 'web-push';

type TPushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type TVapidKeys = {
  publicKey: string;
  privateKey: string;
};

// the push service may write here if pushes from this server misbehave. a server has no
// address of its own to give, so it names the project it runs
const VAPID_SUBJECT = 'https://github.com/Sharkord/sharkord';

// a phone that stays off longer than this gets nothing stale when it comes back
const PUSH_TTL_SECONDS = 60 * 60;

// "gone" means the browser dropped the subscription (uninstalled, cleared, revoked), so the
// row is dead weight; anything else that fails is the push service's problem and is thrown
const sendWebPush = async (
  target: TPushTarget,
  payload: string,
  keys: TVapidKeys
): Promise<'sent' | 'gone'> => {
  try {
    await webPush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth }
      },
      payload,
      {
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: keys.publicKey,
          privateKey: keys.privateKey
        },
        TTL: PUSH_TTL_SECONDS,
        urgency: 'high'
      }
    );

    return 'sent';
  } catch (error) {
    if (
      error instanceof WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410)
    ) {
      return 'gone';
    }

    throw error;
  }
};

export { sendWebPush };
