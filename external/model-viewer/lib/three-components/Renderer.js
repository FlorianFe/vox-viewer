/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a;
import { ACESFilmicToneMapping, EventDispatcher, WebGLRenderer } from 'three';
import { IS_WEBXR_AR_CANDIDATE } from '@google/model-viewer/lib/constants.js';
import { $tick } from '../model-viewer-base.js';
import { resolveDpr } from '@google/model-viewer/lib/utilities.js';
import { ARRenderer } from '@google/model-viewer/lib/three-components/ARRenderer.js';
import TextureUtils from './TextureUtils.js';
import * as WebGLUtils from '@google/model-viewer/lib/three-components/WebGLUtils.js';
export const $arRenderer = Symbol('arRenderer');
const $onWebGLContextLost = Symbol('onWebGLContextLost');
const $webGLContextLostHandler = Symbol('webGLContextLostHandler');
/**
 * Registers canvases with Canvas2DRenderingContexts and renders them
 * all in the same WebGLRenderingContext, spitting out textures to apply
 * to the canvases. Creates a fullscreen WebGL canvas that is not added
 * to the DOM, and on each frame, renders each registered canvas on a portion
 * of the WebGL canvas, and applies the texture on the registered canvas.
 *
 * In the future, can use ImageBitmapRenderingContext instead of
 * Canvas2DRenderingContext if supported for cheaper transfering of
 * the texture.
 */
export class Renderer extends EventDispatcher {
    constructor() {
        super();
        this.width = 0;
        this.height = 0;
        this.scenes = new Set();
        this[_a] = (event) => this[$onWebGLContextLost](event);
        const webGlOptions = { alpha: false, antialias: true };
        // Only enable certain options when Web XR capabilities are detected:
        if (IS_WEBXR_AR_CANDIDATE) {
            Object.assign(webGlOptions, { alpha: true, preserveDrawingBuffer: true });
        }
        this.canvas = document.createElement('canvas');
        this.canvas.addEventListener('webglcontextlost', this[$webGLContextLostHandler]);
        // Need to support both 'webgl' and 'experimental-webgl' (IE11).
        try {
            this.context = WebGLUtils.getContext(this.canvas, webGlOptions);
            // Patch the gl context's extension functions before passing
            // it to three.
            WebGLUtils.applyExtensionCompatibility(this.context);
            this.renderer = new WebGLRenderer({
                canvas: this.canvas,
                context: this.context,
            });
            this.renderer.autoClear = false;
            this.renderer.gammaOutput = true;

            // {{<vox-viewer> modification: no gamma correction}}
            this.renderer.gammaFactor = 1.0;
            this.renderer.physicallyCorrectLights = true;
            this.renderer.setPixelRatio(resolveDpr());
            // ACESFilmicToneMapping appears to be the most "saturated",
            // and similar to Filament's gltf-viewer.
            
            // {{<vox-viewer> modification: remove tone mapping}}
            // this.renderer.toneMapping = ACESFilmicToneMapping;
        }
        catch (error) {
            this.context = null;
            console.warn(error);
        }
        this[$arRenderer] = new ARRenderer(this);
        this.textureUtils = this.canRender ? new TextureUtils(this.renderer) : null;
        this.setRendererSize(1, 1);
        this.lastTick = performance.now();
    }
    get canRender() {
        return this.renderer != null && this.context != null;
    }
    setRendererSize(width, height) {
        if (this.canRender) {
            this.renderer.setSize(width, height, false);
        }
        this.width = width;
        this.height = height;
    }
    registerScene(scene) {
        this.scenes.add(scene);
        if (this.canRender && this.scenes.size > 0) {
            this.renderer.setAnimationLoop((time) => this.render(time));
        }
    }
    unregisterScene(scene) {
        this.scenes.delete(scene);
        if (this.canRender && this.scenes.size === 0) {
            this.renderer.setAnimationLoop(null);
        }
    }
    async supportsPresentation() {
        return this.canRender && this[$arRenderer].supportsPresentation();
    }
    get presentedScene() {
        return this[$arRenderer].presentedScene;
    }
    async present(scene) {
        try {
            return await this[$arRenderer].present(scene);
        }
        catch (error) {
            await this[$arRenderer].stopPresenting();
            throw error;
        }
        finally {
            // NOTE(cdata): Setting width and height to 0 will have the effect of
            // invoking a `setSize` the next time we render in this renderer
            this.width = this.height = 0;
        }
    }
    stopPresenting() {
        return this[$arRenderer].stopPresenting();
    }
    get isPresenting() {
        return this[$arRenderer] != null && this[$arRenderer].isPresenting;
    }
    render(t) {
        if (!this.canRender || this.isPresenting) {
            return;
        }
        const delta = t - this.lastTick;
        const dpr = resolveDpr();
        if (dpr !== this.renderer.getPixelRatio()) {
            this.renderer.setPixelRatio(dpr);
        }
        for (let scene of this.scenes) {
            const { element, width, height, context } = scene;
            element[$tick](t, delta);
            if (!scene.visible || !scene.isDirty || scene.paused) {
                continue;
            }
            const camera = scene.getCamera();
            if (width > this.width || height > this.height) {
                const maxWidth = Math.max(width, this.width);
                const maxHeight = Math.max(height, this.height);
                this.setRendererSize(maxWidth, maxHeight);
            }
            const { exposure } = scene;
            const exposureIsNumber = typeof exposure === 'number' && !self.isNaN(exposure);
            this.renderer.toneMappingExposure = exposureIsNumber ? exposure : 1.0;
            // Need to set the render target in order to prevent
            // clearing the depth from a different buffer -- possibly
            // from something in
            this.renderer.setRenderTarget(null);
            this.renderer.clearDepth();
            this.renderer.setViewport(0, 0, width, height);
            this.renderer.render(scene, camera);
            const widthDPR = width * dpr;
            const heightDPR = height * dpr;
            context.drawImage(this.renderer.domElement, 0, this.canvas.height - heightDPR, widthDPR, heightDPR, 0, 0, widthDPR, heightDPR);
            scene.isDirty = false;
        }
        this.lastTick = t;
    }
    dispose() {
        if (this.textureUtils != null) {
            this.textureUtils.dispose();
        }
        if (this.renderer != null) {
            this.renderer.dispose();
        }
        this.textureUtils = null;
        this.renderer = null;
        this.scenes.clear();
        this.canvas.removeEventListener('webglcontextlost', this[$webGLContextLostHandler]);
    }
    [(_a = $webGLContextLostHandler, $onWebGLContextLost)](event) {
        this.dispatchEvent({ type: 'contextlost', sourceEvent: event });
    }
}
//# sourceMappingURL=Renderer.js.map