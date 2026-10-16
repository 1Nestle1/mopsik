import { t } from '../../utils/trpc';
import { getStreamKeyInfoRoute } from './get-key-info';
import { regenerateStreamKeyRoute } from './regenerate-key';
import { revokeStreamKeyRoute } from './revoke-key';

export const streamingRouter = t.router({
  getKeyInfo: getStreamKeyInfoRoute,
  regenerateKey: regenerateStreamKeyRoute,
  revokeKey: revokeStreamKeyRoute
});
