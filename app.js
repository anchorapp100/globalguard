/* shared: theme toggle (storage-safe) + scroll reveal */
(function(){
  var root=document.documentElement, btn=document.getElementById('tt'), ic=document.getElementById('ttic');
  var saved=null; try{saved=localStorage.getItem('gg-theme');}catch(e){}
  if(saved){root.setAttribute('data-theme',saved);}
  function sync(){
    var explicit=root.getAttribute('data-theme');
    var dark = explicit ? explicit==='dark' : matchMedia('(prefers-color-scheme:dark)').matches;
    if(ic) ic.textContent = dark ? '☀' : '☾';
  }
  sync();
  if(btn){btn.addEventListener('click',function(){
    var explicit=root.getAttribute('data-theme');
    var dark = explicit ? explicit==='dark' : matchMedia('(prefers-color-scheme:dark)').matches;
    var next = dark ? 'light':'dark';
    root.setAttribute('data-theme',next);
    try{localStorage.setItem('gg-theme',next);}catch(e){}
    sync();
  });}
  try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',sync);}catch(e){}

  var rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var els=[].slice.call(document.querySelectorAll('.reveal'));
  if(rm || !('IntersectionObserver' in window)){els.forEach(function(el){el.classList.add('in');});}
  else{
    var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    els.forEach(function(el){io.observe(el);});
  }
})();
