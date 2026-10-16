import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isMicUnavailable,
  MIC_FAILURE_COPY_KEYS,
  type MicStatus
} from '../mic-status';

type TMicFailureCopy = {
  title: string;
  detail: string;
};

// undefined while the microphone works, so callers branch on the copy itself instead of
// re-checking the status
const useMicFailureCopy = (status: MicStatus): TMicFailureCopy | undefined => {
  const { t } = useTranslation('sidebar');

  return useMemo(() => {
    if (!isMicUnavailable(status)) return undefined;

    const keys = MIC_FAILURE_COPY_KEYS[status];

    return { title: t(keys.title), detail: t(keys.detail) };
  }, [status, t]);
};

export { useMicFailureCopy };
