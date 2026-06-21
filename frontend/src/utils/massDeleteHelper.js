export async function executeDelete(apiFn, baseParams = {}, options = {}) {
  const { t } = options;

  const run = (extra = {}) => apiFn({ ...baseParams, ...extra });

  try {
    return await run();
  } catch (err) {
    const code = err.response?.data?.code;

    if (code === 'CONFIRMATION_REQUIRED') {
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
