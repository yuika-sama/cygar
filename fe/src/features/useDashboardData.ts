import { useEffect, useState } from "react";
import baseApi from "../services/baseApi";

export interface DashboardData {
  username: string;
  usageCount: number;
  viewedHistoryCount: number;
  recentActivities: Array<{
    id: string;
    action: string;
    targetName: string;
    date: string;
  }>;
}

interface MeResponse {
  email?: string;
  display_name?: string | null;
}

interface DashboardResponse {
  usage_count?: number;
  viewed_history_count?: number;
}

interface HistoryResponseItem {
  target_id?: string;
  action?: string;
  target_name?: string;
  detected_count?: number;
  timestamp?: string | { _seconds?: number; seconds?: number };
}

const toIsoDate = (raw?: HistoryResponseItem["timestamp"]): string => {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }

  const epochSeconds = raw._seconds ?? raw.seconds;
  if (typeof epochSeconds === "number") {
    return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
};

const fetchDashboardData = async (): Promise<DashboardData> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Bạn chưa đăng nhập");
  }

  const [meRes, dashboardRes, historyRes] = await Promise.all([
    baseApi.get<MeResponse>("/me"),
    baseApi.get<DashboardResponse>("/dashboards"),
    baseApi.get<HistoryResponseItem[]>("/history"),
  ]);

  const me = meRes.data || {};
  const dashboard = dashboardRes.data || {};
  const history = historyRes.data || [];

  const usageCount = Number(dashboard.usage_count ?? 0);
  const viewedHistoryCount = Number(dashboard.viewed_history_count ?? 0);

  const recentActivities = history.slice(0, 5).map((item, index) => {
    const materialName = item.target_name || "vật liệu";
    const actionLabel = item.action || "thực thi";
    const detectedCount = Number(item.detected_count ?? 0);
    const suffix = detectedCount > 0 ? ` (${detectedCount} mục)` : "";

    return {
      id: item.target_id || String(index + 1),
      action: `Đã ${actionLabel}${suffix}`,
      targetName: materialName,
      date: toIsoDate(item.timestamp),
    };
  });

  return {
    username: me.display_name || me.email || "Người dùng CyGar",
    usageCount,
    viewedHistoryCount,
    recentActivities,
  };
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData()
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
          setError("Không thể tải dữ liệu tổng quan");
        }
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
