import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BulkUploadForm from "@/components/BulkUploadForm";
import { uploadAsset } from "@/lib/upload-client";

jest.mock("@/lib/upload-client", () => ({
  uploadAsset: jest.fn(),
}));

function createFile(name: string, contents = "file-data") {
  return new File([contents], name, { type: "image/jpeg" });
}

describe("BulkUploadForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-generates editable titles from filenames", () => {
    render(<BulkUploadForm />);

    const input = screen.getByLabelText("Select files for bulk upload");
    fireEvent.change(input, {
      target: { files: [createFile("self_journal-hero-shot.jpg")] },
    });

    expect(screen.getByDisplayValue("self journal hero shot")).toBeInTheDocument();
  });

  it("limits the queue to 50 files", () => {
    render(<BulkUploadForm />);

    const files = Array.from({ length: 51 }, (_, index) =>
      createFile(`asset-${index + 1}.jpg`)
    );

    const input = screen.getByLabelText("Select files for bulk upload");
    fireEvent.change(input, {
      target: { files },
    });

    expect(screen.getAllByText(/asset-\d+\.jpg/)).toHaveLength(50);
    expect(
      screen.getByText("Only the first 50 files can be queued at once.")
    ).toBeInTheDocument();
  });

  it("uploads files sequentially with shared metadata", async () => {
    const callOrder: string[] = [];
    const deferredResolvers: Array<() => void> = [];

    (uploadAsset as jest.Mock).mockImplementation(({ file }, onProgress) => {
      callOrder.push(file.name);

      return new Promise((resolve) => {
        deferredResolvers.push(() => {
          onProgress?.(100);
          resolve({ asset: { id: `${file.name}-asset` } });
        });
      });
    });

    render(<BulkUploadForm />);

    fireEvent.click(screen.getByLabelText("Product A"));
    fireEvent.change(screen.getByLabelText("Shared Content Type"), {
      target: { value: "Product shot" },
    });

    const input = screen.getByLabelText("Select files for bulk upload");
    fireEvent.change(input, {
      target: { files: [createFile("first.jpg"), createFile("second.jpg")] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Upload Queue" }));

    await waitFor(() => expect(uploadAsset).toHaveBeenCalledTimes(1));
    expect(callOrder).toEqual(["first.jpg"]);
    expect(uploadAsset).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        products: ["Product A"],
        tags: ["Product A", "Product shot"],
      }),
      expect.any(Function)
    );

    await act(async () => {
      deferredResolvers[0]();
    });

    await waitFor(() => expect(uploadAsset).toHaveBeenCalledTimes(2));
    expect(callOrder).toEqual(["first.jpg", "second.jpg"]);

    await act(async () => {
      deferredResolvers[1]();
    });

    await waitFor(() =>
      expect(
        screen.getByText("Uploaded 2 file(s) successfully. 0 file(s) failed.")
      ).toBeInTheDocument()
    );
  });
});
