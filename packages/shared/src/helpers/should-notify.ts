type TNotificationPreferences = {
  all: boolean;
  mentions: boolean;
  dms: boolean;
  replies: boolean;
};

type TMessageRelation = {
  isDm: boolean;
  isMentioned: boolean;
  isReplyToOwnMessage: boolean;
};

// one rule for the open tab and for push, so a phone never rings for a message the desktop
// stayed quiet about. a dm only follows its own switch; anywhere else any switch that matches
// is enough, so turning on "all" can't silence mentions and replies
const shouldNotify = (
  preferences: TNotificationPreferences,
  relation: TMessageRelation
) => {
  if (relation.isDm) return preferences.dms;

  return (
    preferences.all ||
    (preferences.mentions && relation.isMentioned) ||
    (preferences.replies && relation.isReplyToOwnMessage)
  );
};

export { shouldNotify };
export type { TNotificationPreferences };
