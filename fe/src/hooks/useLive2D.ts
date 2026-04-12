import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

type Live2DWindow = Window & {
  PIXI?: typeof PIXI;
};

// expose PIXI ra global (bắt buộc với lib này)
const live2dWindow = window as Live2DWindow;
live2dWindow.PIXI = PIXI;
Live2DModel.registerTicker(PIXI.Ticker);

export function useLive2D(modelUrl: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModel | null>(null);

  // chống React StrictMode init 2 lần
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;
    if (isInitializedRef.current) return;

    isInitializedRef.current = true;

    const init = async () => {
      try {
        // 🔥 1. Tạo PIXI app
        const app = new PIXI.Application({
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          resizeTo: containerRef.current!,
        });

        // 🔥 CRITICAL: stop render trước khi model load
        app.ticker.stop();

        appRef.current = app;
        containerRef.current!.appendChild(app.view as HTMLCanvasElement);

        // 🔥 2. Load model
        const model = await Live2DModel.from(modelUrl);

        // nếu component đã bị unmount trong lúc await
        if (!appRef.current) {
          model.destroy();
          return;
        }

        // 🔥 3. Validate model (tránh crash _currentFrameNo)
        if (!model.internalModel) {
          console.error('Live2D model load failed');
          return;
        }

        modelRef.current = model;

        // 🔥 4. Add vào stage
        app.stage.addChild(model);

        // 🔥 5. Fit scale + position
        const fitScale =
          Math.min(
            app.screen.width / model.width,
            app.screen.height / model.height
          ) * 0.9;

        model.scale.set(fitScale);
        model.anchor.set(0.5, 0.5);
        model.position.set(
          app.screen.width / 2,
          app.screen.height / 2 + (model.height * fitScale) / 10
        );

        // 🔥 6. Start render SAU KHI mọi thứ OK
        app.ticker.start();

        setIsLoaded(true);
      } catch (err) {
        console.error('Live2D error:', err);
      }
    };

    init();

    return () => {
      // 🔥 cleanup cực quan trọng (tránh crash WebGL)
      if (appRef.current) {
        appRef.current.ticker.stop();

        if (appRef.current.view?.parentNode) {
          appRef.current.view.parentNode.removeChild(appRef.current.view);
        }

        appRef.current.destroy(true, {
          children: true,
          texture: true,
          baseTexture: true,
        });

        appRef.current = null;
      }

      modelRef.current = null;
      isInitializedRef.current = false;
      setIsLoaded(false);
    };
  }, [modelUrl]);

  // 🎭 play motion (AI → animation)
  const playMotion = (motionName: string) => {
    const model = modelRef.current;

    if (!model || typeof model.motion !== 'function') return;

    try {
      model.motion(motionName);
    } catch (error) {
      console.warn('Motion not found:', motionName, error);
    }
  };

  return {
    containerRef,
    isLoaded,
    playMotion,
  };
}