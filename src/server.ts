import { createReadStream, existsSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { spawn } from "node:child_process";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../public");
const port = Number(process.env.PORT ?? 3000);
const ytDlp = process.env.YT_DLP_PATH ?? "yt-dlp";

type DownloadRequest = { url?: string; format?: "video" | "audio"; quality?: string; start?: string; end?: string };

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function body(req: IncomingMessage): Promise<DownloadRequest> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw) as DownloadRequest;
}

function validUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com") || url.hostname === "youtu.be";
  } catch { return false; }
}

function runYtDlp(args: string[], onStdout?: (data: Buffer) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ytDlp, args);
    let output = "";
    let error = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); onStdout?.(data); });
    child.stderr.on("data", (data: Buffer) => { error += data.toString(); });
    child.on("error", (err) => reject(new Error(`Could not start yt-dlp: ${err.message}`)));
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(error.trim() || `yt-dlp exited with code ${code}`)));
  });
}

async function metadata(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`).searchParams.get("url");
  if (!validUrl(url)) return json(res, 400, { error: "Enter a valid YouTube URL." });
  try {
    const output = await runYtDlp(["--dump-single-json", "--no-playlist", "--skip-download", url]);
    const info = JSON.parse(output) as Record<string, unknown>;
    json(res, 200, {
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      formats: [2160, 1440, 1080, 720, 480, 360].filter((height) => Number(info.height ?? 0) >= height),
    });
  } catch (error) { json(res, 422, { error: (error as Error).message }); }
}

async function download(req: IncomingMessage, res: ServerResponse) {
  const data = await body(req);
  if (!validUrl(data.url)) return json(res, 400, { error: "Enter a valid YouTube URL." });
  const isAudio = data.format === "audio";
  const quality = ["2160", "1440", "1080", "720", "480", "360"].includes(data.quality ?? "") ? data.quality : "1080";
  const timePattern = data.start && data.end ? /^\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?$/ : null;
  if ((data.start || data.end) && (!timePattern || !timePattern.test(data.start!) || !timePattern.test(data.end!))) return json(res, 400, { error: "Use HH:MM:SS for both start and end times." });

  const workspace = await mkdtemp(join(tmpdir(), "yt-downloader-"));
  const template = join(workspace, "download.%(ext)s");
  const args = ["--no-playlist", "--newline", "-o", template];
  if (isAudio) args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  else args.push("-f", `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`, "--merge-output-format", "mp4");
  if (data.start && data.end) args.push("--download-sections", `*${data.start}-${data.end}`, "--force-keyframes-at-cuts");
  args.push(data.url!);

  try {
    await runYtDlp(args);
    const files = await readdir(workspace);
    const file = files.find((entry) => entry.startsWith("download."));
    if (!file) throw new Error("The download completed without producing a file.");
    const path = join(workspace, file);
    const extension = extname(file).toLowerCase();
    const contentType = isAudio ? "audio/mpeg" : "video/mp4";
    res.writeHead(200, { "Content-Type": contentType, "Content-Disposition": `attachment; filename="youtube-${isAudio ? "audio.mp3" : `video${extension || ".mp4"}`}"` });
    createReadStream(path).pipe(res).on("close", () => void rm(workspace, { recursive: true, force: true }));
  } catch (error) { await rm(workspace, { recursive: true, force: true }); json(res, 422, { error: (error as Error).message }); }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url?.startsWith("/api/metadata")) return await metadata(req, res);
    if (req.method === "POST" && req.url === "/api/download") return await download(req, res);
    const pathname = new URL(req.url ?? "/", `http://localhost:${port}`).pathname;
    const file = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
    const filePath = join(root, file);
    if (!filePath.startsWith(root) || !existsSync(filePath)) return json(res, 404, { error: "Not found" });
    res.writeHead(200, { "Content-Type": file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "text/html" });
    createReadStream(filePath).pipe(res);
  } catch (error) { json(res, 500, { error: (error as Error).message }); }
});

server.listen(port, () => console.log(`YouTube Downloader running at http://localhost:${port}`));
