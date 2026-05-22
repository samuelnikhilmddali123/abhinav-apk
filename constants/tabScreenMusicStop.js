/** When the user switches tabs, every registered stop fn runs (Home / Rates screen music). */
const stopFns = new Set();

export function registerTabScreenMusicStop(stopFn) {
  stopFns.add(stopFn);
  return () => {
    stopFns.delete(stopFn);
  };
}

export function stopAllScreenMusicOnTabChange() {
  stopFns.forEach((fn) => {
    try {
      const r = fn();
      if (r && typeof r.then === 'function') void r;
    } catch {
      /* ignore */
    }
  });
}
