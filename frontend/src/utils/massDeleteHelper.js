export async function executeDelete(apiFn, baseParams = {}, options = {}) {
  const { t, skipTypeDelete = false } = options;

  const run = (extra = {}) => apiFn({ ...baseParams, ...extra });

  const initialParams = skipTypeDelete ? {} : { confirmText: 'DELETE' };

  try {
    return await run(initialParams);
  } catch (err) {
    const code = err.response?.data?.code;
    const message = err.response?.data?.message || '';

    const needsTypedConfirm =
      !skipTypeDelete &&
      (code === 'CONFIRMATION_REQUIRED' || message.includes('Type DELETE'));

    if (needsTypedConfirm) {
      const typed = window.prompt(
        t?.('recycleBin.typeDeleteConfirm') || 'More than 20 records will be affected. Type DELETE to continue.'
      );
      if (typed !== 'DELETE') throw err;

      try {
        return await run({ confirmText: 'DELETE' });
      } catch (err2) {
        if (err2.response?.data?.code === 'MASS_DELETE_BLOCKED') {
          const ok = window.confirm(
            t?.('recycleBin.forceConfirm') || 'More than 200 records would be affected. Continue anyway?'
          );
          if (!ok) throw err2;
          return await run({ confirmText: 'DELETE', force: true });
        }
        throw err2;
      }
    }

    if (code === 'MASS_DELETE_BLOCKED') {
      const ok = window.confirm(
        t?.('recycleBin.forceConfirm') || 'More than 200 records would be affected. Continue anyway?'
      );
      if (!ok) throw err;
      return await run({ confirmText: 'DELETE', force: true });
    }

    throw err;
  }
}

export function getApiErrorMessage(err, fallback = 'Request failed') {
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
}
