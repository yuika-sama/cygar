import { useEffect, useState } from "react";
import baseApi from "../services/baseApi";

export interface HistorySession {
  id: string;
  title: string;
  location: string;
  date: string;
  items: string;
  imageUrl?: string;
}

interface HistoryApiItem {
  action?: string;
  target_id?: string;
  target_name?: string;
  detected_count?: number;
  timestamp?: string | { _seconds?: number; seconds?: number };
}

const formatDate = (raw?: HistoryApiItem["timestamp"]): string => {
  if (!raw) {
    return new Date().toLocaleDateString("vi-VN");
  }

  let date: Date | null = null;

  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  } else {
    const epochSeconds = raw._seconds ?? raw.seconds;
    if (typeof epochSeconds === "number") {
      date = new Date(epochSeconds * 1000);
    }
  }

  return (date ?? new Date()).toLocaleDateString("vi-VN");
};

const fetchHistorySessions = async (): Promise<HistorySession[]> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Bạn chưa đăng nhập");
  }

  const response = await baseApi.get<HistoryApiItem[]>("/history");
  const records = Array.isArray(response.data) ? response.data : [];

  return records.map((item, index) => {
    const detectedCount = Number(item.detected_count ?? 0);
    const targetName = item.target_name || "Vật liệu chưa xác định";
    const action = item.action || "execute";

    return {
      id: item.target_id || String(index + 1),
      title: `${targetName}`,
      location: `Hành động: ${action}`,
      date: formatDate(item.timestamp),
      items: detectedCount > 0 ? `${detectedCount} mục` : "--",
      imageUrl: undefined,
    };
  });
};

export function useHistorySessions() {
  const [data, setData] = useState<HistorySession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistorySessions()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        const status =
          typeof err === "object" && err !== null && "response" in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;

        if (status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("accessToken");
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setError("Không thể tải lịch sử");
        }
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
