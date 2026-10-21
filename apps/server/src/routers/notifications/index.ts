import { t } from '../../utils/trpc';
import { getPushPublicKeyRoute } from './get-push-public-key';
import { subscribePushRoute } from './subscribe-push';
import { unsubscribePushRoute } from './unsubscribe-push';

const notificationsRouter = t.router({
  getPushPublicKey: getPushPublicKeyRoute,
  subscribePush: subscribePushRoute,
  unsubscribePush: unsubscribePushRoute
});

export { notificationsRouter };
