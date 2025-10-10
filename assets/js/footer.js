(function(){
  function setFooterText() {
    var vers = (window.APP_META && window.APP_META.version) ? window.APP_META.version : '1.0';
    var nodes = document.querySelectorAll('.app-footer');
    nodes.forEach(function(n){
      n.innerHTML = '<small>&copy; 2025 Session Wizard, version ' + vers + '. By Lucas James.</small>';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setFooterText);
  } else setFooterText();
})();
