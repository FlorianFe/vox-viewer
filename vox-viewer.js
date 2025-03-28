import { LitElement, html } from "lit";
import voxelTriangulation from "voxel-triangulation";
import { flatten } from "ramda";
import {
  BufferGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  Mesh,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import readVox from "vox-reader";
import zeros from "zeros";

import "@google/model-viewer";
import { isArray } from "underscore";

/**
 * `vox-viewer`
 * displays voxel data
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */

const MAX_VALUE_OF_A_BYTE = 255;

class VoxViewer extends LitElement {
  static get is() {
    return "vox-viewer";
  }

  static get properties() {
    return {
      src: { type: String },

      alt: { type: String },
      ar: { type: Boolean },
      autoRotate: { type: Boolean, attribute: "auto-rotate" },
      autoRotateDelay: { type: Number, attribute: "auto-rotate-delay" },
      autoplay: { type: Boolean },
      backgroundColor: { type: String, attribute: "background-color" },
      backgroundImage: { type: String, attribute: "background-image" },
      cameraControls: { type: Boolean, attribute: "camera-controls" },
      cameraOrbit: { type: String, attribute: "camera-orbit" },
      cameraTarget: { type: String, attribute: "camera-target" },
      environmentImage: { type: String, attribute: "environment-image" },
      exposure: { type: Number },
      fieldOfView: { type: String, attribute: "field-of-view" },
      interactionPolicy: { type: String },
      interactionPrompt: { type: String },
      interactionPromptStyle: { type: String },
      interactionPromptTreshold: { type: Number },

      preload: { type: Boolean },
      reveal: { type: String },
      shadowIntensity: { type: Number, attribute: "shadow-intensity" },
      unstableWebxr: { type: Boolean, attribute: "unstable-webxr" },
    };
  }

  constructor() {
    super();

    this.alt = "a voxel model"; // changed!
  }

  get currentTime() {
    return this.shadowRoot.querySelector("#model-viewer").currentTime;
  }
  get paused() {
    return this.shadowRoot.querySelector("#model-viewer").paused;
  }

  getCameraOrbit() {
    return this.shadowRoot.querySelector("#model-viewer").getCameraOrbit();
  }
  getFieldOfView() {
    return this.shadowRoot.querySelector("#model-viewer").getFieldOfView();
  }
  jumpCameraToGoal() {
    this.shadowRoot.querySelector("#model-viewer").jumpCameraToGoal();
  }
  play() {
    this.shadowRoot.querySelector("#model-viewer").play();
  }
  pause() {
    this.shadowRoot.querySelector("#model-viewer").pause();
  }
  resetTurntableRotation() {
    this.shadowRoot.querySelector("#model-viewer").resetTurntableRotation();
  }
  toDataURL(type, encoderOptions) {
    return this.shadowRoot
      .querySelector("#model-viewer")
      .toDataURL(type, encoderOptions);
  }

  updated(changedProperties) {
    if (changedProperties.has("src")) {
      this.initialized = false;
      this.loadVoxModel(this.src, changedProperties);
    }

    this.setup(changedProperties);
  }

  setup(changedProperties) {
    changedProperties.forEach((_, propertyName) => {
      if (this[propertyName] != undefined) {
        if (propertyName !== "src") {
          this.shadowRoot.querySelector("#model-viewer")[propertyName] =
            this[propertyName];
        }
      }
    });
  }

  async loadVoxModel(fileURL, changedProperties) {
    if (fileURL.slice(0, 5) == "blob:") {
      const response = await fetch(fileURL);
      const arrayBuffer = await response.arrayBuffer();

      this.processVoxContent(arrayBuffer, changedProperties);
    } else {
      let request = new XMLHttpRequest();
      request.responseType = "arraybuffer";
      request.open("GET", fileURL, true);
      request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status == "200") {
          this.processVoxContent(request.response, changedProperties);
        }
      };

      request.send(null);
    }
  }

  processVoxContent(voxContent, changedProperties) {
    const u8intArrayContent = new Uint8Array(voxContent);

    let vox = readVox(u8intArrayContent);

    let hasMultipleLayers = isArray(vox.xyzi);

    let voxelData = vox.xyzi.values;
    let size = vox.size;
    let rgba = vox.rgba.values;

    if (hasMultipleLayers) {
      voxelData = flatten(vox.xyzi.map((xyzi) => xyzi.values));

      size = {
        x: Math.max(...vox.size.map((s) => s.x)),
        y: Math.max(...vox.size.map((s) => s.y)),
        z: Math.max(...vox.size.map((s) => s.z)),
      };

      rgba = vox.rgba.values;
    }

    let componentizedColores = rgba.map((c) => [c.r, c.g, c.b]);
    let voxels = zeros([size.x, size.y, size.z]);

    voxelData.forEach(({ x, y, z, i }) => voxels.set(x, y, z, i));

    voxels = voxels.transpose(1, 2, 0);

    let { vertices, normals, indices, voxelValues } =
      voxelTriangulation(voxels);

    let normalizedColors = componentizedColores.map((color) =>
      color.map((c) => c / MAX_VALUE_OF_A_BYTE)
    );

    let gammaCorrectedColors = normalizedColors.map((color) =>
      color.map((c) => Math.pow(c, 2.2))
    );

    let alignedColors = [[0, 0, 0], ...gammaCorrectedColors];
    let flattenedColors = flatten(voxelValues.map((v) => alignedColors[v]));

    let geometry = new BufferGeometry();

    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(vertices), 3)
    );
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(normals), 3)
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(flattenedColors), 3)
    );
    geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));

    let material = new MeshStandardMaterial({
      roughness: 1.0,
      metalness: 0.0,
    });
    let mesh = new Mesh(geometry, material);
    let exporter = new GLTFExporter();

    exporter.parse(mesh, (json) => {
      let string = JSON.stringify(json);
      let blob = new Blob([string], { type: "text/plain" });
      let url = URL.createObjectURL(blob);

      this.shadowRoot.querySelector("#model-viewer").src = url;

      this.setup(changedProperties);
    });
  }

  render() {
    return html`
      <style>
        :host {
          display: block;
          padding: 5px;
        }

        #model-viewer {
          width: 100%;
          height: 100%;
        }
      </style>

      <model-viewer id="model-viewer"></model-viewer>
    `;
  }
}

window.customElements.define("vox-viewer", VoxViewer);
