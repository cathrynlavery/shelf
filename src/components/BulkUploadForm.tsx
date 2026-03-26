"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { CONTENT_TYPES, PRODUCTS } from "@/lib/constants";
import {
  buildAssetTags,
  titleFromFilename,
} from "@/lib/asset-utils";
import { uploadAsset } from "@/lib/upload-client";

const MAX_FILES = 50;

type QueueStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  title: string;
  progress: number;
  status: QueueStatus;
  error: string | null;
  assetId: string | null;
}

function createQueueItem(file: File, index: number): QueueItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    file,
    title: titleFromFilename(file.name),
    progress: 0,
    status: "queued",
    error: null,
    assetId: null,
  };
}

export default function BulkUploadForm() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [contentType, setContentType] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<{ success: number; error: number } | null>(null);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const overallProgress = useMemo(() => {
    if (queue.length === 0) return 0;
    const total = queue.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(total / queue.length);
  }, [queue]);

  function appendFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setSummary(null);
    const availableSlots = Math.max(MAX_FILES - queue.length, 0);
    const nextFiles = files.slice(0, availableSlots);
    setNotice(
      files.length > availableSlots
        ? `Only the first ${MAX_FILES} files can be queued at once.`
        : ""
    );
    setQueue((current) => [
      ...current,
      ...nextFiles.map((file, index) => createQueueItem(file, current.length + index)),
    ]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    appendFiles(event.dataTransfer.files);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    appendFiles(event.target.files ?? []);
    event.target.value = "";
  }

  function updateItem(id: string, updates: Partial<QueueItem>) {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  function removeItem(id: string) {
    setQueue((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (queue.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    setSummary(null);
    setNotice("");

    let success = 0;
    let error = 0;

    for (const item of queue) {
      updateItem(item.id, {
        status: "uploading",
        progress: 0,
        error: null,
        assetId: null,
      });

      try {
        const response = await uploadAsset(
          {
            file: item.file,
            title: item.title,
            products,
            tags: buildAssetTags({ products, contentType }),
            uploadedBy: "team-ui",
          },
          (progress) => updateItem(item.id, { progress })
        );

        updateItem(item.id, {
          status: "done",
          progress: 100,
          assetId: response.asset.id,
        });
        success += 1;
      } catch (uploadError) {
        updateItem(item.id, {
          status: "error",
          progress: 100,
          error: uploadError instanceof Error ? uploadError.message : "Upload failed",
        });
        error += 1;
      }
    }

    setSummary({ success, error });
    setIsUploading(false);
  }

  const hasQueuedFiles = queue.length > 0;

  return (
    <div className="upload-form upload-form-wide">
      <div className="section-header">
        <div>
          <h2>Bulk Upload</h2>
          <p className="section-copy">
            Queue up to 50 files, adjust titles, then upload them one at a time.
          </p>
        </div>
        <a href="/upload" className="btn btn-outline">
          Single Upload
        </a>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className={`dropzone${isDragging ? " over" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          data-testid="bulk-dropzone"
        >
          <div className="icon">☁️</div>
          <p>Drag up to 50 files here, or click to browse.</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,*/*"
            aria-label="Select files for bulk upload"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        <div className="bulk-settings">
          <div className="field">
            <label htmlFor="bulk-product">Product</label>
            <select
              id="bulk-product"
              value={products[0] ?? ""}
              onChange={(event) => setProducts(event.target.value ? [event.target.value] : [])}
              disabled={isUploading}
            >
              <option value="">Select product…</option>
              {PRODUCTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="bulk-content-type">Shared Content Type</label>
            <select
              id="bulk-content-type"
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              disabled={isUploading}
            >
              <option value="">Select content type…</option>
              {CONTENT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {notice && <div className="inline-note">{notice}</div>}

        {hasQueuedFiles && (
          <>
            <div className="bulk-progress" aria-live="polite">
              <div className="bulk-progress-meta">
                <strong>Overall progress</strong>
                <span>{overallProgress}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="bulk-list" data-testid="bulk-queue">
              {queue.map((item) => (
                <div key={item.id} className="bulk-item">
                  <div className="bulk-item-main">
                    <div className="bulk-item-file">
                      <strong>{item.file.name}</strong>
                      <span>{Math.round(item.file.size / 1024)} KB</span>
                    </div>
                    <div className="bulk-item-actions">
                      <span className={`badge badge-${item.status}`}>
                        {item.status}
                      </span>
                      {!isUploading && (
                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="field field-compact">
                    <label htmlFor={`title-${item.id}`}>Title</label>
                    <input
                      id={`title-${item.id}`}
                      type="text"
                      value={item.title}
                      onChange={(event) => updateItem(item.id, { title: event.target.value })}
                      disabled={isUploading}
                    />
                  </div>

                  <div className="progress-track progress-track-small">
                    <div
                      className={`progress-bar${item.status === "error" ? " progress-bar-error" : ""}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="bulk-item-footer">
                    <span>{item.progress}%</span>
                    {item.assetId && <span>Asset ID: {item.assetId}</span>}
                    {item.error && <span className="error-copy">{item.error}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!hasQueuedFiles || isUploading}
          style={{ width: "100%", padding: "12px" }}
        >
          {isUploading ? "Uploading queue…" : "Upload Queue"}
        </button>
      </form>

      {summary && (
        <div className={`status-bar${summary.error > 0 ? " error" : ""}`}>
          Uploaded {summary.success} file(s) successfully. {summary.error} file(s)
          failed.
        </div>
      )}
    </div>
  );
}
