/**
 * forms.js — Lead Virtual shared form → Asana submission handler
 *
 * SETUP: After deploying the backend, update the BACKEND constant below
 * with your live URL (e.g. https://api.leadvirtual.com).
 * Alternatively, set window.LV_BACKEND before this script loads.
 */
(function () {
  'use strict';

  var BACKEND = ((window.LV_BACKEND || 'https://leadvirtual-website-production.up.railway.app').replace(/\/$/, ''));

  // ── Utilities ─────────────────────────────────────────────────────────────

  function fieldVal(form) {
    return function () {
      for (var i = 0; i < arguments.length; i++) {
        var el = form.querySelector(arguments[i]);
        if (el) return el.value.trim();
      }
      return '';
    };
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = 'Sending&hellip;';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.origHtml || btn.innerHTML;
      btn.disabled = false;
    }
  }

  function showError(form, btn) {
    setLoading(btn, false);
    var el = form.querySelector('.lv-form-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'lv-form-error';
      el.style.cssText = 'color:#ef4444;font-size:14px;margin-top:12px;text-align:center;';
      form.appendChild(el);
    }
    el.textContent = 'Something went wrong. Please try again or email us at info@leadvirtual.com.';
  }

  function successCard(bodyHtml) {
    return (
      '<div style="background:#fff;border:2px solid #3b82f6;border-radius:12px;' +
      'padding:36px 24px;text-align:center;max-width:460px;margin:0 auto;">' +
      '<svg style="width:52px;height:52px;color:#3b82f6;margin-bottom:16px;" viewBox="0 0 24 24"' +
      ' fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
      '<h3 style="color:#0f172a;font-size:20px;font-weight:800;margin-bottom:8px;">Message Sent!</h3>' +
      '<p style="color:#64748b;font-size:15px;line-height:1.65;">' + bodyHtml + '</p>' +
      '</div>'
    );
  }

  function post(endpoint, data) {
    return fetch(BACKEND + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // ── Page source label (appears in Asana task name) ─────────────────────
  function pageSource() {
    var p = window.location.pathname;
    if (p.indexOf('real-estate') !== -1) return 'Real Estate VA';
    if (p.indexOf('admin') !== -1)       return 'Admin & Executive VA';
    if (p.indexOf('bookkeeping') !== -1)  return 'Bookkeeping';
    if (p.indexOf('contact') !== -1)      return 'Contact Page';
    return 'Home';
  }

  // ── Field extraction ──────────────────────────────────────────────────────

  function readContactFields(form) {
    var get = fieldVal(form);
    // Support single full-name field (index/real-estate) OR split first+last (admin/bookkeeping)
    var first = get('#cf-first');
    var last  = get('#cf-last');
    var name  = first ? (first + (last ? ' ' + last : '')) : get('#name', '[name=name]');
    return {
      name:    name,
      email:   get('#email', '#cf-email', '[name=email]'),
      phone:   get('#phone', '#cf-phone', '[name=phone]'),
      company: get('#company', '[name=company]'),
      service: get('#service', '#cf-service', '[name=service]'),
      message: get('#message', '#cf-message', '[name=message]'),
    };
  }

  function readModalFields(form) {
    var get = fieldVal(form);
    return {
      name:    get('#modal-name'),
      email:   get('#modal-email'),
      phone:   get('#modal-phone'),
      company: get('#modal-company'),
      service: get('#modal-service'),
      message: get('#modal-message'),
    };
  }

  // ── Form binders ──────────────────────────────────────────────────────────

  function bindContactForm(form, source) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      setLoading(btn, true);
      var data = readContactFields(form);
      data.source = source;
      post('/api/contact', data)
        .then(function () {
          form.innerHTML = successCard(
            'Thank you' + (data.name ? ', ' + data.name.split(' ')[0] : '') + '!' +
            (data.email ? '<br>We\'ll be in touch at <strong>' + data.email + '</strong> shortly.' : '<br>We\'ll be in touch shortly.')
          );
        })
        .catch(function (err) {
          console.error('[LeadVirtual contact]', err);
          showError(form, btn);
        });
    });
  }

  function bindModalForm(form, source) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      setLoading(btn, true);
      var data = readModalFields(form);
      data.source = source;
      post('/api/contact', data)
        .then(function () {
          var body = form.closest('.modal-body') || form.parentElement;
          body.innerHTML = successCard(
            'Thank you' + (data.name ? ', ' + data.name.split(' ')[0] : '') + '!' +
            (data.email ? '<br>We\'ll follow up at <strong>' + data.email + '</strong> shortly.' : '<br>We\'ll be in touch shortly.')
          );
        })
        .catch(function (err) {
          console.error('[LeadVirtual modal]', err);
          showError(form, btn);
        });
    });
  }

  function bindScriptRequestForm(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      setLoading(btn, true);
      var email = (form.querySelector('#script-modal-email') || {}).value || '';
      post('/api/script-request', { email: email })
        .then(function () {
          var body = form.closest('.modal-body') || form.parentElement;
          body.innerHTML =
            '<div style="text-align:center;padding:32px 0;">' +
            '<svg style="width:52px;height:52px;color:#3b82f6;margin-bottom:20px;" viewBox="0 0 24 24"' +
            ' fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6' +
            ' 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81' +
            'a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85' +
            '.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
            '<h3 style="color:#ffffff;font-size:22px;font-weight:800;margin-bottom:10px;">Success!</h3>' +
            '<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">' +
            "We'll send the script to<br><strong style=\"color:#ffffff;\">" + email + '</strong><br>shortly.</p>' +
            '<button class="btn btn-primary" style="margin-top:24px;" onclick="closeScriptModal()">Done</button>' +
            '</div>';
        })
        .catch(function (err) {
          console.error('[LeadVirtual script-request]', err);
          showError(form, btn);
        });
    });
  }

  // ── Init on DOM ready ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var src = pageSource();

    // Inline contact forms (.contact-form) — present on all service pages + contact.html
    document.querySelectorAll('.contact-form').forEach(function (form) {
      bindContactForm(form, 'Contact Form - ' + src);
    });

    // Get Started modal (#getStartedModal .modal-form)
    var modalForm = document.querySelector('#getStartedModal .modal-form');
    if (modalForm) bindModalForm(modalForm, 'Get Started - ' + src);

    // Script request modal (#scriptModalForm) — real-estate-va.html only
    var scriptForm = document.getElementById('scriptModalForm');
    if (scriptForm) bindScriptRequestForm(scriptForm);
  });

  // Exposed so openScriptModal can re-bind the form after restoring it from success state
  window.LV_bindScriptForm = bindScriptRequestForm;
})();
