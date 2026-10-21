import { getVapidKeys } from '../../helpers/push/vapid-keys';
import { protectedProcedure } from '../../utils/trpc';

// a browser needs the server's public key to subscribe, and only the public half ever leaves
const getPushPublicKeyRoute = protectedProcedure.query(async () => {
  const { publicKey } = await getVapidKeys();

  return { publicKey };
});

export { getPushPublicKeyRoute };
