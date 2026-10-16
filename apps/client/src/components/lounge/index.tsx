import { Dialog } from '@/components/dialogs/dialogs';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { UserAvatar } from '@/components/user-avatar';
import { openDialog } from '@/features/dialogs/actions';
import {
  useInfo,
  useLoungeVoiceChannels,
  useServerName,
  useUnreadTextChannels
} from '@/features/server/hooks';
import {
  useOnlineUsers,
  useOwnPublicUser
} from '@/features/server/users/hooks';
import { getGreetingKey } from '@/helpers/get-greeting-key';
import { PluginSlot } from '@sharkord/shared';
import { ArrowLeft, ArrowRight, CheckCheck, Search } from 'lucide-react';
import { memo, useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IdleRoomChip } from './idle-room-chip';
import { UnreadChannelRow } from './unread-channel-row';
import { VoiceRoomCard } from './voice-room-card';

const MAX_ONLINE_SHOWN = 12;

// what opens after login and whenever no channel is selected: who is around, where they are
// talking, and what is waiting to be read, instead of an empty panel
const Lounge = memo(() => {
  const { t } = useTranslation('common');
  const ownUser = useOwnPublicUser();
  const serverName = useServerName();
  const info = useInfo();
  const { active, idle } = useLoungeVoiceChannels();
  const unreadChannels = useUnreadTextChannels();
  const onlineUsers = useOnlineUsers();
  const voiceTitleId = useId();
  const unreadTitleId = useId();
  const onlineTitleId = useId();

  const greetingKey = useMemo(() => getGreetingKey(new Date().getHours()), []);
  const shownOnlineUsers = useMemo(
    () => onlineUsers.slice(0, MAX_ONLINE_SHOWN),
    [onlineUsers]
  );
  const hiddenOnlineCount = onlineUsers.length - shownOnlineUsers.length;

  const handleOpenSearch = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 md:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">
            {t(greetingKey, { name: ownUser?.name ?? '' })}
          </h1>
          <p className="text-muted-foreground">
            {info?.description || t('loungeSubtitle', { server: serverName })}
          </p>
        </header>

        <button
          type="button"
          onClick={handleOpenSearch}
          className="flex h-12 w-full items-center gap-3 rounded-full bg-card px-5 text-left text-sm text-muted-foreground transition-colors duration-150 ease-emphasized hover:bg-secondary hover:text-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">{t('loungeSearch')}</span>
          <kbd className="hidden rounded-full bg-foreground/[0.07] px-2 py-0.5 font-mono text-[11px] md:inline">
            Ctrl+K
          </kbd>
        </button>

        <section aria-labelledby={voiceTitleId} className="flex flex-col gap-3">
          <h2
            id={voiceTitleId}
            className="text-sm font-semibold text-foreground"
          >
            {t('loungeInVoice')}
          </h2>

          {active.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((channel) => (
                <VoiceRoomCard key={channel.id} channel={channel} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t('loungeNobodyInVoice')}
              </p>
              {idle.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {idle.map((channel) => (
                    <IdleRoomChip key={channel.id} channel={channel} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section
          aria-labelledby={unreadTitleId}
          className="flex flex-col gap-3"
        >
          <h2
            id={unreadTitleId}
            className="text-sm font-semibold text-foreground"
          >
            {t('loungeCatchUp')}
          </h2>

          {unreadChannels.length > 0 ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl bg-card">
              {unreadChannels.map((channel) => (
                <UnreadChannelRow key={channel.id} channel={channel} />
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-card p-4 text-sm text-muted-foreground">
              <CheckCheck className="size-4 shrink-0" />
              {t('loungeAllCaughtUp')}
            </p>
          )}
        </section>

        <section
          aria-labelledby={onlineTitleId}
          className="flex flex-col gap-3"
        >
          <h2
            id={onlineTitleId}
            className="text-sm font-semibold text-foreground"
          >
            {t('loungeOnline')}
            <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
              {onlineUsers.length}
            </span>
          </h2>

          <div className="flex flex-wrap gap-2">
            {shownOnlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3"
              >
                <UserAvatar
                  userId={user.id}
                  className="size-7"
                  showUserPopover
                  showStatusBadge={false}
                />
                <span className="max-w-40 truncate text-sm text-foreground">
                  {user.name}
                </span>
              </div>
            ))}
            {hiddenOnlineCount > 0 && (
              <span className="flex h-9 items-center rounded-full bg-card px-3 text-sm tabular-nums text-muted-foreground">
                +{hiddenOnlineCount}
              </span>
            )}
          </div>
        </section>

        <PluginSlotRenderer slotId={PluginSlot.HOME_SCREEN} />

        <div className="flex flex-col gap-2 text-sm text-muted-foreground md:hidden">
          <p>{t('mobileNotOptimized')}</p>
          <p className="flex items-center gap-2">
            <ArrowRight className="size-4 shrink-0" />
            {t('swipeRightForChannels')}
          </p>
          <p className="flex items-center gap-2">
            <ArrowLeft className="size-4 shrink-0" />
            {t('swipeLeftForUsers')}
          </p>
        </div>
      </div>
    </div>
  );
});

export { Lounge };
