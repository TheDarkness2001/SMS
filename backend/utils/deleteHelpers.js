function getDeleteOptions(req) {
  return {
    deletedBy: req.user?.email || req.user?.name || String(req.user?._id || req.user?.id || 'system'),
    user: req.user,
    confirmText: req.body?.confirmText || req.query?.confirmText,
    force: req.body?.force === true || req.query?.force === 'true'
  };
}

function getPrimaryRecycleId(entries = []) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  return list[0]?._id || null;
}

module.exports = {
  getDeleteOptions,
  getPrimaryRecycleId
};
