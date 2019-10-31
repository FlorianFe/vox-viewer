
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
                    style="height: calc(100vh - 50px); width: 50%;"></vox-viewer>
            </div>
        `;
    }
}

customElements.define(DemoPage.is, DemoPage);