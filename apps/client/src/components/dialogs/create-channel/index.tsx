import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChannelType,
  parseTrpcErrors,
  type TTrpcErrors
} from '@sharkord/shared';
import {
  AutoFocus,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input
} from '@sharkord/ui';
import { Hash, Mic } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TChannelTypeItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
};

const ChannelTypeItem = ({
  icon,
  title,
  description,
  isActive,
  onClick
}: TChannelTypeItemProps) => (
  <button
    type="button"
    aria-pressed={isActive}
    className={cn(
      'flex w-full items-center gap-3 rounded-xl p-3 text-left cursor-pointer text-muted-foreground transition-colors duration-150 ease-emphasized hover:bg-foreground/[0.06] hover:text-foreground',
      isActive && 'bg-primary/12 text-foreground hover:bg-primary/16'
    )}
    onClick={onClick}
  >
    {icon}
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  </button>
);

type TCreateChannelDialogProps = TDialogBaseProps & {
  categoryId: number;
  defaultChannelType?: ChannelType;
};

const CreateChannelDialog = memo(
  ({
    isOpen,
    categoryId,
    close,
    defaultChannelType = ChannelType.TEXT
  }: TCreateChannelDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [channelType, setChannelType] = useState(defaultChannelType);
    const [name, setName] = useState('New Channel');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<TTrpcErrors>({});

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.channels.add.mutate({
          type: channelType,
          name,
          categoryId
        });

        close();
      } catch (error) {
        setErrors(parseTrpcErrors(error));
      } finally {
        setLoading(false);
      }
    }, [name, categoryId, close, channelType]);

    return (
      <Dialog open={isOpen}>
        <DialogContent onInteractOutside={close} close={close}>
          <DialogHeader>
            <DialogTitle>{t('createChannelTitle')}</DialogTitle>
          </DialogHeader>

          <Group label={t('channelTypeLabel')}>
            <ChannelTypeItem
              title={t('textChannelTitle')}
              description={t('textChannelDesc')}
              icon={<Hash className="h-6 w-6" />}
              isActive={channelType === ChannelType.TEXT}
              onClick={() => setChannelType(ChannelType.TEXT)}
            />

            <ChannelTypeItem
              title={t('voiceChannelTitle')}
              description={t('voiceChannelDesc')}
              icon={<Mic className="h-6 w-6" />}
              isActive={channelType === ChannelType.VOICE}
              onClick={() => setChannelType(ChannelType.VOICE)}
            />
          </Group>

          <Group label={t('channelNameLabel')}>
            <AutoFocus>
              <Input
                placeholder={t('channelNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                name="name"
                error={errors.name}
                resetError={setErrors}
                onEnter={onSubmit}
              />
            </AutoFocus>
          </Group>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || !name || !channelType}
            >
              {t('createChannelBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateChannelDialog };
