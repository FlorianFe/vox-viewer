import { html, LitElement } from 'lit-element/lit-element';
import voxelTriangulation from 'voxel-triangulation';
import { flatten } from 'ramda';
import { BufferGeometry, BufferAttribute, MeshStandardMaterial, Mesh } from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import readVox from 'vox-reader';
import zeros from 'zeros';

import '@google/model-viewer/lib/model-viewer';

/**
 * `voxel-viewer`
 * displays voxel data
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */

let loaded = false;

class VoxViewer extends LitElement 
{
  static get is()
  {
    return 'vox-viewer';
  }

  static get properties()
  {
      return {
        src: { type: String },

        alt: { type: String },
        ar: { type: Boolean },
        autoRotate: { type: Boolean, attribute: 'auto-rotate' },
        autoRotateDelay: { type: Number, attribute: 'auto-rotate-delay' },
        autoplay: { type: Boolean },
        backgroundColor: { type: String, attribute: 'background-color' },
        backgroundImage: { type: String, attribute: 'background-image' },
        cameraControls: { type: Boolean, attribute: 'camera-controls' },
        cameraOrbit: { type: String, attribute: 'camera-orbit' },
        cameraTarget: { type: String, attribute: 'camera-target' },
        environmentImage: { type: String, attribute: 'environment-image' },
        exposure: { type: Number  },
        fieldOfView: { type: String, attribute: 'field-of-view' },
        interactionPolicy: { type: String },
        interactionPrompt: { type: String },
        interactionPromptStyle: { type: String },
        interactionPromptTreshold: { type: Number },

        preload: { type: Boolean },
        reveal: { type: String },
        shadowIntensity: { type: Number },
        unstableWebxr: { type: Boolean }
      }
  }

  constructor()
  {
    super();

    this.alt = 'a voxel model'; // changed!
    this.ar = false;
    this.autoRotate = false;
    this.autoRotateDelay = 3000;
    this.autoplay = false;
    this.backgroundColor = 'white';
    this.cameraControls = false;
    this.cameraOrbit = '0deg 75deg 105%';
    this.cameraTarget = 'auto auto auto';
    this.exposure = 0.4; // changed!
    this.fieldOfView = 'auto';
    this.interactionPolicy = 'always-allow';
    this.interactionPrompt = 'auto';
    this.interactionPromptStyle = 'wiggle';
    this.interactionPromptTreshold = 3000;

    this.preload = false;


  }

  get currentTime() { return this.shadowRoot.querySelector('#model-viewer').currentTime; }
  get paused() { return this.shadowRoot.querySelector('#model-viewer').paused; }

  getCameraOrbit() { return this.shadowRoot.querySelector('#model-viewer').getCameraOrbit(); }
  getFieldOfView() { return this.shadowRoot.querySelector('#model-viewer').getFieldOfView(); }
  jumpCameraToGoal() { this.shadowRoot.querySelector('#model-viewer').jumpCameraToGoal(); }
  play() { this.shadowRoot.querySelector('#model-viewer').play(); }
  pause() { this.shadowRoot.querySelector('#model-viewer').pause(); }
  resetTurntableRotation() { this.shadowRoot.querySelector('#model-viewer').resetTurntableRotation(); }
  toDataURL(type, encoderOptions) { return this.shadowRoot.querySelector('#model-viewer').toDataURL(type, encoderOptions); }

  firstUpdated() 
  {
    let modelViewer = this.shadowRoot.querySelector('#model-viewer');

    /*
      modelViewer.addEventListener('camera-change', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('enviroment-change', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('error', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('load', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('model-visibility', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('poster-visibility', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('play', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('pause', (event) => this.dispatchEvent(event));
      modelViewer.addEventListener('preload', (event) => this.dispatchEvent(event));
    */
  }

  disconnectedCallback() 
  {
    super.disconnectedCallback();

    let modelViewer = this.shadowRoot.querySelector('model-viewer');

    /*
      modelViewer.removeEventListener('camera-change');
      modelViewer.removeEventListener('enviroment-change');
      modelViewer.removeEventListener('error');
      modelViewer.removeEventListener('load');
      modelViewer.removeEventListener('model-visibility');
      modelViewer.removeEventListener('poster-visibility');
      modelViewer.removeEventListener('play');
      modelViewer.removeEventListener('pause');
      modelViewer.removeEventListener('preload');
    */
  }

  updated(changedProperties) 
  {
    console.log(changedProperties, this["autoRotate"]);

    if(changedProperties.has('src'))
    {
      this.initialized = false;
      this.loadVoxModel(this.src, changedProperties);
    }

    this.setup(changedProperties);
  }

  setup(changedProperties)
  {
    changedProperties.forEach((oldValue, propertyName) => 
    {
      if(this[propertyName] != undefined)
      {
        if(propertyName !== 'src')
        {
          this.shadowRoot.querySelector('#model-viewer')[propertyName] = this[propertyName];
        }
      }
    });
  }

  loadVoxModel(fileURL, changedProperties)
  {
    let request = new XMLHttpRequest();
    request.responseType = "arraybuffer";

    request.open("GET", fileURL, true);
    request.onreadystatechange = () =>
    {
      if(request.readyState === 4 && request.status == "200")
      {
        let vox = readVox(new Uint8Array(request.response));
      
        let voxelData = vox.xyzi.values;
        let size = vox.size;
        let rgba = vox.rgba.values;

        let componentizedColores = rgba.map((c) => [c.r, c.g, c.b])
        let voxels = zeros([size.x, size.y, size.z]);

        voxelData.forEach(({ x, y, z, i }) => voxels.set(x, y, z, i));

        voxels = voxels.transpose(1, 2, 0);

        let { vertices, normals, indices, voxelValues } = voxelTriangulation(voxels);

        let normalizedColors = componentizedColores.map((color) => color.map((c) => c / 255.0));
        let alignedColors = [ [0, 0, 0], ...normalizedColors ];
        let flattenedColors = flatten(voxelValues.map((v) => alignedColors[v]));

        let geometry = new BufferGeometry();

        geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(flattenedColors), 3) );
        geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));

        let material = new MeshStandardMaterial({ color: '#ffffff', roughness: 1.0, metalness: 0.0 });
        let mesh = new Mesh(geometry, material);
        let exporter = new GLTFExporter();

        exporter.parse(mesh, (json) => 
        {
          let string = JSON.stringify(json);
          let blob = new Blob([string], { type:'text/plain' });
          let url = URL.createObjectURL(blob);

          this.shadowRoot.querySelector('#model-viewer').src = url;
          this.setup(changedProperties);
        });
      }
    }

    request.send(null);
  }

  static attributeNameForProperty(property) {
    return camelToDashCase(property);
  }

  render()
  {
    return html`

      <style>

        :host
        {
          display: block;
          padding: 5px;
        }

        #model-viewer
        {
          width: 100%;
          height: 100%;
        }

      </style>

      <model-viewer id="model-viewer"></model-viewer>
    `;
  }
}

window.customElements.define('vox-viewer', VoxViewer);


/*

.alt="${this.alt}"
?ar="${this.ar}"
?auto-rotate="${this.autoRotate}"
.auto-rotate-delay="${this.autoRotateDelay}"
?auto-play="${this.autoPlay}"
.background-color="${this.backgroundColor}"
.background-image="${this.backgroundImage}"
?camera-controls="${this.cameraControls}"
.camera-orbit="${this.cameraOrbit}"
.camera-target="${this.cameraTarget}"
.environment-image="${this.environmentImage}"
.exposure="${this.exposure}" 
.field-of-view="${this.fieldOfView}" 
.interaction-policy="${this.interactionPolicy}" 
.interaction-prompt="${this.interactionPrompt}"
.interaction-prompt-style="${this.interactionPromptStyle}"
.interaction-prompt-treshold="${this.interactionPromptTreshold}"

?preload="${this.preload}"
.quick-look-browsers="${this.quickLookBrowsers}"
.reveal="${this.reveal}"
.shadow-intensity="${this.shadowIntensity}"
.unstable-webxr="${this.unstableWebxr}"

*/