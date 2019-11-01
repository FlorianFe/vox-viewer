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
var _a, _b;
import { Cache, EventDispatcher, GammaEncoding, NearestFilter, RGBEEncoding, TextureLoader } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from './PMREMGenerator.js';
// Enable three's loader cache so we don't create redundant
// Image objects to decode images fetched over the network.
Cache.enabled = true;
const HDR_FILE_RE = /\.hdr$/;
const ldrLoader = new TextureLoader();
const hdrLoader = new RGBELoader();
const $environmentMapCache = Symbol('environmentMapCache');
const $generatedEnvironmentMap = Symbol('generatedEnvironmentMap');
const $PMREMGenerator = Symbol('PMREMGenerator');
const $addMetadata = Symbol('addMetadata');
const $loadEnvironmentMapFromUrl = Symbol('loadEnvironmentMapFromUrl');
const $loadGeneratedEnvironmentMap = Symbol('loadGeneratedEnvironmentMap');
// Attach a `userData` object for arbitrary data on textures that
// originate from TextureUtils, similar to Object3D's userData,
// for help debugging, providing metadata for tests, and semantically
// describe the type of texture within the context of this application.
const userData = {
    url: null,
    // 'Equirectangular', 'CubeUV', 'PMREM'
    mapping: null,
};
export default class TextureUtils extends EventDispatcher {
    constructor(renderer) {
        super();
        this[_a] = null;
        this[_b] = new Map();
        this.renderer = renderer;
        this[$PMREMGenerator] = new PMREMGenerator(this.renderer);
    }
    async load(url, progressCallback = () => { }) {
        try {
            const isHDR = HDR_FILE_RE.test(url);
            const loader = isHDR ? hdrLoader : ldrLoader;
            const texture = await new Promise((resolve, reject) => loader.load(url, resolve, (event) => {
                progressCallback(event.loaded / event.total * 0.9);
            }, reject));
            progressCallback(1.0);
            this[$addMetadata](texture, url, 'Equirectangular');
            if (isHDR) {
                texture.encoding = RGBEEncoding;
                texture.minFilter = NearestFilter;
                texture.magFilter = NearestFilter;
                texture.flipY = true;
            }
            else {
                texture.encoding = GammaEncoding;
            }
            return texture;
        }
        finally {
            if (progressCallback) {
                progressCallback(1);
            }
        }
    }
    async loadEquirectAsCubeUV(url, progressCallback = () => { }) {
        let equirect = null;
        try {
            equirect = await this.load(url, progressCallback);
            const cubeUV = this[$PMREMGenerator].fromEquirectangular(equirect);
            this[$addMetadata](cubeUV.texture, url, 'CubeUV');
            return cubeUV;
        }
        finally {
            if (equirect != null) {
                equirect.dispose();
            }
        }
    }
    /**
     * Returns a { skybox, environmentMap } object with the targets/textures
     * accordingly. `skybox` is a WebGLRenderCubeTarget, and `environmentMap`
     * is a Texture from a WebGLRenderCubeTarget.
     */
    async generateEnvironmentMapAndSkybox(skyboxUrl = null, environmentMapUrl = null, options = {}) {
        const { progressTracker } = options;
        const updateGenerationProgress = progressTracker != null ? progressTracker.beginActivity() : () => { };
        try {
            let skyboxLoads = Promise.resolve(null);
            let environmentMapLoads;
            // If we have a skybox URL, attempt to load it as a cubemap
            if (!!skyboxUrl) {
                skyboxLoads =
                    this[$loadEnvironmentMapFromUrl](skyboxUrl, progressTracker);
            }
            if (!!environmentMapUrl) {
                // We have an available environment map URL
                environmentMapLoads = this[$loadEnvironmentMapFromUrl](environmentMapUrl, progressTracker);
            }
            else if (!!skyboxUrl) {
                // Fallback to deriving the environment map from an available skybox
                environmentMapLoads = skyboxLoads;
            }
            else {
                // Fallback to generating the environment map
                environmentMapLoads = this[$loadGeneratedEnvironmentMap]();
            }
            let [environmentMap, skybox] = await Promise.all([environmentMapLoads, skyboxLoads]);
            this[$addMetadata](environmentMap.texture, environmentMapUrl, 'PMREM');
            if (skybox != null) {
                this[$addMetadata](skybox.texture, skyboxUrl, 'PMREM');
            }
            return { environmentMap, skybox };
        }
        finally {
            updateGenerationProgress(1.0);
        }
    }
    [(_a = $generatedEnvironmentMap, _b = $environmentMapCache, $addMetadata)](texture, url, mapping) {
        texture.userData = Object.assign({}, userData, ({
            url: url,
            mapping: mapping,
        }));
    }
    /**
     * Loads a WebGLRenderTarget from a given URL. The render target in this
     * case will be assumed to be used as an environment map.
     */
    [$loadEnvironmentMapFromUrl](url, progressTracker) {
        if (!this[$environmentMapCache].has(url)) {
            const progressCallback = progressTracker ? progressTracker.beginActivity() : () => { };
            const environmentMapLoads = this.loadEquirectAsCubeUV(url, progressCallback);
            this[$environmentMapCache].set(url, environmentMapLoads);
        }
        return this[$environmentMapCache].get(url);
    }
    /**
     * Loads a dynamically generated environment map.
     */
    [$loadGeneratedEnvironmentMap]() {
        if (this[$generatedEnvironmentMap] == null) {
            this[$generatedEnvironmentMap] = this[$PMREMGenerator].fromDefault();
        }
        return Promise.resolve(this[$generatedEnvironmentMap]);
    }
    async dispose() {
        const allTargetsLoad = [];
        // NOTE(cdata): We would use for-of iteration on the maps here, but
        // IE11 doesn't have the necessary iterator-returning methods. So,
        // disposal of these render targets is kind of convoluted as a result.
        this[$environmentMapCache].forEach((targetLoads) => {
            allTargetsLoad.push(targetLoads);
        });
        this[$environmentMapCache].clear();
        for (const targetLoads of allTargetsLoad) {
            try {
                const target = await targetLoads;
                target.dispose();
            }
            catch (e) {
                // Suppress errors, so that all render targets will be disposed
            }
        }
        if (this[$generatedEnvironmentMap] != null) {
            this[$generatedEnvironmentMap].dispose();
            this[$generatedEnvironmentMap] = null;
        }
    }
}
//# sourceMappingURL=TextureUtils.js.map