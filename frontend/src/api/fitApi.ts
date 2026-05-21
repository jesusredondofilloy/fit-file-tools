const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function mergeFitFiles(files: File[]): Promise<Blob> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const res = await fetch(`${API_URL}/api/merge`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Merge request failed");
  }

  return res.blob();
}

export async function parseFitFile(file: File): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/parse`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Parse request failed");
  }

  return res.json();
}
