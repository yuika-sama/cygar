import React, { Suspense, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';

type PlayOpts = { hold?: boolean; loop?: boolean };

type ModelControls = {
  playMotion: (nameOrUrl?: string, opts?: PlayOpts) => Promise<number>;
  stopAll: () => void;
  playNamedMotion?: (logicalName: string, mappedName?: string, opts?: PlayOpts) => Promise<number>;
};

type ModelCanvasProps = {
  modelUrl: string;
  onLoaded?: () => void;
  className?: string;
  enableControls?: boolean;
  motionMap?: Record<string, string>;
};

const ModelObject = forwardRef<ModelControls, { url: string; onLoaded?: () => void }>(
  ({ url, onLoaded }, ref) => {
    const group = useRef<THREE.Group | null>(null);
    const vrmRef = useRef<VRM | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const currentActionRef = useRef<THREE.AnimationAction | null>(null);

    const gltf = useLoader(GLTFLoader, url, (loader) => {
      loader.crossOrigin = 'anonymous';
      loader.register((parser) => new VRMLoaderPlugin(parser));
    });

    const { camera } = useThree();

    useEffect(() => {
      if (gltf && gltf.userData && gltf.userData.vrm) {
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;
        vrm.scene.rotation.y = Math.PI;
        mixerRef.current = new THREE.AnimationMixer(vrm.scene);

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // center camera
        try {
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const center = new THREE.Vector3();
          box.getCenter(center);
          camera.lookAt(center.x, center.y, center.z);
        } catch (e) {
          // ignore
        }

        onLoaded?.();
      }
    }, [gltf, onLoaded, camera]);

    useFrame((_state, delta) => {
      if (vrmRef.current) vrmRef.current.update(delta);
      if (mixerRef.current) mixerRef.current.update(delta);
    });

    useImperativeHandle(
      ref,
      () => ({
        playMotion: async (nameOrUrl?: string, opts?: PlayOpts) => {
          if (!nameOrUrl || !vrmRef.current || !mixerRef.current) return 0;

          const stopCurrent = (fadeOut = 0.2) => {
            if (currentActionRef.current) {
              try {
                currentActionRef.current.fadeOut(fadeOut);
              } catch (e) {}
              currentActionRef.current = null;
            }
          };

          // VRMA file playback
          if (nameOrUrl.toLowerCase().endsWith('.vrma')) {
            try {
              const loader = new GLTFLoader();
              loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

              const vrmaGltf = await loader.loadAsync(nameOrUrl);
              const vrmAnimation = vrmaGltf.userData?.vrmAnimations?.[0];

              if (vrmAnimation) {
                const clip = createVRMAnimationClip(vrmAnimation, vrmRef.current!);
                stopCurrent();
                const action = mixerRef.current!.clipAction(clip);
                if (opts?.loop) {
                  action.setLoop(THREE.LoopRepeat, Infinity);
                } else {
                  action.setLoop(THREE.LoopOnce, 1);
                  (action as any).clampWhenFinished = true;
                }
                action.reset();
                action.fadeIn(0.2);
                action.play();
                currentActionRef.current = action;
                return clip.duration || 1;
              }
            } catch (err) {
              console.error('VRMA load error:', err);
              return 0;
            }
            return 0;
          }

          // GLTF animation clip by name
          try {
            const clip = (gltf as any)?.animations?.find((c: any) => c.name === nameOrUrl);
            if (clip) {
              stopCurrent();
              const action = mixerRef.current!.clipAction(clip);
              if (opts?.loop) {
                action.setLoop(THREE.LoopRepeat, Infinity);
              } else {
                action.setLoop(THREE.LoopOnce, 1);
                (action as any).clampWhenFinished = true;
              }
              action.reset();
              action.fadeIn(0.2);
              action.play();
              currentActionRef.current = action;
              return clip.duration || 1;
            }
          } catch (e) {
            // ignore
          }

          // VRM expression fallback
          const vrm = vrmRef.current;
          if (vrm && (vrm as any).expressionManager) {
            try {
              (vrm as any).expressionManager.setValue(nameOrUrl as any, 1.0);
              if (!opts?.hold) {
                const exprDur = 0.8;
                setTimeout(() => {
                  (vrm as any).expressionManager.setValue(nameOrUrl as any, 0);
                }, exprDur * 1000);
                return exprDur;
              } else {
                // hold until stopped explicitly
                return 0;
              }
            } catch (err) {
              // ignore
            }
          }

          return 0;
        },
        stopAll: () => {
          try {
            mixerRef.current?.stopAllAction();
            currentActionRef.current = null;
            if (vrmRef.current && (vrmRef.current as any).expressionManager) {
              try {
                const em: any = (vrmRef.current as any).expressionManager;
                if (em.expressions) {
                  Object.keys(em.expressions).forEach((k) => em.setValue(k, 0));
                } else if (em._expressions) {
                  Object.keys(em._expressions).forEach((k) => em.setValue(k, 0));
                }
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {}
        },
        playNamedMotion: async (logicalName: string, mappedName?: string, opts?: PlayOpts) => {
          const target = mappedName || logicalName;
          return (await (ref as any)?.current?.playMotion?.(target, opts)) || 0;
        },
      }),
      [gltf]
    );

    return (
      <group ref={group as any} dispose={null}>
        <primitive object={gltf.scene} />
      </group>
    );
  }
);

const ModelCanvas = forwardRef<ModelControls, ModelCanvasProps>(
  ({ modelUrl, onLoaded, className, enableControls = true, motionMap }, ref) => {
    const modelRef = useRef<ModelControls | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        playMotion: (name?: string, opts?: PlayOpts) => modelRef.current?.playMotion(name, opts) || Promise.resolve(0),
        stopAll: () => modelRef.current?.stopAll(),
        // playNamedMotion resolved here using motionMap
        playNamedMotion: (logical: string, mapped?: string, opts?: PlayOpts) => {
          const target = mapped || (motionMap && motionMap[logical]) || logical;
          return modelRef.current?.playMotion(target, opts) || Promise.resolve(0);
        },
      }),
      [motionMap]
    );

    return (
      <div className={className}>
        <Canvas camera={{ position: [0, 1.6, 2.8], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 2, 5]} intensity={1} />
          <Suspense fallback={null}>
            <ModelObject ref={modelRef} url={modelUrl} onLoaded={onLoaded} />
          </Suspense>
          {enableControls && <OrbitControls target={[0, 1, 0]} enablePan={false} enableZoom={false} />}
        </Canvas>
      </div>
    );
  }
);

export default ModelCanvas;
