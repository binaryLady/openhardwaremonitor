// Report view — the desktop Save Report window (GUI/ReportForm.cs) as a
// route: the whole tree as plain text, regenerated per poll, download/copy.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var toast = function (m, o) { if (window.TTMToast) TTMToast.show(m, o || {}); };
  var text = '';

  window.OHMFeed.start(function (root) {
    text = window.OHMGui.report(root, new Date().toISOString());
    $('#report').textContent = text;
  }, function (txt, tone) {
    var st = $('#status');
    st.textContent = txt;
    st.className = 'ttm-badge' +
      (tone === 'ok' ? ' ttm-badge--live' : tone === 'bad' ? ' ttm-badge--danger' : '');
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
})();
