/* KAÉM · Motor común de los catálogos: conexión con el servidor, sonidos, imágenes, cinta, categorías y utilidades.
   Un solo lugar para la URL del servidor y las reglas de envío del área metropolitana. */
(function(){
  'use strict';
  var KC = window.KC = {};
  KC.API_URL = "https://script.google.com/macros/s/AKfycbxmXydJ_8gBqVZZ7rx8mCPZc5u80pyMj30o52I993rxdWotODEhTwwfEo05PNKf4OiiZA/exec";
  var $ = KC.$ = function(id){ return document.getElementById(id); };
  KC.cop = function(n){ return '$' + Math.round(n||0).toLocaleString('es-CO'); };
  var esc = KC.esc = function(v){ return String(v==null?'':v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  KC.guardar = function(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  KC.leer = function(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
  KC.vibrar = function(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} };
  KC.sinTildes = function(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  KC.pausa = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  KC.CLAVE = (new URLSearchParams(location.search).get('k') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);

  /* ——— Servidor (Apps Script): reintentos con espera; el pedido lleva llave para que NUNCA se duplique ——— */
  KC.api = function(action, data, idem){
    var intento = 0, enCurso = 0;
    function una(){
      intento++;
      var ctrl = window.AbortController ? new AbortController() : null, t = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 45000);
      return fetch(KC.API_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, redirect:'follow', cache:'no-store',
        signal: ctrl ? ctrl.signal : undefined, body: JSON.stringify({ action:action, data:data, idem:idem||undefined }) })
        .then(function(r){ return r.text(); })
        .then(function(txt){ clearTimeout(t); var j; try{ j=JSON.parse(txt); }catch(e){ throw new Error('respuesta'); } return j; })
        .then(function(j){ if(j && j.enCurso && enCurso<8){ enCurso++; intento--; return KC.pausa(2500).then(una); } return j; })
        .catch(function(e){
          clearTimeout(t);
          var puede = intento < 3 && navigator.onLine !== false && (action !== 'enviarPedidoCatalogo' || !!idem);
          if(puede) return KC.pausa(900*intento + Math.floor(Math.random()*400)).then(una);
          throw e;
        });
    }
    return una();
  };

  /* ——— Avisos ——— */
  KC.aviso = function(msg, ms){ var a=$('aviso'); if(!a) return; a.textContent=msg; a.classList.add('on'); clearTimeout(a._t); a._t=setTimeout(function(){ a.classList.remove('on'); }, ms||Math.min(7000, 2400+msg.length*45)); };

  /* ——— Imágenes: tamaño justo desde la CDN de Shopify (?width=) → buena calidad y carga siempre rápida ——— */
  var esShopify = KC.esShopify = function(u){ return /^https:\/\/cdn\.shopify\.com\//.test(u||''); };
  var im = KC.im = function(u, w){ if(!u) return ''; if(!esShopify(u)) return u; return u + (u.indexOf('?')<0?'?':'&') + 'width=' + w; };
  KC.imgTag = function(u, alt, w, sizes, extra){
    return '<img src="'+esc(im(u,w))+'"'+(esShopify(u)?' srcset="'+[Math.round(w*.6),w,Math.round(w*1.5)].map(function(x){ return esc(im(u,x))+' '+x+'w'; }).join(', ')+'" sizes="'+(sizes||'50vw')+'"':'')+' data-o="'+esc(u)+'" alt="'+esc(alt)+'" decoding="async"'+(extra||'')+'>';
  };
  // Fundido al cargar; si una foto falla se prueba la original y, si tampoco, queda la marca
  document.addEventListener('load', function(e){ if(e.target.tagName==='IMG') e.target.classList.add('lista'); }, true);
  document.addEventListener('error', function(e){
    var t=e.target; if(!t || t.tagName!=='IMG') return;
    var o=t.getAttribute('data-o');
    if(o && !t.getAttribute('data-r')){ t.setAttribute('data-r','1'); t.removeAttribute('srcset'); t.src=o; return; }
    if(t.closest('.tono,.miniaturas,.it')){ t.remove(); return; }
    var box=t.closest('[data-mk]'); if(box){ var s=document.createElement('div'); s.className='vacio'; s.textContent=box.getAttribute('data-mk')||'KAÉM'; t.replaceWith(s); }
  }, true);

  /* ——— Área metropolitana de Bucaramanga (por palabra completa, igual que el servidor: "Gironella" no es Girón) ——— */
  KC.esAreaMetro = function(ciudad){
    var c=String(ciudad||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z\s\/]/g,' ');
    return /\b(BUCARAMANGA|B\s*\/?\s*MANGA|FLORIDA\s*BLANCA|GIRON|PIE\s*DE\s*CUESTA)\b/.test(c);
  };
  KC.CIUDADES = ['Bucaramanga','Floridablanca','Girón','Piedecuesta','Bogotá','Medellín','Cali','Barranquilla','Cartagena','Cúcuta','Pereira','Manizales','Ibagué','Santa Marta','Villavicencio','Pasto','Neiva','Armenia','Montería','Sincelejo','Popayán','Valledupar','Tunja','Soacha','Bello','Itagüí','Envigado','Sabaneta','Soledad','Palmira','Buenaventura','Tuluá','Dosquebradas','Riohacha','Florencia','Yopal','Quibdó','San Gil','Barrancabermeja','Socorro','Málaga','Pamplona','Ocaña','Girardot','Chía','Zipaquirá','Facatativá','Rionegro','Apartadó','Turbo','Maicao','Duitama','Sogamoso','Cartago','Ipiales','Tumaco','Leticia','San Andrés'];
  KC.datalist = function(id){ return '<datalist id="'+id+'">'+KC.CIUDADES.map(function(x){ return '<option value="'+esc(x)+'">'; }).join('')+'</datalist>'; };

  /* ——— Logo: si no carga, se muestra la marca en texto ——— */
  KC.logoRespaldo = function(img){ img.onerror=null; var s=document.createElement('span'); s.className='wm'; s.innerHTML='KAÉM <i>Beauty House</i>'; if(img.parentNode) img.parentNode.replaceChild(s,img); };

  /* ——— Sonidos suaves (se activan con el primer toque; el botón de la cabecera los silencia) ——— */
  var SON = KC.SON = (function(){
    var ctx = null, on = true, ult = 0;
    try{ on = localStorage.getItem('kaem_cat_sonido') !== '0'; }catch(e){}
    function notas(lista, vol){
      if(!on) return;
      try{
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if(ctx.state === 'suspended') ctx.resume();
        var t0 = ctx.currentTime;
        lista.forEach(function(n){
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = n[0];
          g.gain.setValueAtTime(0.0001, t0 + n[1]);
          g.gain.exponentialRampToValueAtTime(vol || 0.07, t0 + n[1] + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
          o.connect(g); g.connect(ctx.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.02);
        });
      }catch(e){}
    }
    function libre(ms){ var t = Date.now(); if(t - ult < ms) return false; ult = t; return true; }
    return {
      agregar: function(){ notas([[880,0,.07],[1320,.05,.09]]); },
      quitar:  function(){ notas([[560,0,.09]], .05); },
      tono:    function(){ notas([[1180,0,.05]], .04); },
      tic:     function(){ if(libre(70)) notas([[1500,0,.02]], .025); },
      abrir:   function(){ if(libre(160)) notas([[620,0,.05],[830,.04,.07]], .035); },
      cerrar:  function(){ if(libre(160)) notas([[760,0,.05],[540,.04,.07]], .03); },
      fav:     function(){ notas([[784,0,.06],[1175,.05,.12]], .05); },
      hito:    function(){ notas([[660,0,.1],[880,.09,.1],[1175,.18,.18]]); },
      enviado: function(){ notas([[523,0,.12],[659,.1,.12],[784,.2,.12],[1047,.3,.3]]); },
      error:   function(){ notas([[240,0,.16]], .06); },
      on: function(){ return on; },
      alternar: function(){ on = !on; try{ localStorage.setItem('kaem_cat_sonido', on?'1':'0'); }catch(e){} if(on) notas([[988,0,.08]]); return on; }
    };
  })();
  KC.pintarSonido = function(){
    var b = $('sonido'); if(!b) return;
    b.innerHTML = SON.on()
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
    b.setAttribute('aria-label', SON.on() ? 'Silenciar sonidos' : 'Activar sonidos');
  };

  /* ——— Cinta de beneficios: se arma con las reglas reales que manda el servidor ——— */
  KC.pintarCinta = function(CAT){
    var c = $('cinta'); if(!c || !CAT) return;
    var e = CAT.envio || {}, cop = KC.cop, p = [];
    if(CAT.minimo > 0) p.push('Pedido mínimo <b>'+cop(CAT.minimo)+'</b>'+(CAT.minPorRef>1?' · '+CAT.minPorRef+' un. por referencia':''));
    else p.push('<b>Sin pedido mínimo</b>');
    if(CAT.descuento && CAT.descuento.pct) p.push('<b>'+CAT.descuento.pct+'% de descuento</b>'+(CAT.descuento.minimo>0?' desde '+cop(CAT.descuento.minimo):''));
    if(e.siempreGratis) p.push('Envío gratis a todo el país');
    else {
      if(e.localGratisDesde != null) p.push('Envío gratis en Bucaramanga y AM desde <b>'+cop(e.localGratisDesde)+'</b>');
      else if(e.amGratis) p.push('Envío gratis en Bucaramanga y AM');
      p.push('A todo el país desde <b>'+cop(e.gratisDesde)+'</b>');
    }
    c.innerHTML = '✦ ' + p.join(' · ') + ' ✦';
  };

  /* ——— Barra de categorías: flechas en computador y arrastre con el mouse ——— */
  KC.flechasChips = function(){
    var w = document.querySelector('.chips-w'), c = $('chips'); if(!w || !c) return;
    var i = w.querySelector('.ch-f.i'), d = w.querySelector('.ch-f.d');
    function est(){ var max = c.scrollWidth - c.clientWidth; w.classList.toggle('mas-i', c.scrollLeft > 2); w.classList.toggle('mas-d', c.scrollLeft < max - 2); }
    if(!w._lista){
      w._lista = true;
      c.addEventListener('scroll', est, { passive:true }); window.addEventListener('resize', est);
      i.addEventListener('click', function(){ c.scrollBy({ left: -Math.max(160, c.clientWidth*0.7), behavior:'smooth' }); SON.tic(); });
      d.addEventListener('click', function(){ c.scrollBy({ left:  Math.max(160, c.clientWidth*0.7), behavior:'smooth' }); SON.tic(); });
      var x0 = 0, s0 = 0, arr = false, movio = false;
      c.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'mouse') return; arr = true; movio = false; x0 = e.clientX; s0 = c.scrollLeft; });
      window.addEventListener('pointermove', function(e){ if(!arr) return; var dx = e.clientX - x0; if(Math.abs(dx) > 4) movio = true; c.scrollLeft = s0 - dx; });
      window.addEventListener('pointerup', function(){ arr = false; });
      c.addEventListener('click', function(e){ if(movio){ e.stopPropagation(); e.preventDefault(); movio = false; } }, true);
    }
    est(); setTimeout(est, 120);
  };
})();
