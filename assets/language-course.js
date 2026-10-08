(() => {
  const tabs = [...document.querySelectorAll('.week-tabs [role="tab"]')];
  const panels = [...document.querySelectorAll('.week-panel')];
  if (tabs.length !== 12 || panels.length !== 12) return;
  const embedded = new URLSearchParams(location.search).get('embed') === '1' && window.parent !== window;
  function select(week, focus = false) {
    const index = Math.max(0, Math.min(11, Number(week) - 1));
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    document.querySelectorAll('.language-switch a').forEach(link => {
      link.hash = 'week-' + (index + 1);
      if (embedded) link.search = '?embed=1&v=applied-20261008';
    });
    if (focus) tabs[index].focus();
  }
  const hashWeek = () => Number(location.hash.match(/^#week-(\d+)$/)?.[1] || 1);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      history.replaceState(null, '', '#week-' + (index + 1));
      select(index + 1);
    });
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % 12 :
        event.key === 'ArrowLeft' ? (index + 11) % 12 :
        event.key === 'Home' ? 0 : event.key === 'End' ? 11 : null;
      if (next === null) return;
      event.preventDefault();
      history.replaceState(null, '', '#week-' + (next + 1));
      select(next + 1, true);
    });
  });
  window.addEventListener('hashchange', () => select(hashWeek()));
  select(hashWeek());
  const style = document.createElement('style');
  style.textContent = '.language-switch a{display:inline-block;padding:10px 16px;border:1px solid #c5d6df;border-radius:8px;text-decoration:none}.language-switch a[aria-current="page"]{background:#124f79;color:white}.week-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}.week-tabs button{padding:10px 14px;cursor:pointer;border:1px solid #b5cbd6;border-radius:8px;background:white;color:#153c53}.week-tabs button[aria-selected="true"]{background:#124f79;color:white}.week-panel[hidden]{display:none}@media print{.week-panel[hidden]{display:block!important}.week-tabs,.language-switch{display:none}}';
  document.head.append(style);
  if (embedded) {
    const embedStyle = document.createElement('style');
    embedStyle.textContent = '.language-course{max-width:none;padding:12px 0 24px}.language-course>.back{display:none}';
    document.head.append(embedStyle);
    const main = document.querySelector('.language-course');
    const resize = () => window.parent.postMessage({type:'language-course-height',height:Math.ceil(main.getBoundingClientRect().height)+24},location.origin);
    new ResizeObserver(resize).observe(main);
    window.addEventListener('load', resize);
    window.addEventListener('message', event => {
      if(event.source === window.parent && event.origin === location.origin && event.data?.type === 'language-course-resize') resize();
    });
    document.fonts.ready.then(resize);
    resize();
  }
})();
