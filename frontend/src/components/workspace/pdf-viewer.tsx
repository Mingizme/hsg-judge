'use client';

import * as React from 'react';
import {
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  FileText,
  RefreshCw,
  MoveHorizontal,
  Maximize2,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface PdfViewerProps {
  /** URL công khai của file PDF. Không có URL → hiện trạng thái trống rõ ràng */
  pdfUrl?: string;
  problemCode?: string;
}

type Engine = 'native' | 'google';
/** `width` = vừa chiều ngang trang (đọc đề dài), `page` = vừa cả trang */
type FitMode = 'width' | 'page';

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

/**
 * Bộ lọc đảo màu trang PDF.
 *
 * `invert` một mình sẽ làm ảnh/biểu đồ trong đề thành âm bản, nên đảo tiếp sắc
 * độ 180° để ảnh trở lại gần đúng màu thật; đảo 0.9 thay vì 1.0 để chữ đen thành
 * xám nhạt (dịu mắt) chứ không phải trắng tinh.
 */
const PAGE_FILTER = (invert: boolean): string | undefined =>
  invert ? 'invert(0.9) hue-rotate(180deg) contrast(0.95)' : undefined;

/**
 * Trình xem PDF cho tab ① Đề bài.
 *
 * Mặc định dùng trình xem PDF CÓ SẴN của trình duyệt (`<object>`): không gửi
 * đường dẫn đề thi sang dịch vụ ngoài. Chỉ khi trình duyệt/tiện ích chặn nhúng
 * PDF thì người dùng mới cần chuyển sang engine Google.
 */
export function PdfViewer({ pdfUrl, problemCode }: PdfViewerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [zoom, setZoom] = React.useState(100);
  const [engine, setEngine] = React.useState<Engine>('native');
  const [reloadKey, setReloadKey] = React.useState(0);
  const [fit, setFit] = React.useState<FitMode>('width');

  /**
   * Đảo màu trang PDF cho chế độ Tối.
   *
   * Trang đề bao giờ cũng là giấy trắng, mở trong giao diện tối thì loá mắt.
   * Mặc định bật theo theme, nhưng người dùng bấm là quyền của họ — nên có `ref`
   * ghi nhớ để lần đổi theme sau không ghi đè lựa chọn đó.
   */
  const [invert, setInvert] = React.useState(isDark);
  const invertPickedRef = React.useRef(false);

  React.useEffect(() => {
    if (invertPickedRef.current) return;
    setInvert(isDark);
  }, [isDark]);

  const googleViewerUrl = React.useMemo(
    () =>
      pdfUrl
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
        : '',
    [pdfUrl],
  );

  if (!pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-2">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Chưa có bản PDF của đề bài
          </h3>
          <p className="text-xs text-muted-foreground">
            Giáo viên chưa tải file đề{problemCode ? ` ${problemCode}` : ''} lên
            (thư mục <code className="font-mono">Doc/*.pdf</code> trong gói bài
            tập). Hãy dùng chế độ “Đề bài (Text)”.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* Thanh điều khiển */}
      <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center rounded-lg border bg-muted p-0.5 text-xs"
            role="group"
            aria-label="Chọn trình đọc PDF"
          >
            {(
              [
                { id: 'native' as Engine, label: 'PDF gốc' },
                { id: 'google' as Engine, label: 'Google' },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEngine(opt.id)}
                aria-pressed={engine === opt.id}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                  engine === opt.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Vừa khung: FitH cho đề dài (đọc trôi theo chiều dọc), Fit khi muốn
              thấy trọn một trang. Chỉ trình xem gốc hiểu được tham số này. */}
          <div
            className="flex items-center rounded-lg border bg-muted p-0.5 text-xs"
            role="group"
            aria-label="Kiểu vừa khung"
          >
            {(
              [
                {
                  id: 'width' as FitMode,
                  label: 'Vừa ngang',
                  Icon: MoveHorizontal,
                },
                { id: 'page' as FitMode, label: 'Vừa trang', Icon: Maximize2 },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFit(opt.id)}
                disabled={engine === 'google'}
                aria-pressed={fit === opt.id}
                title={
                  engine === 'google'
                    ? 'Google Viewer tự canh khung, không đổi được'
                    : opt.label
                }
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40',
                  fit === opt.id && engine !== 'google'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <opt.Icon className="h-3 w-3" aria-hidden />
                <span className="hidden md:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            disabled={engine === 'google' || zoom <= ZOOM_MIN}
            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="px-1 text-center font-mono text-[11px] font-medium tabular-nums">
            {engine === 'google' ? '—' : `${zoom}%`}
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            disabled={engine === 'google' || zoom >= ZOOM_MAX}
            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
            title="Phóng to"
            aria-label="Phóng to"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Tải lại PDF"
            aria-label="Tải lại PDF"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => {
              invertPickedRef.current = true;
              setInvert((v) => !v);
            }}
            aria-pressed={invert}
            title={
              invert
                ? 'Trả lại màu gốc của trang đề (giấy trắng)'
                : 'Đảo màu trang đề cho đỡ loá khi dùng giao diện tối'
            }
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition',
              invert
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {invert ? (
              <Sun className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden lg:inline">
              {invert ? 'Màu gốc' : 'Nền tối'}
            </span>
          </button>

          <span className="mx-1 h-3.5 w-px bg-border" aria-hidden />

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary shadow-sm transition hover:bg-primary/20"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span>Mở tab mới</span>
          </a>
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Tải về</span>
          </a>
        </div>
      </div>

      {/* Vùng hiển thị */}
      <div className="relative flex h-full w-full flex-1 justify-center overflow-auto bg-muted/30">
        {engine === 'google' ? (
          <iframe
            key={`google-${reloadKey}`}
            src={googleViewerUrl}
            className="h-full w-full border-none"
            style={{ filter: PAGE_FILTER(invert) }}
            title={`Đề bài PDF ${problemCode ?? ''} (Google Viewer)`}
          />
        ) : (
          <div
            className="flex h-full w-full origin-top flex-col transition-transform"
            style={{
              transform: `scale(${zoom / 100})`,
              width: `${100 * (100 / zoom)}%`,
              height: `${100 * (100 / zoom)}%`,
              filter: PAGE_FILTER(invert),
            }}
          >
            <object
              /* Đổi kiểu vừa khung phải nạp lại tài liệu: tham số nằm trong
                 fragment của URL, trình xem chỉ đọc nó lúc mở tệp. */
              key={`native-${reloadKey}-${fit}`}
              data={`${pdfUrl}#view=${fit === 'width' ? 'FitH' : 'Fit'}&toolbar=1&navpanes=0`}
              type="application/pdf"
              className="h-full w-full flex-1 border-none"
            >
              {/* Hiện khi trình duyệt / tiện ích (IDM…) chặn nhúng PDF */}
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <FileText className="h-12 w-12 text-primary" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Trình duyệt không nhúng được PDF trực tiếp.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEngine('google')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden /> Thử engine Google
                  </button>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-xs font-semibold"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden /> Mở tab mới
                  </a>
                </div>
              </div>
            </object>
          </div>
        )}
      </div>
    </div>
  );
}
