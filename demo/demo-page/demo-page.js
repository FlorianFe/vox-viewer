import "../../vox-viewer";
import { LitElement, html } from "lit-element";

class DemoPage extends LitElement {
  static get is() {
    return "demo-page";
  }

  static get properties() {
    return {
      selectedModel: { type: String },
    };
  }

  constructor() {
    super();
    this.selectedModel = "deer";
  }

  onModelSelected() {
    const modelSelection = this.shadowRoot.querySelector("#model-selection");

    this.selectedModel = modelSelection.value;
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
        Model: <br />
        <select
          id="model-selection"
          value="${this.selectedModel}"
          @change="${this.onModelSelected}"
        >
          <option value="deer">Deer</option>
          <option value="monu7">Monument 7</option>
          <option value="monu8">Monument 8</option>
        </select>
      </div>

      <div class="container">
        <vox-viewer
          class="vox-viewer"
          src="./models/${this.selectedModel}.vox"
          camera-controls
          auto-rotate
          shadow-intensity="0.3"
        ></vox-viewer>
      </div>
    `;
  }
}

customElements.define(DemoPage.is, DemoPage);
