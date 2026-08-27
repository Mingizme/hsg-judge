'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '@/lib/api-config';

export type SSEEventType = 'compile' | 'test-result' | 'complete' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: number;
}

/** Số lần EventSource báo lỗi liên tiếp trước khi chuyển sang polling */
const MAX_SSE_ERRORS = 3;
/** Nhịp và số lần polling dự phòng khi SSE chết hẳn */
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 40; // ~80 giây, đủ cho Render free tier cold start

const API_URL = API_BASE;

/**
 * Theo dõi tiến trình chấm bài qua Server-Sent Events.
 *
 * Hai lỗi cũ đã được sửa:
 * 1. `addEventListener('error')` bắt luôn CẢ event lỗi gốc của EventSource
 *    (event này không có `.data`) → `JSON.parse(undefined)` ném ngoại lệ mỗi
 *    lần mất kết nối. Nay phân biệt bằng cách kiểm tra `.data`.
 * 2. Khi kết nối chết, `isComplete` không bao giờ bật → vòng xoay "Đang chấm"
 *    quay mãi. Nay sau vài lần thất bại sẽ đóng stream và polling REST để chốt
 *    kết quả từ database.
 */
export function useSSE(submissionId: string | null) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [latestResult, setLatestResult] = useState<any>(null);
  /** true khi kết quả đến từ polling REST thay vì stream realtime */
  const [usedFallback, setUsedFallback] = useState(false);

  // Giữ id để hàm polling không phụ thuộc closure cũ
  const settledRef = useRef(false);

  useEffect(() => {
    setEvents([]);
    setIsConnected(false);
    setIsComplete(false);
    setLatestResult(null);
    setUsedFallback(false);
    settledRef.current = false;

    if (!submissionId) return;

    let eventSource: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let errorCount = 0;
    let pollCount = 0;
    let disposed = false;

    const pushEvent = (type: SSEEventType, data: any) => {
      if (disposed) return;
      setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);
      if (type === 'test-result') setLatestResult(data);
      if (type === 'complete' || type === 'error') {
        settledRef.current = true;
        setIsComplete(true);
        eventSource?.close();
        if (pollTimer) clearTimeout(pollTimer);
      }
    };

    const processRaw = (type: SSEEventType, rawData: unknown) => {
      if (typeof rawData !== 'string' || rawData.length === 0) return;
      try {
        pushEvent(type, JSON.parse(rawData));
      } catch {
        // Server gửi chuỗi thuần (không phải JSON) — vẫn chuyển tiếp nguyên văn
        pushEvent(type, { message: rawData });
      }
    };

    // ── Dự phòng: đọc kết quả đã lưu trong database ──

    const pollOnce = async () => {
      if (disposed || settledRef.current) return;

      pollCount += 1;
      try {
        const res = await fetch(`${API_URL}/submissions/${submissionId}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          const sub = json.data ?? json;
          const done = sub.status === 'COMPLETED' || sub.status === 'ERROR';

          if (done) {
            // Phát lại từng test đã lưu để bảng kết quả không trống.
            // Chỉ làm ở nhịp cuối để tránh đẩy trùng hàng chục lần.
            if (Array.isArray(sub.results)) {
              const replay = sub.results.map((r: unknown) => ({
                type: 'test-result' as SSEEventType,
                data: r,
                timestamp: Date.now(),
              }));
              setEvents((prev) => [...prev, ...replay]);
            }
            setUsedFallback(true);
            pushEvent('complete', { ...sub, replayedFromDatabase: true });
            return;
          }
        }
      } catch {
        // Bỏ qua: sẽ thử lại ở nhịp sau
      }

      if (pollCount >= MAX_POLLS) {
        setUsedFallback(true);
        pushEvent('error', {
          submissionId,
          message:
            'Mất kết nối tới máy chấm. Hãy mở tab "Lịch sử nộp" để xem kết quả.',
        });
        return;
      }

      pollTimer = setTimeout(pollOnce, POLL_INTERVAL_MS);
    };

    const startFallback = () => {
      if (disposed || settledRef.current || pollTimer) return;
      eventSource?.close();
      setIsConnected(false);
      pollTimer = setTimeout(pollOnce, POLL_INTERVAL_MS);
    };

    // ── Kết nối stream ──────────────────────────

    try {
      eventSource = new EventSource(
        `${API_URL}/submissions/${submissionId}/stream`,
      );

      eventSource.onopen = () => {
        errorCount = 0;
        setIsConnected(true);
      };

      eventSource.onmessage = (e: MessageEvent) => {
        // Event không tên (server chỉ gửi `data:`)
        try {
          const parsed = JSON.parse(e.data);
          const type = (parsed.type ||
            (parsed.verdict ? 'test-result' : 'compile')) as SSEEventType;
          pushEvent(type, parsed.data ?? parsed);
        } catch {
          /* payload không phải JSON → bỏ qua */
        }
      };

      eventSource.addEventListener('compile', (e) =>
        processRaw('compile', (e as MessageEvent).data),
      );
      eventSource.addEventListener('test-result', (e) =>
        processRaw('test-result', (e as MessageEvent).data),
      );
      eventSource.addEventListener('complete', (e) =>
        processRaw('complete', (e as MessageEvent).data),
      );

      // 'error' vừa là event nghiệp vụ do server phát, vừa là event lỗi kết nối
      // của chính EventSource. Chỉ event của server mới có `.data`.
      eventSource.addEventListener('error', (e) => {
        const data = (e as MessageEvent).data;
        if (typeof data === 'string' && data.length > 0) {
          processRaw('error', data);
          return;
        }

        setIsConnected(false);
        if (settledRef.current) return;

        errorCount += 1;
        if (
          errorCount >= MAX_SSE_ERRORS ||
          eventSource?.readyState === EventSource.CLOSED
        ) {
          startFallback();
        }
      });
    } catch {
      startFallback();
    }

    return () => {
      disposed = true;
      eventSource?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [submissionId]);

  return { events, isConnected, isComplete, latestResult, usedFallback };
}
