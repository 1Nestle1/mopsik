import { ChannelPermission, Permission } from '@sharkord/shared';
import http from 'http';
import { config } from '../config';
import { channelUserCan } from '../db/queries/channels';
import { isDirectMessageChannel } from '../db/queries/dms';
import { userCan } from '../db/queries/roles';
import { getStreamKeyOwner } from '../db/queries/stream-keys';
import type { getWsInfo } from '../helpers/get-ws-info';
import { hashStreamKey } from '../helpers/stream-keys';
import { WhipOfferError } from '../helpers/whip/sdp';
import { startWhipSession } from '../helpers/whip/start-whip-session';
import { VoiceRuntime } from '../runtimes/voice';
import { endWhipSession, getWhipSession } from '../runtimes/whip';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import { enforceHttpRateLimit, getTextBody } from './helpers';

// whip, rfc 9725: an app like obs posts an sdp offer with its stream key as a bearer token,
// gets an sdp answer and the stream's url back, and deletes that url when it stops

type TWhipRouteContext = {
  info: ReturnType<typeof getWsInfo>;
  pathname: string;
};

// an offer is a few kilobytes even with every codec a browser knows
const WHIP_MAX_OFFER_BYTES = 64 * 1024;

const whipRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.whip.maxRequests,
  windowMs: config.rateLimiters.whip.windowMs
});

// streaming apps show the body of a refusal to the person, so it is plain readable text
const sendText = (
  res: http.ServerResponse,
  status: number,
  message: string,
  headers: http.OutgoingHttpHeaders = {}
) => {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers
  });
  res.end(message);
};

const getStreamKeyUser = async (req: http.IncomingMessage) => {
  const authorization = req.headers.authorization;

  if (!authorization?.toLowerCase().startsWith('bearer ')) return undefined;

  const key = authorization.slice(7).trim();

  if (!key) return undefined;

  const user = await getStreamKeyOwner(hashStreamKey(key));

  if (!user || user.banned) return undefined;

  return user;
};

const isWithinRateLimit = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: TWhipRouteContext
) => {
  const allowed = enforceHttpRateLimit(res, whipRateLimiter, ctx.info?.ip, {
    route: '/whip',
    message: 'Too many stream attempts. Please try again shortly.'
  });

  if (!allowed) req.resume();

  return allowed;
};

const getSessionId = (pathname: string) => pathname.split('/')[2] ?? '';

// shown on the stream card as "via ...", so viewers can tell an obs stream from our own app's
const getStreamSource = (userAgent: string) => {
  if (/MOPSCORD-Stream/i.test(userAgent)) return 'MOPSCORD Stream';
  if (/obs/i.test(userAgent)) return 'OBS';

  return 'WHIP';
};

// pre-auth on purpose: the stream key in the header is the only credential an app like obs
// can carry, so the ip based limit runs first to keep key guessing slow
const whipPostRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: TWhipRouteContext
) => {
  if (!isWithinRateLimit(req, res, ctx)) return;

  const contentType = req.headers['content-type'] ?? '';

  if (!contentType.toLowerCase().startsWith('application/sdp')) {
    req.resume();

    return sendText(res, 415, 'Send the offer as application/sdp.');
  }

  const user = await getStreamKeyUser(req);

  if (!user) {
    req.resume();

    return sendText(res, 401, 'The stream key is not valid.', {
      'WWW-Authenticate': 'Bearer'
    });
  }

  const offerSdp = await getTextBody(req, WHIP_MAX_OFFER_BYTES);

  if (!(await userCan(user.id, Permission.SHARE_SCREEN))) {
    return sendText(
      res,
      403,
      'You are not allowed to share your screen on this server.'
    );
  }

  const runtime = VoiceRuntime.findRuntimeByUserId(user.id);

  if (!runtime) {
    return sendText(
      res,
      409,
      'Join a voice channel in Sharkord first, then start streaming.'
    );
  }

  if (await isDirectMessageChannel(runtime.id)) {
    return sendText(
      res,
      409,
      'Streaming into a direct message call is not supported.'
    );
  }

  const canShareHere = await channelUserCan(
    runtime.id,
    user.id,
    ChannelPermission.SHARE_SCREEN
  );

  if (!canShareHere) {
    return sendText(
      res,
      403,
      'You are not allowed to share your screen in this channel.'
    );
  }

  const source = getStreamSource(req.headers['user-agent'] ?? '');

  try {
    const { sessionId, answerSdp } = await startWhipSession({
      userId: user.id,
      title: user.name,
      source,
      runtime,
      offerSdp
    });

    res.writeHead(201, {
      'Content-Type': 'application/sdp',
      Location: `/whip/${sessionId}`
    });
    res.end(answerSdp);
  } catch (error) {
    if (error instanceof WhipOfferError) {
      return sendText(res, 400, error.message);
    }

    throw error;
  }
};

const whipDeleteRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: TWhipRouteContext
) => {
  if (!isWithinRateLimit(req, res, ctx)) return;

  const user = await getStreamKeyUser(req);

  if (!user) {
    return sendText(res, 401, 'The stream key is not valid.', {
      'WWW-Authenticate': 'Bearer'
    });
  }

  const session = getWhipSession(getSessionId(ctx.pathname));

  // someone else's stream answers the same as no stream, so ids can't be probed
  if (!session || session.userId !== user.id) {
    return sendText(res, 404, 'The stream is not running.');
  }

  endWhipSession(session.id);

  res.writeHead(200);
  res.end();
};

// trickle ice and ice restarts go through PATCH; this endpoint takes the whole offer at once,
// and rfc 9725 has servers without them answer 405
const whipPatchRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  req.resume();

  sendText(res, 405, 'Updating a running stream is not supported.', {
    Allow: 'POST, DELETE'
  });
};

export { whipDeleteRouteHandler, whipPatchRouteHandler, whipPostRouteHandler };
