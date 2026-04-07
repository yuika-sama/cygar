import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

type Live2DModelLike = PIXI.Container & {
  anchor?: { set: (x: number, y: number) => void };
  motion?: (name: string) => void;
  on?: (event: string, handler: () => void) => void;
  destroy?: (options?: unknown) => void;
  position: { set: (x: number, y: number) => void };
  scale: { set: (x: number, y: number) => void };
};

type Live2DModelStatic = {
  from: (modelUrl: string) => Promise<Live2DModelLike>;
  registerTicker: (ticker: unknown) => void;
};

type Live2DWindow = Window & {
  PIXI?: typeof PIXI;
  Live2DCubismCore?: unknown;
};

export interface UseLive2DOptions {
  modelUrl: string;
  autoLoad?: boolean;
  initialScale?: number;
  hitMotion?: string;
}

export interface UseLive2DResult {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  error: string | null;
  hasModel: boolean;
  reloadModel: () => Promise<void>;
  playMotion: (motionName: string) => boolean;
}

let live2DModelStaticPromise: Promise<Live2DModelStatic> | null = null;
let tickerRegistered = false;

function getLive2DWindow(): Live2DWindow {
  return window as Live2DWindow;
}

async function waitForLive2DMemory(timeout = 3000, interval = 20): Promise<void> {
  const wnd = getLive2DWindow();
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (
      wnd.Live2DCubismCore &&
      (wnd.Live2DCubismCore as any).Memory &&
      typeof (wnd.Live2DCubismCore as any).Memory.initializeAmountOfMemory === 'function'
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Timed out waiting for Live2DCubismCore.Memory.initializeAmountOfMemory');
}

function ensureLive2DCubismCore(): void {
  if (!getLive2DWindow().Live2DCubismCore) {
    throw new Error(
      'Thiếu Live2DCubismCore. Hãy thêm live2dcubismcore.min.js vào public và load script này trước khi khởi tạo Live2D.',
    );
  }
}

async function ensureModelFile(modelUrl: string): Promise<string> {
  const normalizedModelUrl = modelUrl.trim();

  if (!normalizedModelUrl) {
    throw new Error('Thiếu modelUrl Live2D. Vui lòng truyền đường dẫn .model3.json hợp lệ.');
  }

  let response: Response;
  try {
    response = await fetch(normalizedModelUrl, { method: 'GET' });
  } catch {
    throw new Error(`Không thể tải model tại "${normalizedModelUrl}". Kiểm tra lại đường dẫn modelUrl.`);
  }

  if (!response.ok) {
    throw new Error(`Không tìm thấy model tại "${normalizedModelUrl}" (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('text/html')) {
    throw new Error(`Model URL "${normalizedModelUrl}" đang trả về HTML, không phải file .model3.json.`);
  }

  return normalizedModelUrl;
}

async function getLive2DModelStatic(): Promise<Live2DModelStatic> {
  if (!live2DModelStaticPromise) {
    ensureLive2DCubismCore();
    getLive2DWindow().PIXI = PIXI;

    try {
      // Wait longer for the core's Memory API (wasm instantiation) to become available.
      await waitForLive2DMemory(10000, 50);
      try {
        (getLive2DWindow().Live2DCubismCore as any).Memory.initializeAmountOfMemory?.(0);
        console.log('Live2D Memory API present and initializeAmountOfMemory invoked.');
      } catch (err) {
        console.warn('Live2D Memory initialize call threw:', err);
      }
    } catch (err) {
      // If the Memory API never appears in time, perform diagnostics and surface a clear error.
      console.warn('Waited for Live2D Memory API but it did not appear.', err);

      const scriptSrcs = Array.from(document.scripts)
        .map((s) => (s as HTMLScriptElement).src)
        .filter(Boolean) as string[];

      const candidates = new Set<string>();
      for (const src of scriptSrcs) {
        if (src.includes('live2dcubismcore')) {
          const base = src.replace(/(\.min)?\.js(\?.*)?$/, '');
          candidates.add(base + '.wasm');
          candidates.add('/live2dcubismcore.wasm');
        }
      }
      candidates.add('/live2dcubismcore.wasm');

      const results: Array<{
        url: string;
        ok: boolean;
        status: number;
        contentType?: string;
        error?: string;
      }> = [];

      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'GET' });
          results.push({ url, ok: res.ok, status: res.status, contentType: res.headers.get('content-type') ?? undefined });
        } catch (e) {
          results.push({ url, ok: false, status: 0, error: String(e) });
        }
      }

      console.warn('Live2D WASM fetch results:', results);
      const diag = results
        .map((r) => `${r.url} -> ${r.ok ? 'OK' : 'FAIL'} (status ${r.status}) content-type=${r.contentType ?? 'n/a'} error=${r.error ?? ''}`)
        .join('; ');

      const userMessage =
        'Live2D core is present but its Memory API did not initialize. Possible causes: wrong core build or WASM failed to load. Check Network tab for live2dcubismcore.wasm; server must serve it as application/wasm. WASM checks: ' +
        diag;

      console.error('Live2D init diagnostic:', userMessage);
      throw new Error(userMessage);
    }

    live2DModelStaticPromise = import('pixi-live2d-display/cubism4').then((mod) => {
      const staticRef = (mod as { Live2DModel?: Live2DModelStatic }).Live2DModel;
      if (!staticRef) {
        throw new Error('Không thể nạp Live2DModel từ pixi-live2d-display/cubism4');
      }

      if (!tickerRegistered) {
        staticRef.registerTicker(PIXI.Ticker);
        tickerRegistered = true;
      }

      return staticRef;
    });
  }

  return live2DModelStaticPromise;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useLive2D(options: UseLive2DOptions): UseLive2DResult {
  const { modelUrl, autoLoad = true, initialScale = 0.1, hitMotion } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModelLike | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const loadIdRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasModel, setHasModel] = useState(false);

  const applyModelLayout = useCallback(
    (model: Live2DModelLike, app: PIXI.Application) => {
      model.anchor?.set(0.5, 0.5);
      model.position.set(app.screen.width / 2, app.screen.height / 2);
      model.scale.set(initialScale, initialScale);
    },
    [initialScale],
  );

  const ensureApp = useCallback(() => {
    if (appRef.current) return appRef.current;

    const canvas = canvasRef.current;
    const container = containerRef.current  ;
    if (!canvas || !container) {
        console.error('Live2D.ensureApp: missing DOM elements', { canvas: !!canvas, container: !!container, canvasRef: canvasRef.current, containerRef: containerRef.current });
        setError(`Yếu tố DOM Live2D chưa sẵn sàng: canvas=${!!canvas}, container=${!!container}`);
        setHasModel(false);
        return null;
    }

    setError(null);

    const tryCreate = (opts: Partial<PIXI.IApplicationOptions> = {}) => {
        try {
        return new PIXI.Application({
            view: canvas,
            autoStart: true,
            resizeTo: container,
            backgroundAlpha: 0,
            antialias: true,
            ...opts,
        } as PIXI.IApplicationOptions);
        } catch (err) {
        console.warn('PIXI.Application creation failed', err);
        return null;
        }
    };

    const webglSupported = !!((PIXI.utils as any)?.isWebGLSupported?.());

    let app: PIXI.Application | null = null;
    if (webglSupported) {
        app = tryCreate(); // prefer WebGL
        if (!app) app = tryCreate({ forceCanvas: true }); // fallback to Canvas
    } else {
        app = tryCreate({ forceCanvas: true }); // Canvas first when WebGL not supported
        if (!app) app = tryCreate();
    }

    if (!app) {
        setError('Không thể khởi tạo renderer phù hợp (WebGL/Canvas). Kiểm tra môi trường hoặc thử trình duyệt khác.');
        return null;
    }

    const handleResize = () => {
        if (!appRef.current || !modelRef.current) return;
        applyModelLayout(modelRef.current, appRef.current);
    };

    window.addEventListener('resize', handleResize);
    resizeHandlerRef.current = handleResize;
    appRef.current = app;

    return app;
    }, [applyModelLayout]);

  const clearModel = useCallback(() => {
    const app = appRef.current;
    const model = modelRef.current;
    if (!app || !model) return;

    app.stage.removeChild(model);
    model.destroy?.({ children: true });
    modelRef.current = null;
    setHasModel(false);
  }, []);

  const reloadModel = useCallback(async () => {
    const app = ensureApp();
    if (!app) {
    //   setError('Không thể khởi tạo canvas Live2D. Vui lòng kiểm tra phần tử container/canvas.');
      setHasModel(false);
      return;
    }

    const currentLoadId = ++loadIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      clearModel();

      const safeModelUrl = await ensureModelFile(modelUrl);
      const Live2DModel = await getLive2DModelStatic();
      const model = await Live2DModel.from(safeModelUrl);

      if (currentLoadId !== loadIdRef.current) {
        model.destroy?.({ children: true });
        return;
      }

      app.stage.addChild(model);
      applyModelLayout(model, app);

      if (hitMotion) {
        model.on?.('hit', () => {
          model.motion?.(hitMotion);
        });
      }

      modelRef.current = model;
      setHasModel(true);
    } catch (err: unknown) {
      if (currentLoadId !== loadIdRef.current) return;
      setError(getErrorMessage(err));
      setHasModel(false);
    } finally {
      if (currentLoadId === loadIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyModelLayout, clearModel, ensureApp, hitMotion, modelUrl]);

  const playMotion = useCallback((motionName: string) => {
    const trimmed = motionName.trim();
    if (!trimmed || !modelRef.current) return false;
    modelRef.current.motion?.(trimmed);
    return true;
  }, []);

  useEffect(() => {
        if (!autoLoad) return;
        const raf = requestAnimationFrame(() => {
            void reloadModel();
        });
        return () => cancelAnimationFrame(raf);
    }, [autoLoad, reloadModel]);
  useEffect(() => {
        return () => {
            loadIdRef.current += 1;
            clearModel();

            if (resizeHandlerRef.current) {
            window.removeEventListener('resize', resizeHandlerRef.current);
            }

            if (appRef.current) {
            appRef.current.destroy(false, { children: true }); // Nhớ đổi thành false
            appRef.current = null;
            }
        };
    }, []);

  return {
    containerRef,
    canvasRef,
    isLoading,
    error,
    hasModel,
    reloadModel,
    playMotion,
  };
}