
import '../../vox-viewer';
import { LitElement, html } from 'lit-element';

class DemoPage extends LitElement
{
    static get is()
    {
        return 'demo-page';
    }

    render() 
    {
        return html`
            <style>
            
                :host
                {
                    display: block;
                    margin: 0px;
                    padding: 10px;
                }

                .container
                {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

            </style>
            
            <div class="container">

                <vox-viewer 
                    src="./models/deer.vox" 
                    camera-controls
                    auto-rotate
                    shadow-intensity="0.3"
                    style="height: calc(100vh - 50px); width: 30%;"
                ></vox-viewer>

<!--
                <vox-viewer 
                    src="./models/monu7.vox" 
                    camera-controls
                    auto-rotate
                    style="height: calc(100vh - 50px); width: 30%;"
                ></vox-viewer>

                <vox-viewer 
                    src="./models/monu8.vox" 
                    camera-controls
                    auto-rotate
                    style="height: calc(100vh - 50px); width: 30%;"
                ></vox-viewer>
-->
            </div>
        `;
    }
}

customElements.define(DemoPage.is, DemoPage);