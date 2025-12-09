import React, { useState } from 'react';

type JobStatus = 'ready' | 'processing' | 'done' | 'error';

interface ImageJob {
  id: number;
  file: File;
  previewUrl: string;
  resultUrl?: string;
  status: JobStatus;
  error?: string;
}

const TARGET_WIDTH = 4500;
const TARGET_HEIGHT = 5400;

// ---------- Utilities ----------
function getOutputName(file: File) {
  const dot = file.name.lastIndexOf(".");
  const base = dot === -1 ? file.name : file.name.slice(0, dot);
  return `${base}_4500x5400_300dpi.png`;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject("Error reading file");
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject("Error loading image");
    img.src = src;
  });
}

async function resizeToTarget(file: File): Promise<string> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  const scale = Math.max(TARGET_WIDTH / img.width, TARGET_HEIGHT / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = (TARGET_WIDTH - drawW) / 2;
  const dy = (TARGET_HEIGHT - drawH) / 2;

  ctx.drawImage(img, dx, dy, drawW, drawH);
  return canvas.toDataURL("image/png");
}

function triggerAutoDownload(file: File, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = getOutputName(file);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------- Component ----------
const App: React.FC = () => {
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processJob = async (job: ImageJob) => {
    const id = job.id;
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "processing", error: "" } : j));

    try {
      const url = await resizeToTarget(job.file);
      setJobs(prev => prev.map(j => j.id === id ? { ...j, resultUrl: url, status: "done" } : j));
      triggerAutoDownload(job.file, url);
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "error", error: err?.toString() } : j));
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const now = Date.now();
    const newJobs: ImageJob[] = [...files].map((file, i) => ({
      id: now + i,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "ready"
    }));

    setJobs(prev => [...prev, ...newJobs]);
    e.target.value = "";

    (async () => {
      setIsProcessing(true);
      for (const job of newJobs) await processJob(job);
      setIsProcessing(false);
    })();
  };

  const redoOne = async (id: number) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    await processJob(job);
  };

  const redoAll = async () => {
    setIsProcessing(true);
    for (const job of jobs) await processJob(job);
    setIsProcessing(false);
  };

  const clearAll = () => {
    jobs.forEach(j => URL.revokeObjectURL(j.previewUrl));
    setJobs([]);
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", color: "white" }}>
      <h1>LDD Quick Bulk Resizer</h1>
      <p>Drag & drop → auto-resize to <b>4500×5400 @ 300</b> → auto-download.</p>

      <label
        style={{
          display: "block",
          padding: 30,
          border: "2px dashed #666",
          borderRadius: 12,
          margin: "20px 0",
          textAlign: "center",
          cursor: "pointer"
        }}
      >
        <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        <div>Click or Drop Images Here</div>
      </label>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button disabled={jobs.length === 0 || isProcessing} onClick={redoAll}>
          {isProcessing ? "Processing…" : "Re-run All"}
        </button>
        <button disabled={jobs.length === 0} onClick={clearAll}>
          Clear All
        </button>
      </div>

      {jobs.map(job => (
        <div
          key={job.id}
          style={{
            display: "grid",
            gridTemplateColumns: "90px 1fr",
            gap: 10,
            padding: 10,
            marginBottom: 8,
            border: "1px solid #333",
            borderRadius: 8
          }}
        >
          <img
            src={job.previewUrl}
            style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }}
          />

          <div>
            <div><b>{job.file.name}</b></div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{(job.file.size / 1024 / 1024).toFixed(2)} MB</div>
            <div style={{ marginTop: 4 }}>
              {job.status === "ready" && <span>Ready</span>}
              {job.status === "processing" && <span>Processing…</span>}
              {job.status === "done" && <span>Done + Downloaded</span>}
              {job.status === "error" && <span>Error: {job.error}</span>}
            </div>

            <button
              style={{ marginTop: 6 }}
              disabled={job.status === "processing"}
              onClick={() => redoOne(job.id)}
            >
              {job.status === "done" ? "Re-do" : "Resize"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;