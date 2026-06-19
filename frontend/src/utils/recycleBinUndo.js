export function showMovedToRecycleBin(toast, recycleBinAPI, recycleBinId, message, onRestored) {
  const text = message || 'Item moved to Recycle Bin';

  if (!recycleBinId || !recycleBinAPI?.restore) {
    toast.success(text);
    return;
  }

  toast.action(text, 'Undo', async () => {
    try {
      await recycleBinAPI.restore(recycleBinId);
      toast.success('Restored from Recycle Bin');
      if (onRestored) await onRestored();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed');
    }
  }, 8000);
}
