// Prefetch the root index.html when user hovers or touches any .back-btn
(function() {
  if (typeof document === 'undefined') return;
  const prefetched = new Set();
  function addPrefetch(url) {
    if (!url || prefetched.has(url)) return;
    prefetched.add(url);
    try {
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = url;
      l.as = 'document';
      document.head.appendChild(l);
    } catch (e) {
      // noop
    }
  }

  function attach(el) {
    if (!el) return;
    const onIntent = () => {
      // Prefetch both root slash and explicit index.html to cover different server setups
      addPrefetch('/');
      addPrefetch('/index.html');
    };
    el.addEventListener('mouseenter', onIntent, {passive:true});
    el.addEventListener('touchstart', onIntent, {passive:true});
    // Keyboard users: prefetch on focus
    el.addEventListener('focus', onIntent, {passive:true});
  }

  document.addEventListener('DOMContentLoaded', () => {
    const backBtns = document.querySelectorAll('.back-btn');
    backBtns.forEach(attach);
  });
})();
