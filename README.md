# Cliply — YouTube Downloader

Cliply is a small local web app for downloading YouTube videos or audio. It lets you choose a video resolution, extract MP3 audio, and download only a selected timeline from a video.

> Only download content you own or have permission to use. Respect YouTube’s Terms of Service and applicable copyright laws.

## Features

- Download video in up to 4K when the source supports it
- Choose from 2160p, 1440p, 1080p, 720p, 480p, and 360p
- Download audio-only MP3 files
- Clip a video using `HH:MM:SS` start and end times
- Preview video title, uploader, duration, and thumbnail before downloading
- Run processing locally through a simple Node.js server
- Responsive browser interface for desktop and mobile

## Requirements

- Node.js 20 or newer
- `yt-dlp` installed and available in your PATH
- `ffmpeg` installed and available in your PATH

You can confirm the tools are available with:

```powershell
node --version
yt-dlp --version
ffmpeg -version
```

If `yt-dlp` or `ffmpeg` is installed somewhere else, set `YT_DLP_PATH` to the full path of the `yt-dlp` executable. `ffmpeg` must still be available to `yt-dlp` through the system PATH.

## Install and run

Install the project dependencies:

```powershell
npm install
```

Build the TypeScript server:

```powershell
npm run build
```

Start the app:

```powershell
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For a one-command local development start:

```powershell
npm run dev
```

The server port can be changed with the `PORT` environment variable:

```powershell
$env:PORT=8080
npm start
```

## How to use

1. Paste a YouTube video URL into the URL field.
2. Select `Video` or `Audio only`.
3. For video downloads, select a target resolution.
4. Enable `Clip a section` if you only want part of the video.
5. Enter both start and end times in `HH:MM:SS` format, such as `00:01:30` and `00:03:45`.
6. Select `Download`.

The browser receives the processed file as a download. Temporary server files are removed after the response is closed.

## API endpoints

### `GET /api/metadata?url=<youtube-url>`

Loads basic metadata for a YouTube video:

```json
{
  "id": "video-id",
  "title": "Example video",
  "thumbnail": "https://...",
  "duration": 245,
  "uploader": "Channel name",
  "formats": [1080, 720, 480]
}
```

### `POST /api/download`

Starts a processed download. Request body:

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "video",
  "quality": "1080",
  "start": "00:01:30",
  "end": "00:03:45"
}
```

Use `"format": "audio"` for an MP3 download. `start` and `end` are optional; provide both to clip a section.

## Project structure

```text
public/
  app.js          Browser interactions and download flow
  index.html      Application markup
  styles.css      Responsive interface styling
src/
  server.ts       Static server and yt-dlp download API
package.json      Scripts and dependencies
tsconfig.json     TypeScript configuration
```

## Troubleshooting

### `Could not start yt-dlp`

Install `yt-dlp`, then make sure it is available in the terminal PATH. Alternatively, set `YT_DLP_PATH` to its executable path.

### Video downloads fail during merging or MP3 conversion

Install `ffmpeg` and make sure `ffmpeg -version` works from the same terminal used to start the app.

### The selected resolution is unavailable

The app asks `yt-dlp` for the highest available stream at or below the selected resolution. If the source does not provide that quality, it falls back to the closest available format.

## License

This project does not grant permission to download or redistribute third-party content. Use it responsibly and only with content you are authorized to access and save.
