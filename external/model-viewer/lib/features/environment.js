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
import { Color } from 'three';
import { $container, $isInRenderTree, $needsRender, $onModelLoad, $progressTracker, $renderer, $scene } from '../model-viewer-base.js';
import { deserializeUrl } from '@google/model-viewer/lib/utilities.js';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_SHADOW_INTENSITY = 0.0;
const DEFAULT_EXPOSURE = 1.0;
const $currentEnvironmentMap = Symbol('currentEnvironmentMap');
const $applyEnvironmentMap = Symbol('applyEnvironmentMap');
const $updateToneMapping = Symbol('updateToneMapping');
const $updateShadow = Symbol('updateShadow');
const $updateEnvironment = Symbol('updateEnvironment');
const $cancelEnvironmentUpdate = Symbol('cancelEnvironmentUpdate');
export const EnvironmentMixin = (ModelViewerElement) => {
    var _a, _b;
    class EnvironmentModelViewerElement extends ModelViewerElement {
        constructor() {
            super(...arguments);
            this.environmentImage = null;
            this.backgroundImage = null;
            this.backgroundColor = DEFAULT_BACKGROUND_COLOR;
            this.shadowIntensity = DEFAULT_SHADOW_INTENSITY;
            this.exposure = DEFAULT_EXPOSURE;
            this[_a] = null;
            this[_b] = null;
        }
        updated(changedProperties) {
            super.updated(changedProperties);
            if (changedProperties.has('shadowIntensity')) {
                this[$updateShadow]();
            }
            if (changedProperties.has('exposure')) {
                this[$updateToneMapping]();
            }
            if (changedProperties.has('environmentImage') ||
                changedProperties.has('backgroundImage') ||
                changedProperties.has('backgroundColor') ||
                changedProperties.has('experimentalPmrem') ||
                changedProperties.has($isInRenderTree)) {
                this[$updateEnvironment]();
            }
        }
        [(_a = $currentEnvironmentMap, _b = $cancelEnvironmentUpdate, $onModelLoad)](event) {
            super[$onModelLoad](event);
            if (this[$currentEnvironmentMap] != null) {
                this[$applyEnvironmentMap](this[$currentEnvironmentMap]);
            }
        }
        async [$updateEnvironment]() {
            if (!this[$isInRenderTree]) {
                return;
            }
            const { backgroundImage, environmentImage } = this;
            let { backgroundColor } = this;
            if (this[$cancelEnvironmentUpdate] != null) {
                this[$cancelEnvironmentUpdate]();
                this[$cancelEnvironmentUpdate] = null;
            }
            const { textureUtils } = this[$renderer];
            if (textureUtils == null) {
                return;
            }
            try {
                const { environmentMap, skybox } = await new Promise(async (resolve, reject) => {
                    const texturesLoad = textureUtils.generateEnvironmentMapAndSkybox(backgroundImage, environmentImage, { progressTracker: this[$progressTracker] });
                    this[$cancelEnvironmentUpdate] = () => reject(texturesLoad);
                    resolve(await texturesLoad);
                });
                if (skybox != null) {
                    const material = this[$scene].skyboxMaterial();
                    // This hack causes ShaderMaterial to populate the correct
                    // envMapTexelToLinear function.
                    material.envMap = skybox.texture;
                    material.uniforms.envMap.value = skybox.texture;
                    material.needsUpdate = true;
                    this[$scene].add(this[$scene].skyboxMesh);
                }
                else {
                    this[$scene].remove(this[$scene].skyboxMesh);
                    if (!backgroundColor) {
                        backgroundColor = DEFAULT_BACKGROUND_COLOR;
                    }
                    const parsedColor = new Color(backgroundColor);
                    this[$scene].background = parsedColor;
                    // Set the container node's background color so that it matches
                    // the background color configured for the scene. It's important
                    // to do this because we round the size of the canvas off to the
                    // nearest pixel, so it is possible (indeed likely) that there is
                    // a marginal gap around one or two edges of the canvas.
                    this[$container].style.backgroundColor = backgroundColor;
                }
                this[$applyEnvironmentMap](environmentMap.texture);
                this[$scene].model.dispatchEvent({ type: 'envmap-update' });
            }
            catch (errorOrPromise) {
                if (errorOrPromise instanceof Error) {
                    this[$applyEnvironmentMap](null);
                    throw errorOrPromise;
                }
                const { environmentMap, skybox } = await errorOrPromise;
                if (environmentMap != null) {
                    environmentMap.dispose();
                }
                if (skybox != null) {
                    skybox.dispose();
                }
            }
        }
        /**
         * Sets the Model to use the provided environment map,
         * or `null` if the Model should remove its' environment map.
         */
        [$applyEnvironmentMap](environmentMap) {
            this[$currentEnvironmentMap] = environmentMap;
            this[$scene].model.applyEnvironmentMap(this[$currentEnvironmentMap]);
            this.dispatchEvent(new CustomEvent('environment-change'));
            this[$needsRender]();
        }
        [$updateShadow]() {
            this[$scene].shadow.intensity = this.shadowIntensity;
            this[$needsRender]();
        }
        [$updateToneMapping]() {
            this[$scene].exposure = this.exposure;
            this[$needsRender]();
        }
    }
    __decorate([
        property({
            type: String,
            attribute: 'environment-image',
            converter: { fromAttribute: deserializeUrl }
        })
    ], EnvironmentModelViewerElement.prototype, "environmentImage", void 0);
    __decorate([
        property({
            type: String,
            attribute: 'background-image',
            converter: { fromAttribute: deserializeUrl }
        })
    ], EnvironmentModelViewerElement.prototype, "backgroundImage", void 0);
    __decorate([
        property({ type: String, attribute: 'background-color' })
    ], EnvironmentModelViewerElement.prototype, "backgroundColor", void 0);
    __decorate([
        property({ type: Number, attribute: 'shadow-intensity' })
    ], EnvironmentModelViewerElement.prototype, "shadowIntensity", void 0);
    __decorate([
        property({
            type: Number,
        })
    ], EnvironmentModelViewerElement.prototype, "exposure", void 0);
    return EnvironmentModelViewerElement;
};
//# sourceMappingURL=environment.js.map