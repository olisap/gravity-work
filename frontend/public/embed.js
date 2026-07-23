(function() {
  // Find the script tag that loaded this script
  const scripts = document.getElementsByTagName('script');
  let currentScript = null;
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src.includes('embed.js')) {
      currentScript = scripts[i];
      break;
    }
  }
  if (!currentScript) return;

  const formKey = currentScript.getAttribute('data-form-key');
  if (!formKey) return;

  // Create container div
  const container = document.createElement('div');
  container.className = 'olinwa-form-container';
  container.style.width = '100%';
  container.style.overflow = 'hidden';

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `https://olinwa.vercel.app/checkout?form=${formKey}`;
  iframe.style.width = '100%';
  iframe.style.height = '700px'; // Initial fallback height
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.scrolling = 'no';
  iframe.setAttribute('frameborder', '0');

  container.appendChild(iframe);
  currentScript.parentNode.insertBefore(container, currentScript);

  // Listen for messages from iframe to resize
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'resize-iframe') {
      iframe.style.height = event.data.height + 'px';
    }
  });
})();
