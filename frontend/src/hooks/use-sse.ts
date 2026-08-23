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
    let eventSource: EventSource;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      eventSource = new EventSource(`${apiUrl}/submissions/${submissionId}/stream`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      const handleEvent = (type: SSEEventType) => (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);
          
          if (type === 'test-result') {
            setLatestResult(data);
          }
          
          if (type === 'complete' || type === 'error') {
            setIsComplete(true);
            eventSource.close();
          }
        } catch (err) {
          console.error('Failed to parse SSE event data', err);
        }
      };

      eventSource.addEventListener('compile', handleEvent('compile'));
      eventSource.addEventListener('test-result', handleEvent('test-result'));
      eventSource.addEventListener('complete', handleEvent('complete'));
      eventSource.addEventListener('error', handleEvent('error'));

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        
        if (!isComplete) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [submissionId, isComplete]);

  return { events, isConnected, isComplete, latestResult };
}
