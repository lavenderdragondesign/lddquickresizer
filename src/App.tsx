
import React, { useState } from 'react';

const TARGET_WIDTH = 4500;
const TARGET_HEIGHT = 5400;

// Encode PNG with 300 DPI metadata (pHYs chunk)
function encodePNGWithDPI(dataURL: string) {
  // Convert base64 → binary
  const bin = atob(dataURL.split(',')[1]);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

  // Insert pHYs chunk for 300 DPI (11811 pixels per meter)
  const pHYs = new Uint8Array([
    0x00,0x00,0x2E,0xC3,  // 11811 X
    0x00,0x00,0x2E,0xC3,  // 11811 Y
    0x01                   // unit = meter
  ]);

  // PNG structure: signature + IHDR + ... We patch after IHDR
  // Find IHDR end
  function findIHDRend(bytes){
    for (let i=0;i<bytes.length-4;i++){
      if (bytes[i]==0x49 && bytes[i+1]==0x48 && bytes[i+2]==0x44 && bytes[i+3]==0x52){
        // IHDR chunk length = next 4 bytes
        const len = (bytes[i-4]<<24)|(bytes[i-3]<<16)|(bytes[i-2]<<8)|bytes[i-1];
        return i+4+len+4; // type+data+CRC
      }
    }
    return -1;
  }

  const ihdrEnd = findIHDRend(buf);
  if (ihdrEnd < 0) return dataURL;

  // Build pHYs chunk
  function crc32(arr){
    let c = ~0;
    for (let n=0; n<arr.length; n++){
      c ^= arr[n];
      for (let k=0; k<8; k++){
        c = (c & 1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1);
      }
    }
    return ~c >>> 0;
  }

  const type = new TextEncoder().encode("pHYs");
  const chunkData = pHYs;
  const length = new Uint8Array([
    0,0,0, chunkData.length
  ]);

  const crcInput = new Uint8Array([...type, ...chunkData]);
  const crc = new Uint8Array([
    (crcInput.length>>24)&255,
    (crcInput.length>>16)&255,
    (crcInput.length>>8)&255,
    crcInput.length&255
  ]);

  const crcVal = crc32(crcInput);
  const crcBytes = new Uint8Array([
    (crcVal>>>24)&255,
    (crcVal>>>16)&255,
    (crcVal>>>8)&255,
    crcVal&255
  ]);

  const chunk = new Uint8Array([
    ...length,
    ...type,
    ...chunkData,
    ...crcBytes
  ]);

  // Insert new chunk
  const newBuf = new Uint8Array(buf.length + chunk.length);
  newBuf.set(buf.slice(0, ihdrEnd), 0);
  newBuf.set(chunk, ihdrEnd);
  newBuf.set(buf.slice(ihdrEnd), ihdrEnd + chunk.length);

  return "data:image/png;base64," + btoa(String.fromCharCode(...newBuf));
}

async function resizeNoCrop(file: File) {
  const dataUrl = await new Promise<string>((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result as string);
    r.onerror = ()=>rej("read error");
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res,rej)=>{
    const im = new Image();
    im.onload = ()=>res(im);
    im.onerror = ()=>rej("load error");
    im.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle="#fff";
  ctx.fillRect(0,0,TARGET_WIDTH,TARGET_HEIGHT);

  const scale = Math.min(TARGET_WIDTH/img.width, TARGET_HEIGHT/img.height);
  const w = img.width*scale;
  const h = img.height*scale;
  const x = (TARGET_WIDTH - w)/2;
  const y = (TARGET_HEIGHT - h)/2;

  ctx.drawImage(img, x, y, w, h);

  // PNG with added 300 DPI metadata
  const raw = canvas.toDataURL("image/png");
  return encodePNGWithDPI(raw);
}

export default function App(){
  const [jobs,setJobs]=useState([]);

  async function handle(e){
    const files = [...e.target.files];
    const now = Date.now();

    const newJobs = files.map((f,i)=>({
      id: now+i,
      file:f,
      name:f.name,
      status:"processing"
    }));

    setJobs(j => [...j, ...newJobs]);

    for (const job of newJobs){
      const out = await resizeNoCrop(job.file);

      // Auto download
      const a = document.createElement("a");
      a.href = out;
      a.download = job.name.replace(/\.[^.]+$/, "") + "_4500x5400_300dpi.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setJobs(jobs =>
        jobs.map(x=> x.id===job.id ? {...x,status:"done"} : x)
      );
    }
  }

  return (
    <div>
      <h1>No‑Crop Resizer (4500×5400 @ TRUE 300 DPI)</h1>
      <input type="file" multiple accept="image/*" onChange={handle}/>
      {jobs.map(j=>(
        <div key={j.id}>{j.name} — {j.status}</div>
      ))}
    </div>
  );
}
