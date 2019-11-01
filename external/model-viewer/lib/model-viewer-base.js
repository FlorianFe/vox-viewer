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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
import { property } from 'lit-element';
import { UpdatingElement } from 'lit-element/lib/updating-element';
import { HAS_INTERSECTION_OBSERVER, HAS_RESIZE_OBSERVER } from '@google/model-viewer/lib/constants.js';
import { makeTemplate } from '@google/model-viewer/lib/template.js';
import { $evictionPolicy, CachingGLTFLoader } from '@google/model-viewer/lib/three-components/CachingGLTFLoader.js';
import ModelScene from '@google/model-viewer/lib/three-components/ModelScene.js';
import { Renderer } from './three-components/Renderer.js';
import { debounce, deserializeUrl, resolveDpr } from '@google/model-viewer/lib/utilities.js';
import { ProgressTracker } from '@google/model-viewer/lib/utilities/progress-tracker.js';
let renderer = new Renderer();
const CLEAR_MODEL_TIMEOUT_MS = 1000;
const FALLBACK_SIZE_UPDATE_THRESHOLD_MS = 50;
const UNSIZED_MEDIA_WIDTH = 300;
const UNSIZED_MEDIA_HEIGHT = 150;
const $updateSize = Symbol('updateSize');
const $loaded = Symbol('loaded');
const $template = Symbol('template');
const $fallbackResizeHandler = Symbol('fallbackResizeHandler');
const $defaultAriaLabel = Symbol('defaultAriaLabel');
const $resizeObserver = Symbol('resizeObserver');
const $intersectionObserver = Symbol('intersectionObserver');
const $lastDpr = Symbol('lastDpr');
const $clearModelTimeout = Symbol('clearModelTimeout');
const $onContextLost = Symbol('onContextLost');
const $contextLostHandler = Symbol('contextLostHandler');
export const $isInRenderTree = Symbol('isInRenderTree');
export const $resetRenderer = Symbol('resetRenderer');
export const $ariaLabel = Symbol('ariaLabel');
export const $loadedTime = Symbol('loadedTime');
export const $updateSource = Symbol('updateSource');
export const $markLoaded = Symbol('markLoaded');
export const $container = Symbol('container');
export const $canvas = Symbol('canvas');
export const $scene = Symbol('scene');
export const $needsRender = Symbol('needsRender');
export const $tick = Symbol('tick');
export const $onModelLoad = Symbol('onModelLoad');
export const $onResize = Symbol('onResize');
export const $onUserModelOrbit = Symbol('onUserModelOrbit');
export const $renderer = Symbol('renderer');
export const $progressTracker = Symbol('progressTracker');
export const $getLoaded = Symbol('getLoaded');
export const $getModelIsVisible = Symbol('getModelIsVisible');
/**
 * Definition for a basic <model-viewer> element.
 */
export default class ModelViewerElementBase extends UpdatingElement {
    /**
     * Creates a new ModelViewerElement.
     */
    constructor() {
        super();
        this.alt = null;
        this.src = null;
        this[_a] = false;
        this[_b] = false;
        this[_c] = 0;
        this[_d] = resolveDpr();
        this[_e] = null;
        this[_f] = debounce(() => {
            const boundingRect = this.getBoundingClientRect();
            this[$updateSize](boundingRect);
        }, FALLBACK_SIZE_UPDATE_THRESHOLD_MS);
        this[_g] = null;
        this[_h] = null;
        this[_j] = new ProgressTracker();
        this[_k] = (event) => this[$onContextLost](event);
        // NOTE(cdata): It is *very important* to access this template first so that
        // the ShadyCSS template preparation steps happen before element styling in
        // IE11:
        const template = this.constructor.template;
        if (window.ShadyCSS) {
            window.ShadyCSS.styleElement(this, {});
        }
        // NOTE(cdata): The canonical ShadyCSS examples suggest that the Shadow Root
        // should be created after the invocation of ShadyCSS.styleElement
        this.attachShadow({ mode: 'open', delegatesFocus: true });
        const shadowRoot = this.shadowRoot;
        shadowRoot.appendChild(template.content.cloneNode(true));
        this[$container] = shadowRoot.querySelector('.container');
        this[$canvas] = shadowRoot.querySelector('canvas');
        this[$defaultAriaLabel] = this[$canvas].getAttribute('aria-label');
        // Because of potential race conditions related to invoking the constructor
        // we only use the bounding rect to set the initial size if the element is
        // already connected to the document:
        let width, height;
        if (this.isConnected) {
            const rect = this.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
        }
        else {
            width = UNSIZED_MEDIA_WIDTH;
            height = UNSIZED_MEDIA_HEIGHT;
        }
        // Create the underlying ModelScene.
        this[$scene] = new ModelScene({ canvas: this[$canvas], element: this, width, height, renderer });
        this[$scene].addEventListener('model-load', (event) => {
            this[$markLoaded]();
            this[$onModelLoad](event);
            this.dispatchEvent(new CustomEvent('load', { detail: { url: event.url } }));
        });
        // Update initial size on microtask timing so that subclasses have a
        // chance to initialize
        Promise.resolve().then(() => {
            this[$updateSize](this.getBoundingClientRect(), true);
        });
        if (HAS_RESIZE_OBSERVER) {
            // Set up a resize observer so we can scale our canvas
            // if our <model-viewer> changes
            this[$resizeObserver] = new ResizeObserver((entries) => {
                // Don't resize anything if in AR mode; otherwise the canvas
                // scaling to fullscreen on entering AR will clobber the flat/2d
                // dimensions of the element.
                if (renderer.isPresenting) {
                    return;
                }
                for (let entry of entries) {
                    if (entry.target === this) {
                        this[$updateSize](entry.contentRect);
                    }
                }
            });
        }
        if (HAS_INTERSECTION_OBSERVER) {
            const enterRenderTreeProgress = this[$progressTracker].beginActivity();
            this[$intersectionObserver] = new IntersectionObserver(entries => {
                for (let entry of entries) {
                    if (entry.target === this) {
                        const oldValue = this[$isInRenderTree];
                        this[$isInRenderTree] = this[$scene].visible = entry.isIntersecting;
                        this.requestUpdate($isInRenderTree, oldValue);
                        if (this[$isInRenderTree]) {
                            // Wait a microtask to give other properties a chance to respond
                            // to the state change, then resolve progress on entering the
                            // render tree:
                            Promise.resolve().then(() => {
                                enterRenderTreeProgress(1);
                            });
                        }
                    }
                }
            }, {
                root: null,
                rootMargin: '10px',
                threshold: 0,
            });
        }
        else {
            // If there is no intersection obsever, then all models should be visible
            // at all times:
            this[$isInRenderTree] = this[$scene].visible = true;
            this.requestUpdate($isInRenderTree, false);
        }
    }
    static [$resetRenderer]() {
        renderer.dispose();
        renderer = new Renderer();
    }
    static get is() {
        return 'model-viewer';
    }
    /** @nocollapse */
    static get template() {
        if (!this.hasOwnProperty($template)) {
            this[$template] = makeTemplate(this.is);
        }
        return this[$template];
    }
    static set modelCacheSize(value) {
        CachingGLTFLoader[$evictionPolicy].evictionThreshold = value;
    }
    static get modelCacheSize() {
        return CachingGLTFLoader[$evictionPolicy].evictionThreshold;
    }
    get loaded() {
        return this[$getLoaded]();
    }
    get [(_a = $isInRenderTree, _b = $loaded, _c = $loadedTime, _d = $lastDpr, _e = $clearModelTimeout, _f = $fallbackResizeHandler, _g = $resizeObserver, _h = $intersectionObserver, _j = $progressTracker, _k = $contextLostHandler, $renderer)]() {
        return renderer;
    }
    get modelIsVisible() {
        return this[$getModelIsVisible]();
    }
    connectedCallback() {
        super.connectedCallback && super.connectedCallback();
        if (HAS_RESIZE_OBSERVER) {
            this[$resizeObserver].observe(this);
        }
        else {
            self.addEventListener('resize', this[$fallbackResizeHandler]);
        }
        if (HAS_INTERSECTION_OBSERVER) {
            this[$intersectionObserver].observe(this);
        }
        this[$renderer].addEventListener('contextlost', this[$contextLostHandler]);
        this[$renderer].registerScene(this[$scene]);
        this[$scene].isDirty = true;
        if (this[$clearModelTimeout] != null) {
            self.clearTimeout(this[$clearModelTimeout]);
            this[$clearModelTimeout] = null;
            // Force an update in case the model has been evicted from our GLTF cache
            // @see https://lit-element.polymer-project.org/guide/lifecycle#requestupdate
            this.requestUpdate('src', null);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();
        if (HAS_RESIZE_OBSERVER) {
            this[$resizeObserver].unobserve(this);
        }
        else {
            self.removeEventListener('resize', this[$fallbackResizeHandler]);
        }
        if (HAS_INTERSECTION_OBSERVER) {
            this[$intersectionObserver].unobserve(this);
        }
        this[$renderer].removeEventListener('contextlost', this[$contextLostHandler]);
        this[$renderer].unregisterScene(this[$scene]);
        this[$clearModelTimeout] = self.setTimeout(() => {
            this[$scene].model.clear();
        }, CLEAR_MODEL_TIMEOUT_MS);
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        // NOTE(cdata): If a property changes from values A -> B -> A in the space
        // of a microtask, LitElement/UpdatingElement will notify of a change even
        // though the value has effectively not changed, so we need to check to make
        // sure that the value has actually changed before changing the loaded flag.
        if (changedProperties.has('src') &&
            (this.src == null || this.src !== this[$scene].model.url)) {
            this[$loaded] = false;
            this[$loadedTime] = 0;
            (async () => {
                const updateSourceProgress = this[$progressTracker].beginActivity();
                await this[$updateSource]((progress) => updateSourceProgress(progress * 0.9));
                updateSourceProgress(1.0);
            })();
        }
        if (changedProperties.has('alt')) {
            const ariaLabel = this.alt == null ? this[$defaultAriaLabel] : this.alt;
            this[$canvas].setAttribute('aria-label', ariaLabel);
        }
    }
    toDataURL(type, encoderOptions) {
        return this[$canvas].toDataURL(type, encoderOptions);
    }
    get [$ariaLabel]() {
        return (this.alt == null || this.alt === 'null') ? this[$defaultAriaLabel] :
            this.alt;
    }
    // NOTE(cdata): Although this may seem extremely redundant, it is required in
    // order to support overloading when TypeScript is compiled to ES5
    // @see https://github.com/Polymer/lit-element/pull/745
    // @see https://github.com/microsoft/TypeScript/issues/338
    [$getLoaded]() {
        return this[$loaded];
    }
    // @see [$getLoaded]
    [$getModelIsVisible]() {
        return true;
    }
    /**
     * Called on initialization and when the resize observer fires.
     */
    [$updateSize]({ width, height }, forceApply = false) {
        const { width: prevWidth, height: prevHeight } = this[$scene].getSize();
        // Round off the pixel size
        const intWidth = parseInt(width, 10);
        const intHeight = parseInt(height, 10);
        this[$container].style.width = `${width}px`;
        this[$container].style.height = `${height}px`;
        if (forceApply || (prevWidth !== intWidth || prevHeight !== intHeight)) {
            this[$onResize]({ width: intWidth, height: intHeight });
        }
    }
    [$tick](_time, _delta) {
        const dpr = resolveDpr();
        // There is no standard way to detect when DPR changes on account of zoom.
        // Here we keep a local copy of DPR updated, and when it changes we invoke
        // the fallback resize handler. It might be better to invoke the resize
        // handler directly in this case, but the fallback is debounced which will
        // save us from doing too much work when DPR and window size changes at the
        // same time.
        if (dpr !== this[$lastDpr]) {
            this[$lastDpr] = dpr;
            this[$fallbackResizeHandler]();
        }
    }
    [$markLoaded]() {
        if (this[$loaded]) {
            return;
        }
        this[$loaded] = true;
        this[$loadedTime] = performance.now();
        // Asynchronously invoke `update`:
        this.requestUpdate();
    }
    [$needsRender]() {
        this[$scene].isDirty = true;
    }
    [$onModelLoad](_event) {
        this[$needsRender]();
    }
    [$onResize](e) {
        this[$scene].setSize(e.width, e.height);
        this[$needsRender]();
    }
    [$onContextLost](event) {
        this.dispatchEvent(new CustomEvent('error', { detail: { type: 'webglcontextlost', sourceError: event.attachment } }));
    }
    /**
     * Parses the element for an appropriate source URL and
     * sets the views to use the new model based off of the `preload`
     * attribute.
     */
    async [$updateSource](progressCallback = () => { }) {
        const source = this.src;
        try {
            this[$canvas].classList.add('show');
            await this[$scene].setModelSource(source, progressCallback);
        }
        catch (error) {
            this[$canvas].classList.remove('show');
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
    }
}
__decorate([
    property({ type: String })
], ModelViewerElementBase.prototype, "alt", void 0);
__decorate([
    property({ converter: { fromAttribute: deserializeUrl } })
], ModelViewerElementBase.prototype, "src", void 0);
//# sourceMappingURL=model-viewer-base.js.map