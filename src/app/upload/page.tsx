"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { PRODUCTS, CONTENT_TYPES } from "@/lib/constants";
import {
  buildAssetTags,
  titleFromFilename,
  toggleStringSelection,
} from "@/lib/asset-utils";
import { uploadAsset } from "@/lib/upload-client";
import Header from "@/components/Header";

type UploadStatus = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [contentType, setContentType] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!title) setTitle(titleFromFilename(dropped.name));
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(titleFromFilename(selected.name));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) {
      alert("Please select a file and add a title.");
      return;
    }

    setStatus("uploading");
    setStatusMsg("Uploading…");

    try {
      const { asset } = await uploadAsset({
        file,
        title,
        description,
        tags: buildAssetTags({ rawTags: tags, products, contentType }),
        products,
        uploadedBy: "team-ui",
      });

      setStatus("done");
      setStatusMsg(`✅ Uploaded "${title}" successfully! Asset ID: ${asset.id}`);

      // Reset form
      setFile(null);
      setTitle("");
      setDescription("");
      setProducts([]);
      setContentType("");
      setTags("");
    } catch (err) {
      setStatus("error");
      setStatusMsg(
        `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return (
    <>
      <Header />

      <div className="container">
        <div className="upload-form">
          <h2>Upload Asset</h2>
          <form onSubmit={handleSubmit}>
            {/* Dropzone */}
            <div
              className={`dropzone${isDragging ? " over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="icon">☁️</div>
              {file ? (
                <p>
                  <strong>{file.name}</strong> ({Math.round(file.size / 1024)}{" "}
                  KB)
                </p>
              ) : (
                <p>Drag & drop a file here, or click to browse</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                style={{ display: "none" }}
                accept="image/*,video/*,application/pdf,*/*"
              />
            </div>

            <div className="field" style={{ marginTop: 20 }}>
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Spring Campaign Hero Shot"
                required
              />
            </div>

            <div className="field">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the asset…"
              />
            </div>

            <div className="field">
              <label>Products</label>
              <div className="checkbox-grid" role="group" aria-label="Products">
                {PRODUCTS.map((product) => (
                  <label key={product} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={products.includes(product)}
                      onChange={() => setProducts((current) => toggleStringSelection(current, product))}
                    />
                    <span>{product}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
              >
                <option value="">Select content type…</option>
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Additional Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="hero, launch-2024, approved"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "uploading"}
              style={{ width: "100%", padding: "12px" }}
            >
              {status === "uploading" ? "Uploading…" : "Upload Asset"}
            </button>
          </form>

          {statusMsg && (
            <div
              className={`status-bar${status === "error" ? " error" : ""}`}
              style={{
                background: status === "error" ? "#dc2626" : undefined,
              }}
            >
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
