
import React, { useState } from 'react';
import JSZip from 'jszip';

const TARGET_WIDTH = 4500;
const TARGET_HEIGHT = 5400;

// encode PNG pHYs chunk for 300 DPI
function encodePNGWithDPI(dataURL) {
  try {
    const bin = atob(dataURL.split(',')[1]);
    const buf = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);

    const pHYs = new Uint8Array([0x00,0x00,0x2E,0xC3,0x00,0x00,0x2E,0xC3,0x01]);

    function findIHDRend(bytes){
      for (let i=0;i<bytes.length-4;i++){
        if (bytes[i]==0x49 && bytes[i+1]==0x48 && bytes[i+2]==0x44 && bytes[i+3]==0x52){
          const len = (bytes[i-4]<<24)|(bytes[i-3]<<16)|(bytes[i-2]<<8)|bytes[i-1];
          return i+4+len+4;
        }
      }
      return -1;
    }

    const ihdrEnd = findIHDRend(buf);
    if (ihdrEnd < 0) return dataURL;

    function crc32(arr){
      let c = ~0;
      for (let n=0;n<arr.length;n++){
        c ^= arr[n];
        for (let k=0;k<8;k++){
          c = (c & 1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1);
        }
      }
      return ~c >>> 0;
    }

    const type = new TextEncoder().encode("pHYs");
    const chunkData = pHYs;
    const length = new Uint8Array([0,0,0, chunkData.length]);

    const crcInput = new Uint8Array([...type, ...chunkData]);
    const crcVal = crc32(crcInput);
    const crcBytes = new Uint8Array([
      (crcVal>>>24)&255,(crcVal>>>16)&255,(crcVal>>>8)&255,crcVal&255
    ]);

    const chunk = new Uint8Array([
      ...length, ...type, ...chunkData, ...crcBytes
    ]);

    const newBuf = new Uint8Array(buf.length + chunk.length);
    newBuf.set(buf.slice(0, ihdrEnd), 0);
    newBuf.set(chunk, ihdrEnd);
    newBuf.set(buf.slice(ihdrEnd), ihdrEnd + chunk.length);

    return "data:image/png;base64," + btoa(String.fromCharCode(...newBuf));
  } catch {
    return dataURL;
  }
}

async function resizeNoCrop(file) {
  const dataUrl = await new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = ()=>rej("read error");
    r.readAsDataURL(file);
  });

  const img = await new Promise((res,rej)=>{
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
  const raw = canvas.toDataURL("image/png");
  return encodePNGWithDPI(raw);
}

export default function App(){
  const [jobs,setJobs]=useState([]);
  const [processing,setProcessing]=useState(false);

  async function handle(e){
    const files=[...e.target.files];
    if(!files.length) return;

    setProcessing(true);
    const zip = new JSZip();

    let count = 0;
    for (const f of files){
      const out = await resizeNoCrop(f);

      // convert base64 to blob
      const bstr = atob(out.split(",")[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while(n--) u8[n]=bstr.charCodeAt(n);
      const blob = new Blob([u8], {type:"image/png"});

      const name = f.name.replace(/\.[^.]+$/, "") + "_4500x5400_300dpi.png";

      if(files.length === 1){
        // direct download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // add to zip
        zip.file(name, blob);
      }

      count++;
      setJobs(j=>[...j, `${name} done`]);
    }

    if(files.length > 1){
      const content = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "LDD_Resized_Images.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setProcessing(false);
  }

  return (
    <div>
      <h1>No-Crop Resizer (4500×5400 @ TRUE 300 DPI) + ZIP Mode</h1>
      <input type="file" multiple accept="image/*" onChange={handle}/>
      {processing && <div>Processing…</div>}
      {jobs.map((j,i)=><div key={i}>{j}</div>)}
    </div>
  );
}
