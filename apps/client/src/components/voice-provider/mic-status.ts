// the call itself can be healthy while the microphone is not, and the two used to share one
// green "connected" chip. this keeps what happened to the microphone apart from the call
export enum MicStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  NOT_FOUND = 'not-found',
  BUSY = 'busy',
  LOST = 'lost',
  INSECURE = 'insecure',
  FAILED = 'failed'
}

export type TMicFailureStatus = Exclude<
  MicStatus,
  MicStatus.IDLE | MicStatus.ACTIVE
>;

// attempt counts every start that finished, so a retry that fails the same way as before is
// still a new event the ui can tell the user about
export type TMicState = {
  status: MicStatus;
  attempt: number;
};

export const INITIAL_MIC_STATE: TMicState = {
  status: MicStatus.IDLE,
  attempt: 0
};

// getUserMedia reports failures as DOMException names. the legacy chrome names are still
// thrown by some embedded webviews, so they map the same way
const FAILURE_BY_ERROR_NAME: Record<string, TMicFailureStatus> = {
  NotAllowedError: MicStatus.BLOCKED,
  PermissionDeniedError: MicStatus.BLOCKED,
  SecurityError: MicStatus.BLOCKED,
  NotFoundError: MicStatus.NOT_FOUND,
  DevicesNotFoundError: MicStatus.NOT_FOUND,
  OverconstrainedError: MicStatus.NOT_FOUND,
  ConstraintNotSatisfiedError: MicStatus.NOT_FOUND,
  NotReadableError: MicStatus.BUSY,
  TrackStartError: MicStatus.BUSY,
  AbortError: MicStatus.BUSY
};

export const getMicFailureStatus = (error: unknown): TMicFailureStatus => {
  if (error instanceof Error || error instanceof DOMException) {
    return FAILURE_BY_ERROR_NAME[error.name] ?? MicStatus.FAILED;
  }

  return MicStatus.FAILED;
};

// browsers only expose getUserMedia on https and localhost. asking for permission there
// cannot help, so it gets its own explanation instead of "blocked"
export const isMicrophoneApiAvailable = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export const isMicUnavailable = (
  status: MicStatus
): status is TMicFailureStatus =>
  status !== MicStatus.IDLE && status !== MicStatus.ACTIVE;

export const MIC_FAILURE_COPY_KEYS = {
  [MicStatus.BLOCKED]: { title: 'micBlocked', detail: 'micBlockedDetail' },
  [MicStatus.NOT_FOUND]: { title: 'micNotFound', detail: 'micNotFoundDetail' },
  [MicStatus.BUSY]: { title: 'micBusy', detail: 'micBusyDetail' },
  [MicStatus.LOST]: { title: 'micLost', detail: 'micLostDetail' },
  [MicStatus.INSECURE]: { title: 'micInsecure', detail: 'micInsecureDetail' },
  [MicStatus.FAILED]: { title: 'micFailed', detail: 'micFailedDetail' }
} as const satisfies Record<
  TMicFailureStatus,
  { title: string; detail: string }
>;
