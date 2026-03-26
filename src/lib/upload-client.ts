import { DAM_API_KEY } from "@/lib/client-api";

interface UploadAssetInput {
  file: File;
  title: string;
  description?: string;
  tags?: string[];
  products?: string[];
  uploadedBy?: string;
}

interface UploadAssetResponse {
  asset: {
    id: string;
  };
}

export function uploadAsset(
  input: UploadAssetInput,
  onProgress?: (progress: number) => void
): Promise<UploadAssetResponse> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("title", input.title);
  form.append("description", input.description ?? "");
  form.append("tags", JSON.stringify(input.tags ?? []));

  if (input.products && input.products.length > 0) {
    form.append("products", JSON.stringify(input.products));
  }

  form.append("uploaded_by", input.uploadedBy ?? "team-ui");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/assets/upload");
    xhr.setRequestHeader("x-api-key", DAM_API_KEY);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      let payload: { error?: string; asset?: { id: string } } = {};

      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.asset) {
        onProgress?.(100);
        resolve(payload as UploadAssetResponse);
        return;
      }

      reject(new Error(payload.error ?? "Upload failed"));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    xhr.send(form);
  });
}
