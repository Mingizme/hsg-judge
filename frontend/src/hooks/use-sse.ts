'use client';

import { useState, useEffect } from 'react';

export type SSEEventType = 'compile' | 'test-result' | 'complete' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: number;
}

export function useSSE(submissionId: string | null) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [latestResult, setLatestResult] = useState<any>(null);

  useEffect(() => {
    if (!submissionId) {
      setEvents([]);
      setIsConnected(false);
      setIsComplete(false);
      setLatestResult(null);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const streamUrl = `${apiUrl}/submissions/${submissionId}/stream`;
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        const processEvent = (type: SSEEventType, rawData: string) => {
          try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);

            if (type === 'test-result') {
              setLatestResult(data);
            }

            if (type === 'complete' || type === 'error') {
              setIsComplete(true);
              eventSource?.close();
            }
          } catch (err) {
            console.error('Failed to parse SSE event data', err);
          }
        };

        // Handle default message event
        eventSource.onmessage = (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            const eventType = (parsed.type || (parsed.verdict ? 'test-result' : 'compile')) as SSEEventType;
            const eventData = parsed.data || parsed;
            processEvent(eventType, eventData);
          } catch (err) {
            console.error('SSE onmessage parse error', err);
          }
        };

        // Handle named events from NestJS
        eventSource.addEventListener('compile', (e: MessageEvent) => processEvent('compile', e.data));
        eventSource.addEventListener('test-result', (e: MessageEvent) => processEvent('test-result', e.data));
        eventSource.addEventListener('complete', (e: MessageEvent) => processEvent('complete', e.data));
        eventSource.addEventListener('error', (e: MessageEvent) => processEvent('error', e.data));

        eventSource.onerror = (err) => {
          console.warn('SSE stream notice:', err);
          setIsConnected(false);
        };
      } catch (err) {
        console.error('SSE connect failed', err);
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [submissionId]);

  return { events, isConnected, isComplete, latestResult };
}
