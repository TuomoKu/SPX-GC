
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
    iframe.src = import.meta.resolve("./resources/Title_2_steps/TITLE_2_STEPS.html"); 
    iframe.onload = () => {
      const document = iframe.contentWindow.document;
      document.getElementById("f0").innerText = params.data.f0;
      document.getElementById("f1").innerText = params.data.f1;
      document.getElementById("f99").innerText = params.data.f99.replace("resources/Title_2_steps/", "");
    }
    this.appendChild(iframe);
    this.iframe = iframe;
    
    this.step = 0;

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
    if (!this.iframe.contentWindow) {
      console.error("Error");
      return;
    }
    if (this.step === 0) {
      // First call always plays the IN animation, regardless of params.
      this.iframe.contentWindow.play();
      this.step = 1;
      return;
    }

    let targetStep = this.step;
    if (_params && typeof _params.goto === "number") {
      targetStep = _params.goto;
    } else if (_params && typeof _params.delta === "number") {
      targetStep = this.step + _params.delta;
    } else {
      targetStep = this.step + 1;
    }
    if (targetStep < 1) { targetStep = 1; } // floor at step 1 (the state right after play()); use stopAction to fully exit

    if (targetStep > this.step) {
      this.iframe.contentWindow.next();
    } else if (targetStep < this.step) {
      this.iframe.contentWindow.prev();
    }
    this.step = targetStep;
  }
  async stopAction(_params) {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.stop();
    } else {
      console.error("Error");
    }
  }
  async customAction(params) {
    if (this.iframe.contentWindow && params.id === "next") {
      this.iframe.contentWindow.next();
    } else {
      console.error("Error");
    }
  }
}

export default Graphic;

// Note: The renderer will render the component
