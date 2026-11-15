/* Layout controls only; all satellite and map behavior stays in its existing modules. */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('controls-toggle');
  const toggleLabel = document.getElementById('controls-toggle-label');
  const sidebar = document.getElementById('workspace-controls');
  const close = document.getElementById('controls-close');
  const surface = document.getElementById('map-container');
  const mobile = window.matchMedia('(max-width: 900px)');
  const tabs = [...sidebar.querySelectorAll('[role="tab"]')];
  const basinButtons = [...document.querySelectorAll('.basin-btn')];

  function setControls(open, returnFocus = false) {
    document.body.dataset.controls = open ? 'open' : 'closed';
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? (mobile.matches ? 'Ver mapa' : 'Ocultar panel') : 'Controles';
    sidebar.inert = !open;
    surface.inert = mobile.matches && open;
    if (returnFocus) toggle.focus();
    window.dispatchEvent(new Event('resize'));
  }

  toggle.addEventListener('click', () => {
    const open = document.body.dataset.controls !== 'open';
    setControls(open);
    if (open && mobile.matches) close.focus();
  });
  close.addEventListener('click', () => setControls(false, true));
  sidebar.addEventListener('click', event => {
    if (mobile.matches && event.target.closest('[data-show-map]')) setControls(false, true);
  });
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches) {
      event.preventDefault();
      setControls(false, true);
    }
  });
  mobile.addEventListener('change', () => setControls(!mobile.matches, sidebar.contains(document.activeElement)));
  function syncBasinState() {
    for (const button of basinButtons) button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  }
  document.querySelector('.basin-navigation').addEventListener('click', event => {
    if (event.target.closest('.basin-btn')) {
      syncBasinState();
      if (mobile.matches) setControls(false);
    }
  });

  function selectTab(tab, focus = false) {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    }
    sidebar.querySelector('.panel-content').scrollTop = 0;
    if (focus) tab.focus();
  }
  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const index = tabs.indexOf(tab);
      const destinations = { ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (event.key in destinations) {
        event.preventDefault();
        selectTab(tabs[destinations[event.key]], true);
      }
    });
  }
  syncBasinState();
  setControls(!mobile.matches);

  // The existing renderer rebuilds these buttons. Only reflect its state in the UI.
  const timeline = document.getElementById('orbital-timeline-steps');
  const playButton = document.getElementById('btn-play-cycle');
  const playText = document.getElementById('play-text');
  let restoreCycleFocus = false;
  function syncTimeline() {
    const buttons = [...timeline.querySelectorAll('button')];
    const active = buttons.find(button => button.classList.contains('border-cyan-400'));
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === active));
    if (!active) return;
    if (restoreCycleFocus) active.focus({ preventScroll: true });
    restoreCycleFocus = false;
    const left = active.offsetLeft;
    if (left < timeline.scrollLeft || left + active.offsetWidth > timeline.scrollLeft + timeline.clientWidth) {
      timeline.scrollTo({ left: left - (timeline.clientWidth - active.offsetWidth) / 2, behavior: 'auto' });
    }
  }
  timeline.addEventListener('click', event => {
    if (event.target.closest('button')) restoreCycleFocus = timeline.contains(document.activeElement);
  }, true);
  new MutationObserver(syncTimeline).observe(timeline, { childList: true });
  window.addEventListener('resize', syncTimeline);
  function syncPlaybackLabel() {
    const playing = playText.textContent === 'Pausar';
    playButton.setAttribute('aria-pressed', String(playing));
    playButton.setAttribute('aria-label', playing ? 'Pausar secuencia de ciclos' : 'Reproducir secuencia de ciclos');
  }
  new MutationObserver(syncPlaybackLabel).observe(playText, { childList: true });
  syncTimeline();
  syncPlaybackLabel();
});
