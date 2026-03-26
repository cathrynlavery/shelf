"use client";

import { useState } from "react";
import { ASSET_STATUSES, PRODUCTS } from "@/lib/constants";
import type { Asset } from "@/lib/db";
import { DAM_API_KEY } from "@/lib/client-api";
import {
  formatDimensions,
  formatFileSize,
  parseTagInput,
  toggleStringSelection,
} from "@/lib/asset-utils";

function AssetPreview({ asset }: { asset: Asset }) {
  if (asset.file_type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.file_url} alt={asset.title} className="detail-preview-image" />
    );
  }

  if (asset.file_type === "video") {
    return (
      <video className="detail-preview-video" controls src={asset.file_url}>
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <div className="detail-preview-fallback">
      <strong>{asset.file_type.toUpperCase()}</strong>
      <p>Preview unavailable. Use Download Original to open the source file.</p>
    </div>
  );
}

export default function AssetDetailView({ initialAsset }: { initialAsset: Asset }) {
  const [asset, setAsset] = useState(initialAsset);
  const [title, setTitle] = useState(initialAsset.title);
  const [description, setDescription] = useState(initialAsset.description ?? "");
  const [tags, setTags] = useState(initialAsset.tags.join(", "));
  const [products, setProducts] = useState(initialAsset.products ?? (initialAsset.product ? [initialAsset.product] : []));
  const [status, setStatus] = useState(initialAsset.status);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function patchAsset(nextValues: Partial<Asset>) {
    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": DAM_API_KEY,
      },
      body: JSON.stringify(nextValues),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? "Unable to update asset");
    }

    return body.asset as Asset;
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const updatedAsset = await patchAsset({
        title,
        description,
        tags: parseTagInput(tags),
        products,
        status,
      });

      setAsset(updatedAsset);
      setTags(updatedAsset.tags.join(", "));
      setProducts(updatedAsset.products ?? []);
      setStatus(updatedAsset.status);
      setMessage("Asset details saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (asset.status === "archived") return;
    if (!window.confirm("Archive this asset?")) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const updatedAsset = await patchAsset({ status: "archived" });
      setAsset(updatedAsset);
      setStatus(updatedAsset.status);
      setMessage("Asset archived.");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archive failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="detail-shell">
      <div className="detail-header">
        <div>
          <a href="/" className="detail-backlink">
            ← Back to library
          </a>
          <h2>{asset.title}</h2>
          <p className="detail-subtitle">{asset.filename}</p>
          {products.length > 0 && (
            <div className="tags">
              {products.map((product) => (
                <span key={product} className="tag tag-product">
                  {product}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="detail-header-actions">
          <a
            href={asset.file_url}
            className="btn btn-primary"
            target="_blank"
            rel="noreferrer"
          >
            Download Original
          </a>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleArchive}
            disabled={isSaving || asset.status === "archived"}
          >
            {asset.status === "archived" ? "Archived" : "Archive Asset"}
          </button>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-preview-panel">
          <AssetPreview asset={asset} />
        </div>

        <div className="detail-side">
          <form className="detail-form" onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="asset-title">Title</label>
              <input
                id="asset-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label htmlFor="asset-description">Description</label>
              <textarea
                id="asset-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label htmlFor="asset-tags">Tags</label>
              <input
                id="asset-tags"
                type="text"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                disabled={isSaving}
                placeholder="hero, social, product shot"
              />
            </div>

            <div className="detail-form-grid">
              <div className="field">
                <label>Products</label>
                <div className="checkbox-grid" role="group" aria-label="Products">
                  {PRODUCTS.map((option) => (
                    <label key={option} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={products.includes(option)}
                        onChange={() => setProducts((current) => toggleStringSelection(current, option))}
                        disabled={isSaving}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="asset-status">Status</label>
                <select
                  id="asset-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Asset["status"])}
                  disabled={isSaving}
                >
                  {ASSET_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </form>

          {(message || error) && (
            <div className={`status-bar${error ? " error" : ""}`}>
              {error || message}
            </div>
          )}

          {asset.ai_tags && asset.ai_tags.length > 0 && (
            <div className="detail-panel">
              <h3>
                <span className="ai-tags-header">
                  AI Tags
                  <span className="ai-tags-label">✨ Auto</span>
                </span>
              </h3>
              <div className="ai-tags-grid">
                {asset.ai_tags.map((tag) => (
                  <span key={tag} className="ai-tag">
                    {tag}
                  </span>
                ))}
              </div>
              {asset.ai_tagged_at && (
                <div style={{ marginTop: 8, fontSize: ".7rem", color: "#9ca3af" }}>
                  Tagged {new Date(asset.ai_tagged_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          <div className="detail-panel">
            <h3>Metadata</h3>
            <div className="detail-row">
              <span>Size</span>
              <span>{formatFileSize(asset.file_size_kb)}</span>
            </div>
            <div className="detail-row">
              <span>Dimensions</span>
              <span>{formatDimensions(asset.width_px, asset.height_px)}</span>
            </div>
            <div className="detail-row">
              <span>Uploaded</span>
              <span>{new Date(asset.created_at).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <span>Uploaded By</span>
              <span>{asset.uploaded_by ?? "Unknown"}</span>
            </div>
            <div className="detail-row">
              <span>MIME Type</span>
              <span>{asset.mime_type ?? "Unknown"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
