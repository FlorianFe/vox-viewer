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
import { property } from 'lit-element';
import { Spherical, Vector3 } from 'three';
import { style } from '@google/model-viewer/lib/decorators.js';
import { $ariaLabel, $loadedTime, $needsRender, $onModelLoad, $onResize, $scene, $tick } from '../model-viewer-base.js';
import { normalizeUnit } from '@google/model-viewer/lib/styles/conversions.js';
import { numberNode, parseExpressions } from '@google/model-viewer/lib/styles/parsers.js';
import { DEFAULT_FOV_DEG } from '@google/model-viewer/lib/three-components/Model.js';
import { ChangeSource, SmoothControls } from '@google/model-viewer/lib/three-components/SmoothControls.js';
import { timeline } from '@google/model-viewer/lib/utilities/animation.js';
// NOTE(cdata): The following "animation" timing functions are deliberately
// being used in favor of CSS animations. In Safari 12.1 and 13, CSS animations
// would cause the interaction prompt to glitch unexpectedly
// @see https://github.com/GoogleWebComponents/model-viewer/issues/839
const PROMPT_ANIMATION_TIME = 5000;
// For timing purposes, a "frame" is a timing agnostic relative unit of time
// and a "value" is a target value for the keyframe.
const wiggle = timeline(0, [
    { frames: 6, value: 0 },
    { frames: 5, value: -1 },
    { frames: 1, value: -1 },
    { frames: 8, value: 1 },
    { frames: 1, value: 1 },
    { frames: 5, value: 0 },
    { frames: 12, value: 0 }
]);
const fade = timeline(0, [
    { frames: 2, value: 0 },
    { frames: 1, value: 1 },
    { frames: 5, value: 1 },
    { frames: 1, value: 0 },
    { frames: 4, value: 0 }
]);
export const InteractionPromptStrategy = {
    AUTO: 'auto',
    WHEN_FOCUSED: 'when-focused',
    NONE: 'none'
};
export const InteractionPromptStyle = {
    BASIC: 'basic',
    WIGGLE: 'wiggle'
};
export const InteractionPolicy = {
    ALWAYS_ALLOW: 'always-allow',
    WHEN_FOCUSED: 'allow-when-focused'
};
export const DEFAULT_CAMERA_ORBIT = '0deg 75deg 105%';
const DEFAULT_CAMERA_TARGET = 'auto auto auto';
const DEFAULT_FIELD_OF_VIEW = 'auto';
export const fieldOfViewIntrinsics = (element) => {
    return {
        basis: [numberNode(element[$zoomAdjustedFieldOfView] * Math.PI / 180, 'rad')],
        keywords: { auto: [null] }
    };
};
export const cameraOrbitIntrinsics = (() => {
    const defaultTerms = parseExpressions(DEFAULT_CAMERA_ORBIT)[0]
        .terms;
    const theta = normalizeUnit(defaultTerms[0]);
    const phi = normalizeUnit(defaultTerms[1]);
    return (element) => {
        const radius = element[$scene].model.idealCameraDistance;
        return {
            basis: [theta, phi, numberNode(radius, 'm')],
            keywords: { auto: [null, null, numberNode(105, '%')] }
        };
    };
})();
export const cameraTargetIntrinsics = (element) => {
    const center = element[$scene].model.boundingBox.getCenter(new Vector3);
    return {
        basis: [
            numberNode(center.x, 'm'),
            numberNode(center.y, 'm'),
            numberNode(center.z, 'm')
        ],
        keywords: { auto: [null, null, null] }
    };
};
const HALF_FIELD_OF_VIEW_RADIANS = (DEFAULT_FOV_DEG / 2) * Math.PI / 180;
const HALF_PI = Math.PI / 2.0;
const THIRD_PI = Math.PI / 3.0;
const QUARTER_PI = HALF_PI / 2.0;
const PHI = 2.0 * Math.PI;
const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];
export const DEFAULT_INTERACTION_PROMPT_THRESHOLD = 3000;
export const INTERACTION_PROMPT = 'Use mouse, touch or arrow keys to control the camera!';
export const $controls = Symbol('controls');
export const $promptElement = Symbol('promptElement');
export const $promptAnimatedContainer = Symbol('promptAnimatedContainer');
export const $idealCameraDistance = Symbol('idealCameraDistance');
const $framedFieldOfView = Symbol('framedFieldOfView');
const $deferInteractionPrompt = Symbol('deferInteractionPrompt');
const $updateAria = Symbol('updateAria');
const $updateCamera = Symbol('updateCamera');
const $blurHandler = Symbol('blurHandler');
const $focusHandler = Symbol('focusHandler');
const $changeHandler = Symbol('changeHandler');
const $onBlur = Symbol('onBlur');
const $onFocus = Symbol('onFocus');
const $onChange = Symbol('onChange');
const $shouldPromptUserToInteract = Symbol('shouldPromptUserToInteract');
const $waitingToPromptUser = Symbol('waitingToPromptUser');
const $userPromptedOnce = Symbol('userPromptedOnce');
const $promptElementVisibleTime = Symbol('promptElementVisibleTime');
const $lastPromptOffset = Symbol('lastPromptOffset');
const $focusedTime = Symbol('focusedTime');
const $zoomAdjustedFieldOfView = Symbol('zoomAdjustedFieldOfView');
const $lastSpherical = Symbol('lastSpherical');
const $jumpCamera = Symbol('jumpCamera');
const $syncCameraOrbit = Symbol('syncCameraOrbit');
const $syncFieldOfView = Symbol('syncFieldOfView');
const $syncCameraTarget = Symbol('syncCameraTarget');
export const ControlsMixin = (ModelViewerElement) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    class ControlsModelViewerElement extends ModelViewerElement {
        constructor() {
            super(...arguments);
            this.cameraControls = false;
            this.cameraOrbit = DEFAULT_CAMERA_ORBIT;
            this.cameraTarget = DEFAULT_CAMERA_TARGET;
            this.fieldOfView = DEFAULT_FIELD_OF_VIEW;
            this.interactionPromptThreshold = DEFAULT_INTERACTION_PROMPT_THRESHOLD;
            this.interactionPromptStyle = InteractionPromptStyle.WIGGLE;
            this.interactionPrompt = InteractionPromptStrategy.AUTO;
            this.interactionPolicy = InteractionPolicy.ALWAYS_ALLOW;
            this[_a] = this.shadowRoot.querySelector('.interaction-prompt');
            this[_b] = this.shadowRoot.querySelector('.interaction-prompt > .animated-container');
            this[_c] = Infinity;
            this[_d] = 0;
            this[_e] = Infinity;
            this[_f] = false;
            this[_g] = false;
            this[_h] = true;
            this[_j] = new SmoothControls(this[$scene].getCamera(), this[$scene].canvas);
            this[_k] = null;
            this[_l] = DEFAULT_FOV_DEG;
            this[_m] = new Spherical();
            this[_o] = false;
            this[_p] = (event) => this[$onChange](event);
            this[_q] = () => this[$onFocus]();
            this[_r] = () => this[$onBlur]();
        }
        getCameraOrbit() {
            const { theta, phi, radius } = this[$lastSpherical];
            return { theta, phi, radius };
        }
        getCameraTarget() {
            return this[$controls].getTarget();
        }
        getFieldOfView() {
            return this[$controls].getFieldOfView();
        }
        jumpCameraToGoal() {
            this[$jumpCamera] = true;
            this.requestUpdate($jumpCamera, false);
        }
        connectedCallback() {
            super.connectedCallback();
            this[$controls].addEventListener('change', this[$changeHandler]);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            this[$controls].removeEventListener('change', this[$changeHandler]);
        }
        updated(changedProperties) {
            super.updated(changedProperties);
            const controls = this[$controls];
            const scene = this[$scene];
            if (changedProperties.has('cameraControls')) {
                if (this.cameraControls) {
                    controls.enableInteraction();
                    if (this.interactionPrompt === InteractionPromptStrategy.AUTO) {
                        this[$waitingToPromptUser] = true;
                    }
                    scene.canvas.addEventListener('focus', this[$focusHandler]);
                    scene.canvas.addEventListener('blur', this[$blurHandler]);
                }
                else {
                    scene.canvas.removeEventListener('focus', this[$focusHandler]);
                    scene.canvas.removeEventListener('blur', this[$blurHandler]);
                    controls.disableInteraction();
                    this[$deferInteractionPrompt]();
                }
            }
            if (changedProperties.has('interactionPrompt') ||
                changedProperties.has('cameraControls') ||
                changedProperties.has('src')) {
                if (this.interactionPrompt === InteractionPromptStrategy.AUTO &&
                    this.cameraControls) {
                    this[$waitingToPromptUser] = true;
                }
                else {
                    this[$deferInteractionPrompt]();
                }
            }
            if (changedProperties.has('interactionPromptStyle')) {
                this[$promptElement].classList.toggle('wiggle', this.interactionPromptStyle === InteractionPromptStyle.WIGGLE);
            }
            if (changedProperties.has('interactionPolicy')) {
                const interactionPolicy = this.interactionPolicy;
                controls.applyOptions({ interactionPolicy });
            }
            if (this[$jumpCamera] === true) {
                Promise.resolve().then(() => {
                    this[$controls].jumpToGoal();
                    this[$jumpCamera] = false;
                });
            }
        }
        [(_a = $promptElement, _b = $promptAnimatedContainer, _c = $focusedTime, _d = $lastPromptOffset, _e = $promptElementVisibleTime, _f = $userPromptedOnce, _g = $waitingToPromptUser, _h = $shouldPromptUserToInteract, _j = $controls, _k = $framedFieldOfView, _l = $zoomAdjustedFieldOfView, _m = $lastSpherical, _o = $jumpCamera, _p = $changeHandler, _q = $focusHandler, _r = $blurHandler, $syncFieldOfView)](style) {
            this[$controls].setFieldOfView(style[0] * 180 / Math.PI);
        }
        [$syncCameraOrbit](style) {
            this[$controls].setOrbit(style[0], style[1], style[2]);
        }
        [$syncCameraTarget](style) {
            const [x, y, z] = style;
            const scene = this[$scene];
            this[$controls].setTarget(x, y, z);
            // TODO(#837): Mutating scene.pivotCenter should automatically adjust
            // pivot rotation
            scene.pivotCenter.set(x, y, z);
            scene.setPivotRotation(scene.getPivotRotation());
        }
        [$tick](time, delta) {
            super[$tick](time, delta);
            if (this[$waitingToPromptUser] &&
                this.interactionPrompt !== InteractionPromptStrategy.NONE) {
                const thresholdTime = this.interactionPrompt === InteractionPromptStrategy.AUTO ?
                    this[$loadedTime] :
                    this[$focusedTime];
                if (this.loaded &&
                    time > thresholdTime + this.interactionPromptThreshold) {
                    this[$scene].canvas.setAttribute('aria-label', INTERACTION_PROMPT);
                    // NOTE(cdata): After notifying users that the controls are
                    // available, we flag that the user has been prompted at least
                    // once, and then effectively stop the idle timer. If the camera
                    // orbit changes after this point, the user will never be prompted
                    // again for this particular <model-element> instance:
                    this[$userPromptedOnce] = true;
                    this[$waitingToPromptUser] = false;
                    this[$promptElementVisibleTime] = time;
                    this[$promptElement].classList.add('visible');
                }
            }
            if (isFinite(this[$promptElementVisibleTime]) &&
                this.interactionPromptStyle === InteractionPromptStyle.WIGGLE) {
                const scene = this[$scene];
                const animationTime = ((time - this[$promptElementVisibleTime]) / PROMPT_ANIMATION_TIME) %
                    1;
                const offset = wiggle(animationTime);
                const opacity = fade(animationTime);
                const xOffset = offset * scene.width * 0.05;
                const deltaTheta = (offset - this[$lastPromptOffset]) * Math.PI / 16;
                this[$promptAnimatedContainer].style.transform =
                    `translateX(${xOffset}px)`;
                this[$promptAnimatedContainer].style.opacity = `${opacity}`;
                this[$controls].adjustOrbit(deltaTheta, 0, 0, 0);
                this[$lastPromptOffset] = offset;
                this[$needsRender]();
            }
            this[$controls].update(time, delta);
            const target = this.getCameraTarget();
            if (!this[$scene].pivotCenter.equals(target)) {
                this[$scene].pivotCenter.copy(target);
                this[$scene].setPivotRotation(this[$scene].getPivotRotation());
            }
        }
        [$deferInteractionPrompt]() {
            // Effectively cancel the timer waiting for user interaction:
            this[$waitingToPromptUser] = false;
            this[$promptElement].classList.remove('visible');
            this[$promptElementVisibleTime] = Infinity;
            // Implicitly there was some reason to defer the prompt. If the user
            // has been prompted at least once already, we no longer need to
            // prompt the user, although if they have never been prompted we
            // should probably prompt them at least once just in case.
            if (this[$userPromptedOnce]) {
                this[$shouldPromptUserToInteract] = false;
            }
        }
        /**
         * Set the camera's radius and field of view to properly frame the scene
         * based on changes to the model or aspect ratio, and maintains the
         * relative camera zoom state.
         */
        [$updateCamera]() {
            const controls = this[$controls];
            const { aspect } = this[$scene];
            const { idealCameraDistance, fieldOfViewAspect } = this[$scene].model;
            const maximumRadius = idealCameraDistance * 2;
            controls.applyOptions({ maximumRadius });
            const modelRadius = idealCameraDistance * Math.sin(HALF_FIELD_OF_VIEW_RADIANS);
            const near = 0;
            const far = maximumRadius + modelRadius;
            controls.updateIntrinsics(near, far, aspect);
            if (this.fieldOfView === DEFAULT_FIELD_OF_VIEW) {
                const zoom = (this[$framedFieldOfView] != null) ?
                    controls.getFieldOfView() / this[$framedFieldOfView] :
                    1;
                const vertical = Math.tan(HALF_FIELD_OF_VIEW_RADIANS) *
                    Math.max(1, fieldOfViewAspect / aspect);
                this[$framedFieldOfView] = 2 * Math.atan(vertical) * 180 / Math.PI;
                const maximumFieldOfView = this[$framedFieldOfView];
                controls.applyOptions({ maximumFieldOfView });
                // TODO(#835): Move computation of this value to Model or ModelScene
                this[$zoomAdjustedFieldOfView] = this[$framedFieldOfView] * zoom;
                this.requestUpdate('fieldOfView', this.fieldOfView);
            }
            controls.jumpToGoal();
        }
        [$updateAria]() {
            // NOTE(cdata): It is possible that we might want to record the
            // last spherical when the label actually changed. Right now, the
            // side-effect the current implementation is that we will only
            // announce the first view change that occurs after the element
            // becomes focused.
            const { theta: lastTheta, phi: lastPhi } = this[$lastSpherical];
            const { theta, phi } = this[$controls].getCameraSpherical(this[$lastSpherical]);
            const rootNode = this.getRootNode();
            // Only change the aria-label if <model-viewer> is currently focused:
            if (rootNode != null && rootNode.activeElement === this) {
                const lastAzimuthalQuadrant = (4 + Math.floor(((lastTheta % PHI) + QUARTER_PI) / HALF_PI)) % 4;
                const azimuthalQuadrant = (4 + Math.floor(((theta % PHI) + QUARTER_PI) / HALF_PI)) % 4;
                const lastPolarTrient = Math.floor(lastPhi / THIRD_PI);
                const polarTrient = Math.floor(phi / THIRD_PI);
                if (azimuthalQuadrant !== lastAzimuthalQuadrant ||
                    polarTrient !== lastPolarTrient) {
                    const { canvas } = this[$scene];
                    const azimuthalQuadrantLabel = AZIMUTHAL_QUADRANT_LABELS[azimuthalQuadrant];
                    const polarTrientLabel = POLAR_TRIENT_LABELS[polarTrient];
                    const ariaLabel = `View from stage ${polarTrientLabel}${azimuthalQuadrantLabel}`;
                    canvas.setAttribute('aria-label', ariaLabel);
                }
            }
        }
        [$onResize](event) {
            super[$onResize](event);
            this[$updateCamera]();
        }
        [$onModelLoad](event) {
            super[$onModelLoad](event);
            this[$updateCamera]();
            this.requestUpdate('cameraOrbit', this.cameraOrbit);
            this.requestUpdate('cameraTarget', this.cameraTarget);
            this[$controls].jumpToGoal();
        }
        [$onFocus]() {
            const { canvas } = this[$scene];
            if (!isFinite(this[$focusedTime])) {
                this[$focusedTime] = performance.now();
            }
            // NOTE(cdata): On every re-focus, we switch the aria-label back to
            // the original, non-prompt label if appropriate. If the user has
            // already interacted, they no longer need to hear the prompt.
            // Otherwise, they will hear it again after the idle prompt threshold
            // has been crossed.
            const ariaLabel = this[$ariaLabel];
            if (canvas.getAttribute('aria-label') !== ariaLabel) {
                canvas.setAttribute('aria-label', ariaLabel);
            }
            // NOTE(cdata): When focused, if the user has yet to interact with the
            // camera controls (that is, we "should" prompt the user), we begin
            // the idle timer and indicate that we are waiting for it to cross the
            // prompt threshold:
            if (!isFinite(this[$promptElementVisibleTime]) &&
                this[$shouldPromptUserToInteract]) {
                this[$waitingToPromptUser] = true;
            }
        }
        [$onBlur]() {
            this[$waitingToPromptUser] = false;
            this[$promptElement].classList.remove('visible');
            this[$promptElementVisibleTime] = Infinity;
            this[$focusedTime] = Infinity;
        }
        [$onChange]({ source }) {
            this[$updateAria]();
            this[$needsRender]();
            if (source === ChangeSource.USER_INTERACTION) {
                this[$deferInteractionPrompt]();
            }
            this.dispatchEvent(new CustomEvent('camera-change', { detail: { source } }));
        }
    }
    __decorate([
        property({ type: Boolean, attribute: 'camera-controls' })
    ], ControlsModelViewerElement.prototype, "cameraControls", void 0);
    __decorate([
        style({
            intrinsics: cameraOrbitIntrinsics,
            observeEffects: true,
            updateHandler: $syncCameraOrbit
        }),
        property({ type: String, attribute: 'camera-orbit', hasChanged: () => true })
    ], ControlsModelViewerElement.prototype, "cameraOrbit", void 0);
    __decorate([
        style({
            intrinsics: cameraTargetIntrinsics,
            observeEffects: true,
            updateHandler: $syncCameraTarget
        }),
        property({ type: String, attribute: 'camera-target', hasChanged: () => true })
    ], ControlsModelViewerElement.prototype, "cameraTarget", void 0);
    __decorate([
        style({
            intrinsics: fieldOfViewIntrinsics,
            observeEffects: true,
            updateHandler: $syncFieldOfView
        }),
        property({ type: String, attribute: 'field-of-view', hasChanged: () => true })
    ], ControlsModelViewerElement.prototype, "fieldOfView", void 0);
    __decorate([
        property({ type: Number, attribute: 'interaction-prompt-threshold' })
    ], ControlsModelViewerElement.prototype, "interactionPromptThreshold", void 0);
    __decorate([
        property({ type: String, attribute: 'interaction-prompt-style' })
    ], ControlsModelViewerElement.prototype, "interactionPromptStyle", void 0);
    __decorate([
        property({ type: String, attribute: 'interaction-prompt' })
    ], ControlsModelViewerElement.prototype, "interactionPrompt", void 0);
    __decorate([
        property({ type: String, attribute: 'interaction-policy' })
    ], ControlsModelViewerElement.prototype, "interactionPolicy", void 0);
    return ControlsModelViewerElement;
};
//# sourceMappingURL=controls.js.map