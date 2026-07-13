/*!
 * topigsnirsvin.com.ec — form handler
 * Intercepts the site's Elementor forms and sends submissions to Web3Forms
 * (works on static hosting like GitHub Pages — no backend needed). Keeps the
 * forms visually identical; only the submit behaviour changes.
 *
 * The recipient inbox is set on your Web3Forms dashboard (web3forms.com),
 * tied to the access key below. The access key is public by design — it is
 * meant to live in client-side code, so it is safe here.
 */
(function () {
  'use strict';

  var WEB3FORMS_KEY = '71f93455-aad8-4b4c-86e8-37e7b4fdfda1';
  var API = 'https://api.web3forms.com/submit';

  // Friendly labels for the Elementor field keys (nicer emails).
  var LABELS = {
    your_first_name: 'Nombre',
    your_last_name: 'Apellidos',
    your_email: 'Email',
    your_country: 'País',
    your_question: 'Pregunta'
  };

  var SUCCESS_TEXT = '¡Gracias! Tu mensaje se ha enviado correctamente.';
  var ERROR_TEXT = 'No se pudo enviar el mensaje. Revisa los datos e inténtalo de nuevo.';
  var REQUIRED_TEXT = 'Por favor, completa todos los campos obligatorios.';
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function collectFields(form) {
    var fields = {};
    var nodes = form.querySelectorAll('[name^="form_fields["]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var m = /^form_fields\[(.+)\]$/.exec(el.name);
      if (!m) continue;
      var key = m[1];
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) fields[key] = el.value;
      } else if (el.tagName === 'SELECT' && el.multiple) {
        var vals = [];
        for (var j = 0; j < el.options.length; j++) {
          if (el.options[j].selected) vals.push(el.options[j].value);
        }
        fields[key] = vals.join(', ');
      } else {
        fields[key] = el.value;
      }
    }
    return fields;
  }

  function findRequiredEmpty(form) {
    var groups = form.querySelectorAll('.elementor-field-required');
    for (var i = 0; i < groups.length; i++) {
      var input = groups[i].querySelector('input, textarea, select');
      // Skip captcha fields — we don't use them.
      if (!input || /frcaptcha/.test(input.name || '')) continue;
      if (!String(input.value || '').trim()) return input;
    }
    return null;
  }

  function clearMessages(form) {
    var old = form.querySelectorAll('.tn-form-message');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
  }

  function showMessage(form, ok, text) {
    clearMessages(form);
    var div = document.createElement('div');
    div.className =
      'tn-form-message elementor-message ' +
      (ok ? 'elementor-message-success' : 'elementor-message-danger');
    div.setAttribute('role', ok ? 'status' : 'alert');
    div.textContent = text;
    form.appendChild(div);
  }

  function setSubmitting(form, on) {
    var btn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!btn) return;
    if (on) {
      btn.dataset.tnOrig = btn.dataset.tnOrig || btn.innerHTML || btn.value || '';
      btn.disabled = true;
      form.classList.add('tn-submitting');
    } else {
      btn.disabled = false;
      form.classList.remove('tn-submitting');
    }
  }

  function handle(form, e) {
    e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    var missing = findRequiredEmpty(form);
    if (missing) {
      showMessage(form, false, REQUIRED_TEXT);
      try { missing.focus(); } catch (_) {}
      return;
    }

    var fields = collectFields(form);
    var email = fields.your_email || fields.email || '';
    if (!EMAIL_RE.test(String(email))) {
      showMessage(form, false, 'Introduce un correo electrónico válido.');
      return;
    }

    // Honeypot: real users can't fill this hidden field. Silently accept bots.
    var hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) { form.reset(); showMessage(form, true, SUCCESS_TEXT); return; }

    var formName =
      form.getAttribute('name') || form.getAttribute('aria-label') || form.id || 'Formulario';

    // Web3Forms payload: access key + subject + the fields (friendly labels).
    var payload = {
      access_key: WEB3FORMS_KEY,
      subject: '[topigsnirsvin.com.ec] ' + formName,
      from_name: 'Topigs Norsvin Ecuador',
      botcheck: false,
      'Formulario': formName,
      'Página': location.href
    };
    // Web3Forms uses `email`/`name` for the reply-to and sender display.
    if (fields.your_email) payload.email = fields.your_email;
    var fullName = (fields.your_first_name || '') + ' ' + (fields.your_last_name || '');
    if (fullName.trim()) payload.name = fullName.trim();
    for (var k in fields) {
      if (fields[k]) payload[LABELS[k] || k] = fields[k];
    }

    setSubmitting(form, true);
    clearMessages(form);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; });
      })
      .then(function (data) {
        if (data && String(data.success) === 'true') {
          form.reset();
          showMessage(form, true, SUCCESS_TEXT);
        } else {
          showMessage(form, false, (data && data.message) || ERROR_TEXT);
        }
      })
      .catch(function () {
        showMessage(form, false, ERROR_TEXT);
      })
      .finally(function () {
        setSubmitting(form, false);
      });
  }

  function addHoneypot(form) {
    if (form.querySelector('input[name="website"]')) return;
    var hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'website';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.className = 'tn-hp';
    form.appendChild(hp);
  }

  function wire(form) {
    if (form.dataset.tnWired) return;
    form.dataset.tnWired = '1';
    addHoneypot(form);
    // Capture phase so we run before Elementor's own submit handler.
    form.addEventListener('submit', function (e) { handle(form, e); }, true);
    form.setAttribute('action', 'javascript:void(0)');
  }

  // --- Slideshow hero fix -------------------------------------------------
  // The Element Pack "slideshow" widget positions its cover <img> via runtime
  // JS that doesn't fully reproduce in a static mirror (the image ends up not
  // painting, leaving a grey overlay). Promote each slide's cover image to a
  // real CSS background so the hero shows reliably. Idempotent.
  function bgUrl(el, src) {
    el.style.backgroundImage = 'url("' + src.replace(/"/g, '\\"') + '")';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  }

  function slideImg(item) {
    var img = item.querySelector('img.bdt-cover, img[data-bdt-cover], img');
    return img && (img.getAttribute('src') || '').trim();
  }

  function fixSlideshowBackgrounds() {
    var containers = document.querySelectorAll('.bdt-slideshow-items');
    for (var c = 0; c < containers.length; c++) {
      var ul = containers[c];
      var items = ul.querySelectorAll('.bdt-slideshow-item');
      // Find the first usable image in this slideshow (some slides get their
      // image from the section parallax gallery, which has no <img> in a static
      // mirror — those must fall back to a real image or their grey overlay
      // composites against white and shows as flat grey).
      var firstSrc = null;
      for (var i = 0; i < items.length; i++) {
        var s = slideImg(items[i]);
        if (s) { firstSrc = s; break; }
      }
      if (!firstSrc) continue;
      // Every slide gets a background (its own image, or the fallback) so the
      // overlay always darkens a photo instead of turning grey.
      for (var j = 0; j < items.length; j++) {
        bgUrl(items[j], slideImg(items[j]) || firstSrc);
      }
      // Also paint the always-visible container, so the hero shows even if the
      // slideshow JS never activates any slide.
      if (!ul.dataset.tnBg) {
        bgUrl(ul, firstSrc);
        ul.dataset.tnBg = '1';
      }
    }
  }

  // --- Navigation fixes ---------------------------------------------------
  // The static mirror can't run Elementor's popup / mobile-menu JS, so wire the
  // essentials ourselves: the "Elija su país" popup, the mobile hamburger menu,
  // and tap-to-open submenus.
  function popupIdFromHref(href) {
    var m = /settings(?:%3D|=)([^&"']+)/.exec(href || '');
    if (!m) return null;
    try { return JSON.parse(atob(decodeURIComponent(m[1]))).id; } catch (_) { return null; }
  }
  function findPopupModal(id) {
    var inner = id && document.querySelector('[data-elementor-id="' + id + '"]');
    if (inner) return inner.closest('.elementor-popup-modal') || inner;
    return document.querySelector('.elementor-popup-modal');
  }
  function openPopup(m) {
    if (!m) return;
    m.classList.add('tn-popup-open');
    document.documentElement.classList.add('tn-noscroll');
  }
  function closePopup(m) {
    if (!m) return;
    m.classList.remove('tn-popup-open');
    document.documentElement.classList.remove('tn-noscroll');
  }

  function initNav() {
    if (document.documentElement.dataset.tnNav) return;
    document.documentElement.dataset.tnNav = '1';

    // "Elija su país" removed per request — hide its trigger(s).
    var paisTriggers = document.querySelectorAll('a[href*="popup%3Aopen"], a[href*="popup:open"]');
    for (var p = 0; p < paisTriggers.length; p++) {
      var pa = paisTriggers[p];
      if (/elija su pa[ií]s/i.test(pa.textContent || '') || popupIdFromHref(pa.getAttribute('href')) === '119185') {
        var w = pa.closest('.elementor-widget-button, .elementor-widget') || pa;
        w.style.display = 'none';
      }
    }

    // A) Popups ("Elija su país", etc.) — delegated on document (capture).
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      var open = t.closest('a[href*="popup%3Aopen"], a[href*="popup:open"]');
      if (open) { e.preventDefault(); openPopup(findPopupModal(popupIdFromHref(open.getAttribute('href')))); return; }
      var close = t.closest('a[href*="popup%3Aclose"], a[href*="popup:close"], .tn-popup-open .dialog-close-button, .tn-popup-open .dialog-lightbox-close-button, .tn-popup-open .eael-modal-close');
      if (close) { e.preventDefault(); closePopup(close.closest('.elementor-popup-modal') || document.querySelector('.tn-popup-open')); return; }
      if (t.classList && t.classList.contains('tn-popup-open')) { closePopup(t); }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var m = document.querySelector('.tn-popup-open'); if (m) closePopup(m); }
    });

    // B) Mobile hamburger toggles.
    var toggles = document.querySelectorAll('.elementor-menu-toggle');
    for (var i = 0; i < toggles.length; i++) {
      (function (tg) {
        tg.addEventListener('click', function (e) {
          e.preventDefault();
          var box = tg.closest('.elementor-widget-container') || document;
          // The mobile menu is the <nav> dropdown, NOT the .sub-menu <ul>s.
          var dd = box.querySelector('nav.elementor-nav-menu--dropdown, .elementor-nav-menu--dropdown:not(.sub-menu)');
          var on = tg.classList.toggle('elementor-active');
          tg.setAttribute('aria-expanded', on ? 'true' : 'false');
          if (dd) {
            if (on) dd.style.setProperty('--tn-menu-top', Math.max(0, tg.getBoundingClientRect().bottom) + 'px');
            dd.classList.toggle('tn-menu-open', on);
          }
        });
      })(toggles[i]);
    }

    // C) Tap-to-open submenus inside the mobile dropdown.
    var subs = document.querySelectorAll('.elementor-nav-menu--dropdown .menu-item-has-children > a');
    for (var j = 0; j < subs.length; j++) {
      (function (a) {
        a.addEventListener('click', function (e) {
          var li = a.closest('li');
          if (li && li.querySelector('.sub-menu, ul')) { e.preventDefault(); li.classList.toggle('tn-sub-open'); }
        });
      })(subs[j]);
    }
  }

  function init() {
    var forms = document.querySelectorAll('form.elementor-form');
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
    fixSlideshowBackgrounds();
    // Retry: Element Pack may build/replace slides after our first pass.
    [300, 1000, 2500].forEach(function (t) { setTimeout(fixSlideshowBackgrounds, t); });
    initNav();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
