const $ = (selector) => document.querySelector(selector);
let format = 'video';
let videoReady = false;
const status = (message, error = false) => { const node = $('#status'); node.textContent = message; node.className = `status${error ? ' error' : ''}`; };
const setReady = (ready) => { videoReady = ready; $('#download').disabled = !ready; };

document.querySelectorAll('.choice').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.choice').forEach((item) => item.classList.remove('active'));
  button.classList.add('active'); format = button.dataset.format;
  $('#quality-wrap').classList.toggle('hidden', format === 'audio'); $('#download-kind').textContent = format === 'audio' ? 'MP3' : 'video';
}));
$('#toggle').addEventListener('click', () => { const toggle = $('#toggle'); const on = toggle.classList.toggle('on'); toggle.setAttribute('aria-pressed', on); $('#clip-fields').classList.toggle('hidden', !on); });
$('#load').addEventListener('click', async () => {
  const url = $('#url').value.trim(); if (!url) return status('Paste a YouTube URL to continue.', true);
  status('Loading video details…'); setReady(false); $('#video-card').classList.add('hidden');
  try { const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error);
    $('#thumb').src = data.thumbnail || ''; $('#title').textContent = data.title || 'Untitled video'; $('#meta').textContent = `${data.uploader || 'YouTube'}  ·  ${data.duration ? new Date(data.duration * 1000).toISOString().slice(11, 19) : 'duration unavailable'}`; $('#video-card').classList.remove('hidden'); status('Ready to download.'); setReady(true);
  } catch (error) { status(error.message || 'Could not load that video.', true); }
});
$('#download').addEventListener('click', async () => {
  const button = $('#download'); const start = $('#start').value.trim(); const end = $('#end').value.trim(); const clipped = !$('#clip-fields').classList.contains('hidden');
  button.disabled = true; button.textContent = 'Preparing your download…'; status('Downloading and processing locally…');
  try { const response = await fetch('/api/download', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url: $('#url').value.trim(), format, quality: $('#quality').value, start: clipped ? start : undefined, end: clipped ? end : undefined }) }); if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
    const blob = await response.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = format === 'audio' ? 'youtube-audio.mp3' : 'youtube-video.mp4'; link.click(); URL.revokeObjectURL(link.href); status('Download complete.');
  } catch (error) { status(error.message || 'Download failed.', true); } finally { button.disabled = !videoReady; button.innerHTML = `<span>↓</span> Download <b id="download-kind">${format === 'audio' ? 'MP3' : 'video'}</b><small>⌘ ↵</small>`; }
});
$('#url').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('#load').click(); });
