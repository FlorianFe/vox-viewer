import "../../vox-viewer";
import { LitElement, html } from "lit-element";

class DemoPage extends LitElement {
  static get is() {
    return "demo-page";
  }

  static get properties() {
    return {
      selectedModel: { type: String },
      selectedMode: { type: String },
    };
  }

  constructor() {
    super();
    this.selectedMode = "examples";
    this.selectedModel = "./models/deer.vox";
  }

  onModelSelected() {
    const modelSelection = this.shadowRoot.querySelector("#model-selection");

    this.selectedModel = modelSelection.value;
  }

  onModeSelected() {
    const modeSelection = this.shadowRoot.querySelector("#mode-selection");

    this.selectedMode = modeSelection.value;

    if (this.selectedMode === "examples") {
      this.selectedModel = "./models/deer.vox";
    }
  }

  onCustomModelUpload(e) {
    let files = e.target.files;
    let f = files[0];

    let reader = new FileReader();

    reader.onload = ((file) => {
      return (e) => {
        const string = e.target.result;
        const blob = new Blob([string]);
        const url = URL.createObjectURL(blob);

        this.selectedModel = url;
      };
    })(f);

    reader.readAsArrayBuffer(f);
  }

  render() {
    return html`
      <style>
        :host {
          display: block;
          margin: 0px;
          padding: 10px;

          height: calc(100vh - 20px);
          width: calc(100vw - 20px);
        }

        .controls {
          height: 10%;
          width: 100%;
          display: flex;
          gap: 15px;
        }

        .container {
          height: 90%;
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vox-viewer {
          height: 100%;
          width: 100%;
        }
      </style>

      <div class="controls">
        <div>
          Mode: <br />
          <select
            id="mode-selection"
            value="${this.selectedMode}"
            @change="${this.onModeSelected}"
          >
            <option value="examples">Examples</option>
            <option value="custom">Own Model</option>
          </select>
        </div>

        <div>
          ${this.selectedMode === "custom"
            ? html`<div>
                Own Model: <br />
                <input
                  id="custom-model-selection"
                  type="file"
                  @change="${this.onCustomModelUpload}"
                />
              </div>`
            : html`<div>
                Model: <br />
                <select
                  id="model-selection"
                  value="${this.selectedModel}"
                  @change="${this.onModelSelected}"
                >
                  <option value="./models/deer.vox">Deer</option>
                  <option value="./models/monu7.vox">Monument 7</option>
                  <option value="./models/monu8.vox">Monument 8</option>
                  <option value="./models/sphere.vox">Sphere</option>
                </select>
              </div>`}
        </div>
      </div>

      <div class="container">
        <vox-viewer
          class="vox-viewer"
          src=${this.selectedModel}
          camera-controls
          auto-rotate
          shadow-intensity="0.3"
        ></vox-viewer>
      </div>
    `;
  }
}

customElements.define(DemoPage.is, DemoPage);
