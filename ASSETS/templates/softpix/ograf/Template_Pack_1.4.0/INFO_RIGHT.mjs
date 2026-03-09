
class Graphic extends HTMLElement {
  connectedCallback() {
    // Called when the element is added to the DOM
    // Note: Don't paint any pixels at this point, wait for load() to be called
  }

  async load(params) {
    if (params.renderType !== "realtime")
      throw new Error("Only realtime rendering is supported by this graphic");

    const iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.src = import.meta.resolve("./resources/Info_right/INFO_RIGHT.html"); 
    iframe.onload = () => {
      const document = iframe.contentWindow.document;
      document.getElementById("f0").innerText = params.data.f0;
      document.getElementById("f1").innerText = params.data.f1.replace("resources/Info_right/", "");
      document.getElementById("f99").innerText = params.data.f99.replace("resources/Info_right/", "");
    }
    this.appendChild(iframe);
    this.iframe = iframe;
    

    // When everything is loaded we can return:
    return {
      statusCode: 200,
    };
  }
  async dispose(_params) {
    this.innerHTML = "";
  }
  async getStatus(_params) {
    return {
      statusCode: 200,
      status: {
        // nothing
      },
    };
  }
  async updateAction(_params) {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.update(_params);
    }
  }
  async playAction(_params) {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.play();
    } else {
      console.error("Error");
    }
  }
  async stopAction(_params) {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.stop();
    } else {
      console.error("Error");
    }
  }
  async customAction(params) {
    // No actions are implemented in this minimal example
  }
}

export default Graphic;

// Note: The renderer will render the component
