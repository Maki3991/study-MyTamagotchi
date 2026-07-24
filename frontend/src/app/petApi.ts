export type PetAsset = {
  id: string;
  name: string;
  role: string;
  world: string;
  color: string;
  sourceUrl: string;
  cleanUrl: string;
  finalUrl: string;
  stylizeProvider: string;
  removeBackgroundProvider: string;
  promptVersion: string;
  backgroundColor: string;
  outputFormat: "image/png";
  createdAt: string;
  personality?: string[];
  temperament?: string;
  registeredAt?: string;
};

export type PetJob = {
  id: string;
  name: string;
  status: "queued" | "processing" | "ready" | "failed";
  stage: "upload" | "stylize" | "remove-background" | "register" | "complete" | "failed";
  progress: number;
  error?: string;
  asset?: PetAsset;
};

const API_BASE = (import.meta.env.VITE_WORLD_API_URL || "http://127.0.0.1:8787/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

function absoluteAssetUrls(asset: PetAsset): PetAsset {
  const resolve = (url: string) => url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
  return {
    ...asset,
    sourceUrl: resolve(asset.sourceUrl),
    cleanUrl: resolve(asset.cleanUrl),
    finalUrl: resolve(asset.finalUrl),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Agent pipeline returned ${response.status}`);
  return payload;
}

async function fetchApi(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error("生成服务未连接，请点击重试");
  }
}

export const petApi = {
  async list(): Promise<PetAsset[]> {
    const payload = await readJson<{ assets: PetAsset[] }>(await fetchApi(`${API_BASE}/pets`));
    return payload.assets.map(absoluteAssetUrls);
  },

  async submit(file: File, name?: string): Promise<PetJob> {
    const response = await fetchApi(`${API_BASE}/pets`, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name),
        "X-Pet-Name": encodeURIComponent(name || file.name.replace(/\.[^.]+$/, "") || "新伙伴"),
      },
      body: file,
    });
    return readJson<PetJob>(response);
  },

  async getJob(id: string): Promise<PetJob> {
    const job = await readJson<PetJob>(await fetchApi(`${API_BASE}/pets/${id}`));
    return job.asset ? { ...job, asset: absoluteAssetUrls(job.asset) } : job;
  },

  async register(id: string): Promise<PetAsset> {
    const payload = await readJson<{ asset: PetAsset }>(await fetchApi(`${API_BASE}/pets/${id}/register`, {
      method: "POST",
    }));
    return absoluteAssetUrls(payload.asset);
  },

  async retry(id: string): Promise<PetJob> {
    return readJson<PetJob>(await fetchApi(`${API_BASE}/pets/${id}/retry`, {
      method: "POST",
    }));
  },
};

export async function waitForPet(jobId: string, onProgress: (job: PetJob) => void) {
  for (let attempt = 0; attempt < 800; attempt += 1) {
    const job = await petApi.getJob(jobId);
    onProgress(job);
    if (job.status === "ready" && job.asset) return job.asset;
    if (job.status === "failed") throw new Error(job.error || "萌化 Agent 生成失败");
    await new Promise(resolve => window.setTimeout(resolve, 750));
  }
  throw new Error("萌化 Agent 生成超时，请稍后重试");
}
