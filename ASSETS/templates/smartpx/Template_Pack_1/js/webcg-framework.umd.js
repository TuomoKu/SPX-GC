(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  var version = "2.6.0";

  var Parser = function Parser () {};

  Parser.prototype.parse = function parse (raw) {
    if (typeof raw === 'object') { return raw }
    if (typeof raw !== 'string') { return null }
    if (raw.length <= 0) { return null }
    if (raw[0] === '<') {
      return this._parseXml(raw)
    }
    if (raw[0] === '{') {
      return JSON.parse(raw)
    }
  };

  Parser.prototype._parseXml = function _parseXml (xmlString) {
    var xmlDoc = this._loadXmlDoc(xmlString);
    var result = {};
    var componentDataElements = xmlDoc.getElementsByTagName('componentData');
    for (var i = 0; i < componentDataElements.length; i++) {
      var componentId = componentDataElements[i].getAttribute('id');
      result[componentId] = {};
      var dataElements = componentDataElements[i].getElementsByTagName('data');
      for (var ii = 0; ii < dataElements.length; ii++) {
        var dataElement = dataElements[ii];
        result[componentId][dataElement.getAttribute('id')] = dataElement.getAttribute('value');
      }
    }
    return result
  };

  Parser.prototype._loadXmlDoc = function _loadXmlDoc (xmlString) {
    if (window && window.DOMParser && typeof XMLDocument !== 'undefined') {
      return new window.DOMParser().parseFromString(xmlString, 'text/xml')
    } else {
      // Internet Explorer
      // eslint-disable-next-line no-undef
      var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
      xmlDoc.async = false;
      xmlDoc.loadXML(xmlString);
      return xmlDoc
    }
  };

  var FUNCTIONS = ['play', 'stop', 'next', 'update'];

  var State = Object.freeze({ stopped: 0, playing: 1 });

  var WebCG = function WebCG (window) {
    var this$1 = this;

    this._listeners = {};
    this._window = window;
    FUNCTIONS.forEach(function (each) {
      this$1._window[each] = this$1[each].bind(this$1);
      this$1._window[each].webcg = true;
    });
    this._state = State.stopped;
    this._transitioning = false;
    this._bufferCommands = false;
    this._commandQueue = [];
  };

  WebCG.prototype.addEventListener = function addEventListener (type, listener) {
    if (typeof listener !== 'function') { throw new TypeError('listener must be a function') }
    var listeners = this._listeners[type] = this._listeners[type] || [];
    listeners.push(listener);
    this._addWindowFunction(type);
  };

  WebCG.prototype.once = function once (type, listener) {
    if (typeof listener !== 'function') { throw new TypeError('listener must be a function') }
    var onceWrapper = function () {
      this.removeEventListener(type, onceWrapper);
      return listener.apply(null, arguments)
    }.bind(this);
    this.addEventListener(type, onceWrapper);
  };

  WebCG.prototype._addWindowFunction = function _addWindowFunction (name) {
    if (typeof this._window[name] === 'function' && this._window[name].webcg) { return }

    this._window[name] = this.invokeFunction.bind(this, name);
    this._window[name].webcg = true;
  };

  WebCG.prototype.invokeFunction = function invokeFunction (name) {
      var this$1 = this;

    if (this._bufferCommand.apply(this, ['invokeFunction'].concat(Array.from(arguments)))) { return }
    this._transitioning = true;
    this._dispatch.apply(this, arguments).finally(function () {
      this$1._transitioning = false;
      this$1._shiftCommand();
    });
  };

  WebCG.prototype.removeEventListener = function removeEventListener (type, listener) {
    var listeners = this._getListeners(type);
    var idx = listeners.indexOf(listener);
    if (idx >= 0) {
      listeners.splice(idx, 1);
    }

    if (listeners.length === 0) {
      this._removeWindowFunction(type);
    }
  };

  WebCG.prototype._removeWindowFunction = function _removeWindowFunction (name) {
    if (FUNCTIONS.indexOf(name) >= 0) { return }
    if (typeof this._window[name] !== 'function' || !this._window[name].webcg) { return }
    delete this._window[name];
  };

  WebCG.prototype.bufferCommands = function bufferCommands () {
    this._bufferCommands = true;
    this._commandQueue = [];
  };

  WebCG.prototype.flushCommands = function flushCommands () {
    this._bufferCommands = false;
    this._shiftCommand();
  };

  WebCG.prototype._shiftCommand = function _shiftCommand () {
    if (this._commandQueue.length) {
      var command = this._commandQueue.shift();
      this[command.name].apply(this, command.args);
    }
  };

  WebCG.prototype.play = function play () {
      var this$1 = this;

    if (this._bufferCommand('play')) { return }
    if (this._state !== State.playing) {
      this._transitioning = true;
      this._dispatch('play').finally(function () {
        this$1._transitioning = false;
        this$1._state = State.playing;
        this$1._shiftCommand();
      });
    }
  };

  WebCG.prototype.stop = function stop () {
      var this$1 = this;

    if (this._bufferCommand('stop')) { return }
    if (this._state === State.playing) {
      this._transitioning = true;
      this._dispatch('stop').finally(function () {
        this$1._transitioning = false;
        this$1._state = State.stopped;
        this$1._shiftCommand();
      });
    }
  };

  WebCG.prototype.next = function next () {
      var this$1 = this;

    if (this._bufferCommand('next')) { return }
    this._transitioning = true;
    this._dispatch('next').finally(function () {
      this$1._transitioning = false;
      this$1._shiftCommand();
    });
  };

  WebCG.prototype.update = function update (data) {
      var this$1 = this;

    if (this._bufferCommand('update', data)) { return }
    this._transitioning = true;
    this._dispatch('update', data).then(function (handled) {
      this$1._transitioning = false;
      if (handled) {
        this$1._shiftCommand();
      } else {
        var parsed = new Parser().parse(data);
        this$1._transitioning = true;
        this$1._dispatch('data', parsed).finally(function () {
          this$1._transitioning = false;
          this$1._shiftCommand();
        });
      }
    }).catch(function () {
      this$1._transitioning = false;
      this$1._shiftCommand();
    });
  };

  WebCG.prototype._bufferCommand = function _bufferCommand (name) {
    if (!this._transitioning && !this._bufferCommands) {
      return false
    }
    var args = Array.prototype.slice.call(arguments, 1);
    this._commandQueue.push({ name: name, args: args });
    return true
  };

  WebCG.prototype._dispatch = function _dispatch (type) {
    var listeners = this._getListeners(type);
    var args = Array.prototype.slice.call(arguments, 1);

    var promises = listeners
      .filter(function (listener) { return typeof listener === 'function'; })
      .map(function (listener) {
        return new Promise(function (resolve, reject) {
          try {
            var result = listener.apply(null, args);
            if (result && typeof result === 'object' && Object.getPrototypeOf(result).constructor === Promise) {
              result.then(function (handled) {
                resolve(!!handled);
              }).catch(function (error) {
                console.warn(("[webcg-framework] " + type + " event listener threw " + (error.constructor.name) + ": " + (error.message)));
                resolve(false);
              });
            } else {
              resolve(!!result);
            }
          } catch (error) {
            console.warn(("[webcg-framework] " + type + " event listener threw " + (error.constructor.name) + ": " + (error.message)));
            resolve(false);
          }
        })
      });

    return Promise.all(promises).then(function (values) {
      return values.reduce(function (aggr, curr) {
        return aggr || curr
      }, false)
    })
  };

  WebCG.prototype._getListeners = function _getListeners (type) {
    this._listeners[type] = this._listeners[type] || [];
    return this._listeners[type]
  };

  // Aliases
  WebCG.prototype.on = WebCG.prototype.addEventListener;
  WebCG.prototype.off = WebCG.prototype.removeEventListener;

  var initWebCg = function (window) {
    window.webcg = new WebCG(window);
  };

  var getCurrentScriptPathWithTrailingSlash = function (document) {
    if (!document || typeof document !== 'object') { return '' }
    if (!document.currentScript) { return '' }
    if (!document.currentScript.src || typeof document.currentScript.src !== 'string') { return '' }
    var src = document.currentScript.src;
    return src.substring(0, src.lastIndexOf('/') + 1)
  };

  var initDevTools = function (window) {
    var debug = (window.location.search.match(/[?&]debug=([^&$]+)/) || [])[1] === 'true';
    if (!debug) { return }

    var document = window.document;
    var script = document.createElement('script');
    script.src = getCurrentScriptPathWithTrailingSlash(document) + 'webcg-devtools.umd.js';
    console.log('[webcg-framework] injecting ' + script.src);
    document.head.append(script);
  };

  var boot = function (window) {
    initWebCg(window);
    initDevTools(window);
  };

  /**
   * When required globally
   */
  if (typeof (window) !== 'undefined') {
    console.log('[webcg-framework] version ' + version);
    boot(window);
  }

})));
