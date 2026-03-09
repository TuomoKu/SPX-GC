let graphicInstances = {};

window.loadTheGraphic = async (manifestPath, renderTarget, rundownData) => {
    // Dispose previous instance if exists
    const existingInstance = graphicInstances[renderTarget];
    if (existingInstance) {
        // console.log('OF ::: Disposing "' + manifestPath + '" from >> ' + renderTarget)
        existingInstance.dispose();
    }

    // Helper: extractDefaultsFromJSON
    const extractDefaultsFromJSON = async (fields) => {
        const result = {};
        if (Array.isArray(fields)) {
            for (const field of fields) {
                if (Object.keys(field).length === 0) continue
                const [key, value] = Object.entries(field)[0];
                result[key] = value;
            }
        }
        return result;
    };

    // Helper: loadGraphicModule
    const graphicIdVersion = `${rundownData.ografProps.id}-v${rundownData.ografProps.version}`;
    let elementName = customElements.get(graphicIdVersion);
    if (!elementName) {
        let ografRef = "/templates" + rundownData.ografProps.graphicPath;
        // console.log(`OF ::: loadGraphicModule > loading ${ografRef}`)
        const module = await import(ografRef);
        const Graphic = module.Graphic || module.default;
        if (!Graphic || typeof Graphic !== 'function') {
            throw new Error('Module expected to expose a class named "Graphic"');
        }
        customElements.define(graphicIdVersion, Graphic);
        elementName = graphicIdVersion;
    } else {
        elementName = graphicIdVersion;
    }

    // Create and initialize the graphic instance
    // console.log(`OF ::: loadTheGraphic "${manifestPath}" to >> ${renderTarget}`)
    const graphicInstance = document.createElement(elementName);
    graphicInstance.setAttribute('class', 'ografRenderTarget');
    document.getElementById(renderTarget).appendChild(graphicInstance);
    const data = await extractDefaultsFromJSON(rundownData.fields);
    await graphicInstance.load({
        renderType: 'realtime',
        data: data,
        rundownData: rundownData
    });

    graphicInstances[renderTarget] = graphicInstance;
    // Wait for the iframe inside the graphic instance to load before continuing
    const iframe = graphicInstances[renderTarget].querySelector('iframe');
    if (iframe) {
        await new Promise((resolve) => {
            let timeout = setTimeout(resolve, 1000);
            if (iframe.complete || iframe.readyState === 'complete') {
                clearTimeout(timeout);
                resolve();
            } else {
                iframe.addEventListener('load', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            }
        });
    }
    // console.log('OF:: updateAction', renderTarget)
    await graphicInstances[renderTarget].updateAction({ data });

    // console.log('OF:: playAction', renderTarget)
    await graphicInstances[renderTarget].playAction({ data });
    // Play/update actions
    // setTimeout(() => {
    //     console.log(`OF ::: loadGraphic > playAction on renderTarget "${renderTarget}"...`)
    //     graphicInstances[renderTarget].updateAction({ data });
    //     graphicInstances[renderTarget].playAction({ data });
    // }, 50);
};
