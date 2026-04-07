import { useEffect, useState } from "react";
import baseApi from "../services/baseApi";

export interface HistorySession {
  id: string;
  sessionId: string;
  executionId: string;
  action: string;
  title: string;
  location: string;
  date: string;
  items: string;
  imageUrl?: string;
}

export interface HistoryPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface HistoryApiItem {
  action?: string;
  target_id?: string;
  session_id?: string;
  target_name?: string;
  detected_count?: number;
  timestamp?: string | { _seconds?: number; seconds?: number };
}

interface HistoryApiResponse {
  items?: HistoryApiItem[];
  pagination?: {
    page?: number;
    page_size?: number;
    total_items?: number;
    total_pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
}

interface FetchHistoryResult {
  items: HistorySession[];
  pagination: HistoryPagination;
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

const fetchHistorySessions = async (page: number, pageSize: number): Promise<FetchHistoryResult> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Bạn chưa đăng nhập");
  }

  const response = await baseApi.get<HistoryApiItem[] | HistoryApiResponse>("/history", {
    params: {
      page,
      page_size: pageSize,
    },
  });

  const payload = response.data;
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  const responsePagination = Array.isArray(payload) ? undefined : payload?.pagination;

  const mappedItems = records.map((item, index) => {
    const action = item.action === "add_session" ? "add_session" : "execute";
    const detectedCount = Number(item.detected_count ?? 0);
    const targetName = (item.target_name || "").trim() || "Phiên không tên";
    const sessionId =
      item.session_id ||
      (action === "add_session" ? item.target_id : "") ||
      "";
    const executionId = action === "execute" ? item.target_id || "" : "";
    const title = action === "add_session" ? targetName : `Kết quả: ${targetName}`;
    const location = action === "add_session" ? "Đã tạo phiên mới" : "Đã chạy nhận diện";
    const items = action === "execute" ? `${detectedCount} mục` : "--";

    return {
      id: `${action}-${item.target_id || index + 1}`,
      sessionId,
      executionId,
      action,
      title,
      location,
      date: formatDate(item.timestamp),
      items,
      imageUrl: undefined,
    };
  });

  return {
    items: mappedItems,
    pagination: {
      page: responsePagination?.page ?? page,
      pageSize: responsePagination?.page_size ?? pageSize,
      totalItems: responsePagination?.total_items ?? mappedItems.length,
      totalPages: responsePagination?.total_pages ?? (mappedItems.length > 0 ? 1 : 0),
      hasNext: responsePagination?.has_next ?? false,
      hasPrev: responsePagination?.has_prev ?? page > 1,
    },
  };
};

export function useHistorySessions() {
  const [data, setData] = useState<HistorySession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState<HistoryPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) {
      return;
    }
    setLoading(true);
    setPage(nextPage);
  };

  const nextPage = () => {
    if (!pagination.hasNext) {
      return;
    }
    goToPage(page + 1);
  };

  const prevPage = () => {
    if (!pagination.hasPrev) {
      return;
    }
    goToPage(page - 1);
  };

  useEffect(() => {
    fetchHistorySessions(page, pageSize)
      .then((res) => {
        setData(res.items);
        setPagination(res.pagination);
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
        setPagination((prev) => ({
          ...prev,
          page,
          pageSize,
        }));
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  return { data, loading, error, page, pageSize, pagination, goToPage, nextPage, prevPage };
}
