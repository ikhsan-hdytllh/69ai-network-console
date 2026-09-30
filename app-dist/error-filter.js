// Dipindah dari inline <script> di index.html agar CSP bisa memakai script-src 'self' [SEC-03]
(function() {
  var isSuppressed = function(msg, src, line) {
    var str = String(msg || '');
    return str.indexOf('Script error') !== -1 ||
           str.indexOf('ResizeObserver') !== -1 ||
           str.indexOf('cross-origin') !== -1 ||
           str.indexOf('scrollIntoView') !== -1 ||
           !src || line === 0;
  };
  window.addEventListener('error', function(e) {
    if (isSuppressed(e.message, e.filename, e.lineno)) {
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      return true;
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e && e.reason ? String(e.reason.message || e.reason) : '';
    if (isSuppressed(reason, '', 0)) {
      e.preventDefault();
    }
  });
  window.onerror = function(msg, src, line) {
    if (isSuppressed(msg, src, line)) {
      return true;
    }
    return false;
  };
})();
