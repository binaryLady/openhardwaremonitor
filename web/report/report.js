// Report view — the desktop report window (GUI/ReportForm.cs) as a route:
// the whole tree as plain text, regenerated per poll, with the app's own
// two actions — Save Report (download/copy) and Submit Report (post the
// report to the project's endpoint, exactly the payload the app posts).
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var toast = function (m, o) { if (window.TTMToast) TTMToast.show(m, o || {}); };
  var text = '';

  window.OHMFeed.wire({
    urlInput: $('#src-url'),
    connectBtn: $('#connect'),
    demoBtn: $('#demo'),
    onData: function (root) {
      text = window.OHMGui.report(root, new Date().toISOString());
      $('#report').textContent = text;
    },
    onStatus: function (txt, tone) {
      var st = $('#status');
      st.textContent = txt;
      st.className = 'ttm-badge' +
        (tone === 'ok' ? ' ttm-badge--live' : tone === 'bad' ? ' ttm-badge--danger' : '');
      if (txt === 'no machine') $('#report').textContent =
        '— not connected — enter your machine’s data.json URL above, or load demo data —';
    },
  });

  $('#download').addEventListener('click', function () {
    if (!text) { toast('No feed yet.', { type: 'warning' }); return; }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'open-hardware-monitor-report.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    toast('Report saved.', { type: 'success' });
  });
  $('#copy').addEventListener('click', function () {
    if (!text) { toast('No feed yet.', { type: 'warning' }); return; }
    navigator.clipboard.writeText(text).then(function () {
      toast('Report copied.', { type: 'success' });
    }, function () {
      toast('Copy failed — select the text and copy manually.', { type: 'warning' });
    });
  });

  // ── Submit Report (the application's File → Submit Report) ───────────────
  var G = window.OHMGui;
  $('#submit-endpoint').textContent = G.SUBMIT_ENDPOINT;

  function payload() {
    return G.submitPayload(text, $('#submit-comment').value, $('#submit-email').value);
  }
  function note(msg) { $('#submit-note').textContent = msg; }

  // The endpoint is http-only, so an https page cannot reach it. Say that
  // up front rather than offering a button that silently cannot work.
  var blocked = G.submitBlockedReason();
  if (blocked === 'mixed-content') {
    $('#submit-send').disabled = true;
    note('This page is served over https and the project\'s endpoint is http-only, ' +
      'so the browser blocks the submission. Copy the submission below and send it ' +
      'from the desktop application, or open this dashboard over http on the machine.');
  }

  $('#submit-send').addEventListener('click', function () {
    if (!text) { toast('No feed yet — connect the machine first.', { type: 'warning' }); return; }
    var body = G.encodeForm(payload());
    note('Sending…');
    // form-urlencoded, exactly as GUI/ReportForm.cs posts it. The endpoint
    // sends no CORS headers, so the response is opaque: we can confirm the
    // request left the browser, never that the project accepted it.
    fetch(G.SUBMIT_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    }).then(function () {
      note('Sent to ' + G.SUBMIT_ENDPOINT + '. The endpoint returns no readable ' +
        'response to a browser, so delivery cannot be confirmed here — keep a copy ' +
        'if it matters.');
      toast('Report submitted.', { type: 'success' });
      window.TTMStack && TTMStack.track('report_submit', {});
    }, function (err) {
      note('Sending the hardware report failed — ' + err.message +
        '. Copy the submission and send it from the desktop application.');
      toast('Sending the hardware report failed.', { type: 'error' });
    });
  });

  $('#submit-copy').addEventListener('click', function () {
    if (!text) { toast('No feed yet.', { type: 'warning' }); return; }
    var p = payload();
    var out = 'POST ' + G.SUBMIT_ENDPOINT + '\n' +
      'Content-Type: application/x-www-form-urlencoded\n\n' + G.encodeForm(p);
    navigator.clipboard.writeText(out).then(function () {
      toast('Submission copied.', { type: 'success' });
    }, function () {
      toast('Copy failed — select the report and copy manually.', { type: 'warning' });
    });
  });
})();
