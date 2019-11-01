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
import { $needsRender, $scene, $tick } from '../model-viewer-base.js';
import { Timer } from '@google/model-viewer/lib/utilities/timer.js';
// How much the model will rotate per
// second in radians:
const ROTATION_SPEED = Math.PI / 32;
export const AUTO_ROTATE_DELAY_DEFAULT = 3000;
const $autoRotateTimer = Symbol('autoRotateTimer');
const $cameraChangeHandler = Symbol('cameraChangeHandler');
const $onCameraChange = Symbol('onCameraChange');
export const StagingMixin = (ModelViewerElement) => {
    var _a, _b;
    class StagingModelViewerElement extends ModelViewerElement {
        constructor() {
            super(...arguments);
            this.autoRotate = false;
            this.autoRotateDelay = AUTO_ROTATE_DELAY_DEFAULT;
            this[_a] = new Timer(this.autoRotateDelay);
            this[_b] = (event) => this[$onCameraChange](event);
        }
        connectedCallback() {
            super.connectedCallback();
            this.addEventListener('camera-change', this[$cameraChangeHandler]);
            this[$autoRotateTimer].stop();
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            this.removeEventListener('camera-change', this[$cameraChangeHandler]);
            this[$autoRotateTimer].stop();
        }
        updated(changedProperties) {
            super.updated(changedProperties);
            if (changedProperties.has('autoRotate')) {
                this[$needsRender]();
            }
            if (changedProperties.has('autoRotateDelay')) {
                const timer = new Timer(this.autoRotateDelay);
                timer.tick(this[$autoRotateTimer].time);
                if (timer.hasStopped) {
                    timer.reset();
                }
                this[$autoRotateTimer] = timer;
            }
        }
        [(_a = $autoRotateTimer, _b = $cameraChangeHandler, $tick)](time, delta) {
            super[$tick](time, delta);
            if (!this.autoRotate || !this.modelIsVisible) {
                return;
            }
            this[$autoRotateTimer].tick(delta);
            if (this[$autoRotateTimer].hasStopped) {
                this[$scene].setPivotRotation(this[$scene].getPivotRotation() + ROTATION_SPEED * delta * 0.001);
                this[$needsRender]();
            }
        }
        [$onCameraChange](event) {
            if (!this.autoRotate) {
                return;
            }
            if (event.detail.source === 'user-interaction') {
                this[$autoRotateTimer].reset();
            }
        }
        get turntableRotation() {
            return this[$scene].getPivotRotation();
        }
        resetTurntableRotation() {
            this[$scene].setPivotRotation(0);
            this[$needsRender]();
        }
    }
    __decorate([
        property({ type: Boolean, attribute: 'auto-rotate' })
    ], StagingModelViewerElement.prototype, "autoRotate", void 0);
    __decorate([
        property({ type: Number, attribute: 'auto-rotate-delay' })
    ], StagingModelViewerElement.prototype, "autoRotateDelay", void 0);
    return StagingModelViewerElement;
};
//# sourceMappingURL=staging.js.map