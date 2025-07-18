import { CheckCircle, Warning, CloudArrowUp, CloudArrowDown } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { formatDistanceToNow } from '../utils/formatTime'
import { useTranslation } from 'react-i18next'

interface SyncStatusProps {
  localStreak: number
  cloudStreak: number | null
  lastSyncTimestamp: number | null
  onSaveProgress: () => void
  onRecover: () => void
  isSyncing?: boolean
  isRecovering?: boolean
}

export function SyncStatus({
  localStreak,
  cloudStreak,
  lastSyncTimestamp,
  onSaveProgress,
  onRecover,
  isSyncing = false,
  isRecovering = false
}: SyncStatusProps) {
  const { t } = useTranslation()
  const isSynced = cloudStreak !== null && localStreak === cloudStreak
  const hasCloudData = cloudStreak !== null
  
  return (
    <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
      {isSynced ? (
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{t('account.syncStatus.synced')}</h3>
          <div className="flex items-center gap-2 text-neutral-400">
            <span>{formatDistanceToNow(lastSyncTimestamp || Date.now(), true)}</span>
            <CheckCircle size={20} weight="fill" className="text-green-500" />
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-white mb-4">{t('account.syncStatus.title')}</h3>
          <div className="flex gap-3">
          <Button
            onClick={onSaveProgress}
            disabled={isSyncing || isRecovering}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSyncing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <CloudArrowUp size={20} weight="bold" className="mr-2" />
                {t('account.syncStatus.saveProgress')}
              </>
            )}
          </Button>
          
          {hasCloudData && (
            <Button
              onClick={onRecover}
              disabled={isSyncing || isRecovering}
              variant="secondary"
              className="flex-1"
            >
              {isRecovering ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-500 border-t-neutral-300 rounded-full animate-spin mr-2" />
                  Recovering...
                </>
              ) : (
                <>
                  <CloudArrowDown size={20} weight="bold" className="mr-2" />
                  {t('account.syncStatus.recoverFromCloud')}
                </>
              )}
            </Button>
          )}
          </div>
        </>
      )}
    </div>
  )
}