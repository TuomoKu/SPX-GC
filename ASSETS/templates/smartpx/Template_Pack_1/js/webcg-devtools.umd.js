(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  var version = "2.0.0";

  /*!
   * Vue.js v2.6.11
   * (c) 2014-2019 Evan You
   * Released under the MIT License.
   */
  /*  */

  var emptyObject = Object.freeze({});

  // These helpers produce better VM code in JS engines due to their
  // explicitness and function inlining.
  function isUndef (v) {
    return v === undefined || v === null
  }

  function isDef (v) {
    return v !== undefined && v !== null
  }

  function isTrue (v) {
    return v === true
  }

  function isFalse (v) {
    return v === false
  }

  /**
   * Check if value is primitive.
   */
  function isPrimitive (value) {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      // $flow-disable-line
      typeof value === 'symbol' ||
      typeof value === 'boolean'
    )
  }

  /**
   * Quick object check - this is primarily used to tell
   * Objects from primitive values when we know the value
   * is a JSON-compliant type.
   */
  function isObject (obj) {
    return obj !== null && typeof obj === 'object'
  }

  /**
   * Get the raw type string of a value, e.g., [object Object].
   */
  var _toString = Object.prototype.toString;

  function toRawType (value) {
    return _toString.call(value).slice(8, -1)
  }

  /**
   * Strict object type check. Only returns true
   * for plain JavaScript objects.
   */
  function isPlainObject (obj) {
    return _toString.call(obj) === '[object Object]'
  }

  function isRegExp (v) {
    return _toString.call(v) === '[object RegExp]'
  }

  /**
   * Check if val is a valid array index.
   */
  function isValidArrayIndex (val) {
    var n = parseFloat(String(val));
    return n >= 0 && Math.floor(n) === n && isFinite(val)
  }

  function isPromise (val) {
    return (
      isDef(val) &&
      typeof val.then === 'function' &&
      typeof val.catch === 'function'
    )
  }

  /**
   * Convert a value to a string that is actually rendered.
   */
  function toString (val) {
    return val == null
      ? ''
      : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
        ? JSON.stringify(val, null, 2)
        : String(val)
  }

  /**
   * Convert an input value to a number for persistence.
   * If the conversion fails, return original string.
   */
  function toNumber (val) {
    var n = parseFloat(val);
    return isNaN(n) ? val : n
  }

  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   */
  function makeMap (
    str,
    expectsLowerCase
  ) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase
      ? function (val) { return map[val.toLowerCase()]; }
      : function (val) { return map[val]; }
  }

  /**
   * Check if a tag is a built-in tag.
   */
  var isBuiltInTag = makeMap('slot,component', true);

  /**
   * Check if an attribute is a reserved attribute.
   */
  var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

  /**
   * Remove an item from an array.
   */
  function remove (arr, item) {
    if (arr.length) {
      var index = arr.indexOf(item);
      if (index > -1) {
        return arr.splice(index, 1)
      }
    }
  }

  /**
   * Check whether an object has the property.
   */
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function hasOwn (obj, key) {
    return hasOwnProperty.call(obj, key)
  }

  /**
   * Create a cached version of a pure function.
   */
  function cached (fn) {
    var cache = Object.create(null);
    return (function cachedFn (str) {
      var hit = cache[str];
      return hit || (cache[str] = fn(str))
    })
  }

  /**
   * Camelize a hyphen-delimited string.
   */
  var camelizeRE = /-(\w)/g;
  var camelize = cached(function (str) {
    return str.replace(camelizeRE, function (_, c) { return c ? c.toUpperCase() : ''; })
  });

  /**
   * Capitalize a string.
   */
  var capitalize = cached(function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  });

  /**
   * Hyphenate a camelCase string.
   */
  var hyphenateRE = /\B([A-Z])/g;
  var hyphenate = cached(function (str) {
    return str.replace(hyphenateRE, '-$1').toLowerCase()
  });

  /**
   * Simple bind polyfill for environments that do not support it,
   * e.g., PhantomJS 1.x. Technically, we don't need this anymore
   * since native bind is now performant enough in most browsers.
   * But removing it would mean breaking code that was able to run in
   * PhantomJS 1.x, so this must be kept for backward compatibility.
   */

  /* istanbul ignore next */
  function polyfillBind (fn, ctx) {
    function boundFn (a) {
      var l = arguments.length;
      return l
        ? l > 1
          ? fn.apply(ctx, arguments)
          : fn.call(ctx, a)
        : fn.call(ctx)
    }

    boundFn._length = fn.length;
    return boundFn
  }

  function nativeBind (fn, ctx) {
    return fn.bind(ctx)
  }

  var bind = Function.prototype.bind
    ? nativeBind
    : polyfillBind;

  /**
   * Convert an Array-like object to a real Array.
   */
  function toArray (list, start) {
    start = start || 0;
    var i = list.length - start;
    var ret = new Array(i);
    while (i--) {
      ret[i] = list[i + start];
    }
    return ret
  }

  /**
   * Mix properties into target object.
   */
  function extend (to, _from) {
    for (var key in _from) {
      to[key] = _from[key];
    }
    return to
  }

  /**
   * Merge an Array of Objects into a single Object.
   */
  function toObject (arr) {
    var res = {};
    for (var i = 0; i < arr.length; i++) {
      if (arr[i]) {
        extend(res, arr[i]);
      }
    }
    return res
  }

  /* eslint-disable no-unused-vars */

  /**
   * Perform no operation.
   * Stubbing args to make Flow happy without leaving useless transpiled code
   * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
   */
  function noop (a, b, c) {}

  /**
   * Always return false.
   */
  var no = function (a, b, c) { return false; };

  /* eslint-enable no-unused-vars */

  /**
   * Return the same value.
   */
  var identity = function (_) { return _; };

  /**
   * Check if two values are loosely equal - that is,
   * if they are plain objects, do they have the same shape?
   */
  function looseEqual (a, b) {
    if (a === b) { return true }
    var isObjectA = isObject(a);
    var isObjectB = isObject(b);
    if (isObjectA && isObjectB) {
      try {
        var isArrayA = Array.isArray(a);
        var isArrayB = Array.isArray(b);
        if (isArrayA && isArrayB) {
          return a.length === b.length && a.every(function (e, i) {
            return looseEqual(e, b[i])
          })
        } else if (a instanceof Date && b instanceof Date) {
          return a.getTime() === b.getTime()
        } else if (!isArrayA && !isArrayB) {
          var keysA = Object.keys(a);
          var keysB = Object.keys(b);
          return keysA.length === keysB.length && keysA.every(function (key) {
            return looseEqual(a[key], b[key])
          })
        } else {
          /* istanbul ignore next */
          return false
        }
      } catch (e) {
        /* istanbul ignore next */
        return false
      }
    } else if (!isObjectA && !isObjectB) {
      return String(a) === String(b)
    } else {
      return false
    }
  }

  /**
   * Return the first index at which a loosely equal value can be
   * found in the array (if value is a plain object, the array must
   * contain an object of the same shape), or -1 if it is not present.
   */
  function looseIndexOf (arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (looseEqual(arr[i], val)) { return i }
    }
    return -1
  }

  /**
   * Ensure a function is called only once.
   */
  function once (fn) {
    var called = false;
    return function () {
      if (!called) {
        called = true;
        fn.apply(this, arguments);
      }
    }
  }

  var SSR_ATTR = 'data-server-rendered';

  var ASSET_TYPES = [
    'component',
    'directive',
    'filter'
  ];

  var LIFECYCLE_HOOKS = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeDestroy',
    'destroyed',
    'activated',
    'deactivated',
    'errorCaptured',
    'serverPrefetch'
  ];

  /*  */



  var config = ({
    /**
     * Option merge strategies (used in core/util/options)
     */
    // $flow-disable-line
    optionMergeStrategies: Object.create(null),

    /**
     * Whether to suppress warnings.
     */
    silent: false,

    /**
     * Show production mode tip message on boot?
     */
    productionTip: "production" !== 'production',

    /**
     * Whether to enable devtools
     */
    devtools: "production" !== 'production',

    /**
     * Whether to record perf
     */
    performance: false,

    /**
     * Error handler for watcher errors
     */
    errorHandler: null,

    /**
     * Warn handler for watcher warns
     */
    warnHandler: null,

    /**
     * Ignore certain custom elements
     */
    ignoredElements: [],

    /**
     * Custom user key aliases for v-on
     */
    // $flow-disable-line
    keyCodes: Object.create(null),

    /**
     * Check if a tag is reserved so that it cannot be registered as a
     * component. This is platform-dependent and may be overwritten.
     */
    isReservedTag: no,

    /**
     * Check if an attribute is reserved so that it cannot be used as a component
     * prop. This is platform-dependent and may be overwritten.
     */
    isReservedAttr: no,

    /**
     * Check if a tag is an unknown element.
     * Platform-dependent.
     */
    isUnknownElement: no,

    /**
     * Get the namespace of an element
     */
    getTagNamespace: noop,

    /**
     * Parse the real tag name for the specific platform.
     */
    parsePlatformTagName: identity,

    /**
     * Check if an attribute must be bound using property, e.g. value
     * Platform-dependent.
     */
    mustUseProp: no,

    /**
     * Perform updates asynchronously. Intended to be used by Vue Test Utils
     * This will significantly reduce performance if set to false.
     */
    async: true,

    /**
     * Exposed for legacy reasons
     */
    _lifecycleHooks: LIFECYCLE_HOOKS
  });

  /*  */

  /**
   * unicode letters used for parsing html tags, component names and property paths.
   * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
   * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
   */
  var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

  /**
   * Check if a string starts with $ or _
   */
  function isReserved (str) {
    var c = (str + '').charCodeAt(0);
    return c === 0x24 || c === 0x5F
  }

  /**
   * Define a property.
   */
  function def (obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    });
  }

  /**
   * Parse simple path.
   */
  var bailRE = new RegExp(("[^" + (unicodeRegExp.source) + ".$_\\d]"));
  function parsePath (path) {
    if (bailRE.test(path)) {
      return
    }
    var segments = path.split('.');
    return function (obj) {
      for (var i = 0; i < segments.length; i++) {
        if (!obj) { return }
        obj = obj[segments[i]];
      }
      return obj
    }
  }

  /*  */

  // can we use __proto__?
  var hasProto = '__proto__' in {};

  // Browser environment sniffing
  var inBrowser = typeof window !== 'undefined';
  var inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform;
  var weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
  var UA = inBrowser && window.navigator.userAgent.toLowerCase();
  var isIE = UA && /msie|trident/.test(UA);
  var isIE9 = UA && UA.indexOf('msie 9.0') > 0;
  var isEdge = UA && UA.indexOf('edge/') > 0;
  var isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android');
  var isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios');
  var isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
  var isPhantomJS = UA && /phantomjs/.test(UA);
  var isFF = UA && UA.match(/firefox\/(\d+)/);

  // Firefox has a "watch" function on Object.prototype...
  var nativeWatch = ({}).watch;

  var supportsPassive = false;
  if (inBrowser) {
    try {
      var opts = {};
      Object.defineProperty(opts, 'passive', ({
        get: function get () {
          /* istanbul ignore next */
          supportsPassive = true;
        }
      })); // https://github.com/facebook/flow/issues/285
      window.addEventListener('test-passive', null, opts);
    } catch (e) {}
  }

  // this needs to be lazy-evaled because vue may be required before
  // vue-server-renderer can set VUE_ENV
  var _isServer;
  var isServerRendering = function () {
    if (_isServer === undefined) {
      /* istanbul ignore if */
      if (!inBrowser && !inWeex && typeof global !== 'undefined') {
        // detect presence of vue-server-renderer and avoid
        // Webpack shimming the process
        _isServer = global['process'] && global['process'].env.VUE_ENV === 'server';
      } else {
        _isServer = false;
      }
    }
    return _isServer
  };

  // detect devtools
  var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

  /* istanbul ignore next */
  function isNative (Ctor) {
    return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
  }

  var hasSymbol =
    typeof Symbol !== 'undefined' && isNative(Symbol) &&
    typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys);

  var _Set;
  /* istanbul ignore if */ // $flow-disable-line
  if (typeof Set !== 'undefined' && isNative(Set)) {
    // use native Set when available.
    _Set = Set;
  } else {
    // a non-standard Set polyfill that only works with primitive keys.
    _Set = /*@__PURE__*/(function () {
      function Set () {
        this.set = Object.create(null);
      }
      Set.prototype.has = function has (key) {
        return this.set[key] === true
      };
      Set.prototype.add = function add (key) {
        this.set[key] = true;
      };
      Set.prototype.clear = function clear () {
        this.set = Object.create(null);
      };

      return Set;
    }());
  }

  /*  */

  var warn = noop;

  /*  */

  var uid = 0;

  /**
   * A dep is an observable that can have multiple
   * directives subscribing to it.
   */
  var Dep = function Dep () {
    this.id = uid++;
    this.subs = [];
  };

  Dep.prototype.addSub = function addSub (sub) {
    this.subs.push(sub);
  };

  Dep.prototype.removeSub = function removeSub (sub) {
    remove(this.subs, sub);
  };

  Dep.prototype.depend = function depend () {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  };

  Dep.prototype.notify = function notify () {
    // stabilize the subscriber list first
    var subs = this.subs.slice();
    for (var i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  };

  // The current target watcher being evaluated.
  // This is globally unique because only one watcher
  // can be evaluated at a time.
  Dep.target = null;
  var targetStack = [];

  function pushTarget (target) {
    targetStack.push(target);
    Dep.target = target;
  }

  function popTarget () {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
  }

  /*  */

  var VNode = function VNode (
    tag,
    data,
    children,
    text,
    elm,
    context,
    componentOptions,
    asyncFactory
  ) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.ns = undefined;
    this.context = context;
    this.fnContext = undefined;
    this.fnOptions = undefined;
    this.fnScopeId = undefined;
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = undefined;
    this.parent = undefined;
    this.raw = false;
    this.isStatic = false;
    this.isRootInsert = true;
    this.isComment = false;
    this.isCloned = false;
    this.isOnce = false;
    this.asyncFactory = asyncFactory;
    this.asyncMeta = undefined;
    this.isAsyncPlaceholder = false;
  };

  var prototypeAccessors = { child: { configurable: true } };

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  prototypeAccessors.child.get = function () {
    return this.componentInstance
  };

  Object.defineProperties( VNode.prototype, prototypeAccessors );

  var createEmptyVNode = function (text) {
    if ( text === void 0 ) { text = ''; }

    var node = new VNode();
    node.text = text;
    node.isComment = true;
    return node
  };

  function createTextVNode (val) {
    return new VNode(undefined, undefined, undefined, String(val))
  }

  // optimized shallow clone
  // used for static nodes and slot nodes because they may be reused across
  // multiple renders, cloning them avoids errors when DOM manipulations rely
  // on their elm reference.
  function cloneVNode (vnode) {
    var cloned = new VNode(
      vnode.tag,
      vnode.data,
      // #7975
      // clone children array to avoid mutating original in case of cloning
      // a child.
      vnode.children && vnode.children.slice(),
      vnode.text,
      vnode.elm,
      vnode.context,
      vnode.componentOptions,
      vnode.asyncFactory
    );
    cloned.ns = vnode.ns;
    cloned.isStatic = vnode.isStatic;
    cloned.key = vnode.key;
    cloned.isComment = vnode.isComment;
    cloned.fnContext = vnode.fnContext;
    cloned.fnOptions = vnode.fnOptions;
    cloned.fnScopeId = vnode.fnScopeId;
    cloned.asyncMeta = vnode.asyncMeta;
    cloned.isCloned = true;
    return cloned
  }

  /*
   * not type checking this file because flow doesn't play well with
   * dynamically accessing methods on Array prototype
   */

  var arrayProto = Array.prototype;
  var arrayMethods = Object.create(arrayProto);

  var methodsToPatch = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
  ];

  /**
   * Intercept mutating methods and emit events
   */
  methodsToPatch.forEach(function (method) {
    // cache original method
    var original = arrayProto[method];
    def(arrayMethods, method, function mutator () {
      var arguments$1 = arguments;

      var args = [], len = arguments.length;
      while ( len-- ) { args[ len ] = arguments$1[ len ]; }

      var result = original.apply(this, args);
      var ob = this.__ob__;
      var inserted;
      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args;
          break
        case 'splice':
          inserted = args.slice(2);
          break
      }
      if (inserted) { ob.observeArray(inserted); }
      // notify change
      ob.dep.notify();
      return result
    });
  });

  /*  */

  var arrayKeys = Object.getOwnPropertyNames(arrayMethods);

  /**
   * In some cases we may want to disable observation inside a component's
   * update computation.
   */
  var shouldObserve = true;

  function toggleObserving (value) {
    shouldObserve = value;
  }

  /**
   * Observer class that is attached to each observed
   * object. Once attached, the observer converts the target
   * object's property keys into getter/setters that
   * collect dependencies and dispatch updates.
   */
  var Observer = function Observer (value) {
    this.value = value;
    this.dep = new Dep();
    this.vmCount = 0;
    def(value, '__ob__', this);
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods);
      } else {
        copyAugment(value, arrayMethods, arrayKeys);
      }
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  };

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  Observer.prototype.walk = function walk (obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      defineReactive$$1(obj, keys[i]);
    }
  };

  /**
   * Observe a list of Array items.
   */
  Observer.prototype.observeArray = function observeArray (items) {
    for (var i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  };

  // helpers

  /**
   * Augment a target Object or Array by intercepting
   * the prototype chain using __proto__
   */
  function protoAugment (target, src) {
    /* eslint-disable no-proto */
    target.__proto__ = src;
    /* eslint-enable no-proto */
  }

  /**
   * Augment a target Object or Array by defining
   * hidden properties.
   */
  /* istanbul ignore next */
  function copyAugment (target, src, keys) {
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      def(target, key, src[key]);
    }
  }

  /**
   * Attempt to create an observer instance for a value,
   * returns the new observer if successfully observed,
   * or the existing observer if the value already has one.
   */
  function observe (value, asRootData) {
    if (!isObject(value) || value instanceof VNode) {
      return
    }
    var ob;
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
      ob = value.__ob__;
    } else if (
      shouldObserve &&
      !isServerRendering() &&
      (Array.isArray(value) || isPlainObject(value)) &&
      Object.isExtensible(value) &&
      !value._isVue
    ) {
      ob = new Observer(value);
    }
    if (asRootData && ob) {
      ob.vmCount++;
    }
    return ob
  }

  /**
   * Define a reactive property on an Object.
   */
  function defineReactive$$1 (
    obj,
    key,
    val,
    customSetter,
    shallow
  ) {
    var dep = new Dep();

    var property = Object.getOwnPropertyDescriptor(obj, key);
    if (property && property.configurable === false) {
      return
    }

    // cater for pre-defined getter/setters
    var getter = property && property.get;
    var setter = property && property.set;
    if ((!getter || setter) && arguments.length === 2) {
      val = obj[key];
    }

    var childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter () {
        var value = getter ? getter.call(obj) : val;
        if (Dep.target) {
          dep.depend();
          if (childOb) {
            childOb.dep.depend();
            if (Array.isArray(value)) {
              dependArray(value);
            }
          }
        }
        return value
      },
      set: function reactiveSetter (newVal) {
        var value = getter ? getter.call(obj) : val;
        /* eslint-disable no-self-compare */
        if (newVal === value || (newVal !== newVal && value !== value)) {
          return
        }
        // #7981: for accessor properties without setter
        if (getter && !setter) { return }
        if (setter) {
          setter.call(obj, newVal);
        } else {
          val = newVal;
        }
        childOb = !shallow && observe(newVal);
        dep.notify();
      }
    });
  }

  /**
   * Set a property on an object. Adds the new property and
   * triggers change notification if the property doesn't
   * already exist.
   */
  function set (target, key, val) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val
    }
    if (key in target && !(key in Object.prototype)) {
      target[key] = val;
      return val
    }
    var ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
      return val
    }
    if (!ob) {
      target[key] = val;
      return val
    }
    defineReactive$$1(ob.value, key, val);
    ob.dep.notify();
    return val
  }

  /**
   * Delete a property and trigger change if necessary.
   */
  function del (target, key) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.splice(key, 1);
      return
    }
    var ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
      return
    }
    if (!hasOwn(target, key)) {
      return
    }
    delete target[key];
    if (!ob) {
      return
    }
    ob.dep.notify();
  }

  /**
   * Collect dependencies on array elements when the array is touched, since
   * we cannot intercept array element access like property getters.
   */
  function dependArray (value) {
    for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
      e = value[i];
      e && e.__ob__ && e.__ob__.dep.depend();
      if (Array.isArray(e)) {
        dependArray(e);
      }
    }
  }

  /*  */

  /**
   * Option overwriting strategies are functions that handle
   * how to merge a parent option value and a child option
   * value into the final value.
   */
  var strats = config.optionMergeStrategies;

  /**
   * Helper that recursively merges two data objects together.
   */
  function mergeData (to, from) {
    if (!from) { return to }
    var key, toVal, fromVal;

    var keys = hasSymbol
      ? Reflect.ownKeys(from)
      : Object.keys(from);

    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      // in case the object is already observed...
      if (key === '__ob__') { continue }
      toVal = to[key];
      fromVal = from[key];
      if (!hasOwn(to, key)) {
        set(to, key, fromVal);
      } else if (
        toVal !== fromVal &&
        isPlainObject(toVal) &&
        isPlainObject(fromVal)
      ) {
        mergeData(toVal, fromVal);
      }
    }
    return to
  }

  /**
   * Data
   */
  function mergeDataOrFn (
    parentVal,
    childVal,
    vm
  ) {
    if (!vm) {
      // in a Vue.extend merge, both should be functions
      if (!childVal) {
        return parentVal
      }
      if (!parentVal) {
        return childVal
      }
      // when parentVal & childVal are both present,
      // we need to return a function that returns the
      // merged result of both functions... no need to
      // check if parentVal is a function here because
      // it has to be a function to pass previous merges.
      return function mergedDataFn () {
        return mergeData(
          typeof childVal === 'function' ? childVal.call(this, this) : childVal,
          typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
        )
      }
    } else {
      return function mergedInstanceDataFn () {
        // instance merge
        var instanceData = typeof childVal === 'function'
          ? childVal.call(vm, vm)
          : childVal;
        var defaultData = typeof parentVal === 'function'
          ? parentVal.call(vm, vm)
          : parentVal;
        if (instanceData) {
          return mergeData(instanceData, defaultData)
        } else {
          return defaultData
        }
      }
    }
  }

  strats.data = function (
    parentVal,
    childVal,
    vm
  ) {
    if (!vm) {
      if (childVal && typeof childVal !== 'function') {

        return parentVal
      }
      return mergeDataOrFn(parentVal, childVal)
    }

    return mergeDataOrFn(parentVal, childVal, vm)
  };

  /**
   * Hooks and props are merged as arrays.
   */
  function mergeHook (
    parentVal,
    childVal
  ) {
    var res = childVal
      ? parentVal
        ? parentVal.concat(childVal)
        : Array.isArray(childVal)
          ? childVal
          : [childVal]
      : parentVal;
    return res
      ? dedupeHooks(res)
      : res
  }

  function dedupeHooks (hooks) {
    var res = [];
    for (var i = 0; i < hooks.length; i++) {
      if (res.indexOf(hooks[i]) === -1) {
        res.push(hooks[i]);
      }
    }
    return res
  }

  LIFECYCLE_HOOKS.forEach(function (hook) {
    strats[hook] = mergeHook;
  });

  /**
   * Assets
   *
   * When a vm is present (instance creation), we need to do
   * a three-way merge between constructor options, instance
   * options and parent options.
   */
  function mergeAssets (
    parentVal,
    childVal,
    vm,
    key
  ) {
    var res = Object.create(parentVal || null);
    if (childVal) {
      return extend(res, childVal)
    } else {
      return res
    }
  }

  ASSET_TYPES.forEach(function (type) {
    strats[type + 's'] = mergeAssets;
  });

  /**
   * Watchers.
   *
   * Watchers hashes should not overwrite one
   * another, so we merge them as arrays.
   */
  strats.watch = function (
    parentVal,
    childVal,
    vm,
    key
  ) {
    // work around Firefox's Object.prototype.watch...
    if (parentVal === nativeWatch) { parentVal = undefined; }
    if (childVal === nativeWatch) { childVal = undefined; }
    /* istanbul ignore if */
    if (!childVal) { return Object.create(parentVal || null) }
    if (!parentVal) { return childVal }
    var ret = {};
    extend(ret, parentVal);
    for (var key$1 in childVal) {
      var parent = ret[key$1];
      var child = childVal[key$1];
      if (parent && !Array.isArray(parent)) {
        parent = [parent];
      }
      ret[key$1] = parent
        ? parent.concat(child)
        : Array.isArray(child) ? child : [child];
    }
    return ret
  };

  /**
   * Other object hashes.
   */
  strats.props =
  strats.methods =
  strats.inject =
  strats.computed = function (
    parentVal,
    childVal,
    vm,
    key
  ) {
    if (childVal && "production" !== 'production') {
      assertObjectType(key, childVal);
    }
    if (!parentVal) { return childVal }
    var ret = Object.create(null);
    extend(ret, parentVal);
    if (childVal) { extend(ret, childVal); }
    return ret
  };
  strats.provide = mergeDataOrFn;

  /**
   * Default strategy.
   */
  var defaultStrat = function (parentVal, childVal) {
    return childVal === undefined
      ? parentVal
      : childVal
  };

  /**
   * Ensure all props option syntax are normalized into the
   * Object-based format.
   */
  function normalizeProps (options, vm) {
    var props = options.props;
    if (!props) { return }
    var res = {};
    var i, val, name;
    if (Array.isArray(props)) {
      i = props.length;
      while (i--) {
        val = props[i];
        if (typeof val === 'string') {
          name = camelize(val);
          res[name] = { type: null };
        }
      }
    } else if (isPlainObject(props)) {
      for (var key in props) {
        val = props[key];
        name = camelize(key);
        res[name] = isPlainObject(val)
          ? val
          : { type: val };
      }
    }
    options.props = res;
  }

  /**
   * Normalize all injections into Object-based format
   */
  function normalizeInject (options, vm) {
    var inject = options.inject;
    if (!inject) { return }
    var normalized = options.inject = {};
    if (Array.isArray(inject)) {
      for (var i = 0; i < inject.length; i++) {
        normalized[inject[i]] = { from: inject[i] };
      }
    } else if (isPlainObject(inject)) {
      for (var key in inject) {
        var val = inject[key];
        normalized[key] = isPlainObject(val)
          ? extend({ from: key }, val)
          : { from: val };
      }
    }
  }

  /**
   * Normalize raw function directives into object format.
   */
  function normalizeDirectives (options) {
    var dirs = options.directives;
    if (dirs) {
      for (var key in dirs) {
        var def$$1 = dirs[key];
        if (typeof def$$1 === 'function') {
          dirs[key] = { bind: def$$1, update: def$$1 };
        }
      }
    }
  }

  function assertObjectType (name, value, vm) {
    if (!isPlainObject(value)) {
      warn(
        "Invalid value for option \"" + name + "\": expected an Object, " +
        "but got " + (toRawType(value)) + ".");
    }
  }

  /**
   * Merge two option objects into a new one.
   * Core utility used in both instantiation and inheritance.
   */
  function mergeOptions (
    parent,
    child,
    vm
  ) {

    if (typeof child === 'function') {
      child = child.options;
    }

    normalizeProps(child);
    normalizeInject(child);
    normalizeDirectives(child);

    // Apply extends and mixins on the child options,
    // but only if it is a raw options object that isn't
    // the result of another mergeOptions call.
    // Only merged options has the _base property.
    if (!child._base) {
      if (child.extends) {
        parent = mergeOptions(parent, child.extends, vm);
      }
      if (child.mixins) {
        for (var i = 0, l = child.mixins.length; i < l; i++) {
          parent = mergeOptions(parent, child.mixins[i], vm);
        }
      }
    }

    var options = {};
    var key;
    for (key in parent) {
      mergeField(key);
    }
    for (key in child) {
      if (!hasOwn(parent, key)) {
        mergeField(key);
      }
    }
    function mergeField (key) {
      var strat = strats[key] || defaultStrat;
      options[key] = strat(parent[key], child[key], vm, key);
    }
    return options
  }

  /**
   * Resolve an asset.
   * This function is used because child instances need access
   * to assets defined in its ancestor chain.
   */
  function resolveAsset (
    options,
    type,
    id,
    warnMissing
  ) {
    /* istanbul ignore if */
    if (typeof id !== 'string') {
      return
    }
    var assets = options[type];
    // check local registration variations first
    if (hasOwn(assets, id)) { return assets[id] }
    var camelizedId = camelize(id);
    if (hasOwn(assets, camelizedId)) { return assets[camelizedId] }
    var PascalCaseId = capitalize(camelizedId);
    if (hasOwn(assets, PascalCaseId)) { return assets[PascalCaseId] }
    // fallback to prototype chain
    var res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
    return res
  }

  /*  */



  function validateProp (
    key,
    propOptions,
    propsData,
    vm
  ) {
    var prop = propOptions[key];
    var absent = !hasOwn(propsData, key);
    var value = propsData[key];
    // boolean casting
    var booleanIndex = getTypeIndex(Boolean, prop.type);
    if (booleanIndex > -1) {
      if (absent && !hasOwn(prop, 'default')) {
        value = false;
      } else if (value === '' || value === hyphenate(key)) {
        // only cast empty string / same name to boolean if
        // boolean has higher priority
        var stringIndex = getTypeIndex(String, prop.type);
        if (stringIndex < 0 || booleanIndex < stringIndex) {
          value = true;
        }
      }
    }
    // check default value
    if (value === undefined) {
      value = getPropDefaultValue(vm, prop, key);
      // since the default value is a fresh copy,
      // make sure to observe it.
      var prevShouldObserve = shouldObserve;
      toggleObserving(true);
      observe(value);
      toggleObserving(prevShouldObserve);
    }
    return value
  }

  /**
   * Get the default value of a prop.
   */
  function getPropDefaultValue (vm, prop, key) {
    // no default, return undefined
    if (!hasOwn(prop, 'default')) {
      return undefined
    }
    var def = prop.default;
    // the raw prop value was also undefined from previous render,
    // return previous default value to avoid unnecessary watcher trigger
    if (vm && vm.$options.propsData &&
      vm.$options.propsData[key] === undefined &&
      vm._props[key] !== undefined
    ) {
      return vm._props[key]
    }
    // call factory function for non-Function types
    // a value is Function if its prototype is function even across different execution context
    return typeof def === 'function' && getType(prop.type) !== 'Function'
      ? def.call(vm)
      : def
  }

  /**
   * Use function string name to check built-in types,
   * because a simple equality check will fail when running
   * across different vms / iframes.
   */
  function getType (fn) {
    var match = fn && fn.toString().match(/^\s*function (\w+)/);
    return match ? match[1] : ''
  }

  function isSameType (a, b) {
    return getType(a) === getType(b)
  }

  function getTypeIndex (type, expectedTypes) {
    if (!Array.isArray(expectedTypes)) {
      return isSameType(expectedTypes, type) ? 0 : -1
    }
    for (var i = 0, len = expectedTypes.length; i < len; i++) {
      if (isSameType(expectedTypes[i], type)) {
        return i
      }
    }
    return -1
  }

  /*  */

  function handleError (err, vm, info) {
    // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
    // See: https://github.com/vuejs/vuex/issues/1505
    pushTarget();
    try {
      if (vm) {
        var cur = vm;
        while ((cur = cur.$parent)) {
          var hooks = cur.$options.errorCaptured;
          if (hooks) {
            for (var i = 0; i < hooks.length; i++) {
              try {
                var capture = hooks[i].call(cur, err, vm, info) === false;
                if (capture) { return }
              } catch (e) {
                globalHandleError(e, cur, 'errorCaptured hook');
              }
            }
          }
        }
      }
      globalHandleError(err, vm, info);
    } finally {
      popTarget();
    }
  }

  function invokeWithErrorHandling (
    handler,
    context,
    args,
    vm,
    info
  ) {
    var res;
    try {
      res = args ? handler.apply(context, args) : handler.call(context);
      if (res && !res._isVue && isPromise(res) && !res._handled) {
        res.catch(function (e) { return handleError(e, vm, info + " (Promise/async)"); });
        // issue #9511
        // avoid catch triggering multiple times when nested calls
        res._handled = true;
      }
    } catch (e) {
      handleError(e, vm, info);
    }
    return res
  }

  function globalHandleError (err, vm, info) {
    if (config.errorHandler) {
      try {
        return config.errorHandler.call(null, err, vm, info)
      } catch (e) {
        // if the user intentionally throws the original error in the handler,
        // do not log it twice
        if (e !== err) {
          logError(e);
        }
      }
    }
    logError(err);
  }

  function logError (err, vm, info) {
    /* istanbul ignore else */
    if ((inBrowser || inWeex) && typeof console !== 'undefined') {
      console.error(err);
    } else {
      throw err
    }
  }

  /*  */

  var isUsingMicroTask = false;

  var callbacks = [];
  var pending = false;

  function flushCallbacks () {
    pending = false;
    var copies = callbacks.slice(0);
    callbacks.length = 0;
    for (var i = 0; i < copies.length; i++) {
      copies[i]();
    }
  }

  // Here we have async deferring wrappers using microtasks.
  // In 2.5 we used (macro) tasks (in combination with microtasks).
  // However, it has subtle problems when state is changed right before repaint
  // (e.g. #6813, out-in transitions).
  // Also, using (macro) tasks in event handler would cause some weird behaviors
  // that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
  // So we now use microtasks everywhere, again.
  // A major drawback of this tradeoff is that there are some scenarios
  // where microtasks have too high a priority and fire in between supposedly
  // sequential events (e.g. #4521, #6690, which have workarounds)
  // or even between bubbling of the same event (#6566).
  var timerFunc;

  // The nextTick behavior leverages the microtask queue, which can be accessed
  // via either native Promise.then or MutationObserver.
  // MutationObserver has wider support, however it is seriously bugged in
  // UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
  // completely stops working after triggering a few times... so, if native
  // Promise is available, we will use it:
  /* istanbul ignore next, $flow-disable-line */
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    var p = Promise.resolve();
    timerFunc = function () {
      p.then(flushCallbacks);
      // In problematic UIWebViews, Promise.then doesn't completely break, but
      // it can get stuck in a weird state where callbacks are pushed into the
      // microtask queue but the queue isn't being flushed, until the browser
      // needs to do some other work, e.g. handle a timer. Therefore we can
      // "force" the microtask queue to be flushed by adding an empty timer.
      if (isIOS) { setTimeout(noop); }
    };
    isUsingMicroTask = true;
  } else if (!isIE && typeof MutationObserver !== 'undefined' && (
    isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]'
  )) {
    // Use MutationObserver where native Promise is not available,
    // e.g. PhantomJS, iOS7, Android 4.4
    // (#6466 MutationObserver is unreliable in IE11)
    var counter = 1;
    var observer = new MutationObserver(flushCallbacks);
    var textNode = document.createTextNode(String(counter));
    observer.observe(textNode, {
      characterData: true
    });
    timerFunc = function () {
      counter = (counter + 1) % 2;
      textNode.data = String(counter);
    };
    isUsingMicroTask = true;
  } else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
    // Fallback to setImmediate.
    // Technically it leverages the (macro) task queue,
    // but it is still a better choice than setTimeout.
    timerFunc = function () {
      setImmediate(flushCallbacks);
    };
  } else {
    // Fallback to setTimeout.
    timerFunc = function () {
      setTimeout(flushCallbacks, 0);
    };
  }

  function nextTick (cb, ctx) {
    var _resolve;
    callbacks.push(function () {
      if (cb) {
        try {
          cb.call(ctx);
        } catch (e) {
          handleError(e, ctx, 'nextTick');
        }
      } else if (_resolve) {
        _resolve(ctx);
      }
    });
    if (!pending) {
      pending = true;
      timerFunc();
    }
    // $flow-disable-line
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise(function (resolve) {
        _resolve = resolve;
      })
    }
  }

  /*  */

  var seenObjects = new _Set();

  /**
   * Recursively traverse an object to evoke all converted
   * getters, so that every nested property inside the object
   * is collected as a "deep" dependency.
   */
  function traverse (val) {
    _traverse(val, seenObjects);
    seenObjects.clear();
  }

  function _traverse (val, seen) {
    var i, keys;
    var isA = Array.isArray(val);
    if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
      return
    }
    if (val.__ob__) {
      var depId = val.__ob__.dep.id;
      if (seen.has(depId)) {
        return
      }
      seen.add(depId);
    }
    if (isA) {
      i = val.length;
      while (i--) { _traverse(val[i], seen); }
    } else {
      keys = Object.keys(val);
      i = keys.length;
      while (i--) { _traverse(val[keys[i]], seen); }
    }
  }

  /*  */

  var normalizeEvent = cached(function (name) {
    var passive = name.charAt(0) === '&';
    name = passive ? name.slice(1) : name;
    var once$$1 = name.charAt(0) === '~'; // Prefixed last, checked first
    name = once$$1 ? name.slice(1) : name;
    var capture = name.charAt(0) === '!';
    name = capture ? name.slice(1) : name;
    return {
      name: name,
      once: once$$1,
      capture: capture,
      passive: passive
    }
  });

  function createFnInvoker (fns, vm) {
    function invoker () {
      var arguments$1 = arguments;

      var fns = invoker.fns;
      if (Array.isArray(fns)) {
        var cloned = fns.slice();
        for (var i = 0; i < cloned.length; i++) {
          invokeWithErrorHandling(cloned[i], null, arguments$1, vm, "v-on handler");
        }
      } else {
        // return handler return value for single handlers
        return invokeWithErrorHandling(fns, null, arguments, vm, "v-on handler")
      }
    }
    invoker.fns = fns;
    return invoker
  }

  function updateListeners (
    on,
    oldOn,
    add,
    remove$$1,
    createOnceHandler,
    vm
  ) {
    var name, def$$1, cur, old, event;
    for (name in on) {
      def$$1 = cur = on[name];
      old = oldOn[name];
      event = normalizeEvent(name);
      if (isUndef(cur)) ; else if (isUndef(old)) {
        if (isUndef(cur.fns)) {
          cur = on[name] = createFnInvoker(cur, vm);
        }
        if (isTrue(event.once)) {
          cur = on[name] = createOnceHandler(event.name, cur, event.capture);
        }
        add(event.name, cur, event.capture, event.passive, event.params);
      } else if (cur !== old) {
        old.fns = cur;
        on[name] = old;
      }
    }
    for (name in oldOn) {
      if (isUndef(on[name])) {
        event = normalizeEvent(name);
        remove$$1(event.name, oldOn[name], event.capture);
      }
    }
  }

  /*  */

  function mergeVNodeHook (def, hookKey, hook) {
    if (def instanceof VNode) {
      def = def.data.hook || (def.data.hook = {});
    }
    var invoker;
    var oldHook = def[hookKey];

    function wrappedHook () {
      hook.apply(this, arguments);
      // important: remove merged hook to ensure it's called only once
      // and prevent memory leak
      remove(invoker.fns, wrappedHook);
    }

    if (isUndef(oldHook)) {
      // no existing hook
      invoker = createFnInvoker([wrappedHook]);
    } else {
      /* istanbul ignore if */
      if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
        // already a merged invoker
        invoker = oldHook;
        invoker.fns.push(wrappedHook);
      } else {
        // existing plain hook
        invoker = createFnInvoker([oldHook, wrappedHook]);
      }
    }

    invoker.merged = true;
    def[hookKey] = invoker;
  }

  /*  */

  function extractPropsFromVNodeData (
    data,
    Ctor,
    tag
  ) {
    // we are only extracting raw values here.
    // validation and default values are handled in the child
    // component itself.
    var propOptions = Ctor.options.props;
    if (isUndef(propOptions)) {
      return
    }
    var res = {};
    var attrs = data.attrs;
    var props = data.props;
    if (isDef(attrs) || isDef(props)) {
      for (var key in propOptions) {
        var altKey = hyphenate(key);
        checkProp(res, props, key, altKey, true) ||
        checkProp(res, attrs, key, altKey, false);
      }
    }
    return res
  }

  function checkProp (
    res,
    hash,
    key,
    altKey,
    preserve
  ) {
    if (isDef(hash)) {
      if (hasOwn(hash, key)) {
        res[key] = hash[key];
        if (!preserve) {
          delete hash[key];
        }
        return true
      } else if (hasOwn(hash, altKey)) {
        res[key] = hash[altKey];
        if (!preserve) {
          delete hash[altKey];
        }
        return true
      }
    }
    return false
  }

  /*  */

  // The template compiler attempts to minimize the need for normalization by
  // statically analyzing the template at compile time.
  //
  // For plain HTML markup, normalization can be completely skipped because the
  // generated render function is guaranteed to return Array<VNode>. There are
  // two cases where extra normalization is needed:

  // 1. When the children contains components - because a functional component
  // may return an Array instead of a single root. In this case, just a simple
  // normalization is needed - if any child is an Array, we flatten the whole
  // thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
  // because functional components already normalize their own children.
  function simpleNormalizeChildren (children) {
    for (var i = 0; i < children.length; i++) {
      if (Array.isArray(children[i])) {
        return Array.prototype.concat.apply([], children)
      }
    }
    return children
  }

  // 2. When the children contains constructs that always generated nested Arrays,
  // e.g. <template>, <slot>, v-for, or when the children is provided by user
  // with hand-written render functions / JSX. In such cases a full normalization
  // is needed to cater to all possible types of children values.
  function normalizeChildren (children) {
    return isPrimitive(children)
      ? [createTextVNode(children)]
      : Array.isArray(children)
        ? normalizeArrayChildren(children)
        : undefined
  }

  function isTextNode (node) {
    return isDef(node) && isDef(node.text) && isFalse(node.isComment)
  }

  function normalizeArrayChildren (children, nestedIndex) {
    var res = [];
    var i, c, lastIndex, last;
    for (i = 0; i < children.length; i++) {
      c = children[i];
      if (isUndef(c) || typeof c === 'boolean') { continue }
      lastIndex = res.length - 1;
      last = res[lastIndex];
      //  nested
      if (Array.isArray(c)) {
        if (c.length > 0) {
          c = normalizeArrayChildren(c, ((nestedIndex || '') + "_" + i));
          // merge adjacent text nodes
          if (isTextNode(c[0]) && isTextNode(last)) {
            res[lastIndex] = createTextVNode(last.text + (c[0]).text);
            c.shift();
          }
          res.push.apply(res, c);
        }
      } else if (isPrimitive(c)) {
        if (isTextNode(last)) {
          // merge adjacent text nodes
          // this is necessary for SSR hydration because text nodes are
          // essentially merged when rendered to HTML strings
          res[lastIndex] = createTextVNode(last.text + c);
        } else if (c !== '') {
          // convert primitive to vnode
          res.push(createTextVNode(c));
        }
      } else {
        if (isTextNode(c) && isTextNode(last)) {
          // merge adjacent text nodes
          res[lastIndex] = createTextVNode(last.text + c.text);
        } else {
          // default key for nested array children (likely generated by v-for)
          if (isTrue(children._isVList) &&
            isDef(c.tag) &&
            isUndef(c.key) &&
            isDef(nestedIndex)) {
            c.key = "__vlist" + nestedIndex + "_" + i + "__";
          }
          res.push(c);
        }
      }
    }
    return res
  }

  /*  */

  function initProvide (vm) {
    var provide = vm.$options.provide;
    if (provide) {
      vm._provided = typeof provide === 'function'
        ? provide.call(vm)
        : provide;
    }
  }

  function initInjections (vm) {
    var result = resolveInject(vm.$options.inject, vm);
    if (result) {
      toggleObserving(false);
      Object.keys(result).forEach(function (key) {
        /* istanbul ignore else */
        {
          defineReactive$$1(vm, key, result[key]);
        }
      });
      toggleObserving(true);
    }
  }

  function resolveInject (inject, vm) {
    if (inject) {
      // inject is :any because flow is not smart enough to figure out cached
      var result = Object.create(null);
      var keys = hasSymbol
        ? Reflect.ownKeys(inject)
        : Object.keys(inject);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        // #6574 in case the inject object is observed...
        if (key === '__ob__') { continue }
        var provideKey = inject[key].from;
        var source = vm;
        while (source) {
          if (source._provided && hasOwn(source._provided, provideKey)) {
            result[key] = source._provided[provideKey];
            break
          }
          source = source.$parent;
        }
        if (!source) {
          if ('default' in inject[key]) {
            var provideDefault = inject[key].default;
            result[key] = typeof provideDefault === 'function'
              ? provideDefault.call(vm)
              : provideDefault;
          }
        }
      }
      return result
    }
  }

  /*  */



  /**
   * Runtime helper for resolving raw children VNodes into a slot object.
   */
  function resolveSlots (
    children,
    context
  ) {
    if (!children || !children.length) {
      return {}
    }
    var slots = {};
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i];
      var data = child.data;
      // remove slot attribute if the node is resolved as a Vue slot node
      if (data && data.attrs && data.attrs.slot) {
        delete data.attrs.slot;
      }
      // named slots should only be respected if the vnode was rendered in the
      // same context.
      if ((child.context === context || child.fnContext === context) &&
        data && data.slot != null
      ) {
        var name = data.slot;
        var slot = (slots[name] || (slots[name] = []));
        if (child.tag === 'template') {
          slot.push.apply(slot, child.children || []);
        } else {
          slot.push(child);
        }
      } else {
        (slots.default || (slots.default = [])).push(child);
      }
    }
    // ignore slots that contains only whitespace
    for (var name$1 in slots) {
      if (slots[name$1].every(isWhitespace)) {
        delete slots[name$1];
      }
    }
    return slots
  }

  function isWhitespace (node) {
    return (node.isComment && !node.asyncFactory) || node.text === ' '
  }

  /*  */

  function normalizeScopedSlots (
    slots,
    normalSlots,
    prevSlots
  ) {
    var res;
    var hasNormalSlots = Object.keys(normalSlots).length > 0;
    var isStable = slots ? !!slots.$stable : !hasNormalSlots;
    var key = slots && slots.$key;
    if (!slots) {
      res = {};
    } else if (slots._normalized) {
      // fast path 1: child component re-render only, parent did not change
      return slots._normalized
    } else if (
      isStable &&
      prevSlots &&
      prevSlots !== emptyObject &&
      key === prevSlots.$key &&
      !hasNormalSlots &&
      !prevSlots.$hasNormal
    ) {
      // fast path 2: stable scoped slots w/ no normal slots to proxy,
      // only need to normalize once
      return prevSlots
    } else {
      res = {};
      for (var key$1 in slots) {
        if (slots[key$1] && key$1[0] !== '$') {
          res[key$1] = normalizeScopedSlot(normalSlots, key$1, slots[key$1]);
        }
      }
    }
    // expose normal slots on scopedSlots
    for (var key$2 in normalSlots) {
      if (!(key$2 in res)) {
        res[key$2] = proxyNormalSlot(normalSlots, key$2);
      }
    }
    // avoriaz seems to mock a non-extensible $scopedSlots object
    // and when that is passed down this would cause an error
    if (slots && Object.isExtensible(slots)) {
      (slots)._normalized = res;
    }
    def(res, '$stable', isStable);
    def(res, '$key', key);
    def(res, '$hasNormal', hasNormalSlots);
    return res
  }

  function normalizeScopedSlot(normalSlots, key, fn) {
    var normalized = function () {
      var res = arguments.length ? fn.apply(null, arguments) : fn({});
      res = res && typeof res === 'object' && !Array.isArray(res)
        ? [res] // single vnode
        : normalizeChildren(res);
      return res && (
        res.length === 0 ||
        (res.length === 1 && res[0].isComment) // #9658
      ) ? undefined
        : res
    };
    // this is a slot using the new v-slot syntax without scope. although it is
    // compiled as a scoped slot, render fn users would expect it to be present
    // on this.$slots because the usage is semantically a normal slot.
    if (fn.proxy) {
      Object.defineProperty(normalSlots, key, {
        get: normalized,
        enumerable: true,
        configurable: true
      });
    }
    return normalized
  }

  function proxyNormalSlot(slots, key) {
    return function () { return slots[key]; }
  }

  /*  */

  /**
   * Runtime helper for rendering v-for lists.
   */
  function renderList (
    val,
    render
  ) {
    var ret, i, l, keys, key;
    if (Array.isArray(val) || typeof val === 'string') {
      ret = new Array(val.length);
      for (i = 0, l = val.length; i < l; i++) {
        ret[i] = render(val[i], i);
      }
    } else if (typeof val === 'number') {
      ret = new Array(val);
      for (i = 0; i < val; i++) {
        ret[i] = render(i + 1, i);
      }
    } else if (isObject(val)) {
      if (hasSymbol && val[Symbol.iterator]) {
        ret = [];
        var iterator = val[Symbol.iterator]();
        var result = iterator.next();
        while (!result.done) {
          ret.push(render(result.value, ret.length));
          result = iterator.next();
        }
      } else {
        keys = Object.keys(val);
        ret = new Array(keys.length);
        for (i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          ret[i] = render(val[key], key, i);
        }
      }
    }
    if (!isDef(ret)) {
      ret = [];
    }
    (ret)._isVList = true;
    return ret
  }

  /*  */

  /**
   * Runtime helper for rendering <slot>
   */
  function renderSlot (
    name,
    fallback,
    props,
    bindObject
  ) {
    var scopedSlotFn = this.$scopedSlots[name];
    var nodes;
    if (scopedSlotFn) { // scoped slot
      props = props || {};
      if (bindObject) {
        props = extend(extend({}, bindObject), props);
      }
      nodes = scopedSlotFn(props) || fallback;
    } else {
      nodes = this.$slots[name] || fallback;
    }

    var target = props && props.slot;
    if (target) {
      return this.$createElement('template', { slot: target }, nodes)
    } else {
      return nodes
    }
  }

  /*  */

  /**
   * Runtime helper for resolving filters
   */
  function resolveFilter (id) {
    return resolveAsset(this.$options, 'filters', id) || identity
  }

  /*  */

  function isKeyNotMatch (expect, actual) {
    if (Array.isArray(expect)) {
      return expect.indexOf(actual) === -1
    } else {
      return expect !== actual
    }
  }

  /**
   * Runtime helper for checking keyCodes from config.
   * exposed as Vue.prototype._k
   * passing in eventKeyName as last argument separately for backwards compat
   */
  function checkKeyCodes (
    eventKeyCode,
    key,
    builtInKeyCode,
    eventKeyName,
    builtInKeyName
  ) {
    var mappedKeyCode = config.keyCodes[key] || builtInKeyCode;
    if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
      return isKeyNotMatch(builtInKeyName, eventKeyName)
    } else if (mappedKeyCode) {
      return isKeyNotMatch(mappedKeyCode, eventKeyCode)
    } else if (eventKeyName) {
      return hyphenate(eventKeyName) !== key
    }
  }

  /*  */

  /**
   * Runtime helper for merging v-bind="object" into a VNode's data.
   */
  function bindObjectProps (
    data,
    tag,
    value,
    asProp,
    isSync
  ) {
    if (value) {
      if (!isObject(value)) ; else {
        if (Array.isArray(value)) {
          value = toObject(value);
        }
        var hash;
        var loop = function ( key ) {
          if (
            key === 'class' ||
            key === 'style' ||
            isReservedAttribute(key)
          ) {
            hash = data;
          } else {
            var type = data.attrs && data.attrs.type;
            hash = asProp || config.mustUseProp(tag, type, key)
              ? data.domProps || (data.domProps = {})
              : data.attrs || (data.attrs = {});
          }
          var camelizedKey = camelize(key);
          var hyphenatedKey = hyphenate(key);
          if (!(camelizedKey in hash) && !(hyphenatedKey in hash)) {
            hash[key] = value[key];

            if (isSync) {
              var on = data.on || (data.on = {});
              on[("update:" + key)] = function ($event) {
                value[key] = $event;
              };
            }
          }
        };

        for (var key in value) { loop( key ); }
      }
    }
    return data
  }

  /*  */

  /**
   * Runtime helper for rendering static trees.
   */
  function renderStatic (
    index,
    isInFor
  ) {
    var cached = this._staticTrees || (this._staticTrees = []);
    var tree = cached[index];
    // if has already-rendered static tree and not inside v-for,
    // we can reuse the same tree.
    if (tree && !isInFor) {
      return tree
    }
    // otherwise, render a fresh tree.
    tree = cached[index] = this.$options.staticRenderFns[index].call(
      this._renderProxy,
      null,
      this // for render fns generated for functional component templates
    );
    markStatic(tree, ("__static__" + index), false);
    return tree
  }

  /**
   * Runtime helper for v-once.
   * Effectively it means marking the node as static with a unique key.
   */
  function markOnce (
    tree,
    index,
    key
  ) {
    markStatic(tree, ("__once__" + index + (key ? ("_" + key) : "")), true);
    return tree
  }

  function markStatic (
    tree,
    key,
    isOnce
  ) {
    if (Array.isArray(tree)) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i] && typeof tree[i] !== 'string') {
          markStaticNode(tree[i], (key + "_" + i), isOnce);
        }
      }
    } else {
      markStaticNode(tree, key, isOnce);
    }
  }

  function markStaticNode (node, key, isOnce) {
    node.isStatic = true;
    node.key = key;
    node.isOnce = isOnce;
  }

  /*  */

  function bindObjectListeners (data, value) {
    if (value) {
      if (!isPlainObject(value)) ; else {
        var on = data.on = data.on ? extend({}, data.on) : {};
        for (var key in value) {
          var existing = on[key];
          var ours = value[key];
          on[key] = existing ? [].concat(existing, ours) : ours;
        }
      }
    }
    return data
  }

  /*  */

  function resolveScopedSlots (
    fns, // see flow/vnode
    res,
    // the following are added in 2.6
    hasDynamicKeys,
    contentHashKey
  ) {
    res = res || { $stable: !hasDynamicKeys };
    for (var i = 0; i < fns.length; i++) {
      var slot = fns[i];
      if (Array.isArray(slot)) {
        resolveScopedSlots(slot, res, hasDynamicKeys);
      } else if (slot) {
        // marker for reverse proxying v-slot without scope on this.$slots
        if (slot.proxy) {
          slot.fn.proxy = true;
        }
        res[slot.key] = slot.fn;
      }
    }
    if (contentHashKey) {
      (res).$key = contentHashKey;
    }
    return res
  }

  /*  */

  function bindDynamicKeys (baseObj, values) {
    for (var i = 0; i < values.length; i += 2) {
      var key = values[i];
      if (typeof key === 'string' && key) {
        baseObj[values[i]] = values[i + 1];
      }
    }
    return baseObj
  }

  // helper to dynamically append modifier runtime markers to event names.
  // ensure only append when value is already string, otherwise it will be cast
  // to string and cause the type check to miss.
  function prependModifier (value, symbol) {
    return typeof value === 'string' ? symbol + value : value
  }

  /*  */

  function installRenderHelpers (target) {
    target._o = markOnce;
    target._n = toNumber;
    target._s = toString;
    target._l = renderList;
    target._t = renderSlot;
    target._q = looseEqual;
    target._i = looseIndexOf;
    target._m = renderStatic;
    target._f = resolveFilter;
    target._k = checkKeyCodes;
    target._b = bindObjectProps;
    target._v = createTextVNode;
    target._e = createEmptyVNode;
    target._u = resolveScopedSlots;
    target._g = bindObjectListeners;
    target._d = bindDynamicKeys;
    target._p = prependModifier;
  }

  /*  */

  function FunctionalRenderContext (
    data,
    props,
    children,
    parent,
    Ctor
  ) {
    var this$1 = this;

    var options = Ctor.options;
    // ensure the createElement function in functional components
    // gets a unique context - this is necessary for correct named slot check
    var contextVm;
    if (hasOwn(parent, '_uid')) {
      contextVm = Object.create(parent);
      // $flow-disable-line
      contextVm._original = parent;
    } else {
      // the context vm passed in is a functional context as well.
      // in this case we want to make sure we are able to get a hold to the
      // real context instance.
      contextVm = parent;
      // $flow-disable-line
      parent = parent._original;
    }
    var isCompiled = isTrue(options._compiled);
    var needNormalization = !isCompiled;

    this.data = data;
    this.props = props;
    this.children = children;
    this.parent = parent;
    this.listeners = data.on || emptyObject;
    this.injections = resolveInject(options.inject, parent);
    this.slots = function () {
      if (!this$1.$slots) {
        normalizeScopedSlots(
          data.scopedSlots,
          this$1.$slots = resolveSlots(children, parent)
        );
      }
      return this$1.$slots
    };

    Object.defineProperty(this, 'scopedSlots', ({
      enumerable: true,
      get: function get () {
        return normalizeScopedSlots(data.scopedSlots, this.slots())
      }
    }));

    // support for compiled functional template
    if (isCompiled) {
      // exposing $options for renderStatic()
      this.$options = options;
      // pre-resolve slots for renderSlot()
      this.$slots = this.slots();
      this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots);
    }

    if (options._scopeId) {
      this._c = function (a, b, c, d) {
        var vnode = createElement(contextVm, a, b, c, d, needNormalization);
        if (vnode && !Array.isArray(vnode)) {
          vnode.fnScopeId = options._scopeId;
          vnode.fnContext = parent;
        }
        return vnode
      };
    } else {
      this._c = function (a, b, c, d) { return createElement(contextVm, a, b, c, d, needNormalization); };
    }
  }

  installRenderHelpers(FunctionalRenderContext.prototype);

  function createFunctionalComponent (
    Ctor,
    propsData,
    data,
    contextVm,
    children
  ) {
    var options = Ctor.options;
    var props = {};
    var propOptions = options.props;
    if (isDef(propOptions)) {
      for (var key in propOptions) {
        props[key] = validateProp(key, propOptions, propsData || emptyObject);
      }
    } else {
      if (isDef(data.attrs)) { mergeProps(props, data.attrs); }
      if (isDef(data.props)) { mergeProps(props, data.props); }
    }

    var renderContext = new FunctionalRenderContext(
      data,
      props,
      children,
      contextVm,
      Ctor
    );

    var vnode = options.render.call(null, renderContext._c, renderContext);

    if (vnode instanceof VNode) {
      return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options)
    } else if (Array.isArray(vnode)) {
      var vnodes = normalizeChildren(vnode) || [];
      var res = new Array(vnodes.length);
      for (var i = 0; i < vnodes.length; i++) {
        res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options);
      }
      return res
    }
  }

  function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
    // #7817 clone node before setting fnContext, otherwise if the node is reused
    // (e.g. it was from a cached normal slot) the fnContext causes named slots
    // that should not be matched to match.
    var clone = cloneVNode(vnode);
    clone.fnContext = contextVm;
    clone.fnOptions = options;
    if (data.slot) {
      (clone.data || (clone.data = {})).slot = data.slot;
    }
    return clone
  }

  function mergeProps (to, from) {
    for (var key in from) {
      to[camelize(key)] = from[key];
    }
  }

  /*  */

  /*  */

  /*  */

  /*  */

  // inline hooks to be invoked on component VNodes during patch
  var componentVNodeHooks = {
    init: function init (vnode, hydrating) {
      if (
        vnode.componentInstance &&
        !vnode.componentInstance._isDestroyed &&
        vnode.data.keepAlive
      ) {
        // kept-alive components, treat as a patch
        var mountedNode = vnode; // work around flow
        componentVNodeHooks.prepatch(mountedNode, mountedNode);
      } else {
        var child = vnode.componentInstance = createComponentInstanceForVnode(
          vnode,
          activeInstance
        );
        child.$mount(hydrating ? vnode.elm : undefined, hydrating);
      }
    },

    prepatch: function prepatch (oldVnode, vnode) {
      var options = vnode.componentOptions;
      var child = vnode.componentInstance = oldVnode.componentInstance;
      updateChildComponent(
        child,
        options.propsData, // updated props
        options.listeners, // updated listeners
        vnode, // new parent vnode
        options.children // new children
      );
    },

    insert: function insert (vnode) {
      var context = vnode.context;
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isMounted) {
        componentInstance._isMounted = true;
        callHook(componentInstance, 'mounted');
      }
      if (vnode.data.keepAlive) {
        if (context._isMounted) {
          // vue-router#1212
          // During updates, a kept-alive component's child components may
          // change, so directly walking the tree here may call activated hooks
          // on incorrect children. Instead we push them into a queue which will
          // be processed after the whole patch process ended.
          queueActivatedComponent(componentInstance);
        } else {
          activateChildComponent(componentInstance, true /* direct */);
        }
      }
    },

    destroy: function destroy (vnode) {
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isDestroyed) {
        if (!vnode.data.keepAlive) {
          componentInstance.$destroy();
        } else {
          deactivateChildComponent(componentInstance, true /* direct */);
        }
      }
    }
  };

  var hooksToMerge = Object.keys(componentVNodeHooks);

  function createComponent (
    Ctor,
    data,
    context,
    children,
    tag
  ) {
    if (isUndef(Ctor)) {
      return
    }

    var baseCtor = context.$options._base;

    // plain options object: turn it into a constructor
    if (isObject(Ctor)) {
      Ctor = baseCtor.extend(Ctor);
    }

    // if at this stage it's not a constructor or an async component factory,
    // reject.
    if (typeof Ctor !== 'function') {
      return
    }

    // async component
    var asyncFactory;
    if (isUndef(Ctor.cid)) {
      asyncFactory = Ctor;
      Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
      if (Ctor === undefined) {
        // return a placeholder node for async component, which is rendered
        // as a comment node but preserves all the raw information for the node.
        // the information will be used for async server-rendering and hydration.
        return createAsyncPlaceholder(
          asyncFactory,
          data,
          context,
          children,
          tag
        )
      }
    }

    data = data || {};

    // resolve constructor options in case global mixins are applied after
    // component constructor creation
    resolveConstructorOptions(Ctor);

    // transform component v-model data into props & events
    if (isDef(data.model)) {
      transformModel(Ctor.options, data);
    }

    // extract props
    var propsData = extractPropsFromVNodeData(data, Ctor);

    // functional component
    if (isTrue(Ctor.options.functional)) {
      return createFunctionalComponent(Ctor, propsData, data, context, children)
    }

    // extract listeners, since these needs to be treated as
    // child component listeners instead of DOM listeners
    var listeners = data.on;
    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    data.on = data.nativeOn;

    if (isTrue(Ctor.options.abstract)) {
      // abstract components do not keep anything
      // other than props & listeners & slot

      // work around flow
      var slot = data.slot;
      data = {};
      if (slot) {
        data.slot = slot;
      }
    }

    // install component management hooks onto the placeholder node
    installComponentHooks(data);

    // return a placeholder vnode
    var name = Ctor.options.name || tag;
    var vnode = new VNode(
      ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
      data, undefined, undefined, undefined, context,
      { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
      asyncFactory
    );

    return vnode
  }

  function createComponentInstanceForVnode (
    vnode, // we know it's MountedComponentVNode but flow doesn't
    parent // activeInstance in lifecycle state
  ) {
    var options = {
      _isComponent: true,
      _parentVnode: vnode,
      parent: parent
    };
    // check inline-template render functions
    var inlineTemplate = vnode.data.inlineTemplate;
    if (isDef(inlineTemplate)) {
      options.render = inlineTemplate.render;
      options.staticRenderFns = inlineTemplate.staticRenderFns;
    }
    return new vnode.componentOptions.Ctor(options)
  }

  function installComponentHooks (data) {
    var hooks = data.hook || (data.hook = {});
    for (var i = 0; i < hooksToMerge.length; i++) {
      var key = hooksToMerge[i];
      var existing = hooks[key];
      var toMerge = componentVNodeHooks[key];
      if (existing !== toMerge && !(existing && existing._merged)) {
        hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge;
      }
    }
  }

  function mergeHook$1 (f1, f2) {
    var merged = function (a, b) {
      // flow complains about extra args which is why we use any
      f1(a, b);
      f2(a, b);
    };
    merged._merged = true;
    return merged
  }

  // transform component v-model info (value and callback) into
  // prop and event handler respectively.
  function transformModel (options, data) {
    var prop = (options.model && options.model.prop) || 'value';
    var event = (options.model && options.model.event) || 'input'
    ;(data.attrs || (data.attrs = {}))[prop] = data.model.value;
    var on = data.on || (data.on = {});
    var existing = on[event];
    var callback = data.model.callback;
    if (isDef(existing)) {
      if (
        Array.isArray(existing)
          ? existing.indexOf(callback) === -1
          : existing !== callback
      ) {
        on[event] = [callback].concat(existing);
      }
    } else {
      on[event] = callback;
    }
  }

  /*  */

  var SIMPLE_NORMALIZE = 1;
  var ALWAYS_NORMALIZE = 2;

  // wrapper function for providing a more flexible interface
  // without getting yelled at by flow
  function createElement (
    context,
    tag,
    data,
    children,
    normalizationType,
    alwaysNormalize
  ) {
    if (Array.isArray(data) || isPrimitive(data)) {
      normalizationType = children;
      children = data;
      data = undefined;
    }
    if (isTrue(alwaysNormalize)) {
      normalizationType = ALWAYS_NORMALIZE;
    }
    return _createElement(context, tag, data, children, normalizationType)
  }

  function _createElement (
    context,
    tag,
    data,
    children,
    normalizationType
  ) {
    if (isDef(data) && isDef((data).__ob__)) {
      return createEmptyVNode()
    }
    // object syntax in v-bind
    if (isDef(data) && isDef(data.is)) {
      tag = data.is;
    }
    if (!tag) {
      // in case of component :is set to falsy value
      return createEmptyVNode()
    }
    // support single function children as default scoped slot
    if (Array.isArray(children) &&
      typeof children[0] === 'function'
    ) {
      data = data || {};
      data.scopedSlots = { default: children[0] };
      children.length = 0;
    }
    if (normalizationType === ALWAYS_NORMALIZE) {
      children = normalizeChildren(children);
    } else if (normalizationType === SIMPLE_NORMALIZE) {
      children = simpleNormalizeChildren(children);
    }
    var vnode, ns;
    if (typeof tag === 'string') {
      var Ctor;
      ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
      if (config.isReservedTag(tag)) {
        vnode = new VNode(
          config.parsePlatformTagName(tag), data, children,
          undefined, undefined, context
        );
      } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
        // component
        vnode = createComponent(Ctor, data, context, children, tag);
      } else {
        // unknown or unlisted namespaced elements
        // check at runtime because it may get assigned a namespace when its
        // parent normalizes children
        vnode = new VNode(
          tag, data, children,
          undefined, undefined, context
        );
      }
    } else {
      // direct component options / constructor
      vnode = createComponent(tag, data, context, children);
    }
    if (Array.isArray(vnode)) {
      return vnode
    } else if (isDef(vnode)) {
      if (isDef(ns)) { applyNS(vnode, ns); }
      if (isDef(data)) { registerDeepBindings(data); }
      return vnode
    } else {
      return createEmptyVNode()
    }
  }

  function applyNS (vnode, ns, force) {
    vnode.ns = ns;
    if (vnode.tag === 'foreignObject') {
      // use default namespace inside foreignObject
      ns = undefined;
      force = true;
    }
    if (isDef(vnode.children)) {
      for (var i = 0, l = vnode.children.length; i < l; i++) {
        var child = vnode.children[i];
        if (isDef(child.tag) && (
          isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
          applyNS(child, ns, force);
        }
      }
    }
  }

  // ref #5318
  // necessary to ensure parent re-render when deep bindings like :style and
  // :class are used on slot nodes
  function registerDeepBindings (data) {
    if (isObject(data.style)) {
      traverse(data.style);
    }
    if (isObject(data.class)) {
      traverse(data.class);
    }
  }

  /*  */

  function initRender (vm) {
    vm._vnode = null; // the root of the child tree
    vm._staticTrees = null; // v-once cached trees
    var options = vm.$options;
    var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
    var renderContext = parentVnode && parentVnode.context;
    vm.$slots = resolveSlots(options._renderChildren, renderContext);
    vm.$scopedSlots = emptyObject;
    // bind the createElement fn to this instance
    // so that we get proper render context inside it.
    // args order: tag, data, children, normalizationType, alwaysNormalize
    // internal version is used by render functions compiled from templates
    vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
    // normalization is always applied for the public version, used in
    // user-written render functions.
    vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };

    // $attrs & $listeners are exposed for easier HOC creation.
    // they need to be reactive so that HOCs using them are always updated
    var parentData = parentVnode && parentVnode.data;

    /* istanbul ignore else */
    {
      defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true);
      defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, null, true);
    }
  }

  var currentRenderingInstance = null;

  function renderMixin (Vue) {
    // install runtime convenience helpers
    installRenderHelpers(Vue.prototype);

    Vue.prototype.$nextTick = function (fn) {
      return nextTick(fn, this)
    };

    Vue.prototype._render = function () {
      var vm = this;
      var ref = vm.$options;
      var render = ref.render;
      var _parentVnode = ref._parentVnode;

      if (_parentVnode) {
        vm.$scopedSlots = normalizeScopedSlots(
          _parentVnode.data.scopedSlots,
          vm.$slots,
          vm.$scopedSlots
        );
      }

      // set parent vnode. this allows render functions to have access
      // to the data on the placeholder node.
      vm.$vnode = _parentVnode;
      // render self
      var vnode;
      try {
        // There's no need to maintain a stack because all render fns are called
        // separately from one another. Nested component's render fns are called
        // when parent component is patched.
        currentRenderingInstance = vm;
        vnode = render.call(vm._renderProxy, vm.$createElement);
      } catch (e) {
        handleError(e, vm, "render");
        // return error render result,
        // or previous vnode to prevent render error causing blank component
        /* istanbul ignore else */
        {
          vnode = vm._vnode;
        }
      } finally {
        currentRenderingInstance = null;
      }
      // if the returned array contains only a single node, allow it
      if (Array.isArray(vnode) && vnode.length === 1) {
        vnode = vnode[0];
      }
      // return empty vnode in case the render function errored out
      if (!(vnode instanceof VNode)) {
        vnode = createEmptyVNode();
      }
      // set parent
      vnode.parent = _parentVnode;
      return vnode
    };
  }

  /*  */

  function ensureCtor (comp, base) {
    if (
      comp.__esModule ||
      (hasSymbol && comp[Symbol.toStringTag] === 'Module')
    ) {
      comp = comp.default;
    }
    return isObject(comp)
      ? base.extend(comp)
      : comp
  }

  function createAsyncPlaceholder (
    factory,
    data,
    context,
    children,
    tag
  ) {
    var node = createEmptyVNode();
    node.asyncFactory = factory;
    node.asyncMeta = { data: data, context: context, children: children, tag: tag };
    return node
  }

  function resolveAsyncComponent (
    factory,
    baseCtor
  ) {
    if (isTrue(factory.error) && isDef(factory.errorComp)) {
      return factory.errorComp
    }

    if (isDef(factory.resolved)) {
      return factory.resolved
    }

    var owner = currentRenderingInstance;
    if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
      // already pending
      factory.owners.push(owner);
    }

    if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
      return factory.loadingComp
    }

    if (owner && !isDef(factory.owners)) {
      var owners = factory.owners = [owner];
      var sync = true;
      var timerLoading = null;
      var timerTimeout = null

      ;(owner).$on('hook:destroyed', function () { return remove(owners, owner); });

      var forceRender = function (renderCompleted) {
        for (var i = 0, l = owners.length; i < l; i++) {
          (owners[i]).$forceUpdate();
        }

        if (renderCompleted) {
          owners.length = 0;
          if (timerLoading !== null) {
            clearTimeout(timerLoading);
            timerLoading = null;
          }
          if (timerTimeout !== null) {
            clearTimeout(timerTimeout);
            timerTimeout = null;
          }
        }
      };

      var resolve = once(function (res) {
        // cache resolved
        factory.resolved = ensureCtor(res, baseCtor);
        // invoke callbacks only if this is not a synchronous resolve
        // (async resolves are shimmed as synchronous during SSR)
        if (!sync) {
          forceRender(true);
        } else {
          owners.length = 0;
        }
      });

      var reject = once(function (reason) {
        if (isDef(factory.errorComp)) {
          factory.error = true;
          forceRender(true);
        }
      });

      var res = factory(resolve, reject);

      if (isObject(res)) {
        if (isPromise(res)) {
          // () => Promise
          if (isUndef(factory.resolved)) {
            res.then(resolve, reject);
          }
        } else if (isPromise(res.component)) {
          res.component.then(resolve, reject);

          if (isDef(res.error)) {
            factory.errorComp = ensureCtor(res.error, baseCtor);
          }

          if (isDef(res.loading)) {
            factory.loadingComp = ensureCtor(res.loading, baseCtor);
            if (res.delay === 0) {
              factory.loading = true;
            } else {
              timerLoading = setTimeout(function () {
                timerLoading = null;
                if (isUndef(factory.resolved) && isUndef(factory.error)) {
                  factory.loading = true;
                  forceRender(false);
                }
              }, res.delay || 200);
            }
          }

          if (isDef(res.timeout)) {
            timerTimeout = setTimeout(function () {
              timerTimeout = null;
              if (isUndef(factory.resolved)) {
                reject(
                   null
                );
              }
            }, res.timeout);
          }
        }
      }

      sync = false;
      // return in case resolved synchronously
      return factory.loading
        ? factory.loadingComp
        : factory.resolved
    }
  }

  /*  */

  function isAsyncPlaceholder (node) {
    return node.isComment && node.asyncFactory
  }

  /*  */

  function getFirstComponentChild (children) {
    if (Array.isArray(children)) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
          return c
        }
      }
    }
  }

  /*  */

  /*  */

  function initEvents (vm) {
    vm._events = Object.create(null);
    vm._hasHookEvent = false;
    // init parent attached events
    var listeners = vm.$options._parentListeners;
    if (listeners) {
      updateComponentListeners(vm, listeners);
    }
  }

  var target;

  function add (event, fn) {
    target.$on(event, fn);
  }

  function remove$1 (event, fn) {
    target.$off(event, fn);
  }

  function createOnceHandler (event, fn) {
    var _target = target;
    return function onceHandler () {
      var res = fn.apply(null, arguments);
      if (res !== null) {
        _target.$off(event, onceHandler);
      }
    }
  }

  function updateComponentListeners (
    vm,
    listeners,
    oldListeners
  ) {
    target = vm;
    updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm);
    target = undefined;
  }

  function eventsMixin (Vue) {
    var hookRE = /^hook:/;
    Vue.prototype.$on = function (event, fn) {
      var vm = this;
      if (Array.isArray(event)) {
        for (var i = 0, l = event.length; i < l; i++) {
          vm.$on(event[i], fn);
        }
      } else {
        (vm._events[event] || (vm._events[event] = [])).push(fn);
        // optimize hook:event cost by using a boolean flag marked at registration
        // instead of a hash lookup
        if (hookRE.test(event)) {
          vm._hasHookEvent = true;
        }
      }
      return vm
    };

    Vue.prototype.$once = function (event, fn) {
      var vm = this;
      function on () {
        vm.$off(event, on);
        fn.apply(vm, arguments);
      }
      on.fn = fn;
      vm.$on(event, on);
      return vm
    };

    Vue.prototype.$off = function (event, fn) {
      var vm = this;
      // all
      if (!arguments.length) {
        vm._events = Object.create(null);
        return vm
      }
      // array of events
      if (Array.isArray(event)) {
        for (var i$1 = 0, l = event.length; i$1 < l; i$1++) {
          vm.$off(event[i$1], fn);
        }
        return vm
      }
      // specific event
      var cbs = vm._events[event];
      if (!cbs) {
        return vm
      }
      if (!fn) {
        vm._events[event] = null;
        return vm
      }
      // specific handler
      var cb;
      var i = cbs.length;
      while (i--) {
        cb = cbs[i];
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1);
          break
        }
      }
      return vm
    };

    Vue.prototype.$emit = function (event) {
      var vm = this;
      var cbs = vm._events[event];
      if (cbs) {
        cbs = cbs.length > 1 ? toArray(cbs) : cbs;
        var args = toArray(arguments, 1);
        var info = "event handler for \"" + event + "\"";
        for (var i = 0, l = cbs.length; i < l; i++) {
          invokeWithErrorHandling(cbs[i], vm, args, vm, info);
        }
      }
      return vm
    };
  }

  /*  */

  var activeInstance = null;

  function setActiveInstance(vm) {
    var prevActiveInstance = activeInstance;
    activeInstance = vm;
    return function () {
      activeInstance = prevActiveInstance;
    }
  }

  function initLifecycle (vm) {
    var options = vm.$options;

    // locate first non-abstract parent
    var parent = options.parent;
    if (parent && !options.abstract) {
      while (parent.$options.abstract && parent.$parent) {
        parent = parent.$parent;
      }
      parent.$children.push(vm);
    }

    vm.$parent = parent;
    vm.$root = parent ? parent.$root : vm;

    vm.$children = [];
    vm.$refs = {};

    vm._watcher = null;
    vm._inactive = null;
    vm._directInactive = false;
    vm._isMounted = false;
    vm._isDestroyed = false;
    vm._isBeingDestroyed = false;
  }

  function lifecycleMixin (Vue) {
    Vue.prototype._update = function (vnode, hydrating) {
      var vm = this;
      var prevEl = vm.$el;
      var prevVnode = vm._vnode;
      var restoreActiveInstance = setActiveInstance(vm);
      vm._vnode = vnode;
      // Vue.prototype.__patch__ is injected in entry points
      // based on the rendering backend used.
      if (!prevVnode) {
        // initial render
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
      } else {
        // updates
        vm.$el = vm.__patch__(prevVnode, vnode);
      }
      restoreActiveInstance();
      // update __vue__ reference
      if (prevEl) {
        prevEl.__vue__ = null;
      }
      if (vm.$el) {
        vm.$el.__vue__ = vm;
      }
      // if parent is an HOC, update its $el as well
      if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
        vm.$parent.$el = vm.$el;
      }
      // updated hook is called by the scheduler to ensure that children are
      // updated in a parent's updated hook.
    };

    Vue.prototype.$forceUpdate = function () {
      var vm = this;
      if (vm._watcher) {
        vm._watcher.update();
      }
    };

    Vue.prototype.$destroy = function () {
      var vm = this;
      if (vm._isBeingDestroyed) {
        return
      }
      callHook(vm, 'beforeDestroy');
      vm._isBeingDestroyed = true;
      // remove self from parent
      var parent = vm.$parent;
      if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
        remove(parent.$children, vm);
      }
      // teardown watchers
      if (vm._watcher) {
        vm._watcher.teardown();
      }
      var i = vm._watchers.length;
      while (i--) {
        vm._watchers[i].teardown();
      }
      // remove reference from data ob
      // frozen object may not have observer.
      if (vm._data.__ob__) {
        vm._data.__ob__.vmCount--;
      }
      // call the last hook...
      vm._isDestroyed = true;
      // invoke destroy hooks on current rendered tree
      vm.__patch__(vm._vnode, null);
      // fire destroyed hook
      callHook(vm, 'destroyed');
      // turn off all instance listeners.
      vm.$off();
      // remove __vue__ reference
      if (vm.$el) {
        vm.$el.__vue__ = null;
      }
      // release circular reference (#6759)
      if (vm.$vnode) {
        vm.$vnode.parent = null;
      }
    };
  }

  function mountComponent (
    vm,
    el,
    hydrating
  ) {
    vm.$el = el;
    if (!vm.$options.render) {
      vm.$options.render = createEmptyVNode;
    }
    callHook(vm, 'beforeMount');

    var updateComponent;
    /* istanbul ignore if */
    {
      updateComponent = function () {
        vm._update(vm._render(), hydrating);
      };
    }

    // we set this to vm._watcher inside the watcher's constructor
    // since the watcher's initial patch may call $forceUpdate (e.g. inside child
    // component's mounted hook), which relies on vm._watcher being already defined
    new Watcher(vm, updateComponent, noop, {
      before: function before () {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'beforeUpdate');
        }
      }
    }, true /* isRenderWatcher */);
    hydrating = false;

    // manually mounted instance, call mounted on self
    // mounted is called for render-created child components in its inserted hook
    if (vm.$vnode == null) {
      vm._isMounted = true;
      callHook(vm, 'mounted');
    }
    return vm
  }

  function updateChildComponent (
    vm,
    propsData,
    listeners,
    parentVnode,
    renderChildren
  ) {

    // determine whether component has slot children
    // we need to do this before overwriting $options._renderChildren.

    // check if there are dynamic scopedSlots (hand-written or compiled but with
    // dynamic slot names). Static scoped slots compiled from template has the
    // "$stable" marker.
    var newScopedSlots = parentVnode.data.scopedSlots;
    var oldScopedSlots = vm.$scopedSlots;
    var hasDynamicScopedSlot = !!(
      (newScopedSlots && !newScopedSlots.$stable) ||
      (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
      (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
    );

    // Any static slot children from the parent may have changed during parent's
    // update. Dynamic scoped slots may also have changed. In such cases, a forced
    // update is necessary to ensure correctness.
    var needsForceUpdate = !!(
      renderChildren ||               // has new static slots
      vm.$options._renderChildren ||  // has old static slots
      hasDynamicScopedSlot
    );

    vm.$options._parentVnode = parentVnode;
    vm.$vnode = parentVnode; // update vm's placeholder node without re-render

    if (vm._vnode) { // update child tree's parent
      vm._vnode.parent = parentVnode;
    }
    vm.$options._renderChildren = renderChildren;

    // update $attrs and $listeners hash
    // these are also reactive so they may trigger child update if the child
    // used them during render
    vm.$attrs = parentVnode.data.attrs || emptyObject;
    vm.$listeners = listeners || emptyObject;

    // update props
    if (propsData && vm.$options.props) {
      toggleObserving(false);
      var props = vm._props;
      var propKeys = vm.$options._propKeys || [];
      for (var i = 0; i < propKeys.length; i++) {
        var key = propKeys[i];
        var propOptions = vm.$options.props; // wtf flow?
        props[key] = validateProp(key, propOptions, propsData, vm);
      }
      toggleObserving(true);
      // keep a copy of raw propsData
      vm.$options.propsData = propsData;
    }

    // update listeners
    listeners = listeners || emptyObject;
    var oldListeners = vm.$options._parentListeners;
    vm.$options._parentListeners = listeners;
    updateComponentListeners(vm, listeners, oldListeners);

    // resolve slots + force update if has children
    if (needsForceUpdate) {
      vm.$slots = resolveSlots(renderChildren, parentVnode.context);
      vm.$forceUpdate();
    }
  }

  function isInInactiveTree (vm) {
    while (vm && (vm = vm.$parent)) {
      if (vm._inactive) { return true }
    }
    return false
  }

  function activateChildComponent (vm, direct) {
    if (direct) {
      vm._directInactive = false;
      if (isInInactiveTree(vm)) {
        return
      }
    } else if (vm._directInactive) {
      return
    }
    if (vm._inactive || vm._inactive === null) {
      vm._inactive = false;
      for (var i = 0; i < vm.$children.length; i++) {
        activateChildComponent(vm.$children[i]);
      }
      callHook(vm, 'activated');
    }
  }

  function deactivateChildComponent (vm, direct) {
    if (direct) {
      vm._directInactive = true;
      if (isInInactiveTree(vm)) {
        return
      }
    }
    if (!vm._inactive) {
      vm._inactive = true;
      for (var i = 0; i < vm.$children.length; i++) {
        deactivateChildComponent(vm.$children[i]);
      }
      callHook(vm, 'deactivated');
    }
  }

  function callHook (vm, hook) {
    // #7573 disable dep collection when invoking lifecycle hooks
    pushTarget();
    var handlers = vm.$options[hook];
    var info = hook + " hook";
    if (handlers) {
      for (var i = 0, j = handlers.length; i < j; i++) {
        invokeWithErrorHandling(handlers[i], vm, null, vm, info);
      }
    }
    if (vm._hasHookEvent) {
      vm.$emit('hook:' + hook);
    }
    popTarget();
  }

  var queue = [];
  var activatedChildren = [];
  var has = {};
  var waiting = false;
  var flushing = false;
  var index = 0;

  /**
   * Reset the scheduler's state.
   */
  function resetSchedulerState () {
    index = queue.length = activatedChildren.length = 0;
    has = {};
    waiting = flushing = false;
  }

  // Async edge case #6566 requires saving the timestamp when event listeners are
  // attached. However, calling performance.now() has a perf overhead especially
  // if the page has thousands of event listeners. Instead, we take a timestamp
  // every time the scheduler flushes and use that for all event listeners
  // attached during that flush.
  var currentFlushTimestamp = 0;

  // Async edge case fix requires storing an event listener's attach timestamp.
  var getNow = Date.now;

  // Determine what event timestamp the browser is using. Annoyingly, the
  // timestamp can either be hi-res (relative to page load) or low-res
  // (relative to UNIX epoch), so in order to compare time we have to use the
  // same timestamp type when saving the flush timestamp.
  // All IE versions use low-res event timestamps, and have problematic clock
  // implementations (#9632)
  if (inBrowser && !isIE) {
    var performance = window.performance;
    if (
      performance &&
      typeof performance.now === 'function' &&
      getNow() > document.createEvent('Event').timeStamp
    ) {
      // if the event timestamp, although evaluated AFTER the Date.now(), is
      // smaller than it, it means the event is using a hi-res timestamp,
      // and we need to use the hi-res version for event listener timestamps as
      // well.
      getNow = function () { return performance.now(); };
    }
  }

  /**
   * Flush both queues and run the watchers.
   */
  function flushSchedulerQueue () {
    currentFlushTimestamp = getNow();
    flushing = true;
    var watcher, id;

    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child)
    // 2. A component's user watchers are run before its render watcher (because
    //    user watchers are created before the render watcher)
    // 3. If a component is destroyed during a parent component's watcher run,
    //    its watchers can be skipped.
    queue.sort(function (a, b) { return a.id - b.id; });

    // do not cache length because more watchers might be pushed
    // as we run existing watchers
    for (index = 0; index < queue.length; index++) {
      watcher = queue[index];
      if (watcher.before) {
        watcher.before();
      }
      id = watcher.id;
      has[id] = null;
      watcher.run();
    }

    // keep copies of post queues before resetting state
    var activatedQueue = activatedChildren.slice();
    var updatedQueue = queue.slice();

    resetSchedulerState();

    // call component updated and activated hooks
    callActivatedHooks(activatedQueue);
    callUpdatedHooks(updatedQueue);

    // devtool hook
    /* istanbul ignore if */
    if (devtools && config.devtools) {
      devtools.emit('flush');
    }
  }

  function callUpdatedHooks (queue) {
    var i = queue.length;
    while (i--) {
      var watcher = queue[i];
      var vm = watcher.vm;
      if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'updated');
      }
    }
  }

  /**
   * Queue a kept-alive component that was activated during patch.
   * The queue will be processed after the entire tree has been patched.
   */
  function queueActivatedComponent (vm) {
    // setting _inactive to false here so that a render function can
    // rely on checking whether it's in an inactive tree (e.g. router-view)
    vm._inactive = false;
    activatedChildren.push(vm);
  }

  function callActivatedHooks (queue) {
    for (var i = 0; i < queue.length; i++) {
      queue[i]._inactive = true;
      activateChildComponent(queue[i], true /* true */);
    }
  }

  /**
   * Push a watcher into the watcher queue.
   * Jobs with duplicate IDs will be skipped unless it's
   * pushed when the queue is being flushed.
   */
  function queueWatcher (watcher) {
    var id = watcher.id;
    if (has[id] == null) {
      has[id] = true;
      if (!flushing) {
        queue.push(watcher);
      } else {
        // if already flushing, splice the watcher based on its id
        // if already past its id, it will be run next immediately.
        var i = queue.length - 1;
        while (i > index && queue[i].id > watcher.id) {
          i--;
        }
        queue.splice(i + 1, 0, watcher);
      }
      // queue the flush
      if (!waiting) {
        waiting = true;
        nextTick(flushSchedulerQueue);
      }
    }
  }

  /*  */



  var uid$2 = 0;

  /**
   * A watcher parses an expression, collects dependencies,
   * and fires callback when the expression value changes.
   * This is used for both the $watch() api and directives.
   */
  var Watcher = function Watcher (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    this.vm = vm;
    if (isRenderWatcher) {
      vm._watcher = this;
    }
    vm._watchers.push(this);
    // options
    if (options) {
      this.deep = !!options.deep;
      this.user = !!options.user;
      this.lazy = !!options.lazy;
      this.sync = !!options.sync;
      this.before = options.before;
    } else {
      this.deep = this.user = this.lazy = this.sync = false;
    }
    this.cb = cb;
    this.id = ++uid$2; // uid for batching
    this.active = true;
    this.dirty = this.lazy; // for lazy watchers
    this.deps = [];
    this.newDeps = [];
    this.depIds = new _Set();
    this.newDepIds = new _Set();
    this.expression =  '';
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn;
    } else {
      this.getter = parsePath(expOrFn);
      if (!this.getter) {
        this.getter = noop;
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get();
  };

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  Watcher.prototype.get = function get () {
    pushTarget(this);
    var value;
    var vm = this.vm;
    try {
      value = this.getter.call(vm, vm);
    } catch (e) {
      if (this.user) {
        handleError(e, vm, ("getter for watcher \"" + (this.expression) + "\""));
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value);
      }
      popTarget();
      this.cleanupDeps();
    }
    return value
  };

  /**
   * Add a dependency to this directive.
   */
  Watcher.prototype.addDep = function addDep (dep) {
    var id = dep.id;
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      if (!this.depIds.has(id)) {
        dep.addSub(this);
      }
    }
  };

  /**
   * Clean up for dependency collection.
   */
  Watcher.prototype.cleanupDeps = function cleanupDeps () {
    var i = this.deps.length;
    while (i--) {
      var dep = this.deps[i];
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }
    var tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  };

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  Watcher.prototype.update = function update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync) {
      this.run();
    } else {
      queueWatcher(this);
    }
  };

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  Watcher.prototype.run = function run () {
    if (this.active) {
      var value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        var oldValue = this.value;
        this.value = value;
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue);
          } catch (e) {
            handleError(e, this.vm, ("callback for watcher \"" + (this.expression) + "\""));
          }
        } else {
          this.cb.call(this.vm, value, oldValue);
        }
      }
    }
  };

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  Watcher.prototype.evaluate = function evaluate () {
    this.value = this.get();
    this.dirty = false;
  };

  /**
   * Depend on all deps collected by this watcher.
   */
  Watcher.prototype.depend = function depend () {
    var i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  };

  /**
   * Remove self from all dependencies' subscriber list.
   */
  Watcher.prototype.teardown = function teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this);
      }
      var i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  };

  /*  */

  var sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
  };

  function proxy (target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter () {
      return this[sourceKey][key]
    };
    sharedPropertyDefinition.set = function proxySetter (val) {
      this[sourceKey][key] = val;
    };
    Object.defineProperty(target, key, sharedPropertyDefinition);
  }

  function initState (vm) {
    vm._watchers = [];
    var opts = vm.$options;
    if (opts.props) { initProps(vm, opts.props); }
    if (opts.methods) { initMethods(vm, opts.methods); }
    if (opts.data) {
      initData(vm);
    } else {
      observe(vm._data = {}, true /* asRootData */);
    }
    if (opts.computed) { initComputed(vm, opts.computed); }
    if (opts.watch && opts.watch !== nativeWatch) {
      initWatch(vm, opts.watch);
    }
  }

  function initProps (vm, propsOptions) {
    var propsData = vm.$options.propsData || {};
    var props = vm._props = {};
    // cache prop keys so that future props updates can iterate using Array
    // instead of dynamic object key enumeration.
    var keys = vm.$options._propKeys = [];
    var isRoot = !vm.$parent;
    // root instance props should be converted
    if (!isRoot) {
      toggleObserving(false);
    }
    var loop = function ( key ) {
      keys.push(key);
      var value = validateProp(key, propsOptions, propsData, vm);
      /* istanbul ignore else */
      {
        defineReactive$$1(props, key, value);
      }
      // static props are already proxied on the component's prototype
      // during Vue.extend(). We only need to proxy props defined at
      // instantiation here.
      if (!(key in vm)) {
        proxy(vm, "_props", key);
      }
    };

    for (var key in propsOptions) { loop( key ); }
    toggleObserving(true);
  }

  function initData (vm) {
    var data = vm.$options.data;
    data = vm._data = typeof data === 'function'
      ? getData(data, vm)
      : data || {};
    if (!isPlainObject(data)) {
      data = {};
    }
    // proxy data on instance
    var keys = Object.keys(data);
    var props = vm.$options.props;
    var methods = vm.$options.methods;
    var i = keys.length;
    while (i--) {
      var key = keys[i];
      if (props && hasOwn(props, key)) ; else if (!isReserved(key)) {
        proxy(vm, "_data", key);
      }
    }
    // observe data
    observe(data, true /* asRootData */);
  }

  function getData (data, vm) {
    // #7573 disable dep collection when invoking data getters
    pushTarget();
    try {
      return data.call(vm, vm)
    } catch (e) {
      handleError(e, vm, "data()");
      return {}
    } finally {
      popTarget();
    }
  }

  var computedWatcherOptions = { lazy: true };

  function initComputed (vm, computed) {
    // $flow-disable-line
    var watchers = vm._computedWatchers = Object.create(null);
    // computed properties are just getters during SSR
    var isSSR = isServerRendering();

    for (var key in computed) {
      var userDef = computed[key];
      var getter = typeof userDef === 'function' ? userDef : userDef.get;

      if (!isSSR) {
        // create internal watcher for the computed property.
        watchers[key] = new Watcher(
          vm,
          getter || noop,
          noop,
          computedWatcherOptions
        );
      }

      // component-defined computed properties are already defined on the
      // component prototype. We only need to define computed properties defined
      // at instantiation here.
      if (!(key in vm)) {
        defineComputed(vm, key, userDef);
      }
    }
  }

  function defineComputed (
    target,
    key,
    userDef
  ) {
    var shouldCache = !isServerRendering();
    if (typeof userDef === 'function') {
      sharedPropertyDefinition.get = shouldCache
        ? createComputedGetter(key)
        : createGetterInvoker(userDef);
      sharedPropertyDefinition.set = noop;
    } else {
      sharedPropertyDefinition.get = userDef.get
        ? shouldCache && userDef.cache !== false
          ? createComputedGetter(key)
          : createGetterInvoker(userDef.get)
        : noop;
      sharedPropertyDefinition.set = userDef.set || noop;
    }
    Object.defineProperty(target, key, sharedPropertyDefinition);
  }

  function createComputedGetter (key) {
    return function computedGetter () {
      var watcher = this._computedWatchers && this._computedWatchers[key];
      if (watcher) {
        if (watcher.dirty) {
          watcher.evaluate();
        }
        if (Dep.target) {
          watcher.depend();
        }
        return watcher.value
      }
    }
  }

  function createGetterInvoker(fn) {
    return function computedGetter () {
      return fn.call(this, this)
    }
  }

  function initMethods (vm, methods) {
    var props = vm.$options.props;
    for (var key in methods) {
      vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
    }
  }

  function initWatch (vm, watch) {
    for (var key in watch) {
      var handler = watch[key];
      if (Array.isArray(handler)) {
        for (var i = 0; i < handler.length; i++) {
          createWatcher(vm, key, handler[i]);
        }
      } else {
        createWatcher(vm, key, handler);
      }
    }
  }

  function createWatcher (
    vm,
    expOrFn,
    handler,
    options
  ) {
    if (isPlainObject(handler)) {
      options = handler;
      handler = handler.handler;
    }
    if (typeof handler === 'string') {
      handler = vm[handler];
    }
    return vm.$watch(expOrFn, handler, options)
  }

  function stateMixin (Vue) {
    // flow somehow has problems with directly declared definition object
    // when using Object.defineProperty, so we have to procedurally build up
    // the object here.
    var dataDef = {};
    dataDef.get = function () { return this._data };
    var propsDef = {};
    propsDef.get = function () { return this._props };
    Object.defineProperty(Vue.prototype, '$data', dataDef);
    Object.defineProperty(Vue.prototype, '$props', propsDef);

    Vue.prototype.$set = set;
    Vue.prototype.$delete = del;

    Vue.prototype.$watch = function (
      expOrFn,
      cb,
      options
    ) {
      var vm = this;
      if (isPlainObject(cb)) {
        return createWatcher(vm, expOrFn, cb, options)
      }
      options = options || {};
      options.user = true;
      var watcher = new Watcher(vm, expOrFn, cb, options);
      if (options.immediate) {
        try {
          cb.call(vm, watcher.value);
        } catch (error) {
          handleError(error, vm, ("callback for immediate watcher \"" + (watcher.expression) + "\""));
        }
      }
      return function unwatchFn () {
        watcher.teardown();
      }
    };
  }

  /*  */

  var uid$3 = 0;

  function initMixin (Vue) {
    Vue.prototype._init = function (options) {
      var vm = this;
      // a uid
      vm._uid = uid$3++;

      // a flag to avoid this being observed
      vm._isVue = true;
      // merge options
      if (options && options._isComponent) {
        // optimize internal component instantiation
        // since dynamic options merging is pretty slow, and none of the
        // internal component options needs special treatment.
        initInternalComponent(vm, options);
      } else {
        vm.$options = mergeOptions(
          resolveConstructorOptions(vm.constructor),
          options || {},
          vm
        );
      }
      /* istanbul ignore else */
      {
        vm._renderProxy = vm;
      }
      // expose real self
      vm._self = vm;
      initLifecycle(vm);
      initEvents(vm);
      initRender(vm);
      callHook(vm, 'beforeCreate');
      initInjections(vm); // resolve injections before data/props
      initState(vm);
      initProvide(vm); // resolve provide after data/props
      callHook(vm, 'created');

      if (vm.$options.el) {
        vm.$mount(vm.$options.el);
      }
    };
  }

  function initInternalComponent (vm, options) {
    var opts = vm.$options = Object.create(vm.constructor.options);
    // doing this because it's faster than dynamic enumeration.
    var parentVnode = options._parentVnode;
    opts.parent = options.parent;
    opts._parentVnode = parentVnode;

    var vnodeComponentOptions = parentVnode.componentOptions;
    opts.propsData = vnodeComponentOptions.propsData;
    opts._parentListeners = vnodeComponentOptions.listeners;
    opts._renderChildren = vnodeComponentOptions.children;
    opts._componentTag = vnodeComponentOptions.tag;

    if (options.render) {
      opts.render = options.render;
      opts.staticRenderFns = options.staticRenderFns;
    }
  }

  function resolveConstructorOptions (Ctor) {
    var options = Ctor.options;
    if (Ctor.super) {
      var superOptions = resolveConstructorOptions(Ctor.super);
      var cachedSuperOptions = Ctor.superOptions;
      if (superOptions !== cachedSuperOptions) {
        // super option changed,
        // need to resolve new options.
        Ctor.superOptions = superOptions;
        // check if there are any late-modified/attached options (#4976)
        var modifiedOptions = resolveModifiedOptions(Ctor);
        // update base extend options
        if (modifiedOptions) {
          extend(Ctor.extendOptions, modifiedOptions);
        }
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
        if (options.name) {
          options.components[options.name] = Ctor;
        }
      }
    }
    return options
  }

  function resolveModifiedOptions (Ctor) {
    var modified;
    var latest = Ctor.options;
    var sealed = Ctor.sealedOptions;
    for (var key in latest) {
      if (latest[key] !== sealed[key]) {
        if (!modified) { modified = {}; }
        modified[key] = latest[key];
      }
    }
    return modified
  }

  function Vue (options) {
    this._init(options);
  }

  initMixin(Vue);
  stateMixin(Vue);
  eventsMixin(Vue);
  lifecycleMixin(Vue);
  renderMixin(Vue);

  /*  */

  function initUse (Vue) {
    Vue.use = function (plugin) {
      var installedPlugins = (this._installedPlugins || (this._installedPlugins = []));
      if (installedPlugins.indexOf(plugin) > -1) {
        return this
      }

      // additional parameters
      var args = toArray(arguments, 1);
      args.unshift(this);
      if (typeof plugin.install === 'function') {
        plugin.install.apply(plugin, args);
      } else if (typeof plugin === 'function') {
        plugin.apply(null, args);
      }
      installedPlugins.push(plugin);
      return this
    };
  }

  /*  */

  function initMixin$1 (Vue) {
    Vue.mixin = function (mixin) {
      this.options = mergeOptions(this.options, mixin);
      return this
    };
  }

  /*  */

  function initExtend (Vue) {
    /**
     * Each instance constructor, including Vue, has a unique
     * cid. This enables us to create wrapped "child
     * constructors" for prototypal inheritance and cache them.
     */
    Vue.cid = 0;
    var cid = 1;

    /**
     * Class inheritance
     */
    Vue.extend = function (extendOptions) {
      extendOptions = extendOptions || {};
      var Super = this;
      var SuperId = Super.cid;
      var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
      if (cachedCtors[SuperId]) {
        return cachedCtors[SuperId]
      }

      var name = extendOptions.name || Super.options.name;

      var Sub = function VueComponent (options) {
        this._init(options);
      };
      Sub.prototype = Object.create(Super.prototype);
      Sub.prototype.constructor = Sub;
      Sub.cid = cid++;
      Sub.options = mergeOptions(
        Super.options,
        extendOptions
      );
      Sub['super'] = Super;

      // For props and computed properties, we define the proxy getters on
      // the Vue instances at extension time, on the extended prototype. This
      // avoids Object.defineProperty calls for each instance created.
      if (Sub.options.props) {
        initProps$1(Sub);
      }
      if (Sub.options.computed) {
        initComputed$1(Sub);
      }

      // allow further extension/mixin/plugin usage
      Sub.extend = Super.extend;
      Sub.mixin = Super.mixin;
      Sub.use = Super.use;

      // create asset registers, so extended classes
      // can have their private assets too.
      ASSET_TYPES.forEach(function (type) {
        Sub[type] = Super[type];
      });
      // enable recursive self-lookup
      if (name) {
        Sub.options.components[name] = Sub;
      }

      // keep a reference to the super options at extension time.
      // later at instantiation we can check if Super's options have
      // been updated.
      Sub.superOptions = Super.options;
      Sub.extendOptions = extendOptions;
      Sub.sealedOptions = extend({}, Sub.options);

      // cache constructor
      cachedCtors[SuperId] = Sub;
      return Sub
    };
  }

  function initProps$1 (Comp) {
    var props = Comp.options.props;
    for (var key in props) {
      proxy(Comp.prototype, "_props", key);
    }
  }

  function initComputed$1 (Comp) {
    var computed = Comp.options.computed;
    for (var key in computed) {
      defineComputed(Comp.prototype, key, computed[key]);
    }
  }

  /*  */

  function initAssetRegisters (Vue) {
    /**
     * Create asset registration methods.
     */
    ASSET_TYPES.forEach(function (type) {
      Vue[type] = function (
        id,
        definition
      ) {
        if (!definition) {
          return this.options[type + 's'][id]
        } else {
          if (type === 'component' && isPlainObject(definition)) {
            definition.name = definition.name || id;
            definition = this.options._base.extend(definition);
          }
          if (type === 'directive' && typeof definition === 'function') {
            definition = { bind: definition, update: definition };
          }
          this.options[type + 's'][id] = definition;
          return definition
        }
      };
    });
  }

  /*  */



  function getComponentName (opts) {
    return opts && (opts.Ctor.options.name || opts.tag)
  }

  function matches (pattern, name) {
    if (Array.isArray(pattern)) {
      return pattern.indexOf(name) > -1
    } else if (typeof pattern === 'string') {
      return pattern.split(',').indexOf(name) > -1
    } else if (isRegExp(pattern)) {
      return pattern.test(name)
    }
    /* istanbul ignore next */
    return false
  }

  function pruneCache (keepAliveInstance, filter) {
    var cache = keepAliveInstance.cache;
    var keys = keepAliveInstance.keys;
    var _vnode = keepAliveInstance._vnode;
    for (var key in cache) {
      var cachedNode = cache[key];
      if (cachedNode) {
        var name = getComponentName(cachedNode.componentOptions);
        if (name && !filter(name)) {
          pruneCacheEntry(cache, key, keys, _vnode);
        }
      }
    }
  }

  function pruneCacheEntry (
    cache,
    key,
    keys,
    current
  ) {
    var cached$$1 = cache[key];
    if (cached$$1 && (!current || cached$$1.tag !== current.tag)) {
      cached$$1.componentInstance.$destroy();
    }
    cache[key] = null;
    remove(keys, key);
  }

  var patternTypes = [String, RegExp, Array];

  var KeepAlive = {
    name: 'keep-alive',
    abstract: true,

    props: {
      include: patternTypes,
      exclude: patternTypes,
      max: [String, Number]
    },

    created: function created () {
      this.cache = Object.create(null);
      this.keys = [];
    },

    destroyed: function destroyed () {
      for (var key in this.cache) {
        pruneCacheEntry(this.cache, key, this.keys);
      }
    },

    mounted: function mounted () {
      var this$1 = this;

      this.$watch('include', function (val) {
        pruneCache(this$1, function (name) { return matches(val, name); });
      });
      this.$watch('exclude', function (val) {
        pruneCache(this$1, function (name) { return !matches(val, name); });
      });
    },

    render: function render () {
      var slot = this.$slots.default;
      var vnode = getFirstComponentChild(slot);
      var componentOptions = vnode && vnode.componentOptions;
      if (componentOptions) {
        // check pattern
        var name = getComponentName(componentOptions);
        var ref = this;
        var include = ref.include;
        var exclude = ref.exclude;
        if (
          // not included
          (include && (!name || !matches(include, name))) ||
          // excluded
          (exclude && name && matches(exclude, name))
        ) {
          return vnode
        }

        var ref$1 = this;
        var cache = ref$1.cache;
        var keys = ref$1.keys;
        var key = vnode.key == null
          // same constructor may get registered as different local components
          // so cid alone is not enough (#3269)
          ? componentOptions.Ctor.cid + (componentOptions.tag ? ("::" + (componentOptions.tag)) : '')
          : vnode.key;
        if (cache[key]) {
          vnode.componentInstance = cache[key].componentInstance;
          // make current key freshest
          remove(keys, key);
          keys.push(key);
        } else {
          cache[key] = vnode;
          keys.push(key);
          // prune oldest entry
          if (this.max && keys.length > parseInt(this.max)) {
            pruneCacheEntry(cache, keys[0], keys, this._vnode);
          }
        }

        vnode.data.keepAlive = true;
      }
      return vnode || (slot && slot[0])
    }
  };

  var builtInComponents = {
    KeepAlive: KeepAlive
  };

  /*  */

  function initGlobalAPI (Vue) {
    // config
    var configDef = {};
    configDef.get = function () { return config; };
    Object.defineProperty(Vue, 'config', configDef);

    // exposed util methods.
    // NOTE: these are not considered part of the public API - avoid relying on
    // them unless you are aware of the risk.
    Vue.util = {
      warn: warn,
      extend: extend,
      mergeOptions: mergeOptions,
      defineReactive: defineReactive$$1
    };

    Vue.set = set;
    Vue.delete = del;
    Vue.nextTick = nextTick;

    // 2.6 explicit observable API
    Vue.observable = function (obj) {
      observe(obj);
      return obj
    };

    Vue.options = Object.create(null);
    ASSET_TYPES.forEach(function (type) {
      Vue.options[type + 's'] = Object.create(null);
    });

    // this is used to identify the "base" constructor to extend all plain-object
    // components with in Weex's multi-instance scenarios.
    Vue.options._base = Vue;

    extend(Vue.options.components, builtInComponents);

    initUse(Vue);
    initMixin$1(Vue);
    initExtend(Vue);
    initAssetRegisters(Vue);
  }

  initGlobalAPI(Vue);

  Object.defineProperty(Vue.prototype, '$isServer', {
    get: isServerRendering
  });

  Object.defineProperty(Vue.prototype, '$ssrContext', {
    get: function get () {
      /* istanbul ignore next */
      return this.$vnode && this.$vnode.ssrContext
    }
  });

  // expose FunctionalRenderContext for ssr runtime helper installation
  Object.defineProperty(Vue, 'FunctionalRenderContext', {
    value: FunctionalRenderContext
  });

  Vue.version = '2.6.11';

  /*  */

  // these are reserved for web because they are directly compiled away
  // during template compilation
  var isReservedAttr = makeMap('style,class');

  // attributes that should be using props for binding
  var acceptValue = makeMap('input,textarea,option,select,progress');
  var mustUseProp = function (tag, type, attr) {
    return (
      (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
      (attr === 'selected' && tag === 'option') ||
      (attr === 'checked' && tag === 'input') ||
      (attr === 'muted' && tag === 'video')
    )
  };

  var isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

  var isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only');

  var convertEnumeratedValue = function (key, value) {
    return isFalsyAttrValue(value) || value === 'false'
      ? 'false'
      // allow arbitrary string value for contenteditable
      : key === 'contenteditable' && isValidContentEditableValue(value)
        ? value
        : 'true'
  };

  var isBooleanAttr = makeMap(
    'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
    'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
    'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
    'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
    'required,reversed,scoped,seamless,selected,sortable,translate,' +
    'truespeed,typemustmatch,visible'
  );

  var xlinkNS = 'http://www.w3.org/1999/xlink';

  var isXlink = function (name) {
    return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
  };

  var getXlinkProp = function (name) {
    return isXlink(name) ? name.slice(6, name.length) : ''
  };

  var isFalsyAttrValue = function (val) {
    return val == null || val === false
  };

  /*  */

  function genClassForVnode (vnode) {
    var data = vnode.data;
    var parentNode = vnode;
    var childNode = vnode;
    while (isDef(childNode.componentInstance)) {
      childNode = childNode.componentInstance._vnode;
      if (childNode && childNode.data) {
        data = mergeClassData(childNode.data, data);
      }
    }
    while (isDef(parentNode = parentNode.parent)) {
      if (parentNode && parentNode.data) {
        data = mergeClassData(data, parentNode.data);
      }
    }
    return renderClass(data.staticClass, data.class)
  }

  function mergeClassData (child, parent) {
    return {
      staticClass: concat(child.staticClass, parent.staticClass),
      class: isDef(child.class)
        ? [child.class, parent.class]
        : parent.class
    }
  }

  function renderClass (
    staticClass,
    dynamicClass
  ) {
    if (isDef(staticClass) || isDef(dynamicClass)) {
      return concat(staticClass, stringifyClass(dynamicClass))
    }
    /* istanbul ignore next */
    return ''
  }

  function concat (a, b) {
    return a ? b ? (a + ' ' + b) : a : (b || '')
  }

  function stringifyClass (value) {
    if (Array.isArray(value)) {
      return stringifyArray(value)
    }
    if (isObject(value)) {
      return stringifyObject(value)
    }
    if (typeof value === 'string') {
      return value
    }
    /* istanbul ignore next */
    return ''
  }

  function stringifyArray (value) {
    var res = '';
    var stringified;
    for (var i = 0, l = value.length; i < l; i++) {
      if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
        if (res) { res += ' '; }
        res += stringified;
      }
    }
    return res
  }

  function stringifyObject (value) {
    var res = '';
    for (var key in value) {
      if (value[key]) {
        if (res) { res += ' '; }
        res += key;
      }
    }
    return res
  }

  /*  */

  var namespaceMap = {
    svg: 'http://www.w3.org/2000/svg',
    math: 'http://www.w3.org/1998/Math/MathML'
  };

  var isHTMLTag = makeMap(
    'html,body,base,head,link,meta,style,title,' +
    'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
    'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
    'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
    's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
    'embed,object,param,source,canvas,script,noscript,del,ins,' +
    'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
    'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
    'output,progress,select,textarea,' +
    'details,dialog,menu,menuitem,summary,' +
    'content,element,shadow,template,blockquote,iframe,tfoot'
  );

  // this map is intentionally selective, only covering SVG elements that may
  // contain child elements.
  var isSVG = makeMap(
    'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
    'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
    'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
    true
  );

  var isReservedTag = function (tag) {
    return isHTMLTag(tag) || isSVG(tag)
  };

  function getTagNamespace (tag) {
    if (isSVG(tag)) {
      return 'svg'
    }
    // basic support for MathML
    // note it doesn't support other MathML elements being component roots
    if (tag === 'math') {
      return 'math'
    }
  }

  var unknownElementCache = Object.create(null);
  function isUnknownElement (tag) {
    /* istanbul ignore if */
    if (!inBrowser) {
      return true
    }
    if (isReservedTag(tag)) {
      return false
    }
    tag = tag.toLowerCase();
    /* istanbul ignore if */
    if (unknownElementCache[tag] != null) {
      return unknownElementCache[tag]
    }
    var el = document.createElement(tag);
    if (tag.indexOf('-') > -1) {
      // http://stackoverflow.com/a/28210364/1070244
      return (unknownElementCache[tag] = (
        el.constructor === window.HTMLUnknownElement ||
        el.constructor === window.HTMLElement
      ))
    } else {
      return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
    }
  }

  var isTextInputType = makeMap('text,number,password,search,email,tel,url');

  /*  */

  /**
   * Query an element selector if it's not an element already.
   */
  function query (el) {
    if (typeof el === 'string') {
      var selected = document.querySelector(el);
      if (!selected) {
        return document.createElement('div')
      }
      return selected
    } else {
      return el
    }
  }

  /*  */

  function createElement$1 (tagName, vnode) {
    var elm = document.createElement(tagName);
    if (tagName !== 'select') {
      return elm
    }
    // false or null will remove the attribute but undefined will not
    if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
      elm.setAttribute('multiple', 'multiple');
    }
    return elm
  }

  function createElementNS (namespace, tagName) {
    return document.createElementNS(namespaceMap[namespace], tagName)
  }

  function createTextNode (text) {
    return document.createTextNode(text)
  }

  function createComment (text) {
    return document.createComment(text)
  }

  function insertBefore (parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
  }

  function removeChild (node, child) {
    node.removeChild(child);
  }

  function appendChild (node, child) {
    node.appendChild(child);
  }

  function parentNode (node) {
    return node.parentNode
  }

  function nextSibling (node) {
    return node.nextSibling
  }

  function tagName (node) {
    return node.tagName
  }

  function setTextContent (node, text) {
    node.textContent = text;
  }

  function setStyleScope (node, scopeId) {
    node.setAttribute(scopeId, '');
  }

  var nodeOps = /*#__PURE__*/Object.freeze({
    createElement: createElement$1,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    setStyleScope: setStyleScope
  });

  /*  */

  var ref = {
    create: function create (_, vnode) {
      registerRef(vnode);
    },
    update: function update (oldVnode, vnode) {
      if (oldVnode.data.ref !== vnode.data.ref) {
        registerRef(oldVnode, true);
        registerRef(vnode);
      }
    },
    destroy: function destroy (vnode) {
      registerRef(vnode, true);
    }
  };

  function registerRef (vnode, isRemoval) {
    var key = vnode.data.ref;
    if (!isDef(key)) { return }

    var vm = vnode.context;
    var ref = vnode.componentInstance || vnode.elm;
    var refs = vm.$refs;
    if (isRemoval) {
      if (Array.isArray(refs[key])) {
        remove(refs[key], ref);
      } else if (refs[key] === ref) {
        refs[key] = undefined;
      }
    } else {
      if (vnode.data.refInFor) {
        if (!Array.isArray(refs[key])) {
          refs[key] = [ref];
        } else if (refs[key].indexOf(ref) < 0) {
          // $flow-disable-line
          refs[key].push(ref);
        }
      } else {
        refs[key] = ref;
      }
    }
  }

  /**
   * Virtual DOM patching algorithm based on Snabbdom by
   * Simon Friis Vindum (@paldepind)
   * Licensed under the MIT License
   * https://github.com/paldepind/snabbdom/blob/master/LICENSE
   *
   * modified by Evan You (@yyx990803)
   *
   * Not type-checking this because this file is perf-critical and the cost
   * of making flow understand it is not worth it.
   */

  var emptyNode = new VNode('', {}, []);

  var hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

  function sameVnode (a, b) {
    return (
      a.key === b.key && (
        (
          a.tag === b.tag &&
          a.isComment === b.isComment &&
          isDef(a.data) === isDef(b.data) &&
          sameInputType(a, b)
        ) || (
          isTrue(a.isAsyncPlaceholder) &&
          a.asyncFactory === b.asyncFactory &&
          isUndef(b.asyncFactory.error)
        )
      )
    )
  }

  function sameInputType (a, b) {
    if (a.tag !== 'input') { return true }
    var i;
    var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
    var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
    return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
  }

  function createKeyToOldIdx (children, beginIdx, endIdx) {
    var i, key;
    var map = {};
    for (i = beginIdx; i <= endIdx; ++i) {
      key = children[i].key;
      if (isDef(key)) { map[key] = i; }
    }
    return map
  }

  function createPatchFunction (backend) {
    var i, j;
    var cbs = {};

    var modules = backend.modules;
    var nodeOps = backend.nodeOps;

    for (i = 0; i < hooks.length; ++i) {
      cbs[hooks[i]] = [];
      for (j = 0; j < modules.length; ++j) {
        if (isDef(modules[j][hooks[i]])) {
          cbs[hooks[i]].push(modules[j][hooks[i]]);
        }
      }
    }

    function emptyNodeAt (elm) {
      return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
    }

    function createRmCb (childElm, listeners) {
      function remove$$1 () {
        if (--remove$$1.listeners === 0) {
          removeNode(childElm);
        }
      }
      remove$$1.listeners = listeners;
      return remove$$1
    }

    function removeNode (el) {
      var parent = nodeOps.parentNode(el);
      // element may have already been removed due to v-html / v-text
      if (isDef(parent)) {
        nodeOps.removeChild(parent, el);
      }
    }

    function createElm (
      vnode,
      insertedVnodeQueue,
      parentElm,
      refElm,
      nested,
      ownerArray,
      index
    ) {
      if (isDef(vnode.elm) && isDef(ownerArray)) {
        // This vnode was used in a previous render!
        // now it's used as a new node, overwriting its elm would cause
        // potential patch errors down the road when it's used as an insertion
        // reference node. Instead, we clone the node on-demand before creating
        // associated DOM element for it.
        vnode = ownerArray[index] = cloneVNode(vnode);
      }

      vnode.isRootInsert = !nested; // for transition enter check
      if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
        return
      }

      var data = vnode.data;
      var children = vnode.children;
      var tag = vnode.tag;
      if (isDef(tag)) {

        vnode.elm = vnode.ns
          ? nodeOps.createElementNS(vnode.ns, tag)
          : nodeOps.createElement(tag, vnode);
        setScope(vnode);

        /* istanbul ignore if */
        {
          createChildren(vnode, children, insertedVnodeQueue);
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue);
          }
          insert(parentElm, vnode.elm, refElm);
        }
      } else if (isTrue(vnode.isComment)) {
        vnode.elm = nodeOps.createComment(vnode.text);
        insert(parentElm, vnode.elm, refElm);
      } else {
        vnode.elm = nodeOps.createTextNode(vnode.text);
        insert(parentElm, vnode.elm, refElm);
      }
    }

    function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
      var i = vnode.data;
      if (isDef(i)) {
        var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
        if (isDef(i = i.hook) && isDef(i = i.init)) {
          i(vnode, false /* hydrating */);
        }
        // after calling the init hook, if the vnode is a child component
        // it should've created a child instance and mounted it. the child
        // component also has set the placeholder vnode's elm.
        // in that case we can just return the element and be done.
        if (isDef(vnode.componentInstance)) {
          initComponent(vnode, insertedVnodeQueue);
          insert(parentElm, vnode.elm, refElm);
          if (isTrue(isReactivated)) {
            reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
          }
          return true
        }
      }
    }

    function initComponent (vnode, insertedVnodeQueue) {
      if (isDef(vnode.data.pendingInsert)) {
        insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
        vnode.data.pendingInsert = null;
      }
      vnode.elm = vnode.componentInstance.$el;
      if (isPatchable(vnode)) {
        invokeCreateHooks(vnode, insertedVnodeQueue);
        setScope(vnode);
      } else {
        // empty component root.
        // skip all element-related modules except for ref (#3455)
        registerRef(vnode);
        // make sure to invoke the insert hook
        insertedVnodeQueue.push(vnode);
      }
    }

    function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
      var i;
      // hack for #4339: a reactivated component with inner transition
      // does not trigger because the inner node's created hooks are not called
      // again. It's not ideal to involve module-specific logic in here but
      // there doesn't seem to be a better way to do it.
      var innerNode = vnode;
      while (innerNode.componentInstance) {
        innerNode = innerNode.componentInstance._vnode;
        if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
          for (i = 0; i < cbs.activate.length; ++i) {
            cbs.activate[i](emptyNode, innerNode);
          }
          insertedVnodeQueue.push(innerNode);
          break
        }
      }
      // unlike a newly created component,
      // a reactivated keep-alive component doesn't insert itself
      insert(parentElm, vnode.elm, refElm);
    }

    function insert (parent, elm, ref$$1) {
      if (isDef(parent)) {
        if (isDef(ref$$1)) {
          if (nodeOps.parentNode(ref$$1) === parent) {
            nodeOps.insertBefore(parent, elm, ref$$1);
          }
        } else {
          nodeOps.appendChild(parent, elm);
        }
      }
    }

    function createChildren (vnode, children, insertedVnodeQueue) {
      if (Array.isArray(children)) {
        for (var i = 0; i < children.length; ++i) {
          createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i);
        }
      } else if (isPrimitive(vnode.text)) {
        nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
      }
    }

    function isPatchable (vnode) {
      while (vnode.componentInstance) {
        vnode = vnode.componentInstance._vnode;
      }
      return isDef(vnode.tag)
    }

    function invokeCreateHooks (vnode, insertedVnodeQueue) {
      for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
        cbs.create[i$1](emptyNode, vnode);
      }
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        if (isDef(i.create)) { i.create(emptyNode, vnode); }
        if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
      }
    }

    // set scope id attribute for scoped CSS.
    // this is implemented as a special case to avoid the overhead
    // of going through the normal attribute patching process.
    function setScope (vnode) {
      var i;
      if (isDef(i = vnode.fnScopeId)) {
        nodeOps.setStyleScope(vnode.elm, i);
      } else {
        var ancestor = vnode;
        while (ancestor) {
          if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
            nodeOps.setStyleScope(vnode.elm, i);
          }
          ancestor = ancestor.parent;
        }
      }
      // for slot content they should also get the scopeId from the host instance.
      if (isDef(i = activeInstance) &&
        i !== vnode.context &&
        i !== vnode.fnContext &&
        isDef(i = i.$options._scopeId)
      ) {
        nodeOps.setStyleScope(vnode.elm, i);
      }
    }

    function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
      for (; startIdx <= endIdx; ++startIdx) {
        createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
      }
    }

    function invokeDestroyHook (vnode) {
      var i, j;
      var data = vnode.data;
      if (isDef(data)) {
        if (isDef(i = data.hook) && isDef(i = i.destroy)) { i(vnode); }
        for (i = 0; i < cbs.destroy.length; ++i) { cbs.destroy[i](vnode); }
      }
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
    }

    function removeVnodes (vnodes, startIdx, endIdx) {
      for (; startIdx <= endIdx; ++startIdx) {
        var ch = vnodes[startIdx];
        if (isDef(ch)) {
          if (isDef(ch.tag)) {
            removeAndInvokeRemoveHook(ch);
            invokeDestroyHook(ch);
          } else { // Text node
            removeNode(ch.elm);
          }
        }
      }
    }

    function removeAndInvokeRemoveHook (vnode, rm) {
      if (isDef(rm) || isDef(vnode.data)) {
        var i;
        var listeners = cbs.remove.length + 1;
        if (isDef(rm)) {
          // we have a recursively passed down rm callback
          // increase the listeners count
          rm.listeners += listeners;
        } else {
          // directly removing
          rm = createRmCb(vnode.elm, listeners);
        }
        // recursively invoke hooks on child component root node
        if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
          removeAndInvokeRemoveHook(i, rm);
        }
        for (i = 0; i < cbs.remove.length; ++i) {
          cbs.remove[i](vnode, rm);
        }
        if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
          i(vnode, rm);
        } else {
          rm();
        }
      } else {
        removeNode(vnode.elm);
      }
    }

    function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
      var oldStartIdx = 0;
      var newStartIdx = 0;
      var oldEndIdx = oldCh.length - 1;
      var oldStartVnode = oldCh[0];
      var oldEndVnode = oldCh[oldEndIdx];
      var newEndIdx = newCh.length - 1;
      var newStartVnode = newCh[0];
      var newEndVnode = newCh[newEndIdx];
      var oldKeyToIdx, idxInOld, vnodeToMove, refElm;

      // removeOnly is a special flag used only by <transition-group>
      // to ensure removed elements stay in correct relative positions
      // during leaving transitions
      var canMove = !removeOnly;

      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (isUndef(oldStartVnode)) {
          oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
        } else if (isUndef(oldEndVnode)) {
          oldEndVnode = oldCh[--oldEndIdx];
        } else if (sameVnode(oldStartVnode, newStartVnode)) {
          patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
          oldStartVnode = oldCh[++oldStartIdx];
          newStartVnode = newCh[++newStartIdx];
        } else if (sameVnode(oldEndVnode, newEndVnode)) {
          patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
          oldEndVnode = oldCh[--oldEndIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
          patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
          canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
          oldStartVnode = oldCh[++oldStartIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
          patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
          canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
          oldEndVnode = oldCh[--oldEndIdx];
          newStartVnode = newCh[++newStartIdx];
        } else {
          if (isUndef(oldKeyToIdx)) { oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); }
          idxInOld = isDef(newStartVnode.key)
            ? oldKeyToIdx[newStartVnode.key]
            : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
          if (isUndef(idxInOld)) { // New element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
          } else {
            vnodeToMove = oldCh[idxInOld];
            if (sameVnode(vnodeToMove, newStartVnode)) {
              patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
              oldCh[idxInOld] = undefined;
              canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
            } else {
              // same key but different element. treat as new element
              createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
            }
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
      if (oldStartIdx > oldEndIdx) {
        refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
        addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
      } else if (newStartIdx > newEndIdx) {
        removeVnodes(oldCh, oldStartIdx, oldEndIdx);
      }
    }

    function findIdxInOld (node, oldCh, start, end) {
      for (var i = start; i < end; i++) {
        var c = oldCh[i];
        if (isDef(c) && sameVnode(node, c)) { return i }
      }
    }

    function patchVnode (
      oldVnode,
      vnode,
      insertedVnodeQueue,
      ownerArray,
      index,
      removeOnly
    ) {
      if (oldVnode === vnode) {
        return
      }

      if (isDef(vnode.elm) && isDef(ownerArray)) {
        // clone reused vnode
        vnode = ownerArray[index] = cloneVNode(vnode);
      }

      var elm = vnode.elm = oldVnode.elm;

      if (isTrue(oldVnode.isAsyncPlaceholder)) {
        if (isDef(vnode.asyncFactory.resolved)) {
          hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
        } else {
          vnode.isAsyncPlaceholder = true;
        }
        return
      }

      // reuse element for static trees.
      // note we only do this if the vnode is cloned -
      // if the new node is not cloned it means the render functions have been
      // reset by the hot-reload-api and we need to do a proper re-render.
      if (isTrue(vnode.isStatic) &&
        isTrue(oldVnode.isStatic) &&
        vnode.key === oldVnode.key &&
        (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
      ) {
        vnode.componentInstance = oldVnode.componentInstance;
        return
      }

      var i;
      var data = vnode.data;
      if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
        i(oldVnode, vnode);
      }

      var oldCh = oldVnode.children;
      var ch = vnode.children;
      if (isDef(data) && isPatchable(vnode)) {
        for (i = 0; i < cbs.update.length; ++i) { cbs.update[i](oldVnode, vnode); }
        if (isDef(i = data.hook) && isDef(i = i.update)) { i(oldVnode, vnode); }
      }
      if (isUndef(vnode.text)) {
        if (isDef(oldCh) && isDef(ch)) {
          if (oldCh !== ch) { updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
        } else if (isDef(ch)) {
          if (isDef(oldVnode.text)) { nodeOps.setTextContent(elm, ''); }
          addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
        } else if (isDef(oldCh)) {
          removeVnodes(oldCh, 0, oldCh.length - 1);
        } else if (isDef(oldVnode.text)) {
          nodeOps.setTextContent(elm, '');
        }
      } else if (oldVnode.text !== vnode.text) {
        nodeOps.setTextContent(elm, vnode.text);
      }
      if (isDef(data)) {
        if (isDef(i = data.hook) && isDef(i = i.postpatch)) { i(oldVnode, vnode); }
      }
    }

    function invokeInsertHook (vnode, queue, initial) {
      // delay insert hooks for component root nodes, invoke them after the
      // element is really inserted
      if (isTrue(initial) && isDef(vnode.parent)) {
        vnode.parent.data.pendingInsert = queue;
      } else {
        for (var i = 0; i < queue.length; ++i) {
          queue[i].data.hook.insert(queue[i]);
        }
      }
    }
    // list of modules that can skip create hook during hydration because they
    // are already rendered on the client or has no need for initialization
    // Note: style is excluded because it relies on initial clone for future
    // deep updates (#7063).
    var isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key');

    // Note: this is a browser-only function so we can assume elms are DOM nodes.
    function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
      var i;
      var tag = vnode.tag;
      var data = vnode.data;
      var children = vnode.children;
      inVPre = inVPre || (data && data.pre);
      vnode.elm = elm;

      if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
        vnode.isAsyncPlaceholder = true;
        return true
      }
      if (isDef(data)) {
        if (isDef(i = data.hook) && isDef(i = i.init)) { i(vnode, true /* hydrating */); }
        if (isDef(i = vnode.componentInstance)) {
          // child component. it should have hydrated its own tree.
          initComponent(vnode, insertedVnodeQueue);
          return true
        }
      }
      if (isDef(tag)) {
        if (isDef(children)) {
          // empty element, allow client to pick up and populate children
          if (!elm.hasChildNodes()) {
            createChildren(vnode, children, insertedVnodeQueue);
          } else {
            // v-html and domProps: innerHTML
            if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
              if (i !== elm.innerHTML) {
                return false
              }
            } else {
              // iterate and compare children lists
              var childrenMatch = true;
              var childNode = elm.firstChild;
              for (var i$1 = 0; i$1 < children.length; i$1++) {
                if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                  childrenMatch = false;
                  break
                }
                childNode = childNode.nextSibling;
              }
              // if childNode is not null, it means the actual childNodes list is
              // longer than the virtual children list.
              if (!childrenMatch || childNode) {
                return false
              }
            }
          }
        }
        if (isDef(data)) {
          var fullInvoke = false;
          for (var key in data) {
            if (!isRenderedModule(key)) {
              fullInvoke = true;
              invokeCreateHooks(vnode, insertedVnodeQueue);
              break
            }
          }
          if (!fullInvoke && data['class']) {
            // ensure collecting deps for deep class bindings for future updates
            traverse(data['class']);
          }
        }
      } else if (elm.data !== vnode.text) {
        elm.data = vnode.text;
      }
      return true
    }

    return function patch (oldVnode, vnode, hydrating, removeOnly) {
      if (isUndef(vnode)) {
        if (isDef(oldVnode)) { invokeDestroyHook(oldVnode); }
        return
      }

      var isInitialPatch = false;
      var insertedVnodeQueue = [];

      if (isUndef(oldVnode)) {
        // empty mount (likely as component), create new root element
        isInitialPatch = true;
        createElm(vnode, insertedVnodeQueue);
      } else {
        var isRealElement = isDef(oldVnode.nodeType);
        if (!isRealElement && sameVnode(oldVnode, vnode)) {
          // patch existing root node
          patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
        } else {
          if (isRealElement) {
            // mounting to a real element
            // check if this is server-rendered content and if we can perform
            // a successful hydration.
            if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
              oldVnode.removeAttribute(SSR_ATTR);
              hydrating = true;
            }
            if (isTrue(hydrating)) {
              if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                invokeInsertHook(vnode, insertedVnodeQueue, true);
                return oldVnode
              }
            }
            // either not server-rendered, or hydration failed.
            // create an empty node and replace it
            oldVnode = emptyNodeAt(oldVnode);
          }

          // replacing existing element
          var oldElm = oldVnode.elm;
          var parentElm = nodeOps.parentNode(oldElm);

          // create new node
          createElm(
            vnode,
            insertedVnodeQueue,
            // extremely rare edge case: do not insert if old element is in a
            // leaving transition. Only happens when combining transition +
            // keep-alive + HOCs. (#4590)
            oldElm._leaveCb ? null : parentElm,
            nodeOps.nextSibling(oldElm)
          );

          // update parent placeholder node element, recursively
          if (isDef(vnode.parent)) {
            var ancestor = vnode.parent;
            var patchable = isPatchable(vnode);
            while (ancestor) {
              for (var i = 0; i < cbs.destroy.length; ++i) {
                cbs.destroy[i](ancestor);
              }
              ancestor.elm = vnode.elm;
              if (patchable) {
                for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                  cbs.create[i$1](emptyNode, ancestor);
                }
                // #6513
                // invoke insert hooks that may have been merged by create hooks.
                // e.g. for directives that uses the "inserted" hook.
                var insert = ancestor.data.hook.insert;
                if (insert.merged) {
                  // start at index 1 to avoid re-invoking component mounted hook
                  for (var i$2 = 1; i$2 < insert.fns.length; i$2++) {
                    insert.fns[i$2]();
                  }
                }
              } else {
                registerRef(ancestor);
              }
              ancestor = ancestor.parent;
            }
          }

          // destroy old node
          if (isDef(parentElm)) {
            removeVnodes([oldVnode], 0, 0);
          } else if (isDef(oldVnode.tag)) {
            invokeDestroyHook(oldVnode);
          }
        }
      }

      invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
      return vnode.elm
    }
  }

  /*  */

  var directives = {
    create: updateDirectives,
    update: updateDirectives,
    destroy: function unbindDirectives (vnode) {
      updateDirectives(vnode, emptyNode);
    }
  };

  function updateDirectives (oldVnode, vnode) {
    if (oldVnode.data.directives || vnode.data.directives) {
      _update(oldVnode, vnode);
    }
  }

  function _update (oldVnode, vnode) {
    var isCreate = oldVnode === emptyNode;
    var isDestroy = vnode === emptyNode;
    var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context);
    var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context);

    var dirsWithInsert = [];
    var dirsWithPostpatch = [];

    var key, oldDir, dir;
    for (key in newDirs) {
      oldDir = oldDirs[key];
      dir = newDirs[key];
      if (!oldDir) {
        // new directive, bind
        callHook$1(dir, 'bind', vnode, oldVnode);
        if (dir.def && dir.def.inserted) {
          dirsWithInsert.push(dir);
        }
      } else {
        // existing directive, update
        dir.oldValue = oldDir.value;
        dir.oldArg = oldDir.arg;
        callHook$1(dir, 'update', vnode, oldVnode);
        if (dir.def && dir.def.componentUpdated) {
          dirsWithPostpatch.push(dir);
        }
      }
    }

    if (dirsWithInsert.length) {
      var callInsert = function () {
        for (var i = 0; i < dirsWithInsert.length; i++) {
          callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode);
        }
      };
      if (isCreate) {
        mergeVNodeHook(vnode, 'insert', callInsert);
      } else {
        callInsert();
      }
    }

    if (dirsWithPostpatch.length) {
      mergeVNodeHook(vnode, 'postpatch', function () {
        for (var i = 0; i < dirsWithPostpatch.length; i++) {
          callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode);
        }
      });
    }

    if (!isCreate) {
      for (key in oldDirs) {
        if (!newDirs[key]) {
          // no longer present, unbind
          callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy);
        }
      }
    }
  }

  var emptyModifiers = Object.create(null);

  function normalizeDirectives$1 (
    dirs,
    vm
  ) {
    var res = Object.create(null);
    if (!dirs) {
      // $flow-disable-line
      return res
    }
    var i, dir;
    for (i = 0; i < dirs.length; i++) {
      dir = dirs[i];
      if (!dir.modifiers) {
        // $flow-disable-line
        dir.modifiers = emptyModifiers;
      }
      res[getRawDirName(dir)] = dir;
      dir.def = resolveAsset(vm.$options, 'directives', dir.name);
    }
    // $flow-disable-line
    return res
  }

  function getRawDirName (dir) {
    return dir.rawName || ((dir.name) + "." + (Object.keys(dir.modifiers || {}).join('.')))
  }

  function callHook$1 (dir, hook, vnode, oldVnode, isDestroy) {
    var fn = dir.def && dir.def[hook];
    if (fn) {
      try {
        fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
      } catch (e) {
        handleError(e, vnode.context, ("directive " + (dir.name) + " " + hook + " hook"));
      }
    }
  }

  var baseModules = [
    ref,
    directives
  ];

  /*  */

  function updateAttrs (oldVnode, vnode) {
    var opts = vnode.componentOptions;
    if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
      return
    }
    if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
      return
    }
    var key, cur, old;
    var elm = vnode.elm;
    var oldAttrs = oldVnode.data.attrs || {};
    var attrs = vnode.data.attrs || {};
    // clone observed objects, as the user probably wants to mutate it
    if (isDef(attrs.__ob__)) {
      attrs = vnode.data.attrs = extend({}, attrs);
    }

    for (key in attrs) {
      cur = attrs[key];
      old = oldAttrs[key];
      if (old !== cur) {
        setAttr(elm, key, cur);
      }
    }
    // #4391: in IE9, setting type can reset value for input[type=radio]
    // #6666: IE/Edge forces progress value down to 1 before setting a max
    /* istanbul ignore if */
    if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
      setAttr(elm, 'value', attrs.value);
    }
    for (key in oldAttrs) {
      if (isUndef(attrs[key])) {
        if (isXlink(key)) {
          elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
        } else if (!isEnumeratedAttr(key)) {
          elm.removeAttribute(key);
        }
      }
    }
  }

  function setAttr (el, key, value) {
    if (el.tagName.indexOf('-') > -1) {
      baseSetAttr(el, key, value);
    } else if (isBooleanAttr(key)) {
      // set attribute for blank value
      // e.g. <option disabled>Select one</option>
      if (isFalsyAttrValue(value)) {
        el.removeAttribute(key);
      } else {
        // technically allowfullscreen is a boolean attribute for <iframe>,
        // but Flash expects a value of "true" when used on <embed> tag
        value = key === 'allowfullscreen' && el.tagName === 'EMBED'
          ? 'true'
          : key;
        el.setAttribute(key, value);
      }
    } else if (isEnumeratedAttr(key)) {
      el.setAttribute(key, convertEnumeratedValue(key, value));
    } else if (isXlink(key)) {
      if (isFalsyAttrValue(value)) {
        el.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else {
        el.setAttributeNS(xlinkNS, key, value);
      }
    } else {
      baseSetAttr(el, key, value);
    }
  }

  function baseSetAttr (el, key, value) {
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      // #7138: IE10 & 11 fires input event when setting placeholder on
      // <textarea>... block the first input event and remove the blocker
      // immediately.
      /* istanbul ignore if */
      if (
        isIE && !isIE9 &&
        el.tagName === 'TEXTAREA' &&
        key === 'placeholder' && value !== '' && !el.__ieph
      ) {
        var blocker = function (e) {
          e.stopImmediatePropagation();
          el.removeEventListener('input', blocker);
        };
        el.addEventListener('input', blocker);
        // $flow-disable-line
        el.__ieph = true; /* IE placeholder patched */
      }
      el.setAttribute(key, value);
    }
  }

  var attrs = {
    create: updateAttrs,
    update: updateAttrs
  };

  /*  */

  function updateClass (oldVnode, vnode) {
    var el = vnode.elm;
    var data = vnode.data;
    var oldData = oldVnode.data;
    if (
      isUndef(data.staticClass) &&
      isUndef(data.class) && (
        isUndef(oldData) || (
          isUndef(oldData.staticClass) &&
          isUndef(oldData.class)
        )
      )
    ) {
      return
    }

    var cls = genClassForVnode(vnode);

    // handle transition classes
    var transitionClass = el._transitionClasses;
    if (isDef(transitionClass)) {
      cls = concat(cls, stringifyClass(transitionClass));
    }

    // set the class
    if (cls !== el._prevClass) {
      el.setAttribute('class', cls);
      el._prevClass = cls;
    }
  }

  var klass = {
    create: updateClass,
    update: updateClass
  };

  /*  */

  /*  */

  /*  */

  /*  */

  // in some cases, the event used has to be determined at runtime
  // so we used some reserved tokens during compile.
  var RANGE_TOKEN = '__r';
  var CHECKBOX_RADIO_TOKEN = '__c';

  /*  */

  // normalize v-model event tokens that can only be determined at runtime.
  // it's important to place the event as the first in the array because
  // the whole point is ensuring the v-model callback gets called before
  // user-attached handlers.
  function normalizeEvents (on) {
    /* istanbul ignore if */
    if (isDef(on[RANGE_TOKEN])) {
      // IE input[type=range] only supports `change` event
      var event = isIE ? 'change' : 'input';
      on[event] = [].concat(on[RANGE_TOKEN], on[event] || []);
      delete on[RANGE_TOKEN];
    }
    // This was originally intended to fix #4521 but no longer necessary
    // after 2.5. Keeping it for backwards compat with generated code from < 2.4
    /* istanbul ignore if */
    if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
      on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || []);
      delete on[CHECKBOX_RADIO_TOKEN];
    }
  }

  var target$1;

  function createOnceHandler$1 (event, handler, capture) {
    var _target = target$1; // save current target element in closure
    return function onceHandler () {
      var res = handler.apply(null, arguments);
      if (res !== null) {
        remove$2(event, onceHandler, capture, _target);
      }
    }
  }

  // #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
  // implementation and does not fire microtasks in between event propagation, so
  // safe to exclude.
  var useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53);

  function add$1 (
    name,
    handler,
    capture,
    passive
  ) {
    // async edge case #6566: inner click event triggers patch, event handler
    // attached to outer element during patch, and triggered again. This
    // happens because browsers fire microtask ticks between event propagation.
    // the solution is simple: we save the timestamp when a handler is attached,
    // and the handler would only fire if the event passed to it was fired
    // AFTER it was attached.
    if (useMicrotaskFix) {
      var attachedTimestamp = currentFlushTimestamp;
      var original = handler;
      handler = original._wrapper = function (e) {
        if (
          // no bubbling, should always fire.
          // this is just a safety net in case event.timeStamp is unreliable in
          // certain weird environments...
          e.target === e.currentTarget ||
          // event is fired after handler attachment
          e.timeStamp >= attachedTimestamp ||
          // bail for environments that have buggy event.timeStamp implementations
          // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
          // #9681 QtWebEngine event.timeStamp is negative value
          e.timeStamp <= 0 ||
          // #9448 bail if event is fired in another document in a multi-page
          // electron/nw.js app, since event.timeStamp will be using a different
          // starting reference
          e.target.ownerDocument !== document
        ) {
          return original.apply(this, arguments)
        }
      };
    }
    target$1.addEventListener(
      name,
      handler,
      supportsPassive
        ? { capture: capture, passive: passive }
        : capture
    );
  }

  function remove$2 (
    name,
    handler,
    capture,
    _target
  ) {
    (_target || target$1).removeEventListener(
      name,
      handler._wrapper || handler,
      capture
    );
  }

  function updateDOMListeners (oldVnode, vnode) {
    if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
      return
    }
    var on = vnode.data.on || {};
    var oldOn = oldVnode.data.on || {};
    target$1 = vnode.elm;
    normalizeEvents(on);
    updateListeners(on, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context);
    target$1 = undefined;
  }

  var events = {
    create: updateDOMListeners,
    update: updateDOMListeners
  };

  /*  */

  var svgContainer;

  function updateDOMProps (oldVnode, vnode) {
    if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
      return
    }
    var key, cur;
    var elm = vnode.elm;
    var oldProps = oldVnode.data.domProps || {};
    var props = vnode.data.domProps || {};
    // clone observed objects, as the user probably wants to mutate it
    if (isDef(props.__ob__)) {
      props = vnode.data.domProps = extend({}, props);
    }

    for (key in oldProps) {
      if (!(key in props)) {
        elm[key] = '';
      }
    }

    for (key in props) {
      cur = props[key];
      // ignore children if the node has textContent or innerHTML,
      // as these will throw away existing DOM nodes and cause removal errors
      // on subsequent patches (#3360)
      if (key === 'textContent' || key === 'innerHTML') {
        if (vnode.children) { vnode.children.length = 0; }
        if (cur === oldProps[key]) { continue }
        // #6601 work around Chrome version <= 55 bug where single textNode
        // replaced by innerHTML/textContent retains its parentNode property
        if (elm.childNodes.length === 1) {
          elm.removeChild(elm.childNodes[0]);
        }
      }

      if (key === 'value' && elm.tagName !== 'PROGRESS') {
        // store value as _value as well since
        // non-string values will be stringified
        elm._value = cur;
        // avoid resetting cursor position when value is the same
        var strCur = isUndef(cur) ? '' : String(cur);
        if (shouldUpdateValue(elm, strCur)) {
          elm.value = strCur;
        }
      } else if (key === 'innerHTML' && isSVG(elm.tagName) && isUndef(elm.innerHTML)) {
        // IE doesn't support innerHTML for SVG elements
        svgContainer = svgContainer || document.createElement('div');
        svgContainer.innerHTML = "<svg>" + cur + "</svg>";
        var svg = svgContainer.firstChild;
        while (elm.firstChild) {
          elm.removeChild(elm.firstChild);
        }
        while (svg.firstChild) {
          elm.appendChild(svg.firstChild);
        }
      } else if (
        // skip the update if old and new VDOM state is the same.
        // `value` is handled separately because the DOM value may be temporarily
        // out of sync with VDOM state due to focus, composition and modifiers.
        // This  #4521 by skipping the unnecesarry `checked` update.
        cur !== oldProps[key]
      ) {
        // some property updates can throw
        // e.g. `value` on <progress> w/ non-finite value
        try {
          elm[key] = cur;
        } catch (e) {}
      }
    }
  }

  // check platforms/web/util/attrs.js acceptValue


  function shouldUpdateValue (elm, checkVal) {
    return (!elm.composing && (
      elm.tagName === 'OPTION' ||
      isNotInFocusAndDirty(elm, checkVal) ||
      isDirtyWithModifiers(elm, checkVal)
    ))
  }

  function isNotInFocusAndDirty (elm, checkVal) {
    // return true when textbox (.number and .trim) loses focus and its value is
    // not equal to the updated value
    var notInFocus = true;
    // #6157
    // work around IE bug when accessing document.activeElement in an iframe
    try { notInFocus = document.activeElement !== elm; } catch (e) {}
    return notInFocus && elm.value !== checkVal
  }

  function isDirtyWithModifiers (elm, newVal) {
    var value = elm.value;
    var modifiers = elm._vModifiers; // injected by v-model runtime
    if (isDef(modifiers)) {
      if (modifiers.number) {
        return toNumber(value) !== toNumber(newVal)
      }
      if (modifiers.trim) {
        return value.trim() !== newVal.trim()
      }
    }
    return value !== newVal
  }

  var domProps = {
    create: updateDOMProps,
    update: updateDOMProps
  };

  /*  */

  var parseStyleText = cached(function (cssText) {
    var res = {};
    var listDelimiter = /;(?![^(]*\))/g;
    var propertyDelimiter = /:(.+)/;
    cssText.split(listDelimiter).forEach(function (item) {
      if (item) {
        var tmp = item.split(propertyDelimiter);
        tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
      }
    });
    return res
  });

  // merge static and dynamic style data on the same vnode
  function normalizeStyleData (data) {
    var style = normalizeStyleBinding(data.style);
    // static style is pre-processed into an object during compilation
    // and is always a fresh object, so it's safe to merge into it
    return data.staticStyle
      ? extend(data.staticStyle, style)
      : style
  }

  // normalize possible array / string values into Object
  function normalizeStyleBinding (bindingStyle) {
    if (Array.isArray(bindingStyle)) {
      return toObject(bindingStyle)
    }
    if (typeof bindingStyle === 'string') {
      return parseStyleText(bindingStyle)
    }
    return bindingStyle
  }

  /**
   * parent component style should be after child's
   * so that parent component's style could override it
   */
  function getStyle (vnode, checkChild) {
    var res = {};
    var styleData;

    if (checkChild) {
      var childNode = vnode;
      while (childNode.componentInstance) {
        childNode = childNode.componentInstance._vnode;
        if (
          childNode && childNode.data &&
          (styleData = normalizeStyleData(childNode.data))
        ) {
          extend(res, styleData);
        }
      }
    }

    if ((styleData = normalizeStyleData(vnode.data))) {
      extend(res, styleData);
    }

    var parentNode = vnode;
    while ((parentNode = parentNode.parent)) {
      if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
        extend(res, styleData);
      }
    }
    return res
  }

  /*  */

  var cssVarRE = /^--/;
  var importantRE = /\s*!important$/;
  var setProp = function (el, name, val) {
    /* istanbul ignore if */
    if (cssVarRE.test(name)) {
      el.style.setProperty(name, val);
    } else if (importantRE.test(val)) {
      el.style.setProperty(hyphenate(name), val.replace(importantRE, ''), 'important');
    } else {
      var normalizedName = normalize(name);
      if (Array.isArray(val)) {
        // Support values array created by autoprefixer, e.g.
        // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
        // Set them one by one, and the browser will only set those it can recognize
        for (var i = 0, len = val.length; i < len; i++) {
          el.style[normalizedName] = val[i];
        }
      } else {
        el.style[normalizedName] = val;
      }
    }
  };

  var vendorNames = ['Webkit', 'Moz', 'ms'];

  var emptyStyle;
  var normalize = cached(function (prop) {
    emptyStyle = emptyStyle || document.createElement('div').style;
    prop = camelize(prop);
    if (prop !== 'filter' && (prop in emptyStyle)) {
      return prop
    }
    var capName = prop.charAt(0).toUpperCase() + prop.slice(1);
    for (var i = 0; i < vendorNames.length; i++) {
      var name = vendorNames[i] + capName;
      if (name in emptyStyle) {
        return name
      }
    }
  });

  function updateStyle (oldVnode, vnode) {
    var data = vnode.data;
    var oldData = oldVnode.data;

    if (isUndef(data.staticStyle) && isUndef(data.style) &&
      isUndef(oldData.staticStyle) && isUndef(oldData.style)
    ) {
      return
    }

    var cur, name;
    var el = vnode.elm;
    var oldStaticStyle = oldData.staticStyle;
    var oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

    // if static style exists, stylebinding already merged into it when doing normalizeStyleData
    var oldStyle = oldStaticStyle || oldStyleBinding;

    var style = normalizeStyleBinding(vnode.data.style) || {};

    // store normalized style under a different key for next diff
    // make sure to clone it if it's reactive, since the user likely wants
    // to mutate it.
    vnode.data.normalizedStyle = isDef(style.__ob__)
      ? extend({}, style)
      : style;

    var newStyle = getStyle(vnode, true);

    for (name in oldStyle) {
      if (isUndef(newStyle[name])) {
        setProp(el, name, '');
      }
    }
    for (name in newStyle) {
      cur = newStyle[name];
      if (cur !== oldStyle[name]) {
        // ie9 setting to null has no effect, must use empty string
        setProp(el, name, cur == null ? '' : cur);
      }
    }
  }

  var style = {
    create: updateStyle,
    update: updateStyle
  };

  /*  */

  var whitespaceRE = /\s+/;

  /**
   * Add class with compatibility for SVG since classList is not supported on
   * SVG elements in IE
   */
  function addClass (el, cls) {
    /* istanbul ignore if */
    if (!cls || !(cls = cls.trim())) {
      return
    }

    /* istanbul ignore else */
    if (el.classList) {
      if (cls.indexOf(' ') > -1) {
        cls.split(whitespaceRE).forEach(function (c) { return el.classList.add(c); });
      } else {
        el.classList.add(cls);
      }
    } else {
      var cur = " " + (el.getAttribute('class') || '') + " ";
      if (cur.indexOf(' ' + cls + ' ') < 0) {
        el.setAttribute('class', (cur + cls).trim());
      }
    }
  }

  /**
   * Remove class with compatibility for SVG since classList is not supported on
   * SVG elements in IE
   */
  function removeClass (el, cls) {
    /* istanbul ignore if */
    if (!cls || !(cls = cls.trim())) {
      return
    }

    /* istanbul ignore else */
    if (el.classList) {
      if (cls.indexOf(' ') > -1) {
        cls.split(whitespaceRE).forEach(function (c) { return el.classList.remove(c); });
      } else {
        el.classList.remove(cls);
      }
      if (!el.classList.length) {
        el.removeAttribute('class');
      }
    } else {
      var cur = " " + (el.getAttribute('class') || '') + " ";
      var tar = ' ' + cls + ' ';
      while (cur.indexOf(tar) >= 0) {
        cur = cur.replace(tar, ' ');
      }
      cur = cur.trim();
      if (cur) {
        el.setAttribute('class', cur);
      } else {
        el.removeAttribute('class');
      }
    }
  }

  /*  */

  function resolveTransition (def$$1) {
    if (!def$$1) {
      return
    }
    /* istanbul ignore else */
    if (typeof def$$1 === 'object') {
      var res = {};
      if (def$$1.css !== false) {
        extend(res, autoCssTransition(def$$1.name || 'v'));
      }
      extend(res, def$$1);
      return res
    } else if (typeof def$$1 === 'string') {
      return autoCssTransition(def$$1)
    }
  }

  var autoCssTransition = cached(function (name) {
    return {
      enterClass: (name + "-enter"),
      enterToClass: (name + "-enter-to"),
      enterActiveClass: (name + "-enter-active"),
      leaveClass: (name + "-leave"),
      leaveToClass: (name + "-leave-to"),
      leaveActiveClass: (name + "-leave-active")
    }
  });

  var hasTransition = inBrowser && !isIE9;
  var TRANSITION = 'transition';
  var ANIMATION = 'animation';

  // Transition property/event sniffing
  var transitionProp = 'transition';
  var transitionEndEvent = 'transitionend';
  var animationProp = 'animation';
  var animationEndEvent = 'animationend';
  if (hasTransition) {
    /* istanbul ignore if */
    if (window.ontransitionend === undefined &&
      window.onwebkittransitionend !== undefined
    ) {
      transitionProp = 'WebkitTransition';
      transitionEndEvent = 'webkitTransitionEnd';
    }
    if (window.onanimationend === undefined &&
      window.onwebkitanimationend !== undefined
    ) {
      animationProp = 'WebkitAnimation';
      animationEndEvent = 'webkitAnimationEnd';
    }
  }

  // binding to window is necessary to make hot reload work in IE in strict mode
  var raf = inBrowser
    ? window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : setTimeout
    : /* istanbul ignore next */ function (fn) { return fn(); };

  function nextFrame (fn) {
    raf(function () {
      raf(fn);
    });
  }

  function addTransitionClass (el, cls) {
    var transitionClasses = el._transitionClasses || (el._transitionClasses = []);
    if (transitionClasses.indexOf(cls) < 0) {
      transitionClasses.push(cls);
      addClass(el, cls);
    }
  }

  function removeTransitionClass (el, cls) {
    if (el._transitionClasses) {
      remove(el._transitionClasses, cls);
    }
    removeClass(el, cls);
  }

  function whenTransitionEnds (
    el,
    expectedType,
    cb
  ) {
    var ref = getTransitionInfo(el, expectedType);
    var type = ref.type;
    var timeout = ref.timeout;
    var propCount = ref.propCount;
    if (!type) { return cb() }
    var event = type === TRANSITION ? transitionEndEvent : animationEndEvent;
    var ended = 0;
    var end = function () {
      el.removeEventListener(event, onEnd);
      cb();
    };
    var onEnd = function (e) {
      if (e.target === el) {
        if (++ended >= propCount) {
          end();
        }
      }
    };
    setTimeout(function () {
      if (ended < propCount) {
        end();
      }
    }, timeout + 1);
    el.addEventListener(event, onEnd);
  }

  var transformRE = /\b(transform|all)(,|$)/;

  function getTransitionInfo (el, expectedType) {
    var styles = window.getComputedStyle(el);
    // JSDOM may return undefined for transition properties
    var transitionDelays = (styles[transitionProp + 'Delay'] || '').split(', ');
    var transitionDurations = (styles[transitionProp + 'Duration'] || '').split(', ');
    var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
    var animationDelays = (styles[animationProp + 'Delay'] || '').split(', ');
    var animationDurations = (styles[animationProp + 'Duration'] || '').split(', ');
    var animationTimeout = getTimeout(animationDelays, animationDurations);

    var type;
    var timeout = 0;
    var propCount = 0;
    /* istanbul ignore if */
    if (expectedType === TRANSITION) {
      if (transitionTimeout > 0) {
        type = TRANSITION;
        timeout = transitionTimeout;
        propCount = transitionDurations.length;
      }
    } else if (expectedType === ANIMATION) {
      if (animationTimeout > 0) {
        type = ANIMATION;
        timeout = animationTimeout;
        propCount = animationDurations.length;
      }
    } else {
      timeout = Math.max(transitionTimeout, animationTimeout);
      type = timeout > 0
        ? transitionTimeout > animationTimeout
          ? TRANSITION
          : ANIMATION
        : null;
      propCount = type
        ? type === TRANSITION
          ? transitionDurations.length
          : animationDurations.length
        : 0;
    }
    var hasTransform =
      type === TRANSITION &&
      transformRE.test(styles[transitionProp + 'Property']);
    return {
      type: type,
      timeout: timeout,
      propCount: propCount,
      hasTransform: hasTransform
    }
  }

  function getTimeout (delays, durations) {
    /* istanbul ignore next */
    while (delays.length < durations.length) {
      delays = delays.concat(delays);
    }

    return Math.max.apply(null, durations.map(function (d, i) {
      return toMs(d) + toMs(delays[i])
    }))
  }

  // Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
  // in a locale-dependent way, using a comma instead of a dot.
  // If comma is not replaced with a dot, the input will be rounded down (i.e. acting
  // as a floor function) causing unexpected behaviors
  function toMs (s) {
    return Number(s.slice(0, -1).replace(',', '.')) * 1000
  }

  /*  */

  function enter (vnode, toggleDisplay) {
    var el = vnode.elm;

    // call leave callback now
    if (isDef(el._leaveCb)) {
      el._leaveCb.cancelled = true;
      el._leaveCb();
    }

    var data = resolveTransition(vnode.data.transition);
    if (isUndef(data)) {
      return
    }

    /* istanbul ignore if */
    if (isDef(el._enterCb) || el.nodeType !== 1) {
      return
    }

    var css = data.css;
    var type = data.type;
    var enterClass = data.enterClass;
    var enterToClass = data.enterToClass;
    var enterActiveClass = data.enterActiveClass;
    var appearClass = data.appearClass;
    var appearToClass = data.appearToClass;
    var appearActiveClass = data.appearActiveClass;
    var beforeEnter = data.beforeEnter;
    var enter = data.enter;
    var afterEnter = data.afterEnter;
    var enterCancelled = data.enterCancelled;
    var beforeAppear = data.beforeAppear;
    var appear = data.appear;
    var afterAppear = data.afterAppear;
    var appearCancelled = data.appearCancelled;
    var duration = data.duration;

    // activeInstance will always be the <transition> component managing this
    // transition. One edge case to check is when the <transition> is placed
    // as the root node of a child component. In that case we need to check
    // <transition>'s parent for appear check.
    var context = activeInstance;
    var transitionNode = activeInstance.$vnode;
    while (transitionNode && transitionNode.parent) {
      context = transitionNode.context;
      transitionNode = transitionNode.parent;
    }

    var isAppear = !context._isMounted || !vnode.isRootInsert;

    if (isAppear && !appear && appear !== '') {
      return
    }

    var startClass = isAppear && appearClass
      ? appearClass
      : enterClass;
    var activeClass = isAppear && appearActiveClass
      ? appearActiveClass
      : enterActiveClass;
    var toClass = isAppear && appearToClass
      ? appearToClass
      : enterToClass;

    var beforeEnterHook = isAppear
      ? (beforeAppear || beforeEnter)
      : beforeEnter;
    var enterHook = isAppear
      ? (typeof appear === 'function' ? appear : enter)
      : enter;
    var afterEnterHook = isAppear
      ? (afterAppear || afterEnter)
      : afterEnter;
    var enterCancelledHook = isAppear
      ? (appearCancelled || enterCancelled)
      : enterCancelled;

    var explicitEnterDuration = toNumber(
      isObject(duration)
        ? duration.enter
        : duration
    );

    var expectsCSS = css !== false && !isIE9;
    var userWantsControl = getHookArgumentsLength(enterHook);

    var cb = el._enterCb = once(function () {
      if (expectsCSS) {
        removeTransitionClass(el, toClass);
        removeTransitionClass(el, activeClass);
      }
      if (cb.cancelled) {
        if (expectsCSS) {
          removeTransitionClass(el, startClass);
        }
        enterCancelledHook && enterCancelledHook(el);
      } else {
        afterEnterHook && afterEnterHook(el);
      }
      el._enterCb = null;
    });

    if (!vnode.data.show) {
      // remove pending leave element on enter by injecting an insert hook
      mergeVNodeHook(vnode, 'insert', function () {
        var parent = el.parentNode;
        var pendingNode = parent && parent._pending && parent._pending[vnode.key];
        if (pendingNode &&
          pendingNode.tag === vnode.tag &&
          pendingNode.elm._leaveCb
        ) {
          pendingNode.elm._leaveCb();
        }
        enterHook && enterHook(el, cb);
      });
    }

    // start enter transition
    beforeEnterHook && beforeEnterHook(el);
    if (expectsCSS) {
      addTransitionClass(el, startClass);
      addTransitionClass(el, activeClass);
      nextFrame(function () {
        removeTransitionClass(el, startClass);
        if (!cb.cancelled) {
          addTransitionClass(el, toClass);
          if (!userWantsControl) {
            if (isValidDuration(explicitEnterDuration)) {
              setTimeout(cb, explicitEnterDuration);
            } else {
              whenTransitionEnds(el, type, cb);
            }
          }
        }
      });
    }

    if (vnode.data.show) {
      toggleDisplay && toggleDisplay();
      enterHook && enterHook(el, cb);
    }

    if (!expectsCSS && !userWantsControl) {
      cb();
    }
  }

  function leave (vnode, rm) {
    var el = vnode.elm;

    // call enter callback now
    if (isDef(el._enterCb)) {
      el._enterCb.cancelled = true;
      el._enterCb();
    }

    var data = resolveTransition(vnode.data.transition);
    if (isUndef(data) || el.nodeType !== 1) {
      return rm()
    }

    /* istanbul ignore if */
    if (isDef(el._leaveCb)) {
      return
    }

    var css = data.css;
    var type = data.type;
    var leaveClass = data.leaveClass;
    var leaveToClass = data.leaveToClass;
    var leaveActiveClass = data.leaveActiveClass;
    var beforeLeave = data.beforeLeave;
    var leave = data.leave;
    var afterLeave = data.afterLeave;
    var leaveCancelled = data.leaveCancelled;
    var delayLeave = data.delayLeave;
    var duration = data.duration;

    var expectsCSS = css !== false && !isIE9;
    var userWantsControl = getHookArgumentsLength(leave);

    var explicitLeaveDuration = toNumber(
      isObject(duration)
        ? duration.leave
        : duration
    );

    var cb = el._leaveCb = once(function () {
      if (el.parentNode && el.parentNode._pending) {
        el.parentNode._pending[vnode.key] = null;
      }
      if (expectsCSS) {
        removeTransitionClass(el, leaveToClass);
        removeTransitionClass(el, leaveActiveClass);
      }
      if (cb.cancelled) {
        if (expectsCSS) {
          removeTransitionClass(el, leaveClass);
        }
        leaveCancelled && leaveCancelled(el);
      } else {
        rm();
        afterLeave && afterLeave(el);
      }
      el._leaveCb = null;
    });

    if (delayLeave) {
      delayLeave(performLeave);
    } else {
      performLeave();
    }

    function performLeave () {
      // the delayed leave may have already been cancelled
      if (cb.cancelled) {
        return
      }
      // record leaving element
      if (!vnode.data.show && el.parentNode) {
        (el.parentNode._pending || (el.parentNode._pending = {}))[(vnode.key)] = vnode;
      }
      beforeLeave && beforeLeave(el);
      if (expectsCSS) {
        addTransitionClass(el, leaveClass);
        addTransitionClass(el, leaveActiveClass);
        nextFrame(function () {
          removeTransitionClass(el, leaveClass);
          if (!cb.cancelled) {
            addTransitionClass(el, leaveToClass);
            if (!userWantsControl) {
              if (isValidDuration(explicitLeaveDuration)) {
                setTimeout(cb, explicitLeaveDuration);
              } else {
                whenTransitionEnds(el, type, cb);
              }
            }
          }
        });
      }
      leave && leave(el, cb);
      if (!expectsCSS && !userWantsControl) {
        cb();
      }
    }
  }

  function isValidDuration (val) {
    return typeof val === 'number' && !isNaN(val)
  }

  /**
   * Normalize a transition hook's argument length. The hook may be:
   * - a merged hook (invoker) with the original in .fns
   * - a wrapped component method (check ._length)
   * - a plain function (.length)
   */
  function getHookArgumentsLength (fn) {
    if (isUndef(fn)) {
      return false
    }
    var invokerFns = fn.fns;
    if (isDef(invokerFns)) {
      // invoker
      return getHookArgumentsLength(
        Array.isArray(invokerFns)
          ? invokerFns[0]
          : invokerFns
      )
    } else {
      return (fn._length || fn.length) > 1
    }
  }

  function _enter (_, vnode) {
    if (vnode.data.show !== true) {
      enter(vnode);
    }
  }

  var transition = inBrowser ? {
    create: _enter,
    activate: _enter,
    remove: function remove$$1 (vnode, rm) {
      /* istanbul ignore else */
      if (vnode.data.show !== true) {
        leave(vnode, rm);
      } else {
        rm();
      }
    }
  } : {};

  var platformModules = [
    attrs,
    klass,
    events,
    domProps,
    style,
    transition
  ];

  /*  */

  // the directive module should be applied last, after all
  // built-in modules have been applied.
  var modules = platformModules.concat(baseModules);

  var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });

  /**
   * Not type checking this file because flow doesn't like attaching
   * properties to Elements.
   */

  /* istanbul ignore if */
  if (isIE9) {
    // http://www.matts411.com/post/internet-explorer-9-oninput/
    document.addEventListener('selectionchange', function () {
      var el = document.activeElement;
      if (el && el.vmodel) {
        trigger(el, 'input');
      }
    });
  }

  var directive = {
    inserted: function inserted (el, binding, vnode, oldVnode) {
      if (vnode.tag === 'select') {
        // #6903
        if (oldVnode.elm && !oldVnode.elm._vOptions) {
          mergeVNodeHook(vnode, 'postpatch', function () {
            directive.componentUpdated(el, binding, vnode);
          });
        } else {
          setSelected(el, binding, vnode.context);
        }
        el._vOptions = [].map.call(el.options, getValue);
      } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
        el._vModifiers = binding.modifiers;
        if (!binding.modifiers.lazy) {
          el.addEventListener('compositionstart', onCompositionStart);
          el.addEventListener('compositionend', onCompositionEnd);
          // Safari < 10.2 & UIWebView doesn't fire compositionend when
          // switching focus before confirming composition choice
          // this also fixes the issue where some browsers e.g. iOS Chrome
          // fires "change" instead of "input" on autocomplete.
          el.addEventListener('change', onCompositionEnd);
          /* istanbul ignore if */
          if (isIE9) {
            el.vmodel = true;
          }
        }
      }
    },

    componentUpdated: function componentUpdated (el, binding, vnode) {
      if (vnode.tag === 'select') {
        setSelected(el, binding, vnode.context);
        // in case the options rendered by v-for have changed,
        // it's possible that the value is out-of-sync with the rendered options.
        // detect such cases and filter out values that no longer has a matching
        // option in the DOM.
        var prevOptions = el._vOptions;
        var curOptions = el._vOptions = [].map.call(el.options, getValue);
        if (curOptions.some(function (o, i) { return !looseEqual(o, prevOptions[i]); })) {
          // trigger change event if
          // no matching option found for at least one value
          var needReset = el.multiple
            ? binding.value.some(function (v) { return hasNoMatchingOption(v, curOptions); })
            : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions);
          if (needReset) {
            trigger(el, 'change');
          }
        }
      }
    }
  };

  function setSelected (el, binding, vm) {
    actuallySetSelected(el, binding);
    /* istanbul ignore if */
    if (isIE || isEdge) {
      setTimeout(function () {
        actuallySetSelected(el, binding);
      }, 0);
    }
  }

  function actuallySetSelected (el, binding, vm) {
    var value = binding.value;
    var isMultiple = el.multiple;
    if (isMultiple && !Array.isArray(value)) {
      return
    }
    var selected, option;
    for (var i = 0, l = el.options.length; i < l; i++) {
      option = el.options[i];
      if (isMultiple) {
        selected = looseIndexOf(value, getValue(option)) > -1;
        if (option.selected !== selected) {
          option.selected = selected;
        }
      } else {
        if (looseEqual(getValue(option), value)) {
          if (el.selectedIndex !== i) {
            el.selectedIndex = i;
          }
          return
        }
      }
    }
    if (!isMultiple) {
      el.selectedIndex = -1;
    }
  }

  function hasNoMatchingOption (value, options) {
    return options.every(function (o) { return !looseEqual(o, value); })
  }

  function getValue (option) {
    return '_value' in option
      ? option._value
      : option.value
  }

  function onCompositionStart (e) {
    e.target.composing = true;
  }

  function onCompositionEnd (e) {
    // prevent triggering an input event for no reason
    if (!e.target.composing) { return }
    e.target.composing = false;
    trigger(e.target, 'input');
  }

  function trigger (el, type) {
    var e = document.createEvent('HTMLEvents');
    e.initEvent(type, true, true);
    el.dispatchEvent(e);
  }

  /*  */

  // recursively search for possible transition defined inside the component root
  function locateNode (vnode) {
    return vnode.componentInstance && (!vnode.data || !vnode.data.transition)
      ? locateNode(vnode.componentInstance._vnode)
      : vnode
  }

  var show = {
    bind: function bind (el, ref, vnode) {
      var value = ref.value;

      vnode = locateNode(vnode);
      var transition$$1 = vnode.data && vnode.data.transition;
      var originalDisplay = el.__vOriginalDisplay =
        el.style.display === 'none' ? '' : el.style.display;
      if (value && transition$$1) {
        vnode.data.show = true;
        enter(vnode, function () {
          el.style.display = originalDisplay;
        });
      } else {
        el.style.display = value ? originalDisplay : 'none';
      }
    },

    update: function update (el, ref, vnode) {
      var value = ref.value;
      var oldValue = ref.oldValue;

      /* istanbul ignore if */
      if (!value === !oldValue) { return }
      vnode = locateNode(vnode);
      var transition$$1 = vnode.data && vnode.data.transition;
      if (transition$$1) {
        vnode.data.show = true;
        if (value) {
          enter(vnode, function () {
            el.style.display = el.__vOriginalDisplay;
          });
        } else {
          leave(vnode, function () {
            el.style.display = 'none';
          });
        }
      } else {
        el.style.display = value ? el.__vOriginalDisplay : 'none';
      }
    },

    unbind: function unbind (
      el,
      binding,
      vnode,
      oldVnode,
      isDestroy
    ) {
      if (!isDestroy) {
        el.style.display = el.__vOriginalDisplay;
      }
    }
  };

  var platformDirectives = {
    model: directive,
    show: show
  };

  /*  */

  var transitionProps = {
    name: String,
    appear: Boolean,
    css: Boolean,
    mode: String,
    type: String,
    enterClass: String,
    leaveClass: String,
    enterToClass: String,
    leaveToClass: String,
    enterActiveClass: String,
    leaveActiveClass: String,
    appearClass: String,
    appearActiveClass: String,
    appearToClass: String,
    duration: [Number, String, Object]
  };

  // in case the child is also an abstract component, e.g. <keep-alive>
  // we want to recursively retrieve the real component to be rendered
  function getRealChild (vnode) {
    var compOptions = vnode && vnode.componentOptions;
    if (compOptions && compOptions.Ctor.options.abstract) {
      return getRealChild(getFirstComponentChild(compOptions.children))
    } else {
      return vnode
    }
  }

  function extractTransitionData (comp) {
    var data = {};
    var options = comp.$options;
    // props
    for (var key in options.propsData) {
      data[key] = comp[key];
    }
    // events.
    // extract listeners and pass them directly to the transition methods
    var listeners = options._parentListeners;
    for (var key$1 in listeners) {
      data[camelize(key$1)] = listeners[key$1];
    }
    return data
  }

  function placeholder (h, rawChild) {
    if (/\d-keep-alive$/.test(rawChild.tag)) {
      return h('keep-alive', {
        props: rawChild.componentOptions.propsData
      })
    }
  }

  function hasParentTransition (vnode) {
    while ((vnode = vnode.parent)) {
      if (vnode.data.transition) {
        return true
      }
    }
  }

  function isSameChild (child, oldChild) {
    return oldChild.key === child.key && oldChild.tag === child.tag
  }

  var isNotTextNode = function (c) { return c.tag || isAsyncPlaceholder(c); };

  var isVShowDirective = function (d) { return d.name === 'show'; };

  var Transition = {
    name: 'transition',
    props: transitionProps,
    abstract: true,

    render: function render (h) {
      var this$1 = this;

      var children = this.$slots.default;
      if (!children) {
        return
      }

      // filter out text nodes (possible whitespaces)
      children = children.filter(isNotTextNode);
      /* istanbul ignore if */
      if (!children.length) {
        return
      }

      var mode = this.mode;

      var rawChild = children[0];

      // if this is a component root node and the component's
      // parent container node also has transition, skip.
      if (hasParentTransition(this.$vnode)) {
        return rawChild
      }

      // apply transition data to child
      // use getRealChild() to ignore abstract components e.g. keep-alive
      var child = getRealChild(rawChild);
      /* istanbul ignore if */
      if (!child) {
        return rawChild
      }

      if (this._leaving) {
        return placeholder(h, rawChild)
      }

      // ensure a key that is unique to the vnode type and to this transition
      // component instance. This key will be used to remove pending leaving nodes
      // during entering.
      var id = "__transition-" + (this._uid) + "-";
      child.key = child.key == null
        ? child.isComment
          ? id + 'comment'
          : id + child.tag
        : isPrimitive(child.key)
          ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
          : child.key;

      var data = (child.data || (child.data = {})).transition = extractTransitionData(this);
      var oldRawChild = this._vnode;
      var oldChild = getRealChild(oldRawChild);

      // mark v-show
      // so that the transition module can hand over the control to the directive
      if (child.data.directives && child.data.directives.some(isVShowDirective)) {
        child.data.show = true;
      }

      if (
        oldChild &&
        oldChild.data &&
        !isSameChild(child, oldChild) &&
        !isAsyncPlaceholder(oldChild) &&
        // #6687 component root is a comment node
        !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
      ) {
        // replace old child transition data with fresh one
        // important for dynamic transitions!
        var oldData = oldChild.data.transition = extend({}, data);
        // handle transition mode
        if (mode === 'out-in') {
          // return placeholder node and queue update when leave finishes
          this._leaving = true;
          mergeVNodeHook(oldData, 'afterLeave', function () {
            this$1._leaving = false;
            this$1.$forceUpdate();
          });
          return placeholder(h, rawChild)
        } else if (mode === 'in-out') {
          if (isAsyncPlaceholder(child)) {
            return oldRawChild
          }
          var delayedLeave;
          var performLeave = function () { delayedLeave(); };
          mergeVNodeHook(data, 'afterEnter', performLeave);
          mergeVNodeHook(data, 'enterCancelled', performLeave);
          mergeVNodeHook(oldData, 'delayLeave', function (leave) { delayedLeave = leave; });
        }
      }

      return rawChild
    }
  };

  /*  */

  var props = extend({
    tag: String,
    moveClass: String
  }, transitionProps);

  delete props.mode;

  var TransitionGroup = {
    props: props,

    beforeMount: function beforeMount () {
      var this$1 = this;

      var update = this._update;
      this._update = function (vnode, hydrating) {
        var restoreActiveInstance = setActiveInstance(this$1);
        // force removing pass
        this$1.__patch__(
          this$1._vnode,
          this$1.kept,
          false, // hydrating
          true // removeOnly (!important, avoids unnecessary moves)
        );
        this$1._vnode = this$1.kept;
        restoreActiveInstance();
        update.call(this$1, vnode, hydrating);
      };
    },

    render: function render (h) {
      var tag = this.tag || this.$vnode.data.tag || 'span';
      var map = Object.create(null);
      var prevChildren = this.prevChildren = this.children;
      var rawChildren = this.$slots.default || [];
      var children = this.children = [];
      var transitionData = extractTransitionData(this);

      for (var i = 0; i < rawChildren.length; i++) {
        var c = rawChildren[i];
        if (c.tag) {
          if (c.key != null && String(c.key).indexOf('__vlist') !== 0) {
            children.push(c);
            map[c.key] = c
            ;(c.data || (c.data = {})).transition = transitionData;
          }
        }
      }

      if (prevChildren) {
        var kept = [];
        var removed = [];
        for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
          var c$1 = prevChildren[i$1];
          c$1.data.transition = transitionData;
          c$1.data.pos = c$1.elm.getBoundingClientRect();
          if (map[c$1.key]) {
            kept.push(c$1);
          } else {
            removed.push(c$1);
          }
        }
        this.kept = h(tag, null, kept);
        this.removed = removed;
      }

      return h(tag, null, children)
    },

    updated: function updated () {
      var children = this.prevChildren;
      var moveClass = this.moveClass || ((this.name || 'v') + '-move');
      if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
        return
      }

      // we divide the work into three loops to avoid mixing DOM reads and writes
      // in each iteration - which helps prevent layout thrashing.
      children.forEach(callPendingCbs);
      children.forEach(recordPosition);
      children.forEach(applyTranslation);

      // force reflow to put everything in position
      // assign to this to avoid being removed in tree-shaking
      // $flow-disable-line
      this._reflow = document.body.offsetHeight;

      children.forEach(function (c) {
        if (c.data.moved) {
          var el = c.elm;
          var s = el.style;
          addTransitionClass(el, moveClass);
          s.transform = s.WebkitTransform = s.transitionDuration = '';
          el.addEventListener(transitionEndEvent, el._moveCb = function cb (e) {
            if (e && e.target !== el) {
              return
            }
            if (!e || /transform$/.test(e.propertyName)) {
              el.removeEventListener(transitionEndEvent, cb);
              el._moveCb = null;
              removeTransitionClass(el, moveClass);
            }
          });
        }
      });
    },

    methods: {
      hasMove: function hasMove (el, moveClass) {
        /* istanbul ignore if */
        if (!hasTransition) {
          return false
        }
        /* istanbul ignore if */
        if (this._hasMove) {
          return this._hasMove
        }
        // Detect whether an element with the move class applied has
        // CSS transitions. Since the element may be inside an entering
        // transition at this very moment, we make a clone of it and remove
        // all other transition classes applied to ensure only the move class
        // is applied.
        var clone = el.cloneNode();
        if (el._transitionClasses) {
          el._transitionClasses.forEach(function (cls) { removeClass(clone, cls); });
        }
        addClass(clone, moveClass);
        clone.style.display = 'none';
        this.$el.appendChild(clone);
        var info = getTransitionInfo(clone);
        this.$el.removeChild(clone);
        return (this._hasMove = info.hasTransform)
      }
    }
  };

  function callPendingCbs (c) {
    /* istanbul ignore if */
    if (c.elm._moveCb) {
      c.elm._moveCb();
    }
    /* istanbul ignore if */
    if (c.elm._enterCb) {
      c.elm._enterCb();
    }
  }

  function recordPosition (c) {
    c.data.newPos = c.elm.getBoundingClientRect();
  }

  function applyTranslation (c) {
    var oldPos = c.data.pos;
    var newPos = c.data.newPos;
    var dx = oldPos.left - newPos.left;
    var dy = oldPos.top - newPos.top;
    if (dx || dy) {
      c.data.moved = true;
      var s = c.elm.style;
      s.transform = s.WebkitTransform = "translate(" + dx + "px," + dy + "px)";
      s.transitionDuration = '0s';
    }
  }

  var platformComponents = {
    Transition: Transition,
    TransitionGroup: TransitionGroup
  };

  /*  */

  // install platform specific utils
  Vue.config.mustUseProp = mustUseProp;
  Vue.config.isReservedTag = isReservedTag;
  Vue.config.isReservedAttr = isReservedAttr;
  Vue.config.getTagNamespace = getTagNamespace;
  Vue.config.isUnknownElement = isUnknownElement;

  // install platform runtime directives & components
  extend(Vue.options.directives, platformDirectives);
  extend(Vue.options.components, platformComponents);

  // install platform patch function
  Vue.prototype.__patch__ = inBrowser ? patch : noop;

  // public mount method
  Vue.prototype.$mount = function (
    el,
    hydrating
  ) {
    el = el && inBrowser ? query(el) : undefined;
    return mountComponent(this, el, hydrating)
  };

  // devtools global hook
  /* istanbul ignore next */
  if (inBrowser) {
    setTimeout(function () {
      if (config.devtools) {
        if (devtools) {
          devtools.emit('init', Vue);
        }
      }
    }, 0);
  }

  var STORAGE_KEY_PREFIX = 'webcg-devtools.' + hashCode('' + window.location.pathname);

  function getStorageItem (name, defaultValue) {
    try {
      var result = window.localStorage.getItem(STORAGE_KEY_PREFIX + '.' + name);
      return result !== null ? JSON.parse(result) : defaultValue
    } catch (err) {
      return defaultValue
    }
  }

  function setStorageItem (name, value) {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + '.' + name, JSON.stringify(value));
  }

  var storage = {
    get: getStorageItem,
    set: setStorageItem
  };

  // https://stackoverflow.com/a/8831937
  function hashCode (str) {
    var hash = 0;
    if (!str || str.length === 0) {
      return hash
    }
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  var script = {
    name: 'tab-settings',
    props: ['value'],
    data: function data () {
      return {
        localValue: JSON.parse(JSON.stringify(this.value))
      }
    },
    watch: {
      localValue: {
        handler: function (val) {
          this.$emit('input', JSON.parse(JSON.stringify(val)));
        },
        deep: true
      }
    }
  };

  function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
      if (typeof shadowMode !== 'boolean') {
          createInjectorSSR = createInjector;
          createInjector = shadowMode;
          shadowMode = false;
      }
      // Vue.extend constructor export interop.
      var options = typeof script === 'function' ? script.options : script;
      // render functions
      if (template && template.render) {
          options.render = template.render;
          options.staticRenderFns = template.staticRenderFns;
          options._compiled = true;
          // functional template
          if (isFunctionalTemplate) {
              options.functional = true;
          }
      }
      // scopedId
      if (scopeId) {
          options._scopeId = scopeId;
      }
      var hook;
      if (moduleIdentifier) {
          // server build
          hook = function (context) {
              // 2.3 injection
              context =
                  context || // cached call
                      (this.$vnode && this.$vnode.ssrContext) || // stateful
                      (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
              // 2.2 with runInNewContext: true
              if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                  context = __VUE_SSR_CONTEXT__;
              }
              // inject component styles
              if (style) {
                  style.call(this, createInjectorSSR(context));
              }
              // register component module identifier for async chunk inference
              if (context && context._registeredComponents) {
                  context._registeredComponents.add(moduleIdentifier);
              }
          };
          // used by ssr in case component is cached and beforeCreate
          // never gets called
          options._ssrRegister = hook;
      }
      else if (style) {
          hook = shadowMode
              ? function (context) {
                  style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
              }
              : function (context) {
                  style.call(this, createInjector(context));
              };
      }
      if (hook) {
          if (options.functional) {
              // register for functional component in vue file
              var originalRender = options.render;
              options.render = function renderWithStyleInjection(h, context) {
                  hook.call(context);
                  return originalRender(h, context);
              };
          }
          else {
              // inject component registration as beforeCreate hook
              var existing = options.beforeCreate;
              options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
          }
      }
      return script;
  }

  var isOldIE = typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
  function createInjector(context) {
      return function (id, style) { return addStyle(id, style); };
  }
  var HEAD;
  var styles = {};
  function addStyle(id, css) {
      var group = isOldIE ? css.media || 'default' : id;
      var style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
      if (!style.ids.has(id)) {
          style.ids.add(id);
          var code = css.source;
          if (css.map) {
              // https://developer.chrome.com/devtools/docs/javascript-debugging
              // this makes source maps inside style tags work properly in Chrome
              code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
              // http://stackoverflow.com/a/26603875
              code +=
                  '\n/*# sourceMappingURL=data:application/json;base64,' +
                      btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                      ' */';
          }
          if (!style.element) {
              style.element = document.createElement('style');
              style.element.type = 'text/css';
              if (css.media)
                  { style.element.setAttribute('media', css.media); }
              if (HEAD === undefined) {
                  HEAD = document.head || document.getElementsByTagName('head')[0];
              }
              HEAD.appendChild(style.element);
          }
          if ('styleSheet' in style.element) {
              style.styles.push(code);
              style.element.styleSheet.cssText = style.styles
                  .filter(Boolean)
                  .join('\n');
          }
          else {
              var index = style.ids.size - 1;
              var textNode = document.createTextNode(code);
              var nodes = style.element.childNodes;
              if (nodes[index])
                  { style.element.removeChild(nodes[index]); }
              if (nodes.length)
                  { style.element.insertBefore(textNode, nodes[index]); }
              else
                  { style.element.appendChild(textNode); }
          }
      }
  }

  /* script */
  var __vue_script__ = script;

  /* template */
  var __vue_render__ = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { staticClass: "modal-body" }, [
      _c("div", { staticClass: "row" }, [
        _c("div", { staticClass: "col-xs-12 col-sm-6" }, [
          _c("h3", [_vm._v("DevTools")]),
          _vm._v(" "),
          _c("div", { staticClass: "form-group" }, [
            _c("div", { staticClass: "form-check" }, [
              _c("input", {
                directives: [
                  {
                    name: "model",
                    rawName: "v-model.lazy",
                    value: _vm.localValue.callUpdateBeforePlay,
                    expression: "localValue.callUpdateBeforePlay",
                    modifiers: { lazy: true }
                  }
                ],
                staticClass: "form-check-input",
                attrs: { type: "checkbox", id: "webcgCallUpdateBeforePlay" },
                domProps: {
                  checked: Array.isArray(_vm.localValue.callUpdateBeforePlay)
                    ? _vm._i(_vm.localValue.callUpdateBeforePlay, null) > -1
                    : _vm.localValue.callUpdateBeforePlay
                },
                on: {
                  change: function($event) {
                    var $$a = _vm.localValue.callUpdateBeforePlay,
                      $$el = $event.target,
                      $$c = $$el.checked ? true : false;
                    if (Array.isArray($$a)) {
                      var $$v = null,
                        $$i = _vm._i($$a, $$v);
                      if ($$el.checked) {
                        $$i < 0 &&
                          _vm.$set(
                            _vm.localValue,
                            "callUpdateBeforePlay",
                            $$a.concat([$$v])
                          );
                      } else {
                        $$i > -1 &&
                          _vm.$set(
                            _vm.localValue,
                            "callUpdateBeforePlay",
                            $$a.slice(0, $$i).concat($$a.slice($$i + 1))
                          );
                      }
                    } else {
                      _vm.$set(_vm.localValue, "callUpdateBeforePlay", $$c);
                    }
                  }
                }
              }),
              _vm._v(" "),
              _c(
                "label",
                {
                  staticClass: "form-check-label",
                  attrs: { for: "webcgCallUpdateBeforePlay" }
                },
                [
                  _vm._v(
                    '\n                        Call "update" before "play" like CasparCG\n                    '
                  )
                ]
              )
            ])
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "form-group" }, [
            _c("div", { staticClass: "form-check" }, [
              _c("input", {
                directives: [
                  {
                    name: "model",
                    rawName: "v-model.lazy",
                    value: _vm.localValue.showRemoveButton,
                    expression: "localValue.showRemoveButton",
                    modifiers: { lazy: true }
                  }
                ],
                staticClass: "form-check-input",
                attrs: { type: "checkbox", id: "webcgShowRemoveButton" },
                domProps: {
                  checked: Array.isArray(_vm.localValue.showRemoveButton)
                    ? _vm._i(_vm.localValue.showRemoveButton, null) > -1
                    : _vm.localValue.showRemoveButton
                },
                on: {
                  change: function($event) {
                    var $$a = _vm.localValue.showRemoveButton,
                      $$el = $event.target,
                      $$c = $$el.checked ? true : false;
                    if (Array.isArray($$a)) {
                      var $$v = null,
                        $$i = _vm._i($$a, $$v);
                      if ($$el.checked) {
                        $$i < 0 &&
                          _vm.$set(
                            _vm.localValue,
                            "showRemoveButton",
                            $$a.concat([$$v])
                          );
                      } else {
                        $$i > -1 &&
                          _vm.$set(
                            _vm.localValue,
                            "showRemoveButton",
                            $$a.slice(0, $$i).concat($$a.slice($$i + 1))
                          );
                      }
                    } else {
                      _vm.$set(_vm.localValue, "showRemoveButton", $$c);
                    }
                  }
                }
              }),
              _vm._v(" "),
              _c(
                "label",
                {
                  staticClass: "form-check-label",
                  attrs: { for: "webcgShowRemoveButton" }
                },
                [
                  _vm._v(
                    '\n                        Show "Remove" button\n                    '
                  )
                ]
              )
            ])
          ])
        ]),
        _vm._v(" "),
        _c("div", { staticClass: "col-xs-12 col-sm-6" }, [
          _c("h3", [_vm._v("Overlay")]),
          _vm._v(" "),
          _c("div", { staticClass: "form-group" }, [
            _c("label", { attrs: { for: "webcgInputOptionBackgroundColor" } }, [
              _vm._v("Background color")
            ]),
            _vm._v(" "),
            _c("input", {
              directives: [
                {
                  name: "model",
                  rawName: "v-model.lazy",
                  value: _vm.localValue.backgroundColor,
                  expression: "localValue.backgroundColor",
                  modifiers: { lazy: true }
                }
              ],
              staticClass: "form-control",
              attrs: { type: "color", id: "webcgInputOptionBackgroundColor" },
              domProps: { value: _vm.localValue.backgroundColor },
              on: {
                change: function($event) {
                  return _vm.$set(
                    _vm.localValue,
                    "backgroundColor",
                    $event.target.value
                  )
                }
              }
            }),
            _vm._v(" "),
            _c("small", { staticClass: "form-text text-muted" }, [
              _c(
                "a",
                {
                  attrs: { href: "#" },
                  on: {
                    click: function($event) {
                      _vm.localValue.backgroundColor = "#000000";
                    }
                  }
                },
                [_vm._v("Black")]
              ),
              _vm._v(" "),
              _c(
                "a",
                {
                  attrs: { href: "#" },
                  on: {
                    click: function($event) {
                      _vm.localValue.backgroundColor = "#ffffff";
                    }
                  }
                },
                [_vm._v("White")]
              ),
              _vm._v(" "),
              _c(
                "a",
                {
                  attrs: { href: "#" },
                  on: {
                    click: function($event) {
                      _vm.localValue.backgroundColor = "#00ff00";
                    }
                  }
                },
                [_vm._v("Green")]
              ),
              _vm._v(" "),
              _c(
                "a",
                {
                  attrs: { href: "#" },
                  on: {
                    click: function($event) {
                      _vm.localValue.backgroundColor = "rgba(0, 0, 0, 0)";
                    }
                  }
                },
                [_vm._v("Transparent")]
              )
            ])
          ])
        ])
      ])
    ])
  };
  var __vue_staticRenderFns__ = [];
  __vue_render__._withStripped = true;

    /* style */
    var __vue_inject_styles__ = function (inject) {
      if (!inject) { return }
      inject("data-v-7c681579_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", map: {"version":3,"sources":[],"names":[],"mappings":"","file":"tab-settings.vue"}, media: undefined });

    };
    /* scoped */
    var __vue_scope_id__ = "data-v-7c681579";
    /* module identifier */
    var __vue_module_identifier__ = undefined;
    /* functional template */
    var __vue_is_functional_template__ = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    var __vue_component__ = normalizeComponent(
      { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
      __vue_inject_styles__,
      __vue_script__,
      __vue_scope_id__,
      __vue_is_functional_template__,
      __vue_module_identifier__,
      false,
      createInjector,
      undefined,
      undefined
    );

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  var script$1 = {
    name: 'edit-data-table',
    props: ['value'],
    data: function data () {
      return {
        newRecord: {},
        records: this.convertObjectToRecords(this.value)
      }
    },
    created: function created () {
      this.resetNewRecord();
    },
    methods: {
      resetNewRecord: function resetNewRecord () {
        var key = this.getNextKey(this.records);
        this.newRecord = {key: key, value: ''};
        if (this.$refs.newRecordInputKey) {
          this.$refs.newRecordInputKey.focus();
        }
      },
      createRecord: function createRecord () {
        var record = Object.assign({}, this.newRecord);
        this.records.push(record);
        this.resetNewRecord();
        this.emitInput();
      },
      autoCreateRecord: function autoCreateRecord () {
        if (this.newRecord['value']) {
          this.createRecord();
        }
      },
      deleteRecord: function deleteRecord (record) {
        var idx = this.records.indexOf(record);
        this.records.splice(idx, 1);
        this.emitInput();
      },
      updateRecord: function updateRecord () {
        this.emitInput();
      },
      getNextKey: function getNextKey (records) {
        var max = -1;
        for (var i = 0; i < records.length; i++) {
          var record = records[i];
          var match = record.key.match(/^f(\d+)$/);
          if (match) {
            max = Math.max(max, parseInt(match[1]));
          }
        }
        return 'f' + (max + 1)
      },
      emitInput: function emitInput () {
        var obj = this.convertRecordsToObject(this.records);
        this.$emit('input', obj);
      },
      convertRecordsToObject: function convertRecordsToObject (records) {
        var obj = {};
        for (var i = 0; i < records.length; i++) {
          obj[records[i].key] = records[i].value;
        }
        return obj
      },
      convertObjectToRecords: function convertObjectToRecords (obj) {
        var records = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            records.push({key: key, value: obj[key]});
          }
        }
        return records
      }
    }
  };

  /* script */
  var __vue_script__$1 = script$1;

  /* template */
  var __vue_render__$1 = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "div",
      { staticClass: "form-row", staticStyle: { "flex-grow": "1" } },
      [
        _c(
          "div",
          { staticClass: "form-group col", staticStyle: { display: "flex" } },
          [
            _c(
              "table",
              {
                staticClass: "table table-bordered table-hover table-sm",
                staticStyle: { flex: "1" }
              },
              [
                _vm._m(0),
                _vm._v(" "),
                _c(
                  "tbody",
                  [
                    _vm._l(_vm.records, function(record) {
                      return _c("tr", [
                        _c("td", { staticClass: "inline-edit" }, [
                          _c("input", {
                            directives: [
                              {
                                name: "model",
                                rawName: "v-model",
                                value: record["key"],
                                expression: "record['key']"
                              }
                            ],
                            staticClass: "inline-input form-control",
                            attrs: { type: "text" },
                            domProps: { value: record["key"] },
                            on: {
                              change: function($event) {
                                return _vm.updateRecord(record)
                              },
                              input: function($event) {
                                if ($event.target.composing) {
                                  return
                                }
                                _vm.$set(record, "key", $event.target.value);
                              }
                            }
                          })
                        ]),
                        _vm._v(" "),
                        _c("td", { staticClass: "inline-edit" }, [
                          _c("input", {
                            directives: [
                              {
                                name: "model",
                                rawName: "v-model",
                                value: record["value"],
                                expression: "record['value']"
                              }
                            ],
                            staticClass: "inline-input form-control",
                            attrs: { type: "text" },
                            domProps: { value: record["value"] },
                            on: {
                              change: function($event) {
                                return _vm.updateRecord(record)
                              },
                              input: function($event) {
                                if ($event.target.composing) {
                                  return
                                }
                                _vm.$set(record, "value", $event.target.value);
                              }
                            }
                          })
                        ]),
                        _vm._v(" "),
                        _c("td", { staticClass: "inline-buttons" }, [
                          _c(
                            "button",
                            {
                              staticClass: "btn btn-outline-danger btn-sm",
                              on: {
                                click: function($event) {
                                  return _vm.deleteRecord(record)
                                }
                              }
                            },
                            [_vm._v("-")]
                          )
                        ])
                      ])
                    }),
                    _vm._v(" "),
                    _c("tr", [
                      _c("td", { staticClass: "inline-edit" }, [
                        _c("input", {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: _vm.newRecord["key"],
                              expression: "newRecord['key']"
                            }
                          ],
                          ref: "newRecordInputKey",
                          staticClass: "inline-input form-control",
                          attrs: { type: "text" },
                          domProps: { value: _vm.newRecord["key"] },
                          on: {
                            input: function($event) {
                              if ($event.target.composing) {
                                return
                              }
                              _vm.$set(_vm.newRecord, "key", $event.target.value);
                            }
                          }
                        })
                      ]),
                      _vm._v(" "),
                      _c("td", { staticClass: "inline-edit" }, [
                        _c("input", {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: _vm.newRecord["value"],
                              expression: "newRecord['value']"
                            }
                          ],
                          ref: "newRecordInputValue",
                          staticClass: "inline-input form-control",
                          attrs: { type: "text" },
                          domProps: { value: _vm.newRecord["value"] },
                          on: {
                            blur: function($event) {
                              return _vm.autoCreateRecord(_vm.newRecord)
                            },
                            input: function($event) {
                              if ($event.target.composing) {
                                return
                              }
                              _vm.$set(
                                _vm.newRecord,
                                "value",
                                $event.target.value
                              );
                            }
                          }
                        })
                      ]),
                      _vm._v(" "),
                      _c("td", { staticClass: "inline-buttons" }, [
                        _c(
                          "button",
                          {
                            staticClass: "btn btn-outline-success btn-sm",
                            on: {
                              click: function($event) {
                                return _vm.createRecord(_vm.newRecord)
                              }
                            }
                          },
                          [_vm._v("+")]
                        )
                      ])
                    ])
                  ],
                  2
                )
              ]
            )
          ]
        )
      ]
    )
  };
  var __vue_staticRenderFns__$1 = [
    function() {
      var _vm = this;
      var _h = _vm.$createElement;
      var _c = _vm._self._c || _h;
      return _c("thead", [
        _c("tr", [
          _c("th", [_vm._v("Name")]),
          _vm._v(" "),
          _c("th", [_vm._v("Value")]),
          _vm._v(" "),
          _c("th")
        ])
      ])
    }
  ];
  __vue_render__$1._withStripped = true;

    /* style */
    var __vue_inject_styles__$1 = function (inject) {
      if (!inject) { return }
      inject("data-v-78faa343_0", { source: ".webcg-devtools table td.inline-edit {\n  padding: 0;\n}\n.webcg-devtools input.inline-input {\n  background-color: transparent;\n  border-width: 0;\n  margin: 1px;\n  border-radius: 0;\n  height: 100%;\n}\n.webcg-devtools input.inline-input:focus {\n  margin: 0;\n  border-width: 1px;\n}\n\n/*# sourceMappingURL=edit-data-table.vue.map */", map: {"version":3,"sources":["/home/reto/Develop/Upstream/webcg/webcg-devtools/src/components/edit-data-table.vue","edit-data-table.vue"],"names":[],"mappings":"AAuHA;EACA,UAAA;ACtHA;ADyHA;EACA,6BAAA;EACA,eAAA;EACA,WAAA;EACA,gBAAA;EACA,YAAA;ACvHA;ADyHA;EACA,SAAA;EACA,iBAAA;ACvHA;;AAEA,8CAA8C","file":"edit-data-table.vue","sourcesContent":["<template>\n    <div class=\"form-row\" style=\"flex-grow: 1\">\n        <div class=\"form-group col\" style=\"display: flex\">\n            <table class=\"table table-bordered table-hover table-sm\" style=\"flex: 1\">\n                <thead>\n                <tr>\n                    <th>Name</th>\n                    <th>Value</th>\n                    <th></th>\n                </tr>\n                </thead>\n                <tbody>\n                <tr v-for=\"record in records\">\n                    <td class=\"inline-edit\">\n                        <input type=\"text\" class=\"inline-input form-control\"\n                               v-model=\"record['key']\" @change=\"updateRecord(record)\"/></td>\n                    <td class=\"inline-edit\">\n                        <input type=\"text\" class=\"inline-input form-control\"\n                               v-model=\"record['value']\" @change=\"updateRecord(record)\"/></td>\n                    <td class=\"inline-buttons\">\n                        <button class=\"btn btn-outline-danger btn-sm\" @click=\"deleteRecord(record)\">-</button>\n                    </td>\n                </tr>\n                <tr>\n                    <td class=\"inline-edit\">\n                        <input ref=\"newRecordInputKey\" type=\"text\" class=\"inline-input form-control\"\n                               v-model=\"newRecord['key']\">\n                    </td>\n                    <td class=\"inline-edit\">\n                        <input ref=\"newRecordInputValue\" type=\"text\" class=\"inline-input form-control\"\n                               v-model=\"newRecord['value']\" @blur=\"autoCreateRecord(newRecord)\">\n                    </td>\n                    <td class=\"inline-buttons\">\n                        <button class=\"btn btn-outline-success btn-sm\" @click=\"createRecord(newRecord)\">+</button>\n                    </td>\n                </tr>\n                </tbody>\n            </table>\n        </div>\n    </div>\n</template>\n\n<script>\n  export default {\n    name: 'edit-data-table',\n    props: ['value'],\n    data () {\n      return {\n        newRecord: {},\n        records: this.convertObjectToRecords(this.value)\n      }\n    },\n    created () {\n      this.resetNewRecord()\n    },\n    methods: {\n      resetNewRecord () {\n        const key = this.getNextKey(this.records)\n        this.newRecord = {key: key, value: ''}\n        if (this.$refs.newRecordInputKey) {\n          this.$refs.newRecordInputKey.focus()\n        }\n      },\n      createRecord () {\n        const record = Object.assign({}, this.newRecord)\n        this.records.push(record)\n        this.resetNewRecord()\n        this.emitInput()\n      },\n      autoCreateRecord () {\n        if (this.newRecord['value']) {\n          this.createRecord()\n        }\n      },\n      deleteRecord (record) {\n        const idx = this.records.indexOf(record)\n        this.records.splice(idx, 1)\n        this.emitInput()\n      },\n      updateRecord () {\n        this.emitInput()\n      },\n      getNextKey (records) {\n        let max = -1\n        for (let i = 0; i < records.length; i++) {\n          const record = records[i]\n          const match = record.key.match(/^f(\\d+)$/)\n          if (match) {\n            max = Math.max(max, parseInt(match[1]))\n          }\n        }\n        return 'f' + (max + 1)\n      },\n      emitInput () {\n        const obj = this.convertRecordsToObject(this.records)\n        this.$emit('input', obj)\n      },\n      convertRecordsToObject (records) {\n        const obj = {}\n        for (let i = 0; i < records.length; i++) {\n          obj[records[i].key] = records[i].value\n        }\n        return obj\n      },\n      convertObjectToRecords (obj) {\n        const records = []\n        for (let key in obj) {\n          if (obj.hasOwnProperty(key)) {\n            records.push({key, value: obj[key]})\n          }\n        }\n        return records\n      }\n    }\n  }\n</script>\n\n<style lang=\"scss\">\n    .webcg-devtools {\n        table td.inline-edit {\n            padding: 0;\n        }\n\n        input.inline-input {\n            background-color: transparent;\n            border-width: 0;\n            margin: 1px;\n            border-radius: 0;\n            height: 100%;\n\n            &:focus {\n                margin: 0;\n                border-width: 1px;\n            }\n        }\n    }\n</style>\n",".webcg-devtools table td.inline-edit {\n  padding: 0;\n}\n.webcg-devtools input.inline-input {\n  background-color: transparent;\n  border-width: 0;\n  margin: 1px;\n  border-radius: 0;\n  height: 100%;\n}\n.webcg-devtools input.inline-input:focus {\n  margin: 0;\n  border-width: 1px;\n}\n\n/*# sourceMappingURL=edit-data-table.vue.map */"]}, media: undefined });

    };
    /* scoped */
    var __vue_scope_id__$1 = undefined;
    /* module identifier */
    var __vue_module_identifier__$1 = undefined;
    /* functional template */
    var __vue_is_functional_template__$1 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    var __vue_component__$1 = normalizeComponent(
      { render: __vue_render__$1, staticRenderFns: __vue_staticRenderFns__$1 },
      __vue_inject_styles__$1,
      __vue_script__$1,
      __vue_scope_id__$1,
      __vue_is_functional_template__$1,
      __vue_module_identifier__$1,
      false,
      createInjector,
      undefined,
      undefined
    );

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  var script$2 = {
    name: 'edit-data-json',
    props: ['value'],
    data: function data () {
      return {
        errorMessage: null,
        localValue: JSON.stringify(this.value, null, 2)
      }
    },
    watch: {
      localValue: function (val) {
        var obj;
        try {
          obj = JSON.parse(val);
        } catch (error) {
          this.errorMessage = error.message;
          return
        }
        this.errorMessage = null;
        this.$emit('input', obj);
      }
    }
  };

  /* script */
  var __vue_script__$2 = script$2;

  /* template */
  var __vue_render__$2 = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { staticClass: "flex-columns" }, [
      _c(
        "div",
        {
          staticClass: "form-row flex-columns",
          staticStyle: { "flex-grow": "1" }
        },
        [
          _c("div", { staticClass: "form-group col flex-columns" }, [
            _c("textarea", {
              directives: [
                {
                  name: "model",
                  rawName: "v-model.lazy",
                  value: _vm.localValue,
                  expression: "localValue",
                  modifiers: { lazy: true }
                }
              ],
              staticClass: "form-control",
              class: { "is-invalid": _vm.errorMessage },
              staticStyle: { flex: "1", resize: "none" },
              domProps: { value: _vm.localValue },
              on: {
                change: function($event) {
                  _vm.localValue = $event.target.value;
                }
              }
            })
          ])
        ]
      ),
      _vm._v(" "),
      _vm.errorMessage
        ? _c("div", { staticClass: "form-row" }, [
            _c("div", { staticClass: "col" }, [
              _c(
                "div",
                { staticClass: "alert alert-danger", attrs: { role: "alert" } },
                [
                  _vm._v(
                    "\n                " +
                      _vm._s(_vm.errorMessage) +
                      "\n            "
                  )
                ]
              )
            ])
          ])
        : _vm._e()
    ])
  };
  var __vue_staticRenderFns__$2 = [];
  __vue_render__$2._withStripped = true;

    /* style */
    var __vue_inject_styles__$2 = function (inject) {
      if (!inject) { return }
      inject("data-v-582dd205_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", map: {"version":3,"sources":[],"names":[],"mappings":"","file":"edit-data-json.vue"}, media: undefined });

    };
    /* scoped */
    var __vue_scope_id__$2 = "data-v-582dd205";
    /* module identifier */
    var __vue_module_identifier__$2 = undefined;
    /* functional template */
    var __vue_is_functional_template__$2 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    var __vue_component__$2 = normalizeComponent(
      { render: __vue_render__$2, staticRenderFns: __vue_staticRenderFns__$2 },
      __vue_inject_styles__$2,
      __vue_script__$2,
      __vue_scope_id__$2,
      __vue_is_functional_template__$2,
      __vue_module_identifier__$2,
      false,
      createInjector,
      undefined,
      undefined
    );

  //

  var script$3 = {
    name: 'edit-data',
    components: {EditDataTable: __vue_component__$1, EditDataJson: __vue_component__$2},
    props: ['value'],
    data: function data () {
      var componentType = window.localStorage.getItem('webcg-devtools.edit-data.component-type');
      if (['edit-data-table', 'edit-data-json'].indexOf(componentType) < 0) {
        componentType = 'edit-data-table';
      }
      return {
        localValue: this.value,
        componentType: componentType
      }
    },
    watch: {
      localValue: function (val) {
        this.$emit('input', val);
      },
      componentType: function (val) {
        window.localStorage.setItem('webcg-devtools.edit-data.component-type', val);
      }
    },
    methods: {
      update: function update () {
        this.$emit('update', this.localValue);
      }
    }
  };

  /* script */
  var __vue_script__$3 = script$3;

  /* template */
  var __vue_render__$3 = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { staticClass: "flex-columns" }, [
      _c(
        "div",
        {
          staticStyle: {
            "flex-grow": "1",
            display: "flex",
            "flex-direction": "column"
          }
        },
        [
          _c(_vm.componentType, {
            tag: "component",
            model: {
              value: _vm.localValue,
              callback: function($$v) {
                _vm.localValue = $$v;
              },
              expression: "localValue"
            }
          })
        ],
        1
      ),
      _vm._v(" "),
      _c("div", { staticClass: "form-row" }, [
        _c("div", { staticClass: "form-group col" }, [
          _c(
            "div",
            {
              staticClass: "btn-group btn-group-toggle",
              attrs: { "data-toggle": "buttons" }
            },
            [
              _c(
                "label",
                {
                  staticClass: "btn btn-outline-secondary",
                  class: { active: _vm.componentType === "edit-data-table" }
                },
                [
                  _c("input", {
                    directives: [
                      {
                        name: "model",
                        rawName: "v-model",
                        value: _vm.componentType,
                        expression: "componentType"
                      }
                    ],
                    attrs: {
                      type: "radio",
                      name: "view",
                      id: "option2",
                      autocomplete: "off",
                      value: "edit-data-table"
                    },
                    domProps: {
                      checked: _vm._q(_vm.componentType, "edit-data-table")
                    },
                    on: {
                      change: function($event) {
                        _vm.componentType = "edit-data-table";
                      }
                    }
                  }),
                  _vm._v(" Table\n                ")
                ]
              ),
              _vm._v(" "),
              _c(
                "label",
                {
                  staticClass: "btn btn-outline-secondary",
                  class: { active: _vm.componentType === "edit-data-json" }
                },
                [
                  _c("input", {
                    directives: [
                      {
                        name: "model",
                        rawName: "v-model",
                        value: _vm.componentType,
                        expression: "componentType"
                      }
                    ],
                    attrs: {
                      type: "radio",
                      name: "view",
                      id: "option1",
                      autocomplete: "off",
                      value: "edit-data-json"
                    },
                    domProps: {
                      checked: _vm._q(_vm.componentType, "edit-data-json")
                    },
                    on: {
                      change: function($event) {
                        _vm.componentType = "edit-data-json";
                      }
                    }
                  }),
                  _vm._v(" JSON\n                ")
                ]
              )
            ]
          )
        ]),
        _vm._v(" "),
        _c(
          "div",
          {
            staticClass: "form-group col",
            staticStyle: { "text-align": "right" }
          },
          [
            _c(
              "button",
              {
                staticClass: "btn btn-primary",
                attrs: { type: "button" },
                on: {
                  click: function($event) {
                    return _vm.update()
                  }
                }
              },
              [_vm._v("\n                Update\n            ")]
            )
          ]
        )
      ])
    ])
  };
  var __vue_staticRenderFns__$3 = [];
  __vue_render__$3._withStripped = true;

    /* style */
    var __vue_inject_styles__$3 = function (inject) {
      if (!inject) { return }
      inject("data-v-c526b158_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", map: {"version":3,"sources":[],"names":[],"mappings":"","file":"edit-data.vue"}, media: undefined });

    };
    /* scoped */
    var __vue_scope_id__$3 = "data-v-c526b158";
    /* module identifier */
    var __vue_module_identifier__$3 = undefined;
    /* functional template */
    var __vue_is_functional_template__$3 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    var __vue_component__$3 = normalizeComponent(
      { render: __vue_render__$3, staticRenderFns: __vue_staticRenderFns__$3 },
      __vue_inject_styles__$3,
      __vue_script__$3,
      __vue_scope_id__$3,
      __vue_is_functional_template__$3,
      __vue_module_identifier__$3,
      false,
      createInjector,
      undefined,
      undefined
    );

  //

  var script$4 = {
    name: 'tab-tools.vue',
    components: { EditData: __vue_component__$3 },
    props: ['settings'],
    data: function data () {
      return {
        invokeExpr: '',
        invokeErrorMessage: null,
        updateData: {}
      }
    },
    created: function created () {
      this.restoreInputs();
    },
    methods: {
      eval: function eval$1 (expr) {
        if (!expr) { return }
        if (expr.indexOf('(') < 0 && expr.indexOf(')') < 0) {
          expr += '()';
        }
        console.log('[webcg-devtools] calling ' + expr);
        window.eval(expr);
      },
      invoke: function invoke () {
        this.invokeErrorMessage = null;
        this.saveInputs();
        try {
          this.eval(this.invokeExpr || '');
        } catch (ex) {
          // Ignore the exception that is thrown because the function is not defined
          if (ex.name === 'ReferenceError' && /is not defined$/.test(ex.message)) {
            return
          }
          // Display any other error message
          this.invokeErrorMessage = ex.message;
        }
      },
      play: function play () {
        // CasparCG invokes update before the first play command
        if (this.settings.callUpdateBeforePlay && !this.played) {
          this.update(this.updateData);
        }
        this.eval('play');
        this.played = true;
      },
      update: function update (data) {
        this.updateData = data;
        this.saveInputs();
        var stringified = JSON.stringify(this.updateData);
        console.log('[webcg-devtools] calling update ' + stringified);
        // stringify contains a string in this form '{"f0":123}'. but what we want to pass
        // to the update() function has this form '"{\"f0\":123}\"', so we stringify() again.
        window.eval('window[\'update\'](' + JSON.stringify(stringified) + ')');
      },
      saveInputs: function saveInputs () {
        storage.set('invokeExpr', this.invokeExpr || '');
        storage.set('updateData', this.updateData);
      },
      restoreInputs: function restoreInputs () {
        this.invokeExpr = storage.get('invokeExpr', '');
        try {
          this.updateData = storage.get('updateData', JSON.parse(JSON.stringify(window.debugData || {})));
        } catch (err) {
          this.updateData = {};
        }
      }
    }
  };

  /* script */
  var __vue_script__$4 = script$4;

  /* template */
  var __vue_render__$4 = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "div",
      { staticClass: "modal-body" },
      [
        _c("div", { staticClass: "form-row" }, [
          _c("div", { staticClass: "form-group col" }, [
            _c(
              "button",
              {
                staticClass: "btn btn-block btn-primary",
                attrs: { type: "button" },
                on: {
                  click: function($event) {
                    return _vm.play()
                  }
                }
              },
              [_vm._v("\n                Play\n            ")]
            )
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "form-group col" }, [
            _c(
              "button",
              {
                staticClass: "btn btn-block btn-outline-secondary",
                attrs: { type: "button" },
                on: {
                  click: function($event) {
                    return _vm.eval("next")
                  }
                }
              },
              [_vm._v("\n                Next\n            ")]
            )
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "form-group col" }, [
            _c(
              "button",
              {
                staticClass: "btn btn-block btn-outline-secondary",
                attrs: { type: "button" },
                on: {
                  click: function($event) {
                    return _vm.eval("stop")
                  }
                }
              },
              [_vm._v("\n                Stop\n            ")]
            )
          ]),
          _vm._v(" "),
          _vm.settings.showRemoveButton
            ? _c("div", { staticClass: "form-group col" }, [
                _c(
                  "button",
                  {
                    staticClass: "btn btn-block btn-outline-secondary",
                    attrs: { type: "button" },
                    on: {
                      click: function($event) {
                        return _vm.eval("remove")
                      }
                    }
                  },
                  [_vm._v("\n                Remove\n            ")]
                )
              ])
            : _vm._e()
        ]),
        _vm._v(" "),
        _c("div", { staticClass: "form-row" }, [
          _c("div", { staticClass: "form-group col" }, [
            _c("div", { staticClass: "input-group" }, [
              _c("input", {
                directives: [
                  {
                    name: "model",
                    rawName: "v-model",
                    value: _vm.invokeExpr,
                    expression: "invokeExpr"
                  }
                ],
                staticClass: "form-control",
                class: { "is-invalid": _vm.invokeErrorMessage },
                attrs: { type: "text" },
                domProps: { value: _vm.invokeExpr },
                on: {
                  input: function($event) {
                    if ($event.target.composing) {
                      return
                    }
                    _vm.invokeExpr = $event.target.value;
                  }
                }
              }),
              _vm._v(" "),
              _c("div", { staticClass: "input-group-append" }, [
                _c(
                  "button",
                  {
                    staticClass: "btn btn-outline-secondary",
                    attrs: { type: "button" },
                    on: {
                      click: function($event) {
                        return _vm.invoke()
                      }
                    }
                  },
                  [
                    _vm._v(
                      "\n                        Invoke\n                    "
                    )
                  ]
                )
              ])
            ])
          ])
        ]),
        _vm._v(" "),
        _vm.invokeErrorMessage
          ? _c("div", { staticClass: "form-row" }, [
              _c("div", { staticClass: "col" }, [
                _c(
                  "div",
                  { staticClass: "alert alert-danger", attrs: { role: "alert" } },
                  [
                    _vm._v(
                      "\n                " +
                        _vm._s(_vm.invokeErrorMessage) +
                        "\n            "
                    )
                  ]
                )
              ])
            ])
          : _vm._e(),
        _vm._v(" "),
        _c("edit-data", {
          on: { update: _vm.update },
          model: {
            value: _vm.updateData,
            callback: function($$v) {
              _vm.updateData = $$v;
            },
            expression: "updateData"
          }
        })
      ],
      1
    )
  };
  var __vue_staticRenderFns__$4 = [];
  __vue_render__$4._withStripped = true;

    /* style */
    var __vue_inject_styles__$4 = function (inject) {
      if (!inject) { return }
      inject("data-v-2461a266_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", map: {"version":3,"sources":[],"names":[],"mappings":"","file":"tab-tools.vue"}, media: undefined });

    };
    /* scoped */
    var __vue_scope_id__$4 = "data-v-2461a266";
    /* module identifier */
    var __vue_module_identifier__$4 = undefined;
    /* functional template */
    var __vue_is_functional_template__$4 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    var __vue_component__$4 = normalizeComponent(
      { render: __vue_render__$4, staticRenderFns: __vue_staticRenderFns__$4 },
      __vue_inject_styles__$4,
      __vue_script__$4,
      __vue_scope_id__$4,
      __vue_is_functional_template__$4,
      __vue_module_identifier__$4,
      false,
      createInjector,
      undefined,
      undefined
    );

  //

  var script$5 = {
    name: 'webcg-dev-tools',
    components: { TabSettings: __vue_component__, TabTools: __vue_component__$4 },
    data: function data () {
      return {
        tab: 'tools',
        version: version,
        settings: {}
      }
    },
    created: function created () {
      this.loadSettings(this.settings);
      this.applySettings(this.settings);
    },
    mounted: function mounted () {
      var $draggable = this.$el.querySelector('.draggable');
      var $resizable = this.$el.querySelector('.resizable');
      this.restoreDimensions($draggable, $resizable);
      this.$draggable({
        ondragged: this.dragged.bind(this)
      });
      this.$resizable({
        targetNode: $resizable,
        onresized: this.resized.bind(this)
      });
    },
    watch: {
      settings: function (settings) {
        this.applySettings(settings);
        this.saveSettings(settings);
      }
    },
    methods: {
      loadSettings: function loadSettings (settings) {
        settings.callUpdateBeforePlay = storage.get('callUpdateBeforePlay', true);
        settings.showRemoveButton = storage.get('showRemoveButton', false);
        settings.backgroundColor = storage.get('backgroundColor', window.getComputedStyle(document.body, null).getPropertyValue('background-color'));
      },
      saveSettings: function saveSettings (settings) {
        storage.set('callUpdateBeforePlay', settings.callUpdateBeforePlay);
        storage.set('showRemoveButton', settings.showRemoveButton);
        storage.set('backgroundColor', settings.backgroundColor);
      },
      applySettings: function applySettings (settings) {
        document.body.style.backgroundColor = settings.backgroundColor;
      },
      dragged: function dragged ($el) {
        storage.set('offsetTop', $el.offsetTop);
        storage.set('offsetLeft', $el.offsetLeft);
      },
      resized: function resized ($el) {
        storage.set('offsetWidth', $el.offsetWidth);
        storage.set('offsetHeight', $el.offsetHeight);
      },
      restoreDimensions: function restoreDimensions ($draggable, $resizable) {
        var minWidth = 410;
        var defaultWidth = 410;
        var minHeight = 63;
        var defaultHeight = 380;
        $draggable.style.top = Math.max(0, storage.get('offsetTop') || 200) + 'px';
        $draggable.style.left = Math.max(0, storage.get('offsetLeft') || 200) + 'px';
        $resizable.style.width = Math.max(minWidth, storage.get('offsetWidth') || defaultWidth) + 'px';
        $resizable.style.height = Math.max(minHeight, storage.get('offsetHeight') || defaultHeight) + 'px';
      },

    }
  };

  /* script */
  var __vue_script__$5 = script$5;

  /* template */
  var __vue_render__$5 = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { staticClass: "webcg-devtools" }, [
      _c(
        "div",
        {
          staticClass: "modal draggable",
          attrs: { tabindex: "-1", role: "dialog" }
        },
        [
          _c(
            "div",
            { staticClass: "modal-content resizable" },
            [
              _c("div", { staticClass: "modal-header drag-handle" }, [
                _c("h5", { staticClass: "modal-title" }, [
                  _vm._v("WebCG DevTools " + _vm._s(_vm.version))
                ])
              ]),
              _vm._v(" "),
              _c("div", { staticClass: "modal-navbar" }, [
                _c(
                  "ul",
                  {
                    staticClass: "nav nav-tabs",
                    attrs: { id: "myTab", role: "tablist" }
                  },
                  [
                    _c("li", { staticClass: "nav-item" }, [
                      _c(
                        "a",
                        {
                          staticClass: "nav-link",
                          class: { active: _vm.tab === "tools" },
                          attrs: {
                            "data-toggle": "tab",
                            href: "#tools",
                            role: "tab",
                            "aria-controls": "tools",
                            "aria-selected": "true"
                          },
                          on: {
                            click: function($event) {
                              _vm.tab = "tools";
                            }
                          }
                        },
                        [_vm._v("Tools")]
                      )
                    ]),
                    _vm._v(" "),
                    _c("li", { staticClass: "nav-item" }, [
                      _c(
                        "a",
                        {
                          staticClass: "nav-link",
                          class: { active: _vm.tab === "settings" },
                          attrs: {
                            "data-toggle": "tab",
                            href: "#settings",
                            role: "tab",
                            "aria-controls": "settings",
                            "aria-selected": "false"
                          },
                          on: {
                            click: function($event) {
                              _vm.tab = "settings";
                            }
                          }
                        },
                        [_vm._v("Settings")]
                      )
                    ])
                  ]
                )
              ]),
              _vm._v(" "),
              _vm.tab === "tools"
                ? _c("tab-tools", { attrs: { settings: _vm.settings } })
                : _vm._e(),
              _vm._v(" "),
              _vm.tab === "settings"
                ? _c("tab-settings", {
                    model: {
                      value: _vm.settings,
                      callback: function($$v) {
                        _vm.settings = $$v;
                      },
                      expression: "settings"
                    }
                  })
                : _vm._e(),
              _vm._v(" "),
              _vm._m(0)
            ],
            1
          )
        ]
      )
    ])
  };
  var __vue_staticRenderFns__$5 = [
    function() {
      var _vm = this;
      var _h = _vm.$createElement;
      var _c = _vm._self._c || _h;
      return _c("div", { staticClass: "modal-footer" }, [
        _c("a", { attrs: { href: "https://github.com/indr/webcg-devtools" } }, [
          _vm._v("https://github.com/indr/webcg-devtools")
        ])
      ])
    }
  ];
  __vue_render__$5._withStripped = true;

    /* style */
    var __vue_inject_styles__$5 = function (inject) {
      if (!inject) { return }
      inject("data-v-08e0a7a1_0", { source: "@charset \"UTF-8\";\n.webcg-devtools {\n  /*!\n   * Bootstrap v4.4.1 (https://getbootstrap.com/)\n   * Copyright 2011-2019 The Bootstrap Authors\n   * Copyright 2011-2019 Twitter, Inc.\n   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)\n   */\n}\n.webcg-devtools :root {\n  --blue: #007bff;\n  --indigo: #6610f2;\n  --purple: #6f42c1;\n  --pink: #e83e8c;\n  --red: #dc3545;\n  --orange: #fd7e14;\n  --yellow: #ffc107;\n  --green: #28a745;\n  --teal: #20c997;\n  --cyan: #17a2b8;\n  --white: #fff;\n  --gray: #6c757d;\n  --gray-dark: #343a40;\n  --primary: #007bff;\n  --secondary: #6c757d;\n  --success: #28a745;\n  --info: #17a2b8;\n  --warning: #ffc107;\n  --danger: #dc3545;\n  --light: #f8f9fa;\n  --dark: #343a40;\n  --breakpoint-xs: 0;\n  --breakpoint-sm: 576px;\n  --breakpoint-md: 768px;\n  --breakpoint-lg: 992px;\n  --breakpoint-xl: 1200px;\n  --font-family-sans-serif: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  --font-family-monospace: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\n}\n.webcg-devtools *,\n.webcg-devtools *::before,\n.webcg-devtools *::after {\n  box-sizing: border-box;\n}\n.webcg-devtools html {\n  font-family: sans-serif;\n  line-height: 1.15;\n  -webkit-text-size-adjust: 100%;\n  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n}\n.webcg-devtools article, .webcg-devtools aside, .webcg-devtools figcaption, .webcg-devtools figure, .webcg-devtools footer, .webcg-devtools header, .webcg-devtools hgroup, .webcg-devtools main, .webcg-devtools nav, .webcg-devtools section {\n  display: block;\n}\n.webcg-devtools body {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #212529;\n  text-align: left;\n  background-color: #fff;\n}\n.webcg-devtools [tabindex=\"-1\"]:focus:not(:focus-visible) {\n  outline: 0 !important;\n}\n.webcg-devtools hr {\n  box-sizing: content-box;\n  height: 0;\n  overflow: visible;\n}\n.webcg-devtools h1, .webcg-devtools h2, .webcg-devtools h3, .webcg-devtools h4, .webcg-devtools h5, .webcg-devtools h6 {\n  margin-top: 0;\n  margin-bottom: 0.5rem;\n}\n.webcg-devtools p {\n  margin-top: 0;\n  margin-bottom: 1rem;\n}\n.webcg-devtools abbr[title],\n.webcg-devtools abbr[data-original-title] {\n  text-decoration: underline;\n  text-decoration: underline dotted;\n  cursor: help;\n  border-bottom: 0;\n  text-decoration-skip-ink: none;\n}\n.webcg-devtools address {\n  margin-bottom: 1rem;\n  font-style: normal;\n  line-height: inherit;\n}\n.webcg-devtools ol,\n.webcg-devtools ul,\n.webcg-devtools dl {\n  margin-top: 0;\n  margin-bottom: 1rem;\n}\n.webcg-devtools ol ol,\n.webcg-devtools ul ul,\n.webcg-devtools ol ul,\n.webcg-devtools ul ol {\n  margin-bottom: 0;\n}\n.webcg-devtools dt {\n  font-weight: 700;\n}\n.webcg-devtools dd {\n  margin-bottom: 0.5rem;\n  margin-left: 0;\n}\n.webcg-devtools blockquote {\n  margin: 0 0 1rem;\n}\n.webcg-devtools b,\n.webcg-devtools strong {\n  font-weight: bolder;\n}\n.webcg-devtools small {\n  font-size: 80%;\n}\n.webcg-devtools sub,\n.webcg-devtools sup {\n  position: relative;\n  font-size: 75%;\n  line-height: 0;\n  vertical-align: baseline;\n}\n.webcg-devtools sub {\n  bottom: -0.25em;\n}\n.webcg-devtools sup {\n  top: -0.5em;\n}\n.webcg-devtools a {\n  color: #007bff;\n  text-decoration: none;\n  background-color: transparent;\n}\n.webcg-devtools a:hover {\n  color: #0056b3;\n  text-decoration: underline;\n}\n.webcg-devtools a:not([href]) {\n  color: inherit;\n  text-decoration: none;\n}\n.webcg-devtools a:not([href]):hover {\n  color: inherit;\n  text-decoration: none;\n}\n.webcg-devtools pre,\n.webcg-devtools code,\n.webcg-devtools kbd,\n.webcg-devtools samp {\n  font-family: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\n  font-size: 1em;\n}\n.webcg-devtools pre {\n  margin-top: 0;\n  margin-bottom: 1rem;\n  overflow: auto;\n}\n.webcg-devtools figure {\n  margin: 0 0 1rem;\n}\n.webcg-devtools img {\n  vertical-align: middle;\n  border-style: none;\n}\n.webcg-devtools svg {\n  overflow: hidden;\n  vertical-align: middle;\n}\n.webcg-devtools table {\n  border-collapse: collapse;\n}\n.webcg-devtools caption {\n  padding-top: 0.75rem;\n  padding-bottom: 0.75rem;\n  color: #6c757d;\n  text-align: left;\n  caption-side: bottom;\n}\n.webcg-devtools th {\n  text-align: inherit;\n}\n.webcg-devtools label {\n  display: inline-block;\n  margin-bottom: 0.5rem;\n}\n.webcg-devtools button {\n  border-radius: 0;\n}\n.webcg-devtools button:focus {\n  outline: 1px dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n}\n.webcg-devtools input,\n.webcg-devtools button,\n.webcg-devtools select,\n.webcg-devtools optgroup,\n.webcg-devtools textarea {\n  margin: 0;\n  font-family: inherit;\n  font-size: inherit;\n  line-height: inherit;\n}\n.webcg-devtools button,\n.webcg-devtools input {\n  overflow: visible;\n}\n.webcg-devtools button,\n.webcg-devtools select {\n  text-transform: none;\n}\n.webcg-devtools select {\n  word-wrap: normal;\n}\n.webcg-devtools button,\n.webcg-devtools [type=button],\n.webcg-devtools [type=reset],\n.webcg-devtools [type=submit] {\n  -webkit-appearance: button;\n}\n.webcg-devtools button:not(:disabled),\n.webcg-devtools [type=button]:not(:disabled),\n.webcg-devtools [type=reset]:not(:disabled),\n.webcg-devtools [type=submit]:not(:disabled) {\n  cursor: pointer;\n}\n.webcg-devtools button::-moz-focus-inner,\n.webcg-devtools [type=button]::-moz-focus-inner,\n.webcg-devtools [type=reset]::-moz-focus-inner,\n.webcg-devtools [type=submit]::-moz-focus-inner {\n  padding: 0;\n  border-style: none;\n}\n.webcg-devtools input[type=radio],\n.webcg-devtools input[type=checkbox] {\n  box-sizing: border-box;\n  padding: 0;\n}\n.webcg-devtools input[type=date],\n.webcg-devtools input[type=time],\n.webcg-devtools input[type=datetime-local],\n.webcg-devtools input[type=month] {\n  -webkit-appearance: listbox;\n}\n.webcg-devtools textarea {\n  overflow: auto;\n  resize: vertical;\n}\n.webcg-devtools fieldset {\n  min-width: 0;\n  padding: 0;\n  margin: 0;\n  border: 0;\n}\n.webcg-devtools legend {\n  display: block;\n  width: 100%;\n  max-width: 100%;\n  padding: 0;\n  margin-bottom: 0.5rem;\n  font-size: 1.5rem;\n  line-height: inherit;\n  color: inherit;\n  white-space: normal;\n}\n.webcg-devtools progress {\n  vertical-align: baseline;\n}\n.webcg-devtools [type=number]::-webkit-inner-spin-button,\n.webcg-devtools [type=number]::-webkit-outer-spin-button {\n  height: auto;\n}\n.webcg-devtools [type=search] {\n  outline-offset: -2px;\n  -webkit-appearance: none;\n}\n.webcg-devtools [type=search]::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n.webcg-devtools ::-webkit-file-upload-button {\n  font: inherit;\n  -webkit-appearance: button;\n}\n.webcg-devtools output {\n  display: inline-block;\n}\n.webcg-devtools summary {\n  display: list-item;\n  cursor: pointer;\n}\n.webcg-devtools template {\n  display: none;\n}\n.webcg-devtools [hidden] {\n  display: none !important;\n}\n.webcg-devtools h1, .webcg-devtools h2, .webcg-devtools h3, .webcg-devtools h4, .webcg-devtools h5, .webcg-devtools h6,\n.webcg-devtools .h1, .webcg-devtools .h2, .webcg-devtools .h3, .webcg-devtools .h4, .webcg-devtools .h5, .webcg-devtools .h6 {\n  margin-bottom: 0.5rem;\n  font-weight: 500;\n  line-height: 1.2;\n}\n.webcg-devtools h1, .webcg-devtools .h1 {\n  font-size: 2.5rem;\n}\n.webcg-devtools h2, .webcg-devtools .h2 {\n  font-size: 2rem;\n}\n.webcg-devtools h3, .webcg-devtools .h3 {\n  font-size: 1.75rem;\n}\n.webcg-devtools h4, .webcg-devtools .h4 {\n  font-size: 1.5rem;\n}\n.webcg-devtools h5, .webcg-devtools .h5 {\n  font-size: 1.25rem;\n}\n.webcg-devtools h6, .webcg-devtools .h6 {\n  font-size: 1rem;\n}\n.webcg-devtools .lead {\n  font-size: 1.25rem;\n  font-weight: 300;\n}\n.webcg-devtools .display-1 {\n  font-size: 6rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools .display-2 {\n  font-size: 5.5rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools .display-3 {\n  font-size: 4.5rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools .display-4 {\n  font-size: 3.5rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools hr {\n  margin-top: 1rem;\n  margin-bottom: 1rem;\n  border: 0;\n  border-top: 1px solid rgba(0, 0, 0, 0.1);\n}\n.webcg-devtools small,\n.webcg-devtools .small {\n  font-size: 80%;\n  font-weight: 400;\n}\n.webcg-devtools mark,\n.webcg-devtools .mark {\n  padding: 0.2em;\n  background-color: #fcf8e3;\n}\n.webcg-devtools .list-unstyled {\n  padding-left: 0;\n  list-style: none;\n}\n.webcg-devtools .list-inline {\n  padding-left: 0;\n  list-style: none;\n}\n.webcg-devtools .list-inline-item {\n  display: inline-block;\n}\n.webcg-devtools .list-inline-item:not(:last-child) {\n  margin-right: 0.5rem;\n}\n.webcg-devtools .initialism {\n  font-size: 90%;\n  text-transform: uppercase;\n}\n.webcg-devtools .blockquote {\n  margin-bottom: 1rem;\n  font-size: 1.25rem;\n}\n.webcg-devtools .blockquote-footer {\n  display: block;\n  font-size: 80%;\n  color: #6c757d;\n}\n.webcg-devtools .blockquote-footer::before {\n  content: \"— \";\n}\n.webcg-devtools .img-fluid {\n  max-width: 100%;\n  height: auto;\n}\n.webcg-devtools .img-thumbnail {\n  padding: 0.25rem;\n  background-color: #fff;\n  border: 1px solid #dee2e6;\n  border-radius: 0.25rem;\n  max-width: 100%;\n  height: auto;\n}\n.webcg-devtools .figure {\n  display: inline-block;\n}\n.webcg-devtools .figure-img {\n  margin-bottom: 0.5rem;\n  line-height: 1;\n}\n.webcg-devtools .figure-caption {\n  font-size: 90%;\n  color: #6c757d;\n}\n.webcg-devtools code {\n  font-size: 87.5%;\n  color: #e83e8c;\n  word-wrap: break-word;\n}\na > .webcg-devtools code {\n  color: inherit;\n}\n.webcg-devtools kbd {\n  padding: 0.2rem 0.4rem;\n  font-size: 87.5%;\n  color: #fff;\n  background-color: #212529;\n  border-radius: 0.2rem;\n}\n.webcg-devtools kbd kbd {\n  padding: 0;\n  font-size: 100%;\n  font-weight: 700;\n}\n.webcg-devtools pre {\n  display: block;\n  font-size: 87.5%;\n  color: #212529;\n}\n.webcg-devtools pre code {\n  font-size: inherit;\n  color: inherit;\n  word-break: normal;\n}\n.webcg-devtools .pre-scrollable {\n  max-height: 340px;\n  overflow-y: scroll;\n}\n.webcg-devtools .container {\n  width: 100%;\n  padding-right: 15px;\n  padding-left: 15px;\n  margin-right: auto;\n  margin-left: auto;\n}\n@media (min-width: 576px) {\n.webcg-devtools .container {\n    max-width: 540px;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .container {\n    max-width: 720px;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .container {\n    max-width: 960px;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .container {\n    max-width: 1140px;\n}\n}\n.webcg-devtools .container-fluid, .webcg-devtools .container-xl, .webcg-devtools .container-lg, .webcg-devtools .container-md, .webcg-devtools .container-sm {\n  width: 100%;\n  padding-right: 15px;\n  padding-left: 15px;\n  margin-right: auto;\n  margin-left: auto;\n}\n@media (min-width: 576px) {\n.webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 540px;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .container-md, .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 720px;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .container-lg, .webcg-devtools .container-md, .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 960px;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .container-xl, .webcg-devtools .container-lg, .webcg-devtools .container-md, .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 1140px;\n}\n}\n.webcg-devtools .row {\n  display: flex;\n  flex-wrap: wrap;\n  margin-right: -15px;\n  margin-left: -15px;\n}\n.webcg-devtools .no-gutters {\n  margin-right: 0;\n  margin-left: 0;\n}\n.webcg-devtools .no-gutters > .col,\n.webcg-devtools .no-gutters > [class*=col-] {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .col-xl,\n.webcg-devtools .col-xl-auto, .webcg-devtools .col-xl-12, .webcg-devtools .col-xl-11, .webcg-devtools .col-xl-10, .webcg-devtools .col-xl-9, .webcg-devtools .col-xl-8, .webcg-devtools .col-xl-7, .webcg-devtools .col-xl-6, .webcg-devtools .col-xl-5, .webcg-devtools .col-xl-4, .webcg-devtools .col-xl-3, .webcg-devtools .col-xl-2, .webcg-devtools .col-xl-1, .webcg-devtools .col-lg,\n.webcg-devtools .col-lg-auto, .webcg-devtools .col-lg-12, .webcg-devtools .col-lg-11, .webcg-devtools .col-lg-10, .webcg-devtools .col-lg-9, .webcg-devtools .col-lg-8, .webcg-devtools .col-lg-7, .webcg-devtools .col-lg-6, .webcg-devtools .col-lg-5, .webcg-devtools .col-lg-4, .webcg-devtools .col-lg-3, .webcg-devtools .col-lg-2, .webcg-devtools .col-lg-1, .webcg-devtools .col-md,\n.webcg-devtools .col-md-auto, .webcg-devtools .col-md-12, .webcg-devtools .col-md-11, .webcg-devtools .col-md-10, .webcg-devtools .col-md-9, .webcg-devtools .col-md-8, .webcg-devtools .col-md-7, .webcg-devtools .col-md-6, .webcg-devtools .col-md-5, .webcg-devtools .col-md-4, .webcg-devtools .col-md-3, .webcg-devtools .col-md-2, .webcg-devtools .col-md-1, .webcg-devtools .col-sm,\n.webcg-devtools .col-sm-auto, .webcg-devtools .col-sm-12, .webcg-devtools .col-sm-11, .webcg-devtools .col-sm-10, .webcg-devtools .col-sm-9, .webcg-devtools .col-sm-8, .webcg-devtools .col-sm-7, .webcg-devtools .col-sm-6, .webcg-devtools .col-sm-5, .webcg-devtools .col-sm-4, .webcg-devtools .col-sm-3, .webcg-devtools .col-sm-2, .webcg-devtools .col-sm-1, .webcg-devtools .col,\n.webcg-devtools .col-auto, .webcg-devtools .col-12, .webcg-devtools .col-11, .webcg-devtools .col-10, .webcg-devtools .col-9, .webcg-devtools .col-8, .webcg-devtools .col-7, .webcg-devtools .col-6, .webcg-devtools .col-5, .webcg-devtools .col-4, .webcg-devtools .col-3, .webcg-devtools .col-2, .webcg-devtools .col-1 {\n  position: relative;\n  width: 100%;\n  padding-right: 15px;\n  padding-left: 15px;\n}\n.webcg-devtools .col {\n  flex-basis: 0;\n  flex-grow: 1;\n  max-width: 100%;\n}\n.webcg-devtools .row-cols-1 > * {\n  flex: 0 0 100%;\n  max-width: 100%;\n}\n.webcg-devtools .row-cols-2 > * {\n  flex: 0 0 50%;\n  max-width: 50%;\n}\n.webcg-devtools .row-cols-3 > * {\n  flex: 0 0 33.3333333333%;\n  max-width: 33.3333333333%;\n}\n.webcg-devtools .row-cols-4 > * {\n  flex: 0 0 25%;\n  max-width: 25%;\n}\n.webcg-devtools .row-cols-5 > * {\n  flex: 0 0 20%;\n  max-width: 20%;\n}\n.webcg-devtools .row-cols-6 > * {\n  flex: 0 0 16.6666666667%;\n  max-width: 16.6666666667%;\n}\n.webcg-devtools .col-auto {\n  flex: 0 0 auto;\n  width: auto;\n  max-width: 100%;\n}\n.webcg-devtools .col-1 {\n  flex: 0 0 8.3333333333%;\n  max-width: 8.3333333333%;\n}\n.webcg-devtools .col-2 {\n  flex: 0 0 16.6666666667%;\n  max-width: 16.6666666667%;\n}\n.webcg-devtools .col-3 {\n  flex: 0 0 25%;\n  max-width: 25%;\n}\n.webcg-devtools .col-4 {\n  flex: 0 0 33.3333333333%;\n  max-width: 33.3333333333%;\n}\n.webcg-devtools .col-5 {\n  flex: 0 0 41.6666666667%;\n  max-width: 41.6666666667%;\n}\n.webcg-devtools .col-6 {\n  flex: 0 0 50%;\n  max-width: 50%;\n}\n.webcg-devtools .col-7 {\n  flex: 0 0 58.3333333333%;\n  max-width: 58.3333333333%;\n}\n.webcg-devtools .col-8 {\n  flex: 0 0 66.6666666667%;\n  max-width: 66.6666666667%;\n}\n.webcg-devtools .col-9 {\n  flex: 0 0 75%;\n  max-width: 75%;\n}\n.webcg-devtools .col-10 {\n  flex: 0 0 83.3333333333%;\n  max-width: 83.3333333333%;\n}\n.webcg-devtools .col-11 {\n  flex: 0 0 91.6666666667%;\n  max-width: 91.6666666667%;\n}\n.webcg-devtools .col-12 {\n  flex: 0 0 100%;\n  max-width: 100%;\n}\n.webcg-devtools .order-first {\n  order: -1;\n}\n.webcg-devtools .order-last {\n  order: 13;\n}\n.webcg-devtools .order-0 {\n  order: 0;\n}\n.webcg-devtools .order-1 {\n  order: 1;\n}\n.webcg-devtools .order-2 {\n  order: 2;\n}\n.webcg-devtools .order-3 {\n  order: 3;\n}\n.webcg-devtools .order-4 {\n  order: 4;\n}\n.webcg-devtools .order-5 {\n  order: 5;\n}\n.webcg-devtools .order-6 {\n  order: 6;\n}\n.webcg-devtools .order-7 {\n  order: 7;\n}\n.webcg-devtools .order-8 {\n  order: 8;\n}\n.webcg-devtools .order-9 {\n  order: 9;\n}\n.webcg-devtools .order-10 {\n  order: 10;\n}\n.webcg-devtools .order-11 {\n  order: 11;\n}\n.webcg-devtools .order-12 {\n  order: 12;\n}\n.webcg-devtools .offset-1 {\n  margin-left: 8.3333333333%;\n}\n.webcg-devtools .offset-2 {\n  margin-left: 16.6666666667%;\n}\n.webcg-devtools .offset-3 {\n  margin-left: 25%;\n}\n.webcg-devtools .offset-4 {\n  margin-left: 33.3333333333%;\n}\n.webcg-devtools .offset-5 {\n  margin-left: 41.6666666667%;\n}\n.webcg-devtools .offset-6 {\n  margin-left: 50%;\n}\n.webcg-devtools .offset-7 {\n  margin-left: 58.3333333333%;\n}\n.webcg-devtools .offset-8 {\n  margin-left: 66.6666666667%;\n}\n.webcg-devtools .offset-9 {\n  margin-left: 75%;\n}\n.webcg-devtools .offset-10 {\n  margin-left: 83.3333333333%;\n}\n.webcg-devtools .offset-11 {\n  margin-left: 91.6666666667%;\n}\n@media (min-width: 576px) {\n.webcg-devtools .col-sm {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-sm-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-sm-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .row-cols-sm-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .row-cols-sm-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .row-cols-sm-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n}\n.webcg-devtools .row-cols-sm-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-sm-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n}\n.webcg-devtools .col-sm-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n}\n.webcg-devtools .col-sm-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-sm-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .col-sm-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .col-sm-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n}\n.webcg-devtools .col-sm-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .col-sm-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n}\n.webcg-devtools .col-sm-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n}\n.webcg-devtools .col-sm-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n}\n.webcg-devtools .col-sm-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n}\n.webcg-devtools .col-sm-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n}\n.webcg-devtools .col-sm-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .order-sm-first {\n    order: -1;\n}\n.webcg-devtools .order-sm-last {\n    order: 13;\n}\n.webcg-devtools .order-sm-0 {\n    order: 0;\n}\n.webcg-devtools .order-sm-1 {\n    order: 1;\n}\n.webcg-devtools .order-sm-2 {\n    order: 2;\n}\n.webcg-devtools .order-sm-3 {\n    order: 3;\n}\n.webcg-devtools .order-sm-4 {\n    order: 4;\n}\n.webcg-devtools .order-sm-5 {\n    order: 5;\n}\n.webcg-devtools .order-sm-6 {\n    order: 6;\n}\n.webcg-devtools .order-sm-7 {\n    order: 7;\n}\n.webcg-devtools .order-sm-8 {\n    order: 8;\n}\n.webcg-devtools .order-sm-9 {\n    order: 9;\n}\n.webcg-devtools .order-sm-10 {\n    order: 10;\n}\n.webcg-devtools .order-sm-11 {\n    order: 11;\n}\n.webcg-devtools .order-sm-12 {\n    order: 12;\n}\n.webcg-devtools .offset-sm-0 {\n    margin-left: 0;\n}\n.webcg-devtools .offset-sm-1 {\n    margin-left: 8.3333333333%;\n}\n.webcg-devtools .offset-sm-2 {\n    margin-left: 16.6666666667%;\n}\n.webcg-devtools .offset-sm-3 {\n    margin-left: 25%;\n}\n.webcg-devtools .offset-sm-4 {\n    margin-left: 33.3333333333%;\n}\n.webcg-devtools .offset-sm-5 {\n    margin-left: 41.6666666667%;\n}\n.webcg-devtools .offset-sm-6 {\n    margin-left: 50%;\n}\n.webcg-devtools .offset-sm-7 {\n    margin-left: 58.3333333333%;\n}\n.webcg-devtools .offset-sm-8 {\n    margin-left: 66.6666666667%;\n}\n.webcg-devtools .offset-sm-9 {\n    margin-left: 75%;\n}\n.webcg-devtools .offset-sm-10 {\n    margin-left: 83.3333333333%;\n}\n.webcg-devtools .offset-sm-11 {\n    margin-left: 91.6666666667%;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .col-md {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-md-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-md-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .row-cols-md-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .row-cols-md-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .row-cols-md-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n}\n.webcg-devtools .row-cols-md-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-md-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n}\n.webcg-devtools .col-md-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n}\n.webcg-devtools .col-md-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-md-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .col-md-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .col-md-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n}\n.webcg-devtools .col-md-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .col-md-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n}\n.webcg-devtools .col-md-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n}\n.webcg-devtools .col-md-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n}\n.webcg-devtools .col-md-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n}\n.webcg-devtools .col-md-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n}\n.webcg-devtools .col-md-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .order-md-first {\n    order: -1;\n}\n.webcg-devtools .order-md-last {\n    order: 13;\n}\n.webcg-devtools .order-md-0 {\n    order: 0;\n}\n.webcg-devtools .order-md-1 {\n    order: 1;\n}\n.webcg-devtools .order-md-2 {\n    order: 2;\n}\n.webcg-devtools .order-md-3 {\n    order: 3;\n}\n.webcg-devtools .order-md-4 {\n    order: 4;\n}\n.webcg-devtools .order-md-5 {\n    order: 5;\n}\n.webcg-devtools .order-md-6 {\n    order: 6;\n}\n.webcg-devtools .order-md-7 {\n    order: 7;\n}\n.webcg-devtools .order-md-8 {\n    order: 8;\n}\n.webcg-devtools .order-md-9 {\n    order: 9;\n}\n.webcg-devtools .order-md-10 {\n    order: 10;\n}\n.webcg-devtools .order-md-11 {\n    order: 11;\n}\n.webcg-devtools .order-md-12 {\n    order: 12;\n}\n.webcg-devtools .offset-md-0 {\n    margin-left: 0;\n}\n.webcg-devtools .offset-md-1 {\n    margin-left: 8.3333333333%;\n}\n.webcg-devtools .offset-md-2 {\n    margin-left: 16.6666666667%;\n}\n.webcg-devtools .offset-md-3 {\n    margin-left: 25%;\n}\n.webcg-devtools .offset-md-4 {\n    margin-left: 33.3333333333%;\n}\n.webcg-devtools .offset-md-5 {\n    margin-left: 41.6666666667%;\n}\n.webcg-devtools .offset-md-6 {\n    margin-left: 50%;\n}\n.webcg-devtools .offset-md-7 {\n    margin-left: 58.3333333333%;\n}\n.webcg-devtools .offset-md-8 {\n    margin-left: 66.6666666667%;\n}\n.webcg-devtools .offset-md-9 {\n    margin-left: 75%;\n}\n.webcg-devtools .offset-md-10 {\n    margin-left: 83.3333333333%;\n}\n.webcg-devtools .offset-md-11 {\n    margin-left: 91.6666666667%;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .col-lg {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-lg-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-lg-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .row-cols-lg-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .row-cols-lg-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .row-cols-lg-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n}\n.webcg-devtools .row-cols-lg-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-lg-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n}\n.webcg-devtools .col-lg-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n}\n.webcg-devtools .col-lg-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-lg-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .col-lg-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .col-lg-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n}\n.webcg-devtools .col-lg-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .col-lg-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n}\n.webcg-devtools .col-lg-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n}\n.webcg-devtools .col-lg-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n}\n.webcg-devtools .col-lg-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n}\n.webcg-devtools .col-lg-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n}\n.webcg-devtools .col-lg-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .order-lg-first {\n    order: -1;\n}\n.webcg-devtools .order-lg-last {\n    order: 13;\n}\n.webcg-devtools .order-lg-0 {\n    order: 0;\n}\n.webcg-devtools .order-lg-1 {\n    order: 1;\n}\n.webcg-devtools .order-lg-2 {\n    order: 2;\n}\n.webcg-devtools .order-lg-3 {\n    order: 3;\n}\n.webcg-devtools .order-lg-4 {\n    order: 4;\n}\n.webcg-devtools .order-lg-5 {\n    order: 5;\n}\n.webcg-devtools .order-lg-6 {\n    order: 6;\n}\n.webcg-devtools .order-lg-7 {\n    order: 7;\n}\n.webcg-devtools .order-lg-8 {\n    order: 8;\n}\n.webcg-devtools .order-lg-9 {\n    order: 9;\n}\n.webcg-devtools .order-lg-10 {\n    order: 10;\n}\n.webcg-devtools .order-lg-11 {\n    order: 11;\n}\n.webcg-devtools .order-lg-12 {\n    order: 12;\n}\n.webcg-devtools .offset-lg-0 {\n    margin-left: 0;\n}\n.webcg-devtools .offset-lg-1 {\n    margin-left: 8.3333333333%;\n}\n.webcg-devtools .offset-lg-2 {\n    margin-left: 16.6666666667%;\n}\n.webcg-devtools .offset-lg-3 {\n    margin-left: 25%;\n}\n.webcg-devtools .offset-lg-4 {\n    margin-left: 33.3333333333%;\n}\n.webcg-devtools .offset-lg-5 {\n    margin-left: 41.6666666667%;\n}\n.webcg-devtools .offset-lg-6 {\n    margin-left: 50%;\n}\n.webcg-devtools .offset-lg-7 {\n    margin-left: 58.3333333333%;\n}\n.webcg-devtools .offset-lg-8 {\n    margin-left: 66.6666666667%;\n}\n.webcg-devtools .offset-lg-9 {\n    margin-left: 75%;\n}\n.webcg-devtools .offset-lg-10 {\n    margin-left: 83.3333333333%;\n}\n.webcg-devtools .offset-lg-11 {\n    margin-left: 91.6666666667%;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .col-xl {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-xl-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .row-cols-xl-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .row-cols-xl-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .row-cols-xl-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .row-cols-xl-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n}\n.webcg-devtools .row-cols-xl-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-xl-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n}\n.webcg-devtools .col-xl-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n}\n.webcg-devtools .col-xl-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n}\n.webcg-devtools .col-xl-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n}\n.webcg-devtools .col-xl-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n}\n.webcg-devtools .col-xl-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n}\n.webcg-devtools .col-xl-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n}\n.webcg-devtools .col-xl-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n}\n.webcg-devtools .col-xl-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n}\n.webcg-devtools .col-xl-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n}\n.webcg-devtools .col-xl-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n}\n.webcg-devtools .col-xl-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n}\n.webcg-devtools .col-xl-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n}\n.webcg-devtools .order-xl-first {\n    order: -1;\n}\n.webcg-devtools .order-xl-last {\n    order: 13;\n}\n.webcg-devtools .order-xl-0 {\n    order: 0;\n}\n.webcg-devtools .order-xl-1 {\n    order: 1;\n}\n.webcg-devtools .order-xl-2 {\n    order: 2;\n}\n.webcg-devtools .order-xl-3 {\n    order: 3;\n}\n.webcg-devtools .order-xl-4 {\n    order: 4;\n}\n.webcg-devtools .order-xl-5 {\n    order: 5;\n}\n.webcg-devtools .order-xl-6 {\n    order: 6;\n}\n.webcg-devtools .order-xl-7 {\n    order: 7;\n}\n.webcg-devtools .order-xl-8 {\n    order: 8;\n}\n.webcg-devtools .order-xl-9 {\n    order: 9;\n}\n.webcg-devtools .order-xl-10 {\n    order: 10;\n}\n.webcg-devtools .order-xl-11 {\n    order: 11;\n}\n.webcg-devtools .order-xl-12 {\n    order: 12;\n}\n.webcg-devtools .offset-xl-0 {\n    margin-left: 0;\n}\n.webcg-devtools .offset-xl-1 {\n    margin-left: 8.3333333333%;\n}\n.webcg-devtools .offset-xl-2 {\n    margin-left: 16.6666666667%;\n}\n.webcg-devtools .offset-xl-3 {\n    margin-left: 25%;\n}\n.webcg-devtools .offset-xl-4 {\n    margin-left: 33.3333333333%;\n}\n.webcg-devtools .offset-xl-5 {\n    margin-left: 41.6666666667%;\n}\n.webcg-devtools .offset-xl-6 {\n    margin-left: 50%;\n}\n.webcg-devtools .offset-xl-7 {\n    margin-left: 58.3333333333%;\n}\n.webcg-devtools .offset-xl-8 {\n    margin-left: 66.6666666667%;\n}\n.webcg-devtools .offset-xl-9 {\n    margin-left: 75%;\n}\n.webcg-devtools .offset-xl-10 {\n    margin-left: 83.3333333333%;\n}\n.webcg-devtools .offset-xl-11 {\n    margin-left: 91.6666666667%;\n}\n}\n.webcg-devtools .table {\n  width: 100%;\n  margin-bottom: 1rem;\n  color: #212529;\n}\n.webcg-devtools .table th,\n.webcg-devtools .table td {\n  padding: 0.75rem;\n  vertical-align: top;\n  border-top: 1px solid #dee2e6;\n}\n.webcg-devtools .table thead th {\n  vertical-align: bottom;\n  border-bottom: 2px solid #dee2e6;\n}\n.webcg-devtools .table tbody + tbody {\n  border-top: 2px solid #dee2e6;\n}\n.webcg-devtools .table-sm th,\n.webcg-devtools .table-sm td {\n  padding: 0.3rem;\n}\n.webcg-devtools .table-bordered {\n  border: 1px solid #dee2e6;\n}\n.webcg-devtools .table-bordered th,\n.webcg-devtools .table-bordered td {\n  border: 1px solid #dee2e6;\n}\n.webcg-devtools .table-bordered thead th,\n.webcg-devtools .table-bordered thead td {\n  border-bottom-width: 2px;\n}\n.webcg-devtools .table-borderless th,\n.webcg-devtools .table-borderless td,\n.webcg-devtools .table-borderless thead th,\n.webcg-devtools .table-borderless tbody + tbody {\n  border: 0;\n}\n.webcg-devtools .table-striped tbody tr:nth-of-type(odd) {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n.webcg-devtools .table-hover tbody tr:hover {\n  color: #212529;\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table-primary,\n.webcg-devtools .table-primary > th,\n.webcg-devtools .table-primary > td {\n  background-color: #b8daff;\n}\n.webcg-devtools .table-primary th,\n.webcg-devtools .table-primary td,\n.webcg-devtools .table-primary thead th,\n.webcg-devtools .table-primary tbody + tbody {\n  border-color: #7abaff;\n}\n.webcg-devtools .table-hover .table-primary:hover {\n  background-color: #9fcdff;\n}\n.webcg-devtools .table-hover .table-primary:hover > td,\n.webcg-devtools .table-hover .table-primary:hover > th {\n  background-color: #9fcdff;\n}\n.webcg-devtools .table-secondary,\n.webcg-devtools .table-secondary > th,\n.webcg-devtools .table-secondary > td {\n  background-color: #d6d8db;\n}\n.webcg-devtools .table-secondary th,\n.webcg-devtools .table-secondary td,\n.webcg-devtools .table-secondary thead th,\n.webcg-devtools .table-secondary tbody + tbody {\n  border-color: #b3b7bb;\n}\n.webcg-devtools .table-hover .table-secondary:hover {\n  background-color: #c8cbcf;\n}\n.webcg-devtools .table-hover .table-secondary:hover > td,\n.webcg-devtools .table-hover .table-secondary:hover > th {\n  background-color: #c8cbcf;\n}\n.webcg-devtools .table-success,\n.webcg-devtools .table-success > th,\n.webcg-devtools .table-success > td {\n  background-color: #c3e6cb;\n}\n.webcg-devtools .table-success th,\n.webcg-devtools .table-success td,\n.webcg-devtools .table-success thead th,\n.webcg-devtools .table-success tbody + tbody {\n  border-color: #8fd19e;\n}\n.webcg-devtools .table-hover .table-success:hover {\n  background-color: #b1dfbb;\n}\n.webcg-devtools .table-hover .table-success:hover > td,\n.webcg-devtools .table-hover .table-success:hover > th {\n  background-color: #b1dfbb;\n}\n.webcg-devtools .table-info,\n.webcg-devtools .table-info > th,\n.webcg-devtools .table-info > td {\n  background-color: #bee5eb;\n}\n.webcg-devtools .table-info th,\n.webcg-devtools .table-info td,\n.webcg-devtools .table-info thead th,\n.webcg-devtools .table-info tbody + tbody {\n  border-color: #86cfda;\n}\n.webcg-devtools .table-hover .table-info:hover {\n  background-color: #abdde5;\n}\n.webcg-devtools .table-hover .table-info:hover > td,\n.webcg-devtools .table-hover .table-info:hover > th {\n  background-color: #abdde5;\n}\n.webcg-devtools .table-warning,\n.webcg-devtools .table-warning > th,\n.webcg-devtools .table-warning > td {\n  background-color: #ffeeba;\n}\n.webcg-devtools .table-warning th,\n.webcg-devtools .table-warning td,\n.webcg-devtools .table-warning thead th,\n.webcg-devtools .table-warning tbody + tbody {\n  border-color: #ffdf7e;\n}\n.webcg-devtools .table-hover .table-warning:hover {\n  background-color: #ffe8a1;\n}\n.webcg-devtools .table-hover .table-warning:hover > td,\n.webcg-devtools .table-hover .table-warning:hover > th {\n  background-color: #ffe8a1;\n}\n.webcg-devtools .table-danger,\n.webcg-devtools .table-danger > th,\n.webcg-devtools .table-danger > td {\n  background-color: #f5c6cb;\n}\n.webcg-devtools .table-danger th,\n.webcg-devtools .table-danger td,\n.webcg-devtools .table-danger thead th,\n.webcg-devtools .table-danger tbody + tbody {\n  border-color: #ed969e;\n}\n.webcg-devtools .table-hover .table-danger:hover {\n  background-color: #f1b0b7;\n}\n.webcg-devtools .table-hover .table-danger:hover > td,\n.webcg-devtools .table-hover .table-danger:hover > th {\n  background-color: #f1b0b7;\n}\n.webcg-devtools .table-light,\n.webcg-devtools .table-light > th,\n.webcg-devtools .table-light > td {\n  background-color: #fdfdfe;\n}\n.webcg-devtools .table-light th,\n.webcg-devtools .table-light td,\n.webcg-devtools .table-light thead th,\n.webcg-devtools .table-light tbody + tbody {\n  border-color: #fbfcfc;\n}\n.webcg-devtools .table-hover .table-light:hover {\n  background-color: #ececf6;\n}\n.webcg-devtools .table-hover .table-light:hover > td,\n.webcg-devtools .table-hover .table-light:hover > th {\n  background-color: #ececf6;\n}\n.webcg-devtools .table-dark,\n.webcg-devtools .table-dark > th,\n.webcg-devtools .table-dark > td {\n  background-color: #c6c8ca;\n}\n.webcg-devtools .table-dark th,\n.webcg-devtools .table-dark td,\n.webcg-devtools .table-dark thead th,\n.webcg-devtools .table-dark tbody + tbody {\n  border-color: #95999c;\n}\n.webcg-devtools .table-hover .table-dark:hover {\n  background-color: #b9bbbe;\n}\n.webcg-devtools .table-hover .table-dark:hover > td,\n.webcg-devtools .table-hover .table-dark:hover > th {\n  background-color: #b9bbbe;\n}\n.webcg-devtools .table-active,\n.webcg-devtools .table-active > th,\n.webcg-devtools .table-active > td {\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table-hover .table-active:hover {\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table-hover .table-active:hover > td,\n.webcg-devtools .table-hover .table-active:hover > th {\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table .thead-dark th {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #454d55;\n}\n.webcg-devtools .table .thead-light th {\n  color: #495057;\n  background-color: #e9ecef;\n  border-color: #dee2e6;\n}\n.webcg-devtools .table-dark {\n  color: #fff;\n  background-color: #343a40;\n}\n.webcg-devtools .table-dark th,\n.webcg-devtools .table-dark td,\n.webcg-devtools .table-dark thead th {\n  border-color: #454d55;\n}\n.webcg-devtools .table-dark.table-bordered {\n  border: 0;\n}\n.webcg-devtools .table-dark.table-striped tbody tr:nth-of-type(odd) {\n  background-color: rgba(255, 255, 255, 0.05);\n}\n.webcg-devtools .table-dark.table-hover tbody tr:hover {\n  color: #fff;\n  background-color: rgba(255, 255, 255, 0.075);\n}\n@media (max-width: 575.98px) {\n.webcg-devtools .table-responsive-sm {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n}\n.webcg-devtools .table-responsive-sm > .table-bordered {\n    border: 0;\n}\n}\n@media (max-width: 767.98px) {\n.webcg-devtools .table-responsive-md {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n}\n.webcg-devtools .table-responsive-md > .table-bordered {\n    border: 0;\n}\n}\n@media (max-width: 991.98px) {\n.webcg-devtools .table-responsive-lg {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n}\n.webcg-devtools .table-responsive-lg > .table-bordered {\n    border: 0;\n}\n}\n@media (max-width: 1199.98px) {\n.webcg-devtools .table-responsive-xl {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n}\n.webcg-devtools .table-responsive-xl > .table-bordered {\n    border: 0;\n}\n}\n.webcg-devtools .table-responsive {\n  display: block;\n  width: 100%;\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n}\n.webcg-devtools .table-responsive > .table-bordered {\n  border: 0;\n}\n.webcg-devtools .form-control {\n  display: block;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  padding: 0.375rem 0.75rem;\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .form-control {\n    transition: none;\n}\n}\n.webcg-devtools .form-control::-ms-expand {\n  background-color: transparent;\n  border: 0;\n}\n.webcg-devtools .form-control:-moz-focusring {\n  color: transparent;\n  text-shadow: 0 0 0 #495057;\n}\n.webcg-devtools .form-control:focus {\n  color: #495057;\n  background-color: #fff;\n  border-color: #80bdff;\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .form-control::placeholder {\n  color: #6c757d;\n  opacity: 1;\n}\n.webcg-devtools .form-control:disabled, .webcg-devtools .form-control[readonly] {\n  background-color: #e9ecef;\n  opacity: 1;\n}\n.webcg-devtools select.form-control:focus::-ms-value {\n  color: #495057;\n  background-color: #fff;\n}\n.webcg-devtools .form-control-file,\n.webcg-devtools .form-control-range {\n  display: block;\n  width: 100%;\n}\n.webcg-devtools .col-form-label {\n  padding-top: calc(0.375rem + 1px);\n  padding-bottom: calc(0.375rem + 1px);\n  margin-bottom: 0;\n  font-size: inherit;\n  line-height: 1.5;\n}\n.webcg-devtools .col-form-label-lg {\n  padding-top: calc(0.5rem + 1px);\n  padding-bottom: calc(0.5rem + 1px);\n  font-size: 1.25rem;\n  line-height: 1.5;\n}\n.webcg-devtools .col-form-label-sm {\n  padding-top: calc(0.25rem + 1px);\n  padding-bottom: calc(0.25rem + 1px);\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n.webcg-devtools .form-control-plaintext {\n  display: block;\n  width: 100%;\n  padding: 0.375rem 0;\n  margin-bottom: 0;\n  font-size: 1rem;\n  line-height: 1.5;\n  color: #212529;\n  background-color: transparent;\n  border: solid transparent;\n  border-width: 1px 0;\n}\n.webcg-devtools .form-control-plaintext.form-control-sm, .webcg-devtools .form-control-plaintext.form-control-lg {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .form-control-sm {\n  height: calc(1.5em + 0.5rem + 2px);\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  border-radius: 0.2rem;\n}\n.webcg-devtools .form-control-lg {\n  height: calc(1.5em + 1rem + 2px);\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n  border-radius: 0.3rem;\n}\n.webcg-devtools select.form-control[size], .webcg-devtools select.form-control[multiple] {\n  height: auto;\n}\n.webcg-devtools textarea.form-control {\n  height: auto;\n}\n.webcg-devtools .form-group {\n  margin-bottom: 1rem;\n}\n.webcg-devtools .form-text {\n  display: block;\n  margin-top: 0.25rem;\n}\n.webcg-devtools .form-row {\n  display: flex;\n  flex-wrap: wrap;\n  margin-right: -5px;\n  margin-left: -5px;\n}\n.webcg-devtools .form-row > .col,\n.webcg-devtools .form-row > [class*=col-] {\n  padding-right: 5px;\n  padding-left: 5px;\n}\n.webcg-devtools .form-check {\n  position: relative;\n  display: block;\n  padding-left: 1.25rem;\n}\n.webcg-devtools .form-check-input {\n  position: absolute;\n  margin-top: 0.3rem;\n  margin-left: -1.25rem;\n}\n.webcg-devtools .form-check-input[disabled] ~ .form-check-label, .webcg-devtools .form-check-input:disabled ~ .form-check-label {\n  color: #6c757d;\n}\n.webcg-devtools .form-check-label {\n  margin-bottom: 0;\n}\n.webcg-devtools .form-check-inline {\n  display: inline-flex;\n  align-items: center;\n  padding-left: 0;\n  margin-right: 0.75rem;\n}\n.webcg-devtools .form-check-inline .form-check-input {\n  position: static;\n  margin-top: 0;\n  margin-right: 0.3125rem;\n  margin-left: 0;\n}\n.webcg-devtools .valid-feedback {\n  display: none;\n  width: 100%;\n  margin-top: 0.25rem;\n  font-size: 80%;\n  color: #28a745;\n}\n.webcg-devtools .valid-tooltip {\n  position: absolute;\n  top: 100%;\n  z-index: 5;\n  display: none;\n  max-width: 100%;\n  padding: 0.25rem 0.5rem;\n  margin-top: 0.1rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: #fff;\n  background-color: rgba(40, 167, 69, 0.9);\n  border-radius: 0.25rem;\n}\n.was-validated .webcg-devtools:valid ~ .valid-feedback,\n.was-validated .webcg-devtools:valid ~ .valid-tooltip, .webcg-devtools.is-valid ~ .valid-feedback,\n.webcg-devtools.is-valid ~ .valid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .form-control:valid, .webcg-devtools .form-control.is-valid {\n  border-color: #28a745;\n  padding-right: calc(1.5em + 0.75rem);\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e\");\n  background-repeat: no-repeat;\n  background-position: right calc(0.375em + 0.1875rem) center;\n  background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .form-control:valid:focus, .webcg-devtools .form-control.is-valid:focus {\n  border-color: #28a745;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.was-validated .webcg-devtools textarea.form-control:valid, .webcg-devtools textarea.form-control.is-valid {\n  padding-right: calc(1.5em + 0.75rem);\n  background-position: top calc(0.375em + 0.1875rem) right calc(0.375em + 0.1875rem);\n}\n.was-validated .webcg-devtools .custom-select:valid, .webcg-devtools .custom-select.is-valid {\n  border-color: #28a745;\n  padding-right: calc(0.75em + 2.3125rem);\n  background: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\") no-repeat right 0.75rem center/8px 10px, url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e\") #fff no-repeat center right 1.75rem/calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .custom-select:valid:focus, .webcg-devtools .custom-select.is-valid:focus {\n  border-color: #28a745;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.was-validated .webcg-devtools .form-check-input:valid ~ .form-check-label, .webcg-devtools .form-check-input.is-valid ~ .form-check-label {\n  color: #28a745;\n}\n.was-validated .webcg-devtools .form-check-input:valid ~ .valid-feedback,\n.was-validated .webcg-devtools .form-check-input:valid ~ .valid-tooltip, .webcg-devtools .form-check-input.is-valid ~ .valid-feedback,\n.webcg-devtools .form-check-input.is-valid ~ .valid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .custom-control-input:valid ~ .custom-control-label, .webcg-devtools .custom-control-input.is-valid ~ .custom-control-label {\n  color: #28a745;\n}\n.was-validated .webcg-devtools .custom-control-input:valid ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid ~ .custom-control-label::before {\n  border-color: #28a745;\n}\n.was-validated .webcg-devtools .custom-control-input:valid:checked ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid:checked ~ .custom-control-label::before {\n  border-color: #34ce57;\n  background-color: #34ce57;\n}\n.was-validated .webcg-devtools .custom-control-input:valid:focus ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid:focus ~ .custom-control-label::before {\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.was-validated .webcg-devtools .custom-control-input:valid:focus:not(:checked) ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid:focus:not(:checked) ~ .custom-control-label::before {\n  border-color: #28a745;\n}\n.was-validated .webcg-devtools .custom-file-input:valid ~ .custom-file-label, .webcg-devtools .custom-file-input.is-valid ~ .custom-file-label {\n  border-color: #28a745;\n}\n.was-validated .webcg-devtools .custom-file-input:valid:focus ~ .custom-file-label, .webcg-devtools .custom-file-input.is-valid:focus ~ .custom-file-label {\n  border-color: #28a745;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.webcg-devtools .invalid-feedback {\n  display: none;\n  width: 100%;\n  margin-top: 0.25rem;\n  font-size: 80%;\n  color: #dc3545;\n}\n.webcg-devtools .invalid-tooltip {\n  position: absolute;\n  top: 100%;\n  z-index: 5;\n  display: none;\n  max-width: 100%;\n  padding: 0.25rem 0.5rem;\n  margin-top: 0.1rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: #fff;\n  background-color: rgba(220, 53, 69, 0.9);\n  border-radius: 0.25rem;\n}\n.was-validated .webcg-devtools:invalid ~ .invalid-feedback,\n.was-validated .webcg-devtools:invalid ~ .invalid-tooltip, .webcg-devtools.is-invalid ~ .invalid-feedback,\n.webcg-devtools.is-invalid ~ .invalid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .form-control:invalid, .webcg-devtools .form-control.is-invalid {\n  border-color: #dc3545;\n  padding-right: calc(1.5em + 0.75rem);\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e\");\n  background-repeat: no-repeat;\n  background-position: right calc(0.375em + 0.1875rem) center;\n  background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .form-control:invalid:focus, .webcg-devtools .form-control.is-invalid:focus {\n  border-color: #dc3545;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.was-validated .webcg-devtools textarea.form-control:invalid, .webcg-devtools textarea.form-control.is-invalid {\n  padding-right: calc(1.5em + 0.75rem);\n  background-position: top calc(0.375em + 0.1875rem) right calc(0.375em + 0.1875rem);\n}\n.was-validated .webcg-devtools .custom-select:invalid, .webcg-devtools .custom-select.is-invalid {\n  border-color: #dc3545;\n  padding-right: calc(0.75em + 2.3125rem);\n  background: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\") no-repeat right 0.75rem center/8px 10px, url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e\") #fff no-repeat center right 1.75rem/calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .custom-select:invalid:focus, .webcg-devtools .custom-select.is-invalid:focus {\n  border-color: #dc3545;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.was-validated .webcg-devtools .form-check-input:invalid ~ .form-check-label, .webcg-devtools .form-check-input.is-invalid ~ .form-check-label {\n  color: #dc3545;\n}\n.was-validated .webcg-devtools .form-check-input:invalid ~ .invalid-feedback,\n.was-validated .webcg-devtools .form-check-input:invalid ~ .invalid-tooltip, .webcg-devtools .form-check-input.is-invalid ~ .invalid-feedback,\n.webcg-devtools .form-check-input.is-invalid ~ .invalid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid ~ .custom-control-label, .webcg-devtools .custom-control-input.is-invalid ~ .custom-control-label {\n  color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid ~ .custom-control-label::before {\n  border-color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid:checked ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid:checked ~ .custom-control-label::before {\n  border-color: #e4606d;\n  background-color: #e4606d;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid:focus ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid:focus ~ .custom-control-label::before {\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.was-validated .webcg-devtools .custom-control-input:invalid:focus:not(:checked) ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid:focus:not(:checked) ~ .custom-control-label::before {\n  border-color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-file-input:invalid ~ .custom-file-label, .webcg-devtools .custom-file-input.is-invalid ~ .custom-file-label {\n  border-color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-file-input:invalid:focus ~ .custom-file-label, .webcg-devtools .custom-file-input.is-invalid:focus ~ .custom-file-label {\n  border-color: #dc3545;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.webcg-devtools .form-inline {\n  display: flex;\n  flex-flow: row wrap;\n  align-items: center;\n}\n.webcg-devtools .form-inline .form-check {\n  width: 100%;\n}\n@media (min-width: 576px) {\n.webcg-devtools .form-inline label {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    margin-bottom: 0;\n}\n.webcg-devtools .form-inline .form-group {\n    display: flex;\n    flex: 0 0 auto;\n    flex-flow: row wrap;\n    align-items: center;\n    margin-bottom: 0;\n}\n.webcg-devtools .form-inline .form-control {\n    display: inline-block;\n    width: auto;\n    vertical-align: middle;\n}\n.webcg-devtools .form-inline .form-control-plaintext {\n    display: inline-block;\n}\n.webcg-devtools .form-inline .input-group,\n.webcg-devtools .form-inline .custom-select {\n    width: auto;\n}\n.webcg-devtools .form-inline .form-check {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    width: auto;\n    padding-left: 0;\n}\n.webcg-devtools .form-inline .form-check-input {\n    position: relative;\n    flex-shrink: 0;\n    margin-top: 0;\n    margin-right: 0.25rem;\n    margin-left: 0;\n}\n.webcg-devtools .form-inline .custom-control {\n    align-items: center;\n    justify-content: center;\n}\n.webcg-devtools .form-inline .custom-control-label {\n    margin-bottom: 0;\n}\n}\n.webcg-devtools .btn {\n  display: inline-block;\n  font-weight: 400;\n  color: #212529;\n  text-align: center;\n  vertical-align: middle;\n  cursor: pointer;\n  user-select: none;\n  background-color: transparent;\n  border: 1px solid transparent;\n  padding: 0.375rem 0.75rem;\n  font-size: 1rem;\n  line-height: 1.5;\n  border-radius: 0.25rem;\n  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .btn {\n    transition: none;\n}\n}\n.webcg-devtools .btn:hover {\n  color: #212529;\n  text-decoration: none;\n}\n.webcg-devtools .btn:focus, .webcg-devtools .btn.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .btn.disabled, .webcg-devtools .btn:disabled {\n  opacity: 0.65;\n}\n.webcg-devtools a.btn.disabled,\n.webcg-devtools fieldset:disabled a.btn {\n  pointer-events: none;\n}\n.webcg-devtools .btn-primary {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-primary:hover {\n  color: #fff;\n  background-color: #0069d9;\n  border-color: #0062cc;\n}\n.webcg-devtools .btn-primary:focus, .webcg-devtools .btn-primary.focus {\n  color: #fff;\n  background-color: #0069d9;\n  border-color: #0062cc;\n  box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5);\n}\n.webcg-devtools .btn-primary.disabled, .webcg-devtools .btn-primary:disabled {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-primary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-primary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-primary.dropdown-toggle {\n  color: #fff;\n  background-color: #0062cc;\n  border-color: #005cbf;\n}\n.webcg-devtools .btn-primary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-primary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-primary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5);\n}\n.webcg-devtools .btn-secondary {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-secondary:hover {\n  color: #fff;\n  background-color: #5a6268;\n  border-color: #545b62;\n}\n.webcg-devtools .btn-secondary:focus, .webcg-devtools .btn-secondary.focus {\n  color: #fff;\n  background-color: #5a6268;\n  border-color: #545b62;\n  box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5);\n}\n.webcg-devtools .btn-secondary.disabled, .webcg-devtools .btn-secondary:disabled {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-secondary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-secondary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-secondary.dropdown-toggle {\n  color: #fff;\n  background-color: #545b62;\n  border-color: #4e555b;\n}\n.webcg-devtools .btn-secondary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-secondary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-secondary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5);\n}\n.webcg-devtools .btn-success {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-success:hover {\n  color: #fff;\n  background-color: #218838;\n  border-color: #1e7e34;\n}\n.webcg-devtools .btn-success:focus, .webcg-devtools .btn-success.focus {\n  color: #fff;\n  background-color: #218838;\n  border-color: #1e7e34;\n  box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5);\n}\n.webcg-devtools .btn-success.disabled, .webcg-devtools .btn-success:disabled {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-success:not(:disabled):not(.disabled):active, .webcg-devtools .btn-success:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-success.dropdown-toggle {\n  color: #fff;\n  background-color: #1e7e34;\n  border-color: #1c7430;\n}\n.webcg-devtools .btn-success:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-success:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-success.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5);\n}\n.webcg-devtools .btn-info {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-info:hover {\n  color: #fff;\n  background-color: #138496;\n  border-color: #117a8b;\n}\n.webcg-devtools .btn-info:focus, .webcg-devtools .btn-info.focus {\n  color: #fff;\n  background-color: #138496;\n  border-color: #117a8b;\n  box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5);\n}\n.webcg-devtools .btn-info.disabled, .webcg-devtools .btn-info:disabled {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-info:not(:disabled):not(.disabled):active, .webcg-devtools .btn-info:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-info.dropdown-toggle {\n  color: #fff;\n  background-color: #117a8b;\n  border-color: #10707f;\n}\n.webcg-devtools .btn-info:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-info:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-info.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5);\n}\n.webcg-devtools .btn-warning {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-warning:hover {\n  color: #212529;\n  background-color: #e0a800;\n  border-color: #d39e00;\n}\n.webcg-devtools .btn-warning:focus, .webcg-devtools .btn-warning.focus {\n  color: #212529;\n  background-color: #e0a800;\n  border-color: #d39e00;\n  box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5);\n}\n.webcg-devtools .btn-warning.disabled, .webcg-devtools .btn-warning:disabled {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-warning:not(:disabled):not(.disabled):active, .webcg-devtools .btn-warning:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-warning.dropdown-toggle {\n  color: #212529;\n  background-color: #d39e00;\n  border-color: #c69500;\n}\n.webcg-devtools .btn-warning:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-warning:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-warning.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5);\n}\n.webcg-devtools .btn-danger {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-danger:hover {\n  color: #fff;\n  background-color: #c82333;\n  border-color: #bd2130;\n}\n.webcg-devtools .btn-danger:focus, .webcg-devtools .btn-danger.focus {\n  color: #fff;\n  background-color: #c82333;\n  border-color: #bd2130;\n  box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5);\n}\n.webcg-devtools .btn-danger.disabled, .webcg-devtools .btn-danger:disabled {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-danger:not(:disabled):not(.disabled):active, .webcg-devtools .btn-danger:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-danger.dropdown-toggle {\n  color: #fff;\n  background-color: #bd2130;\n  border-color: #b21f2d;\n}\n.webcg-devtools .btn-danger:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-danger:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-danger.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5);\n}\n.webcg-devtools .btn-light {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-light:hover {\n  color: #212529;\n  background-color: #e2e6ea;\n  border-color: #dae0e5;\n}\n.webcg-devtools .btn-light:focus, .webcg-devtools .btn-light.focus {\n  color: #212529;\n  background-color: #e2e6ea;\n  border-color: #dae0e5;\n  box-shadow: 0 0 0 0.2rem rgba(216, 217, 219, 0.5);\n}\n.webcg-devtools .btn-light.disabled, .webcg-devtools .btn-light:disabled {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-light:not(:disabled):not(.disabled):active, .webcg-devtools .btn-light:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-light.dropdown-toggle {\n  color: #212529;\n  background-color: #dae0e5;\n  border-color: #d3d9df;\n}\n.webcg-devtools .btn-light:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-light:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-light.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(216, 217, 219, 0.5);\n}\n.webcg-devtools .btn-dark {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-dark:hover {\n  color: #fff;\n  background-color: #23272b;\n  border-color: #1d2124;\n}\n.webcg-devtools .btn-dark:focus, .webcg-devtools .btn-dark.focus {\n  color: #fff;\n  background-color: #23272b;\n  border-color: #1d2124;\n  box-shadow: 0 0 0 0.2rem rgba(82, 88, 93, 0.5);\n}\n.webcg-devtools .btn-dark.disabled, .webcg-devtools .btn-dark:disabled {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-dark:not(:disabled):not(.disabled):active, .webcg-devtools .btn-dark:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-dark.dropdown-toggle {\n  color: #fff;\n  background-color: #1d2124;\n  border-color: #171a1d;\n}\n.webcg-devtools .btn-dark:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-dark:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-dark.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(82, 88, 93, 0.5);\n}\n.webcg-devtools .btn-outline-primary {\n  color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-outline-primary:hover {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-outline-primary:focus, .webcg-devtools .btn-outline-primary.focus {\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .btn-outline-primary.disabled, .webcg-devtools .btn-outline-primary:disabled {\n  color: #007bff;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-primary.dropdown-toggle {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-primary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .btn-outline-secondary {\n  color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-outline-secondary:hover {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-outline-secondary:focus, .webcg-devtools .btn-outline-secondary.focus {\n  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);\n}\n.webcg-devtools .btn-outline-secondary.disabled, .webcg-devtools .btn-outline-secondary:disabled {\n  color: #6c757d;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-secondary.dropdown-toggle {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-secondary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);\n}\n.webcg-devtools .btn-outline-success {\n  color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-outline-success:hover {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-outline-success:focus, .webcg-devtools .btn-outline-success.focus {\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);\n}\n.webcg-devtools .btn-outline-success.disabled, .webcg-devtools .btn-outline-success:disabled {\n  color: #28a745;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-success:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-success:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-success.dropdown-toggle {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-outline-success:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-success:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-success.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);\n}\n.webcg-devtools .btn-outline-info {\n  color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-outline-info:hover {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-outline-info:focus, .webcg-devtools .btn-outline-info.focus {\n  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);\n}\n.webcg-devtools .btn-outline-info.disabled, .webcg-devtools .btn-outline-info:disabled {\n  color: #17a2b8;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-info:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-info:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-info.dropdown-toggle {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-outline-info:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-info:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-info.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);\n}\n.webcg-devtools .btn-outline-warning {\n  color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-outline-warning:hover {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-outline-warning:focus, .webcg-devtools .btn-outline-warning.focus {\n  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);\n}\n.webcg-devtools .btn-outline-warning.disabled, .webcg-devtools .btn-outline-warning:disabled {\n  color: #ffc107;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-warning.dropdown-toggle {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-warning.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);\n}\n.webcg-devtools .btn-outline-danger {\n  color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-outline-danger:hover {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-outline-danger:focus, .webcg-devtools .btn-outline-danger.focus {\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);\n}\n.webcg-devtools .btn-outline-danger.disabled, .webcg-devtools .btn-outline-danger:disabled {\n  color: #dc3545;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-danger.dropdown-toggle {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-danger.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);\n}\n.webcg-devtools .btn-outline-light {\n  color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-outline-light:hover {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-outline-light:focus, .webcg-devtools .btn-outline-light.focus {\n  box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5);\n}\n.webcg-devtools .btn-outline-light.disabled, .webcg-devtools .btn-outline-light:disabled {\n  color: #f8f9fa;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-light:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-light:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-light.dropdown-toggle {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-outline-light:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-light:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-light.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5);\n}\n.webcg-devtools .btn-outline-dark {\n  color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-outline-dark:hover {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-outline-dark:focus, .webcg-devtools .btn-outline-dark.focus {\n  box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5);\n}\n.webcg-devtools .btn-outline-dark.disabled, .webcg-devtools .btn-outline-dark:disabled {\n  color: #343a40;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-dark.dropdown-toggle {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-dark.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5);\n}\n.webcg-devtools .btn-link {\n  font-weight: 400;\n  color: #007bff;\n  text-decoration: none;\n}\n.webcg-devtools .btn-link:hover {\n  color: #0056b3;\n  text-decoration: underline;\n}\n.webcg-devtools .btn-link:focus, .webcg-devtools .btn-link.focus {\n  text-decoration: underline;\n  box-shadow: none;\n}\n.webcg-devtools .btn-link:disabled, .webcg-devtools .btn-link.disabled {\n  color: #6c757d;\n  pointer-events: none;\n}\n.webcg-devtools .btn-lg, .webcg-devtools .btn-group-lg > .btn {\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n  border-radius: 0.3rem;\n}\n.webcg-devtools .btn-sm, .webcg-devtools .btn-group-sm > .btn {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  border-radius: 0.2rem;\n}\n.webcg-devtools .btn-block {\n  display: block;\n  width: 100%;\n}\n.webcg-devtools .btn-block + .btn-block {\n  margin-top: 0.5rem;\n}\n.webcg-devtools input[type=submit].btn-block,\n.webcg-devtools input[type=reset].btn-block,\n.webcg-devtools input[type=button].btn-block {\n  width: 100%;\n}\n.webcg-devtools .fade {\n  transition: opacity 0.15s linear;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .fade {\n    transition: none;\n}\n}\n.webcg-devtools .fade:not(.show) {\n  opacity: 0;\n}\n.webcg-devtools .collapse:not(.show) {\n  display: none;\n}\n.webcg-devtools .collapsing {\n  position: relative;\n  height: 0;\n  overflow: hidden;\n  transition: height 0.35s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .collapsing {\n    transition: none;\n}\n}\n.webcg-devtools .dropup,\n.webcg-devtools .dropright,\n.webcg-devtools .dropdown,\n.webcg-devtools .dropleft {\n  position: relative;\n}\n.webcg-devtools .dropdown-toggle {\n  white-space: nowrap;\n}\n.webcg-devtools .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0.3em solid;\n  border-right: 0.3em solid transparent;\n  border-bottom: 0;\n  border-left: 0.3em solid transparent;\n}\n.webcg-devtools .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropdown-menu {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  z-index: 1000;\n  display: none;\n  float: left;\n  min-width: 10rem;\n  padding: 0.5rem 0;\n  margin: 0.125rem 0 0;\n  font-size: 1rem;\n  color: #212529;\n  text-align: left;\n  list-style: none;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.15);\n  border-radius: 0.25rem;\n}\n.webcg-devtools .dropdown-menu-left {\n  right: auto;\n  left: 0;\n}\n.webcg-devtools .dropdown-menu-right {\n  right: 0;\n  left: auto;\n}\n@media (min-width: 576px) {\n.webcg-devtools .dropdown-menu-sm-left {\n    right: auto;\n    left: 0;\n}\n.webcg-devtools .dropdown-menu-sm-right {\n    right: 0;\n    left: auto;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .dropdown-menu-md-left {\n    right: auto;\n    left: 0;\n}\n.webcg-devtools .dropdown-menu-md-right {\n    right: 0;\n    left: auto;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .dropdown-menu-lg-left {\n    right: auto;\n    left: 0;\n}\n.webcg-devtools .dropdown-menu-lg-right {\n    right: 0;\n    left: auto;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .dropdown-menu-xl-left {\n    right: auto;\n    left: 0;\n}\n.webcg-devtools .dropdown-menu-xl-right {\n    right: 0;\n    left: auto;\n}\n}\n.webcg-devtools .dropup .dropdown-menu {\n  top: auto;\n  bottom: 100%;\n  margin-top: 0;\n  margin-bottom: 0.125rem;\n}\n.webcg-devtools .dropup .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0;\n  border-right: 0.3em solid transparent;\n  border-bottom: 0.3em solid;\n  border-left: 0.3em solid transparent;\n}\n.webcg-devtools .dropup .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropright .dropdown-menu {\n  top: 0;\n  right: auto;\n  left: 100%;\n  margin-top: 0;\n  margin-left: 0.125rem;\n}\n.webcg-devtools .dropright .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0.3em solid transparent;\n  border-right: 0;\n  border-bottom: 0.3em solid transparent;\n  border-left: 0.3em solid;\n}\n.webcg-devtools .dropright .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropright .dropdown-toggle::after {\n  vertical-align: 0;\n}\n.webcg-devtools .dropleft .dropdown-menu {\n  top: 0;\n  right: 100%;\n  left: auto;\n  margin-top: 0;\n  margin-right: 0.125rem;\n}\n.webcg-devtools .dropleft .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n}\n.webcg-devtools .dropleft .dropdown-toggle::after {\n  display: none;\n}\n.webcg-devtools .dropleft .dropdown-toggle::before {\n  display: inline-block;\n  margin-right: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0.3em solid transparent;\n  border-right: 0.3em solid;\n  border-bottom: 0.3em solid transparent;\n}\n.webcg-devtools .dropleft .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropleft .dropdown-toggle::before {\n  vertical-align: 0;\n}\n.webcg-devtools .dropdown-menu[x-placement^=top], .webcg-devtools .dropdown-menu[x-placement^=right], .webcg-devtools .dropdown-menu[x-placement^=bottom], .webcg-devtools .dropdown-menu[x-placement^=left] {\n  right: auto;\n  bottom: auto;\n}\n.webcg-devtools .dropdown-divider {\n  height: 0;\n  margin: 0.5rem 0;\n  overflow: hidden;\n  border-top: 1px solid #e9ecef;\n}\n.webcg-devtools .dropdown-item {\n  display: block;\n  width: 100%;\n  padding: 0.25rem 1.5rem;\n  clear: both;\n  font-weight: 400;\n  color: #212529;\n  text-align: inherit;\n  white-space: nowrap;\n  background-color: transparent;\n  border: 0;\n}\n.webcg-devtools .dropdown-item:hover, .webcg-devtools .dropdown-item:focus {\n  color: #16181b;\n  text-decoration: none;\n  background-color: #f8f9fa;\n}\n.webcg-devtools .dropdown-item.active, .webcg-devtools .dropdown-item:active {\n  color: #fff;\n  text-decoration: none;\n  background-color: #007bff;\n}\n.webcg-devtools .dropdown-item.disabled, .webcg-devtools .dropdown-item:disabled {\n  color: #6c757d;\n  pointer-events: none;\n  background-color: transparent;\n}\n.webcg-devtools .dropdown-menu.show {\n  display: block;\n}\n.webcg-devtools .dropdown-header {\n  display: block;\n  padding: 0.5rem 1.5rem;\n  margin-bottom: 0;\n  font-size: 0.875rem;\n  color: #6c757d;\n  white-space: nowrap;\n}\n.webcg-devtools .dropdown-item-text {\n  display: block;\n  padding: 0.25rem 1.5rem;\n  color: #212529;\n}\n.webcg-devtools .btn-group,\n.webcg-devtools .btn-group-vertical {\n  position: relative;\n  display: inline-flex;\n  vertical-align: middle;\n}\n.webcg-devtools .btn-group > .btn,\n.webcg-devtools .btn-group-vertical > .btn {\n  position: relative;\n  flex: 1 1 auto;\n}\n.webcg-devtools .btn-group > .btn:hover,\n.webcg-devtools .btn-group-vertical > .btn:hover {\n  z-index: 1;\n}\n.webcg-devtools .btn-group > .btn:focus, .webcg-devtools .btn-group > .btn:active, .webcg-devtools .btn-group > .btn.active,\n.webcg-devtools .btn-group-vertical > .btn:focus,\n.webcg-devtools .btn-group-vertical > .btn:active,\n.webcg-devtools .btn-group-vertical > .btn.active {\n  z-index: 1;\n}\n.webcg-devtools .btn-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-start;\n}\n.webcg-devtools .btn-toolbar .input-group {\n  width: auto;\n}\n.webcg-devtools .btn-group > .btn:not(:first-child),\n.webcg-devtools .btn-group > .btn-group:not(:first-child) {\n  margin-left: -1px;\n}\n.webcg-devtools .btn-group > .btn:not(:last-child):not(.dropdown-toggle),\n.webcg-devtools .btn-group > .btn-group:not(:last-child) > .btn {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .btn-group > .btn:not(:first-child),\n.webcg-devtools .btn-group > .btn-group:not(:first-child) > .btn {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .dropdown-toggle-split {\n  padding-right: 0.5625rem;\n  padding-left: 0.5625rem;\n}\n.webcg-devtools .dropdown-toggle-split::after, .dropup .webcg-devtools .dropdown-toggle-split::after, .dropright .webcg-devtools .dropdown-toggle-split::after {\n  margin-left: 0;\n}\n.dropleft .webcg-devtools .dropdown-toggle-split::before {\n  margin-right: 0;\n}\n.webcg-devtools .btn-sm + .dropdown-toggle-split, .webcg-devtools .btn-group-sm > .btn + .dropdown-toggle-split {\n  padding-right: 0.375rem;\n  padding-left: 0.375rem;\n}\n.webcg-devtools .btn-lg + .dropdown-toggle-split, .webcg-devtools .btn-group-lg > .btn + .dropdown-toggle-split {\n  padding-right: 0.75rem;\n  padding-left: 0.75rem;\n}\n.webcg-devtools .btn-group-vertical {\n  flex-direction: column;\n  align-items: flex-start;\n  justify-content: center;\n}\n.webcg-devtools .btn-group-vertical > .btn,\n.webcg-devtools .btn-group-vertical > .btn-group {\n  width: 100%;\n}\n.webcg-devtools .btn-group-vertical > .btn:not(:first-child),\n.webcg-devtools .btn-group-vertical > .btn-group:not(:first-child) {\n  margin-top: -1px;\n}\n.webcg-devtools .btn-group-vertical > .btn:not(:last-child):not(.dropdown-toggle),\n.webcg-devtools .btn-group-vertical > .btn-group:not(:last-child) > .btn {\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .btn-group-vertical > .btn:not(:first-child),\n.webcg-devtools .btn-group-vertical > .btn-group:not(:first-child) > .btn {\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .btn-group-toggle > .btn,\n.webcg-devtools .btn-group-toggle > .btn-group > .btn {\n  margin-bottom: 0;\n}\n.webcg-devtools .btn-group-toggle > .btn input[type=radio],\n.webcg-devtools .btn-group-toggle > .btn input[type=checkbox],\n.webcg-devtools .btn-group-toggle > .btn-group > .btn input[type=radio],\n.webcg-devtools .btn-group-toggle > .btn-group > .btn input[type=checkbox] {\n  position: absolute;\n  clip: rect(0, 0, 0, 0);\n  pointer-events: none;\n}\n.webcg-devtools .input-group {\n  position: relative;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: stretch;\n  width: 100%;\n}\n.webcg-devtools .input-group > .form-control,\n.webcg-devtools .input-group > .form-control-plaintext,\n.webcg-devtools .input-group > .custom-select,\n.webcg-devtools .input-group > .custom-file {\n  position: relative;\n  flex: 1 1 0%;\n  min-width: 0;\n  margin-bottom: 0;\n}\n.webcg-devtools .input-group > .form-control + .form-control,\n.webcg-devtools .input-group > .form-control + .custom-select,\n.webcg-devtools .input-group > .form-control + .custom-file,\n.webcg-devtools .input-group > .form-control-plaintext + .form-control,\n.webcg-devtools .input-group > .form-control-plaintext + .custom-select,\n.webcg-devtools .input-group > .form-control-plaintext + .custom-file,\n.webcg-devtools .input-group > .custom-select + .form-control,\n.webcg-devtools .input-group > .custom-select + .custom-select,\n.webcg-devtools .input-group > .custom-select + .custom-file,\n.webcg-devtools .input-group > .custom-file + .form-control,\n.webcg-devtools .input-group > .custom-file + .custom-select,\n.webcg-devtools .input-group > .custom-file + .custom-file {\n  margin-left: -1px;\n}\n.webcg-devtools .input-group > .form-control:focus,\n.webcg-devtools .input-group > .custom-select:focus,\n.webcg-devtools .input-group > .custom-file .custom-file-input:focus ~ .custom-file-label {\n  z-index: 3;\n}\n.webcg-devtools .input-group > .custom-file .custom-file-input:focus {\n  z-index: 4;\n}\n.webcg-devtools .input-group > .form-control:not(:last-child),\n.webcg-devtools .input-group > .custom-select:not(:last-child) {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .input-group > .form-control:not(:first-child),\n.webcg-devtools .input-group > .custom-select:not(:first-child) {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .input-group > .custom-file {\n  display: flex;\n  align-items: center;\n}\n.webcg-devtools .input-group > .custom-file:not(:last-child) .custom-file-label, .webcg-devtools .input-group > .custom-file:not(:last-child) .custom-file-label::after {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .input-group > .custom-file:not(:first-child) .custom-file-label {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .input-group-prepend,\n.webcg-devtools .input-group-append {\n  display: flex;\n}\n.webcg-devtools .input-group-prepend .btn,\n.webcg-devtools .input-group-append .btn {\n  position: relative;\n  z-index: 2;\n}\n.webcg-devtools .input-group-prepend .btn:focus,\n.webcg-devtools .input-group-append .btn:focus {\n  z-index: 3;\n}\n.webcg-devtools .input-group-prepend .btn + .btn,\n.webcg-devtools .input-group-prepend .btn + .input-group-text,\n.webcg-devtools .input-group-prepend .input-group-text + .input-group-text,\n.webcg-devtools .input-group-prepend .input-group-text + .btn,\n.webcg-devtools .input-group-append .btn + .btn,\n.webcg-devtools .input-group-append .btn + .input-group-text,\n.webcg-devtools .input-group-append .input-group-text + .input-group-text,\n.webcg-devtools .input-group-append .input-group-text + .btn {\n  margin-left: -1px;\n}\n.webcg-devtools .input-group-prepend {\n  margin-right: -1px;\n}\n.webcg-devtools .input-group-append {\n  margin-left: -1px;\n}\n.webcg-devtools .input-group-text {\n  display: flex;\n  align-items: center;\n  padding: 0.375rem 0.75rem;\n  margin-bottom: 0;\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  text-align: center;\n  white-space: nowrap;\n  background-color: #e9ecef;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .input-group-text input[type=radio],\n.webcg-devtools .input-group-text input[type=checkbox] {\n  margin-top: 0;\n}\n.webcg-devtools .input-group-lg > .form-control:not(textarea),\n.webcg-devtools .input-group-lg > .custom-select {\n  height: calc(1.5em + 1rem + 2px);\n}\n.webcg-devtools .input-group-lg > .form-control,\n.webcg-devtools .input-group-lg > .custom-select,\n.webcg-devtools .input-group-lg > .input-group-prepend > .input-group-text,\n.webcg-devtools .input-group-lg > .input-group-append > .input-group-text,\n.webcg-devtools .input-group-lg > .input-group-prepend > .btn,\n.webcg-devtools .input-group-lg > .input-group-append > .btn {\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n  border-radius: 0.3rem;\n}\n.webcg-devtools .input-group-sm > .form-control:not(textarea),\n.webcg-devtools .input-group-sm > .custom-select {\n  height: calc(1.5em + 0.5rem + 2px);\n}\n.webcg-devtools .input-group-sm > .form-control,\n.webcg-devtools .input-group-sm > .custom-select,\n.webcg-devtools .input-group-sm > .input-group-prepend > .input-group-text,\n.webcg-devtools .input-group-sm > .input-group-append > .input-group-text,\n.webcg-devtools .input-group-sm > .input-group-prepend > .btn,\n.webcg-devtools .input-group-sm > .input-group-append > .btn {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  border-radius: 0.2rem;\n}\n.webcg-devtools .input-group-lg > .custom-select,\n.webcg-devtools .input-group-sm > .custom-select {\n  padding-right: 1.75rem;\n}\n.webcg-devtools .input-group > .input-group-prepend > .btn,\n.webcg-devtools .input-group > .input-group-prepend > .input-group-text,\n.webcg-devtools .input-group > .input-group-append:not(:last-child) > .btn,\n.webcg-devtools .input-group > .input-group-append:not(:last-child) > .input-group-text,\n.webcg-devtools .input-group > .input-group-append:last-child > .btn:not(:last-child):not(.dropdown-toggle),\n.webcg-devtools .input-group > .input-group-append:last-child > .input-group-text:not(:last-child) {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .input-group > .input-group-append > .btn,\n.webcg-devtools .input-group > .input-group-append > .input-group-text,\n.webcg-devtools .input-group > .input-group-prepend:not(:first-child) > .btn,\n.webcg-devtools .input-group > .input-group-prepend:not(:first-child) > .input-group-text,\n.webcg-devtools .input-group > .input-group-prepend:first-child > .btn:not(:first-child),\n.webcg-devtools .input-group > .input-group-prepend:first-child > .input-group-text:not(:first-child) {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .custom-control {\n  position: relative;\n  display: block;\n  min-height: 1.5rem;\n  padding-left: 1.5rem;\n}\n.webcg-devtools .custom-control-inline {\n  display: inline-flex;\n  margin-right: 1rem;\n}\n.webcg-devtools .custom-control-input {\n  position: absolute;\n  left: 0;\n  z-index: -1;\n  width: 1rem;\n  height: 1.25rem;\n  opacity: 0;\n}\n.webcg-devtools .custom-control-input:checked ~ .custom-control-label::before {\n  color: #fff;\n  border-color: #007bff;\n  background-color: #007bff;\n}\n.webcg-devtools .custom-control-input:focus ~ .custom-control-label::before {\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-control-input:focus:not(:checked) ~ .custom-control-label::before {\n  border-color: #80bdff;\n}\n.webcg-devtools .custom-control-input:not(:disabled):active ~ .custom-control-label::before {\n  color: #fff;\n  background-color: #b3d7ff;\n  border-color: #b3d7ff;\n}\n.webcg-devtools .custom-control-input[disabled] ~ .custom-control-label, .webcg-devtools .custom-control-input:disabled ~ .custom-control-label {\n  color: #6c757d;\n}\n.webcg-devtools .custom-control-input[disabled] ~ .custom-control-label::before, .webcg-devtools .custom-control-input:disabled ~ .custom-control-label::before {\n  background-color: #e9ecef;\n}\n.webcg-devtools .custom-control-label {\n  position: relative;\n  margin-bottom: 0;\n  vertical-align: top;\n}\n.webcg-devtools .custom-control-label::before {\n  position: absolute;\n  top: 0.25rem;\n  left: -1.5rem;\n  display: block;\n  width: 1rem;\n  height: 1rem;\n  pointer-events: none;\n  content: \"\";\n  background-color: #fff;\n  border: #adb5bd solid 1px;\n}\n.webcg-devtools .custom-control-label::after {\n  position: absolute;\n  top: 0.25rem;\n  left: -1.5rem;\n  display: block;\n  width: 1rem;\n  height: 1rem;\n  content: \"\";\n  background: no-repeat 50%/50% 50%;\n}\n.webcg-devtools .custom-checkbox .custom-control-label::before {\n  border-radius: 0.25rem;\n}\n.webcg-devtools .custom-checkbox .custom-control-input:checked ~ .custom-control-label::after {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .custom-checkbox .custom-control-input:indeterminate ~ .custom-control-label::before {\n  border-color: #007bff;\n  background-color: #007bff;\n}\n.webcg-devtools .custom-checkbox .custom-control-input:indeterminate ~ .custom-control-label::after {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3e%3cpath stroke='%23fff' d='M0 2h4'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .custom-checkbox .custom-control-input:disabled:checked ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-checkbox .custom-control-input:disabled:indeterminate ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-radio .custom-control-label::before {\n  border-radius: 50%;\n}\n.webcg-devtools .custom-radio .custom-control-input:checked ~ .custom-control-label::after {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .custom-radio .custom-control-input:disabled:checked ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-switch {\n  padding-left: 2.25rem;\n}\n.webcg-devtools .custom-switch .custom-control-label::before {\n  left: -2.25rem;\n  width: 1.75rem;\n  pointer-events: all;\n  border-radius: 0.5rem;\n}\n.webcg-devtools .custom-switch .custom-control-label::after {\n  top: calc(0.25rem + 2px);\n  left: calc(-2.25rem + 2px);\n  width: calc(1rem - 4px);\n  height: calc(1rem - 4px);\n  background-color: #adb5bd;\n  border-radius: 0.5rem;\n  transition: transform 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .custom-switch .custom-control-label::after {\n    transition: none;\n}\n}\n.webcg-devtools .custom-switch .custom-control-input:checked ~ .custom-control-label::after {\n  background-color: #fff;\n  transform: translateX(0.75rem);\n}\n.webcg-devtools .custom-switch .custom-control-input:disabled:checked ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-select {\n  display: inline-block;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  padding: 0.375rem 1.75rem 0.375rem 0.75rem;\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  vertical-align: middle;\n  background: #fff url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\") no-repeat right 0.75rem center/8px 10px;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n  appearance: none;\n}\n.webcg-devtools .custom-select:focus {\n  border-color: #80bdff;\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-select:focus::-ms-value {\n  color: #495057;\n  background-color: #fff;\n}\n.webcg-devtools .custom-select[multiple], .webcg-devtools .custom-select[size]:not([size=\"1\"]) {\n  height: auto;\n  padding-right: 0.75rem;\n  background-image: none;\n}\n.webcg-devtools .custom-select:disabled {\n  color: #6c757d;\n  background-color: #e9ecef;\n}\n.webcg-devtools .custom-select::-ms-expand {\n  display: none;\n}\n.webcg-devtools .custom-select:-moz-focusring {\n  color: transparent;\n  text-shadow: 0 0 0 #495057;\n}\n.webcg-devtools .custom-select-sm {\n  height: calc(1.5em + 0.5rem + 2px);\n  padding-top: 0.25rem;\n  padding-bottom: 0.25rem;\n  padding-left: 0.5rem;\n  font-size: 0.875rem;\n}\n.webcg-devtools .custom-select-lg {\n  height: calc(1.5em + 1rem + 2px);\n  padding-top: 0.5rem;\n  padding-bottom: 0.5rem;\n  padding-left: 1rem;\n  font-size: 1.25rem;\n}\n.webcg-devtools .custom-file {\n  position: relative;\n  display: inline-block;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  margin-bottom: 0;\n}\n.webcg-devtools .custom-file-input {\n  position: relative;\n  z-index: 2;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  margin: 0;\n  opacity: 0;\n}\n.webcg-devtools .custom-file-input:focus ~ .custom-file-label {\n  border-color: #80bdff;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-file-input[disabled] ~ .custom-file-label, .webcg-devtools .custom-file-input:disabled ~ .custom-file-label {\n  background-color: #e9ecef;\n}\n.webcg-devtools .custom-file-input:lang(en) ~ .custom-file-label::after {\n  content: \"Browse\";\n}\n.webcg-devtools .custom-file-input ~ .custom-file-label[data-browse]::after {\n  content: attr(data-browse);\n}\n.webcg-devtools .custom-file-label {\n  position: absolute;\n  top: 0;\n  right: 0;\n  left: 0;\n  z-index: 1;\n  height: calc(1.5em + 0.75rem + 2px);\n  padding: 0.375rem 0.75rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  background-color: #fff;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .custom-file-label::after {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 3;\n  display: block;\n  height: calc(1.5em + 0.75rem);\n  padding: 0.375rem 0.75rem;\n  line-height: 1.5;\n  color: #495057;\n  content: \"Browse\";\n  background-color: #e9ecef;\n  border-left: inherit;\n  border-radius: 0 0.25rem 0.25rem 0;\n}\n.webcg-devtools .custom-range {\n  width: 100%;\n  height: 1.4rem;\n  padding: 0;\n  background-color: transparent;\n  appearance: none;\n}\n.webcg-devtools .custom-range:focus {\n  outline: none;\n}\n.webcg-devtools .custom-range:focus::-webkit-slider-thumb {\n  box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-range:focus::-moz-range-thumb {\n  box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-range:focus::-ms-thumb {\n  box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-range::-moz-focus-outer {\n  border: 0;\n}\n.webcg-devtools .custom-range::-webkit-slider-thumb {\n  width: 1rem;\n  height: 1rem;\n  margin-top: -0.25rem;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 1rem;\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n  appearance: none;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .custom-range::-webkit-slider-thumb {\n    transition: none;\n}\n}\n.webcg-devtools .custom-range::-webkit-slider-thumb:active {\n  background-color: #b3d7ff;\n}\n.webcg-devtools .custom-range::-webkit-slider-runnable-track {\n  width: 100%;\n  height: 0.5rem;\n  color: transparent;\n  cursor: pointer;\n  background-color: #dee2e6;\n  border-color: transparent;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range::-moz-range-thumb {\n  width: 1rem;\n  height: 1rem;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 1rem;\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n  appearance: none;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .custom-range::-moz-range-thumb {\n    transition: none;\n}\n}\n.webcg-devtools .custom-range::-moz-range-thumb:active {\n  background-color: #b3d7ff;\n}\n.webcg-devtools .custom-range::-moz-range-track {\n  width: 100%;\n  height: 0.5rem;\n  color: transparent;\n  cursor: pointer;\n  background-color: #dee2e6;\n  border-color: transparent;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range::-ms-thumb {\n  width: 1rem;\n  height: 1rem;\n  margin-top: 0;\n  margin-right: 0.2rem;\n  margin-left: 0.2rem;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 1rem;\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n  appearance: none;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .custom-range::-ms-thumb {\n    transition: none;\n}\n}\n.webcg-devtools .custom-range::-ms-thumb:active {\n  background-color: #b3d7ff;\n}\n.webcg-devtools .custom-range::-ms-track {\n  width: 100%;\n  height: 0.5rem;\n  color: transparent;\n  cursor: pointer;\n  background-color: transparent;\n  border-color: transparent;\n  border-width: 0.5rem;\n}\n.webcg-devtools .custom-range::-ms-fill-lower {\n  background-color: #dee2e6;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range::-ms-fill-upper {\n  margin-right: 15px;\n  background-color: #dee2e6;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range:disabled::-webkit-slider-thumb {\n  background-color: #adb5bd;\n}\n.webcg-devtools .custom-range:disabled::-webkit-slider-runnable-track {\n  cursor: default;\n}\n.webcg-devtools .custom-range:disabled::-moz-range-thumb {\n  background-color: #adb5bd;\n}\n.webcg-devtools .custom-range:disabled::-moz-range-track {\n  cursor: default;\n}\n.webcg-devtools .custom-range:disabled::-ms-thumb {\n  background-color: #adb5bd;\n}\n.webcg-devtools .custom-control-label::before,\n.webcg-devtools .custom-file-label,\n.webcg-devtools .custom-select {\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .custom-control-label::before,\n.webcg-devtools .custom-file-label,\n.webcg-devtools .custom-select {\n    transition: none;\n}\n}\n.webcg-devtools .nav {\n  display: flex;\n  flex-wrap: wrap;\n  padding-left: 0;\n  margin-bottom: 0;\n  list-style: none;\n}\n.webcg-devtools .nav-link {\n  display: block;\n  padding: 0.5rem 1rem;\n}\n.webcg-devtools .nav-link:hover, .webcg-devtools .nav-link:focus {\n  text-decoration: none;\n}\n.webcg-devtools .nav-link.disabled {\n  color: #6c757d;\n  pointer-events: none;\n  cursor: default;\n}\n.webcg-devtools .nav-tabs {\n  border-bottom: 1px solid #dee2e6;\n}\n.webcg-devtools .nav-tabs .nav-item {\n  margin-bottom: -1px;\n}\n.webcg-devtools .nav-tabs .nav-link {\n  border: 1px solid transparent;\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.webcg-devtools .nav-tabs .nav-link:hover, .webcg-devtools .nav-tabs .nav-link:focus {\n  border-color: #e9ecef #e9ecef #dee2e6;\n}\n.webcg-devtools .nav-tabs .nav-link.disabled {\n  color: #6c757d;\n  background-color: transparent;\n  border-color: transparent;\n}\n.webcg-devtools .nav-tabs .nav-link.active,\n.webcg-devtools .nav-tabs .nav-item.show .nav-link {\n  color: #495057;\n  background-color: #fff;\n  border-color: #dee2e6 #dee2e6 #fff;\n}\n.webcg-devtools .nav-tabs .dropdown-menu {\n  margin-top: -1px;\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .nav-pills .nav-link {\n  border-radius: 0.25rem;\n}\n.webcg-devtools .nav-pills .nav-link.active,\n.webcg-devtools .nav-pills .show > .nav-link {\n  color: #fff;\n  background-color: #007bff;\n}\n.webcg-devtools .nav-fill .nav-item {\n  flex: 1 1 auto;\n  text-align: center;\n}\n.webcg-devtools .nav-justified .nav-item {\n  flex-basis: 0;\n  flex-grow: 1;\n  text-align: center;\n}\n.webcg-devtools .tab-content > .tab-pane {\n  display: none;\n}\n.webcg-devtools .tab-content > .active {\n  display: block;\n}\n.webcg-devtools .navbar {\n  position: relative;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.5rem 1rem;\n}\n.webcg-devtools .navbar .container,\n.webcg-devtools .navbar .container-fluid,\n.webcg-devtools .navbar .container-sm,\n.webcg-devtools .navbar .container-md,\n.webcg-devtools .navbar .container-lg,\n.webcg-devtools .navbar .container-xl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n}\n.webcg-devtools .navbar-brand {\n  display: inline-block;\n  padding-top: 0.3125rem;\n  padding-bottom: 0.3125rem;\n  margin-right: 1rem;\n  font-size: 1.25rem;\n  line-height: inherit;\n  white-space: nowrap;\n}\n.webcg-devtools .navbar-brand:hover, .webcg-devtools .navbar-brand:focus {\n  text-decoration: none;\n}\n.webcg-devtools .navbar-nav {\n  display: flex;\n  flex-direction: column;\n  padding-left: 0;\n  margin-bottom: 0;\n  list-style: none;\n}\n.webcg-devtools .navbar-nav .nav-link {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .navbar-nav .dropdown-menu {\n  position: static;\n  float: none;\n}\n.webcg-devtools .navbar-text {\n  display: inline-block;\n  padding-top: 0.5rem;\n  padding-bottom: 0.5rem;\n}\n.webcg-devtools .navbar-collapse {\n  flex-basis: 100%;\n  flex-grow: 1;\n  align-items: center;\n}\n.webcg-devtools .navbar-toggler {\n  padding: 0.25rem 0.75rem;\n  font-size: 1.25rem;\n  line-height: 1;\n  background-color: transparent;\n  border: 1px solid transparent;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .navbar-toggler:hover, .webcg-devtools .navbar-toggler:focus {\n  text-decoration: none;\n}\n.webcg-devtools .navbar-toggler-icon {\n  display: inline-block;\n  width: 1.5em;\n  height: 1.5em;\n  vertical-align: middle;\n  content: \"\";\n  background: no-repeat center center;\n  background-size: 100% 100%;\n}\n@media (max-width: 575.98px) {\n.webcg-devtools .navbar-expand-sm > .container,\n.webcg-devtools .navbar-expand-sm > .container-fluid,\n.webcg-devtools .navbar-expand-sm > .container-sm,\n.webcg-devtools .navbar-expand-sm > .container-md,\n.webcg-devtools .navbar-expand-sm > .container-lg,\n.webcg-devtools .navbar-expand-sm > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n}\n}\n@media (min-width: 576px) {\n.webcg-devtools .navbar-expand-sm {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n}\n.webcg-devtools .navbar-expand-sm .navbar-nav {\n    flex-direction: row;\n}\n.webcg-devtools .navbar-expand-sm .navbar-nav .dropdown-menu {\n    position: absolute;\n}\n.webcg-devtools .navbar-expand-sm .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n}\n.webcg-devtools .navbar-expand-sm > .container,\n.webcg-devtools .navbar-expand-sm > .container-fluid,\n.webcg-devtools .navbar-expand-sm > .container-sm,\n.webcg-devtools .navbar-expand-sm > .container-md,\n.webcg-devtools .navbar-expand-sm > .container-lg,\n.webcg-devtools .navbar-expand-sm > .container-xl {\n    flex-wrap: nowrap;\n}\n.webcg-devtools .navbar-expand-sm .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n}\n.webcg-devtools .navbar-expand-sm .navbar-toggler {\n    display: none;\n}\n}\n@media (max-width: 767.98px) {\n.webcg-devtools .navbar-expand-md > .container,\n.webcg-devtools .navbar-expand-md > .container-fluid,\n.webcg-devtools .navbar-expand-md > .container-sm,\n.webcg-devtools .navbar-expand-md > .container-md,\n.webcg-devtools .navbar-expand-md > .container-lg,\n.webcg-devtools .navbar-expand-md > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .navbar-expand-md {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n}\n.webcg-devtools .navbar-expand-md .navbar-nav {\n    flex-direction: row;\n}\n.webcg-devtools .navbar-expand-md .navbar-nav .dropdown-menu {\n    position: absolute;\n}\n.webcg-devtools .navbar-expand-md .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n}\n.webcg-devtools .navbar-expand-md > .container,\n.webcg-devtools .navbar-expand-md > .container-fluid,\n.webcg-devtools .navbar-expand-md > .container-sm,\n.webcg-devtools .navbar-expand-md > .container-md,\n.webcg-devtools .navbar-expand-md > .container-lg,\n.webcg-devtools .navbar-expand-md > .container-xl {\n    flex-wrap: nowrap;\n}\n.webcg-devtools .navbar-expand-md .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n}\n.webcg-devtools .navbar-expand-md .navbar-toggler {\n    display: none;\n}\n}\n@media (max-width: 991.98px) {\n.webcg-devtools .navbar-expand-lg > .container,\n.webcg-devtools .navbar-expand-lg > .container-fluid,\n.webcg-devtools .navbar-expand-lg > .container-sm,\n.webcg-devtools .navbar-expand-lg > .container-md,\n.webcg-devtools .navbar-expand-lg > .container-lg,\n.webcg-devtools .navbar-expand-lg > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .navbar-expand-lg {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n}\n.webcg-devtools .navbar-expand-lg .navbar-nav {\n    flex-direction: row;\n}\n.webcg-devtools .navbar-expand-lg .navbar-nav .dropdown-menu {\n    position: absolute;\n}\n.webcg-devtools .navbar-expand-lg .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n}\n.webcg-devtools .navbar-expand-lg > .container,\n.webcg-devtools .navbar-expand-lg > .container-fluid,\n.webcg-devtools .navbar-expand-lg > .container-sm,\n.webcg-devtools .navbar-expand-lg > .container-md,\n.webcg-devtools .navbar-expand-lg > .container-lg,\n.webcg-devtools .navbar-expand-lg > .container-xl {\n    flex-wrap: nowrap;\n}\n.webcg-devtools .navbar-expand-lg .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n}\n.webcg-devtools .navbar-expand-lg .navbar-toggler {\n    display: none;\n}\n}\n@media (max-width: 1199.98px) {\n.webcg-devtools .navbar-expand-xl > .container,\n.webcg-devtools .navbar-expand-xl > .container-fluid,\n.webcg-devtools .navbar-expand-xl > .container-sm,\n.webcg-devtools .navbar-expand-xl > .container-md,\n.webcg-devtools .navbar-expand-xl > .container-lg,\n.webcg-devtools .navbar-expand-xl > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .navbar-expand-xl {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n}\n.webcg-devtools .navbar-expand-xl .navbar-nav {\n    flex-direction: row;\n}\n.webcg-devtools .navbar-expand-xl .navbar-nav .dropdown-menu {\n    position: absolute;\n}\n.webcg-devtools .navbar-expand-xl .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n}\n.webcg-devtools .navbar-expand-xl > .container,\n.webcg-devtools .navbar-expand-xl > .container-fluid,\n.webcg-devtools .navbar-expand-xl > .container-sm,\n.webcg-devtools .navbar-expand-xl > .container-md,\n.webcg-devtools .navbar-expand-xl > .container-lg,\n.webcg-devtools .navbar-expand-xl > .container-xl {\n    flex-wrap: nowrap;\n}\n.webcg-devtools .navbar-expand-xl .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n}\n.webcg-devtools .navbar-expand-xl .navbar-toggler {\n    display: none;\n}\n}\n.webcg-devtools .navbar-expand {\n  flex-flow: row nowrap;\n  justify-content: flex-start;\n}\n.webcg-devtools .navbar-expand > .container,\n.webcg-devtools .navbar-expand > .container-fluid,\n.webcg-devtools .navbar-expand > .container-sm,\n.webcg-devtools .navbar-expand > .container-md,\n.webcg-devtools .navbar-expand > .container-lg,\n.webcg-devtools .navbar-expand > .container-xl {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .navbar-expand .navbar-nav {\n  flex-direction: row;\n}\n.webcg-devtools .navbar-expand .navbar-nav .dropdown-menu {\n  position: absolute;\n}\n.webcg-devtools .navbar-expand .navbar-nav .nav-link {\n  padding-right: 0.5rem;\n  padding-left: 0.5rem;\n}\n.webcg-devtools .navbar-expand > .container,\n.webcg-devtools .navbar-expand > .container-fluid,\n.webcg-devtools .navbar-expand > .container-sm,\n.webcg-devtools .navbar-expand > .container-md,\n.webcg-devtools .navbar-expand > .container-lg,\n.webcg-devtools .navbar-expand > .container-xl {\n  flex-wrap: nowrap;\n}\n.webcg-devtools .navbar-expand .navbar-collapse {\n  display: flex !important;\n  flex-basis: auto;\n}\n.webcg-devtools .navbar-expand .navbar-toggler {\n  display: none;\n}\n.webcg-devtools .navbar-light .navbar-brand {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-brand:hover, .webcg-devtools .navbar-light .navbar-brand:focus {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-nav .nav-link {\n  color: rgba(0, 0, 0, 0.5);\n}\n.webcg-devtools .navbar-light .navbar-nav .nav-link:hover, .webcg-devtools .navbar-light .navbar-nav .nav-link:focus {\n  color: rgba(0, 0, 0, 0.7);\n}\n.webcg-devtools .navbar-light .navbar-nav .nav-link.disabled {\n  color: rgba(0, 0, 0, 0.3);\n}\n.webcg-devtools .navbar-light .navbar-nav .show > .nav-link,\n.webcg-devtools .navbar-light .navbar-nav .active > .nav-link,\n.webcg-devtools .navbar-light .navbar-nav .nav-link.show,\n.webcg-devtools .navbar-light .navbar-nav .nav-link.active {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-toggler {\n  color: rgba(0, 0, 0, 0.5);\n  border-color: rgba(0, 0, 0, 0.1);\n}\n.webcg-devtools .navbar-light .navbar-toggler-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(0, 0, 0, 0.5)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .navbar-light .navbar-text {\n  color: rgba(0, 0, 0, 0.5);\n}\n.webcg-devtools .navbar-light .navbar-text a {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-text a:hover, .webcg-devtools .navbar-light .navbar-text a:focus {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-dark .navbar-brand {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-brand:hover, .webcg-devtools .navbar-dark .navbar-brand:focus {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-nav .nav-link {\n  color: rgba(255, 255, 255, 0.5);\n}\n.webcg-devtools .navbar-dark .navbar-nav .nav-link:hover, .webcg-devtools .navbar-dark .navbar-nav .nav-link:focus {\n  color: rgba(255, 255, 255, 0.75);\n}\n.webcg-devtools .navbar-dark .navbar-nav .nav-link.disabled {\n  color: rgba(255, 255, 255, 0.25);\n}\n.webcg-devtools .navbar-dark .navbar-nav .show > .nav-link,\n.webcg-devtools .navbar-dark .navbar-nav .active > .nav-link,\n.webcg-devtools .navbar-dark .navbar-nav .nav-link.show,\n.webcg-devtools .navbar-dark .navbar-nav .nav-link.active {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-toggler {\n  color: rgba(255, 255, 255, 0.5);\n  border-color: rgba(255, 255, 255, 0.1);\n}\n.webcg-devtools .navbar-dark .navbar-toggler-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(255, 255, 255, 0.5)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .navbar-dark .navbar-text {\n  color: rgba(255, 255, 255, 0.5);\n}\n.webcg-devtools .navbar-dark .navbar-text a {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-text a:hover, .webcg-devtools .navbar-dark .navbar-text a:focus {\n  color: #fff;\n}\n.webcg-devtools .card {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  word-wrap: break-word;\n  background-color: #fff;\n  background-clip: border-box;\n  border: 1px solid rgba(0, 0, 0, 0.125);\n  border-radius: 0.25rem;\n}\n.webcg-devtools .card > hr {\n  margin-right: 0;\n  margin-left: 0;\n}\n.webcg-devtools .card > .list-group:first-child .list-group-item:first-child {\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.webcg-devtools .card > .list-group:last-child .list-group-item:last-child {\n  border-bottom-right-radius: 0.25rem;\n  border-bottom-left-radius: 0.25rem;\n}\n.webcg-devtools .card-body {\n  flex: 1 1 auto;\n  min-height: 1px;\n  padding: 1.25rem;\n}\n.webcg-devtools .card-title {\n  margin-bottom: 0.75rem;\n}\n.webcg-devtools .card-subtitle {\n  margin-top: -0.375rem;\n  margin-bottom: 0;\n}\n.webcg-devtools .card-text:last-child {\n  margin-bottom: 0;\n}\n.webcg-devtools .card-link:hover {\n  text-decoration: none;\n}\n.webcg-devtools .card-link + .card-link {\n  margin-left: 1.25rem;\n}\n.webcg-devtools .card-header {\n  padding: 0.75rem 1.25rem;\n  margin-bottom: 0;\n  background-color: rgba(0, 0, 0, 0.03);\n  border-bottom: 1px solid rgba(0, 0, 0, 0.125);\n}\n.webcg-devtools .card-header:first-child {\n  border-radius: calc(0.25rem - 1px) calc(0.25rem - 1px) 0 0;\n}\n.webcg-devtools .card-header + .list-group .list-group-item:first-child {\n  border-top: 0;\n}\n.webcg-devtools .card-footer {\n  padding: 0.75rem 1.25rem;\n  background-color: rgba(0, 0, 0, 0.03);\n  border-top: 1px solid rgba(0, 0, 0, 0.125);\n}\n.webcg-devtools .card-footer:last-child {\n  border-radius: 0 0 calc(0.25rem - 1px) calc(0.25rem - 1px);\n}\n.webcg-devtools .card-header-tabs {\n  margin-right: -0.625rem;\n  margin-bottom: -0.75rem;\n  margin-left: -0.625rem;\n  border-bottom: 0;\n}\n.webcg-devtools .card-header-pills {\n  margin-right: -0.625rem;\n  margin-left: -0.625rem;\n}\n.webcg-devtools .card-img-overlay {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  padding: 1.25rem;\n}\n.webcg-devtools .card-img,\n.webcg-devtools .card-img-top,\n.webcg-devtools .card-img-bottom {\n  flex-shrink: 0;\n  width: 100%;\n}\n.webcg-devtools .card-img,\n.webcg-devtools .card-img-top {\n  border-top-left-radius: calc(0.25rem - 1px);\n  border-top-right-radius: calc(0.25rem - 1px);\n}\n.webcg-devtools .card-img,\n.webcg-devtools .card-img-bottom {\n  border-bottom-right-radius: calc(0.25rem - 1px);\n  border-bottom-left-radius: calc(0.25rem - 1px);\n}\n.webcg-devtools .card-deck .card {\n  margin-bottom: 15px;\n}\n@media (min-width: 576px) {\n.webcg-devtools .card-deck {\n    display: flex;\n    flex-flow: row wrap;\n    margin-right: -15px;\n    margin-left: -15px;\n}\n.webcg-devtools .card-deck .card {\n    flex: 1 0 0%;\n    margin-right: 15px;\n    margin-bottom: 0;\n    margin-left: 15px;\n}\n}\n.webcg-devtools .card-group > .card {\n  margin-bottom: 15px;\n}\n@media (min-width: 576px) {\n.webcg-devtools .card-group {\n    display: flex;\n    flex-flow: row wrap;\n}\n.webcg-devtools .card-group > .card {\n    flex: 1 0 0%;\n    margin-bottom: 0;\n}\n.webcg-devtools .card-group > .card + .card {\n    margin-left: 0;\n    border-left: 0;\n}\n.webcg-devtools .card-group > .card:not(:last-child) {\n    border-top-right-radius: 0;\n    border-bottom-right-radius: 0;\n}\n.webcg-devtools .card-group > .card:not(:last-child) .card-img-top,\n.webcg-devtools .card-group > .card:not(:last-child) .card-header {\n    border-top-right-radius: 0;\n}\n.webcg-devtools .card-group > .card:not(:last-child) .card-img-bottom,\n.webcg-devtools .card-group > .card:not(:last-child) .card-footer {\n    border-bottom-right-radius: 0;\n}\n.webcg-devtools .card-group > .card:not(:first-child) {\n    border-top-left-radius: 0;\n    border-bottom-left-radius: 0;\n}\n.webcg-devtools .card-group > .card:not(:first-child) .card-img-top,\n.webcg-devtools .card-group > .card:not(:first-child) .card-header {\n    border-top-left-radius: 0;\n}\n.webcg-devtools .card-group > .card:not(:first-child) .card-img-bottom,\n.webcg-devtools .card-group > .card:not(:first-child) .card-footer {\n    border-bottom-left-radius: 0;\n}\n}\n.webcg-devtools .card-columns .card {\n  margin-bottom: 0.75rem;\n}\n@media (min-width: 576px) {\n.webcg-devtools .card-columns {\n    column-count: 3;\n    column-gap: 1.25rem;\n    orphans: 1;\n    widows: 1;\n}\n.webcg-devtools .card-columns .card {\n    display: inline-block;\n    width: 100%;\n}\n}\n.webcg-devtools .accordion > .card {\n  overflow: hidden;\n}\n.webcg-devtools .accordion > .card:not(:last-of-type) {\n  border-bottom: 0;\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .accordion > .card:not(:first-of-type) {\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .accordion > .card > .card-header {\n  border-radius: 0;\n  margin-bottom: -1px;\n}\n.webcg-devtools .breadcrumb {\n  display: flex;\n  flex-wrap: wrap;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  list-style: none;\n  background-color: #e9ecef;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item {\n  padding-left: 0.5rem;\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item::before {\n  display: inline-block;\n  padding-right: 0.5rem;\n  color: #6c757d;\n  content: \"/\";\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item:hover::before {\n  text-decoration: underline;\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item:hover::before {\n  text-decoration: none;\n}\n.webcg-devtools .breadcrumb-item.active {\n  color: #6c757d;\n}\n.webcg-devtools .pagination {\n  display: flex;\n  padding-left: 0;\n  list-style: none;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .page-link {\n  position: relative;\n  display: block;\n  padding: 0.5rem 0.75rem;\n  margin-left: -1px;\n  line-height: 1.25;\n  color: #007bff;\n  background-color: #fff;\n  border: 1px solid #dee2e6;\n}\n.webcg-devtools .page-link:hover {\n  z-index: 2;\n  color: #0056b3;\n  text-decoration: none;\n  background-color: #e9ecef;\n  border-color: #dee2e6;\n}\n.webcg-devtools .page-link:focus {\n  z-index: 3;\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .page-item:first-child .page-link {\n  margin-left: 0;\n  border-top-left-radius: 0.25rem;\n  border-bottom-left-radius: 0.25rem;\n}\n.webcg-devtools .page-item:last-child .page-link {\n  border-top-right-radius: 0.25rem;\n  border-bottom-right-radius: 0.25rem;\n}\n.webcg-devtools .page-item.active .page-link {\n  z-index: 3;\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .page-item.disabled .page-link {\n  color: #6c757d;\n  pointer-events: none;\n  cursor: auto;\n  background-color: #fff;\n  border-color: #dee2e6;\n}\n.webcg-devtools .pagination-lg .page-link {\n  padding: 0.75rem 1.5rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n}\n.webcg-devtools .pagination-lg .page-item:first-child .page-link {\n  border-top-left-radius: 0.3rem;\n  border-bottom-left-radius: 0.3rem;\n}\n.webcg-devtools .pagination-lg .page-item:last-child .page-link {\n  border-top-right-radius: 0.3rem;\n  border-bottom-right-radius: 0.3rem;\n}\n.webcg-devtools .pagination-sm .page-link {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n.webcg-devtools .pagination-sm .page-item:first-child .page-link {\n  border-top-left-radius: 0.2rem;\n  border-bottom-left-radius: 0.2rem;\n}\n.webcg-devtools .pagination-sm .page-item:last-child .page-link {\n  border-top-right-radius: 0.2rem;\n  border-bottom-right-radius: 0.2rem;\n}\n.webcg-devtools .badge {\n  display: inline-block;\n  padding: 0.25em 0.4em;\n  font-size: 75%;\n  font-weight: 700;\n  line-height: 1;\n  text-align: center;\n  white-space: nowrap;\n  vertical-align: baseline;\n  border-radius: 0.25rem;\n  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .badge {\n    transition: none;\n}\n}\na.webcg-devtools .badge:hover, a.webcg-devtools .badge:focus {\n  text-decoration: none;\n}\n.webcg-devtools .badge:empty {\n  display: none;\n}\n.webcg-devtools .btn .badge {\n  position: relative;\n  top: -1px;\n}\n.webcg-devtools .badge-pill {\n  padding-right: 0.6em;\n  padding-left: 0.6em;\n  border-radius: 10rem;\n}\n.webcg-devtools .badge-primary {\n  color: #fff;\n  background-color: #007bff;\n}\na.webcg-devtools .badge-primary:hover, a.webcg-devtools .badge-primary:focus {\n  color: #fff;\n  background-color: #0062cc;\n}\na.webcg-devtools .badge-primary:focus, a.webcg-devtools .badge-primary.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .badge-secondary {\n  color: #fff;\n  background-color: #6c757d;\n}\na.webcg-devtools .badge-secondary:hover, a.webcg-devtools .badge-secondary:focus {\n  color: #fff;\n  background-color: #545b62;\n}\na.webcg-devtools .badge-secondary:focus, a.webcg-devtools .badge-secondary.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);\n}\n.webcg-devtools .badge-success {\n  color: #fff;\n  background-color: #28a745;\n}\na.webcg-devtools .badge-success:hover, a.webcg-devtools .badge-success:focus {\n  color: #fff;\n  background-color: #1e7e34;\n}\na.webcg-devtools .badge-success:focus, a.webcg-devtools .badge-success.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);\n}\n.webcg-devtools .badge-info {\n  color: #fff;\n  background-color: #17a2b8;\n}\na.webcg-devtools .badge-info:hover, a.webcg-devtools .badge-info:focus {\n  color: #fff;\n  background-color: #117a8b;\n}\na.webcg-devtools .badge-info:focus, a.webcg-devtools .badge-info.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);\n}\n.webcg-devtools .badge-warning {\n  color: #212529;\n  background-color: #ffc107;\n}\na.webcg-devtools .badge-warning:hover, a.webcg-devtools .badge-warning:focus {\n  color: #212529;\n  background-color: #d39e00;\n}\na.webcg-devtools .badge-warning:focus, a.webcg-devtools .badge-warning.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);\n}\n.webcg-devtools .badge-danger {\n  color: #fff;\n  background-color: #dc3545;\n}\na.webcg-devtools .badge-danger:hover, a.webcg-devtools .badge-danger:focus {\n  color: #fff;\n  background-color: #bd2130;\n}\na.webcg-devtools .badge-danger:focus, a.webcg-devtools .badge-danger.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);\n}\n.webcg-devtools .badge-light {\n  color: #212529;\n  background-color: #f8f9fa;\n}\na.webcg-devtools .badge-light:hover, a.webcg-devtools .badge-light:focus {\n  color: #212529;\n  background-color: #dae0e5;\n}\na.webcg-devtools .badge-light:focus, a.webcg-devtools .badge-light.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5);\n}\n.webcg-devtools .badge-dark {\n  color: #fff;\n  background-color: #343a40;\n}\na.webcg-devtools .badge-dark:hover, a.webcg-devtools .badge-dark:focus {\n  color: #fff;\n  background-color: #1d2124;\n}\na.webcg-devtools .badge-dark:focus, a.webcg-devtools .badge-dark.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5);\n}\n.webcg-devtools .jumbotron {\n  padding: 2rem 1rem;\n  margin-bottom: 2rem;\n  background-color: #e9ecef;\n  border-radius: 0.3rem;\n}\n@media (min-width: 576px) {\n.webcg-devtools .jumbotron {\n    padding: 4rem 2rem;\n}\n}\n.webcg-devtools .jumbotron-fluid {\n  padding-right: 0;\n  padding-left: 0;\n  border-radius: 0;\n}\n.webcg-devtools .alert {\n  position: relative;\n  padding: 0.75rem 1.25rem;\n  margin-bottom: 1rem;\n  border: 1px solid transparent;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .alert-heading {\n  color: inherit;\n}\n.webcg-devtools .alert-link {\n  font-weight: 700;\n}\n.webcg-devtools .alert-dismissible {\n  padding-right: 4rem;\n}\n.webcg-devtools .alert-dismissible .close {\n  position: absolute;\n  top: 0;\n  right: 0;\n  padding: 0.75rem 1.25rem;\n  color: inherit;\n}\n.webcg-devtools .alert-primary {\n  color: #004085;\n  background-color: #cce5ff;\n  border-color: #b8daff;\n}\n.webcg-devtools .alert-primary hr {\n  border-top-color: #9fcdff;\n}\n.webcg-devtools .alert-primary .alert-link {\n  color: #002752;\n}\n.webcg-devtools .alert-secondary {\n  color: #383d41;\n  background-color: #e2e3e5;\n  border-color: #d6d8db;\n}\n.webcg-devtools .alert-secondary hr {\n  border-top-color: #c8cbcf;\n}\n.webcg-devtools .alert-secondary .alert-link {\n  color: #202326;\n}\n.webcg-devtools .alert-success {\n  color: #155724;\n  background-color: #d4edda;\n  border-color: #c3e6cb;\n}\n.webcg-devtools .alert-success hr {\n  border-top-color: #b1dfbb;\n}\n.webcg-devtools .alert-success .alert-link {\n  color: #0b2e13;\n}\n.webcg-devtools .alert-info {\n  color: #0c5460;\n  background-color: #d1ecf1;\n  border-color: #bee5eb;\n}\n.webcg-devtools .alert-info hr {\n  border-top-color: #abdde5;\n}\n.webcg-devtools .alert-info .alert-link {\n  color: #062c33;\n}\n.webcg-devtools .alert-warning {\n  color: #856404;\n  background-color: #fff3cd;\n  border-color: #ffeeba;\n}\n.webcg-devtools .alert-warning hr {\n  border-top-color: #ffe8a1;\n}\n.webcg-devtools .alert-warning .alert-link {\n  color: #533f03;\n}\n.webcg-devtools .alert-danger {\n  color: #721c24;\n  background-color: #f8d7da;\n  border-color: #f5c6cb;\n}\n.webcg-devtools .alert-danger hr {\n  border-top-color: #f1b0b7;\n}\n.webcg-devtools .alert-danger .alert-link {\n  color: #491217;\n}\n.webcg-devtools .alert-light {\n  color: #818182;\n  background-color: #fefefe;\n  border-color: #fdfdfe;\n}\n.webcg-devtools .alert-light hr {\n  border-top-color: #ececf6;\n}\n.webcg-devtools .alert-light .alert-link {\n  color: #686868;\n}\n.webcg-devtools .alert-dark {\n  color: #1b1e21;\n  background-color: #d6d8d9;\n  border-color: #c6c8ca;\n}\n.webcg-devtools .alert-dark hr {\n  border-top-color: #b9bbbe;\n}\n.webcg-devtools .alert-dark .alert-link {\n  color: #040505;\n}\n@keyframes progress-bar-stripes {\nfrom {\n    background-position: 1rem 0;\n}\nto {\n    background-position: 0 0;\n}\n}\n.webcg-devtools .progress {\n  display: flex;\n  height: 1rem;\n  overflow: hidden;\n  font-size: 0.75rem;\n  background-color: #e9ecef;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .progress-bar {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  overflow: hidden;\n  color: #fff;\n  text-align: center;\n  white-space: nowrap;\n  background-color: #007bff;\n  transition: width 0.6s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .progress-bar {\n    transition: none;\n}\n}\n.webcg-devtools .progress-bar-striped {\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-size: 1rem 1rem;\n}\n.webcg-devtools .progress-bar-animated {\n  animation: progress-bar-stripes 1s linear infinite;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .progress-bar-animated {\n    animation: none;\n}\n}\n.webcg-devtools .media {\n  display: flex;\n  align-items: flex-start;\n}\n.webcg-devtools .media-body {\n  flex: 1;\n}\n.webcg-devtools .list-group {\n  display: flex;\n  flex-direction: column;\n  padding-left: 0;\n  margin-bottom: 0;\n}\n.webcg-devtools .list-group-item-action {\n  width: 100%;\n  color: #495057;\n  text-align: inherit;\n}\n.webcg-devtools .list-group-item-action:hover, .webcg-devtools .list-group-item-action:focus {\n  z-index: 1;\n  color: #495057;\n  text-decoration: none;\n  background-color: #f8f9fa;\n}\n.webcg-devtools .list-group-item-action:active {\n  color: #212529;\n  background-color: #e9ecef;\n}\n.webcg-devtools .list-group-item {\n  position: relative;\n  display: block;\n  padding: 0.75rem 1.25rem;\n  background-color: #fff;\n  border: 1px solid rgba(0, 0, 0, 0.125);\n}\n.webcg-devtools .list-group-item:first-child {\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.webcg-devtools .list-group-item:last-child {\n  border-bottom-right-radius: 0.25rem;\n  border-bottom-left-radius: 0.25rem;\n}\n.webcg-devtools .list-group-item.disabled, .webcg-devtools .list-group-item:disabled {\n  color: #6c757d;\n  pointer-events: none;\n  background-color: #fff;\n}\n.webcg-devtools .list-group-item.active {\n  z-index: 2;\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .list-group-item + .webcg-devtools .list-group-item {\n  border-top-width: 0;\n}\n.webcg-devtools .list-group-item + .webcg-devtools .list-group-item.active {\n  margin-top: -1px;\n  border-top-width: 1px;\n}\n.webcg-devtools .list-group-horizontal {\n  flex-direction: row;\n}\n.webcg-devtools .list-group-horizontal .list-group-item:first-child {\n  border-bottom-left-radius: 0.25rem;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item:last-child {\n  border-top-right-radius: 0.25rem;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item.active {\n  margin-top: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item + .list-group-item {\n  border-top-width: 1px;\n  border-left-width: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item + .list-group-item.active {\n  margin-left: -1px;\n  border-left-width: 1px;\n}\n@media (min-width: 576px) {\n.webcg-devtools .list-group-horizontal-sm {\n    flex-direction: row;\n}\n.webcg-devtools .list-group-horizontal-sm .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-sm .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-sm .list-group-item.active {\n    margin-top: 0;\n}\n.webcg-devtools .list-group-horizontal-sm .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n}\n.webcg-devtools .list-group-horizontal-sm .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .list-group-horizontal-md {\n    flex-direction: row;\n}\n.webcg-devtools .list-group-horizontal-md .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-md .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-md .list-group-item.active {\n    margin-top: 0;\n}\n.webcg-devtools .list-group-horizontal-md .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n}\n.webcg-devtools .list-group-horizontal-md .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .list-group-horizontal-lg {\n    flex-direction: row;\n}\n.webcg-devtools .list-group-horizontal-lg .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-lg .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-lg .list-group-item.active {\n    margin-top: 0;\n}\n.webcg-devtools .list-group-horizontal-lg .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n}\n.webcg-devtools .list-group-horizontal-lg .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .list-group-horizontal-xl {\n    flex-direction: row;\n}\n.webcg-devtools .list-group-horizontal-xl .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-xl .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n}\n.webcg-devtools .list-group-horizontal-xl .list-group-item.active {\n    margin-top: 0;\n}\n.webcg-devtools .list-group-horizontal-xl .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n}\n.webcg-devtools .list-group-horizontal-xl .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n}\n}\n.webcg-devtools .list-group-flush .list-group-item {\n  border-right-width: 0;\n  border-left-width: 0;\n  border-radius: 0;\n}\n.webcg-devtools .list-group-flush .list-group-item:first-child {\n  border-top-width: 0;\n}\n.webcg-devtools .list-group-flush:last-child .list-group-item:last-child {\n  border-bottom-width: 0;\n}\n.webcg-devtools .list-group-item-primary {\n  color: #004085;\n  background-color: #b8daff;\n}\n.webcg-devtools .list-group-item-primary.list-group-item-action:hover, .webcg-devtools .list-group-item-primary.list-group-item-action:focus {\n  color: #004085;\n  background-color: #9fcdff;\n}\n.webcg-devtools .list-group-item-primary.list-group-item-action.active {\n  color: #fff;\n  background-color: #004085;\n  border-color: #004085;\n}\n.webcg-devtools .list-group-item-secondary {\n  color: #383d41;\n  background-color: #d6d8db;\n}\n.webcg-devtools .list-group-item-secondary.list-group-item-action:hover, .webcg-devtools .list-group-item-secondary.list-group-item-action:focus {\n  color: #383d41;\n  background-color: #c8cbcf;\n}\n.webcg-devtools .list-group-item-secondary.list-group-item-action.active {\n  color: #fff;\n  background-color: #383d41;\n  border-color: #383d41;\n}\n.webcg-devtools .list-group-item-success {\n  color: #155724;\n  background-color: #c3e6cb;\n}\n.webcg-devtools .list-group-item-success.list-group-item-action:hover, .webcg-devtools .list-group-item-success.list-group-item-action:focus {\n  color: #155724;\n  background-color: #b1dfbb;\n}\n.webcg-devtools .list-group-item-success.list-group-item-action.active {\n  color: #fff;\n  background-color: #155724;\n  border-color: #155724;\n}\n.webcg-devtools .list-group-item-info {\n  color: #0c5460;\n  background-color: #bee5eb;\n}\n.webcg-devtools .list-group-item-info.list-group-item-action:hover, .webcg-devtools .list-group-item-info.list-group-item-action:focus {\n  color: #0c5460;\n  background-color: #abdde5;\n}\n.webcg-devtools .list-group-item-info.list-group-item-action.active {\n  color: #fff;\n  background-color: #0c5460;\n  border-color: #0c5460;\n}\n.webcg-devtools .list-group-item-warning {\n  color: #856404;\n  background-color: #ffeeba;\n}\n.webcg-devtools .list-group-item-warning.list-group-item-action:hover, .webcg-devtools .list-group-item-warning.list-group-item-action:focus {\n  color: #856404;\n  background-color: #ffe8a1;\n}\n.webcg-devtools .list-group-item-warning.list-group-item-action.active {\n  color: #fff;\n  background-color: #856404;\n  border-color: #856404;\n}\n.webcg-devtools .list-group-item-danger {\n  color: #721c24;\n  background-color: #f5c6cb;\n}\n.webcg-devtools .list-group-item-danger.list-group-item-action:hover, .webcg-devtools .list-group-item-danger.list-group-item-action:focus {\n  color: #721c24;\n  background-color: #f1b0b7;\n}\n.webcg-devtools .list-group-item-danger.list-group-item-action.active {\n  color: #fff;\n  background-color: #721c24;\n  border-color: #721c24;\n}\n.webcg-devtools .list-group-item-light {\n  color: #818182;\n  background-color: #fdfdfe;\n}\n.webcg-devtools .list-group-item-light.list-group-item-action:hover, .webcg-devtools .list-group-item-light.list-group-item-action:focus {\n  color: #818182;\n  background-color: #ececf6;\n}\n.webcg-devtools .list-group-item-light.list-group-item-action.active {\n  color: #fff;\n  background-color: #818182;\n  border-color: #818182;\n}\n.webcg-devtools .list-group-item-dark {\n  color: #1b1e21;\n  background-color: #c6c8ca;\n}\n.webcg-devtools .list-group-item-dark.list-group-item-action:hover, .webcg-devtools .list-group-item-dark.list-group-item-action:focus {\n  color: #1b1e21;\n  background-color: #b9bbbe;\n}\n.webcg-devtools .list-group-item-dark.list-group-item-action.active {\n  color: #fff;\n  background-color: #1b1e21;\n  border-color: #1b1e21;\n}\n.webcg-devtools .close {\n  float: right;\n  font-size: 1.5rem;\n  font-weight: 700;\n  line-height: 1;\n  color: #000;\n  text-shadow: 0 1px 0 #fff;\n  opacity: 0.5;\n}\n.webcg-devtools .close:hover {\n  color: #000;\n  text-decoration: none;\n}\n.webcg-devtools .close:not(:disabled):not(.disabled):hover, .webcg-devtools .close:not(:disabled):not(.disabled):focus {\n  opacity: 0.75;\n}\n.webcg-devtools button.close {\n  padding: 0;\n  background-color: transparent;\n  border: 0;\n  appearance: none;\n}\n.webcg-devtools a.close.disabled {\n  pointer-events: none;\n}\n.webcg-devtools .toast {\n  max-width: 350px;\n  overflow: hidden;\n  font-size: 0.875rem;\n  background-color: rgba(255, 255, 255, 0.85);\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.1);\n  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);\n  backdrop-filter: blur(10px);\n  opacity: 0;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .toast:not(:last-child) {\n  margin-bottom: 0.75rem;\n}\n.webcg-devtools .toast.showing {\n  opacity: 1;\n}\n.webcg-devtools .toast.show {\n  display: block;\n  opacity: 1;\n}\n.webcg-devtools .toast.hide {\n  display: none;\n}\n.webcg-devtools .toast-header {\n  display: flex;\n  align-items: center;\n  padding: 0.25rem 0.75rem;\n  color: #6c757d;\n  background-color: rgba(255, 255, 255, 0.85);\n  background-clip: padding-box;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.05);\n}\n.webcg-devtools .toast-body {\n  padding: 0.75rem;\n}\n.webcg-devtools .modal-open {\n  overflow: hidden;\n}\n.webcg-devtools .modal-open .modal {\n  overflow-x: hidden;\n  overflow-y: auto;\n}\n.webcg-devtools .modal {\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 1050;\n  display: none;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  outline: 0;\n}\n.webcg-devtools .modal-dialog {\n  position: relative;\n  width: auto;\n  margin: 0.5rem;\n  pointer-events: none;\n}\n.modal.fade .webcg-devtools .modal-dialog {\n  transition: transform 0.3s ease-out;\n  transform: translate(0, -50px);\n}\n@media (prefers-reduced-motion: reduce) {\n.modal.fade .webcg-devtools .modal-dialog {\n    transition: none;\n}\n}\n.modal.show .webcg-devtools .modal-dialog {\n  transform: none;\n}\n.modal.modal-static .webcg-devtools .modal-dialog {\n  transform: scale(1.02);\n}\n.webcg-devtools .modal-dialog-scrollable {\n  display: flex;\n  max-height: calc(100% - 1rem);\n}\n.webcg-devtools .modal-dialog-scrollable .modal-content {\n  max-height: calc(100vh - 1rem);\n  overflow: hidden;\n}\n.webcg-devtools .modal-dialog-scrollable .modal-header,\n.webcg-devtools .modal-dialog-scrollable .modal-footer {\n  flex-shrink: 0;\n}\n.webcg-devtools .modal-dialog-scrollable .modal-body {\n  overflow-y: auto;\n}\n.webcg-devtools .modal-dialog-centered {\n  display: flex;\n  align-items: center;\n  min-height: calc(100% - 1rem);\n}\n.webcg-devtools .modal-dialog-centered::before {\n  display: block;\n  height: calc(100vh - 1rem);\n  content: \"\";\n}\n.webcg-devtools .modal-dialog-centered.modal-dialog-scrollable {\n  flex-direction: column;\n  justify-content: center;\n  height: 100%;\n}\n.webcg-devtools .modal-dialog-centered.modal-dialog-scrollable .modal-content {\n  max-height: none;\n}\n.webcg-devtools .modal-dialog-centered.modal-dialog-scrollable::before {\n  content: none;\n}\n.webcg-devtools .modal-content {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  width: 100%;\n  pointer-events: auto;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 0.3rem;\n  outline: 0;\n}\n.webcg-devtools .modal-backdrop {\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 1040;\n  width: 100vw;\n  height: 100vh;\n  background-color: #000;\n}\n.webcg-devtools .modal-backdrop.fade {\n  opacity: 0;\n}\n.webcg-devtools .modal-backdrop.show {\n  opacity: 0.5;\n}\n.webcg-devtools .modal-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  padding: 1rem 1rem;\n  border-bottom: 1px solid #dee2e6;\n  border-top-left-radius: calc(0.3rem - 1px);\n  border-top-right-radius: calc(0.3rem - 1px);\n}\n.webcg-devtools .modal-header .close {\n  padding: 1rem 1rem;\n  margin: -1rem -1rem -1rem auto;\n}\n.webcg-devtools .modal-title {\n  margin-bottom: 0;\n  line-height: 1.5;\n}\n.webcg-devtools .modal-body {\n  position: relative;\n  flex: 1 1 auto;\n  padding: 1rem;\n}\n.webcg-devtools .modal-footer {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: flex-end;\n  padding: 0.75rem;\n  border-top: 1px solid #dee2e6;\n  border-bottom-right-radius: calc(0.3rem - 1px);\n  border-bottom-left-radius: calc(0.3rem - 1px);\n}\n.webcg-devtools .modal-footer > * {\n  margin: 0.25rem;\n}\n.webcg-devtools .modal-scrollbar-measure {\n  position: absolute;\n  top: -9999px;\n  width: 50px;\n  height: 50px;\n  overflow: scroll;\n}\n@media (min-width: 576px) {\n.webcg-devtools .modal-dialog {\n    max-width: 500px;\n    margin: 1.75rem auto;\n}\n.webcg-devtools .modal-dialog-scrollable {\n    max-height: calc(100% - 3.5rem);\n}\n.webcg-devtools .modal-dialog-scrollable .modal-content {\n    max-height: calc(100vh - 3.5rem);\n}\n.webcg-devtools .modal-dialog-centered {\n    min-height: calc(100% - 3.5rem);\n}\n.webcg-devtools .modal-dialog-centered::before {\n    height: calc(100vh - 3.5rem);\n}\n.webcg-devtools .modal-sm {\n    max-width: 300px;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .modal-lg,\n.webcg-devtools .modal-xl {\n    max-width: 800px;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .modal-xl {\n    max-width: 1140px;\n}\n}\n.webcg-devtools .tooltip {\n  position: absolute;\n  z-index: 1070;\n  display: block;\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  font-style: normal;\n  font-weight: 400;\n  line-height: 1.5;\n  text-align: left;\n  text-align: start;\n  text-decoration: none;\n  text-shadow: none;\n  text-transform: none;\n  letter-spacing: normal;\n  word-break: normal;\n  word-spacing: normal;\n  white-space: normal;\n  line-break: auto;\n  font-size: 0.875rem;\n  word-wrap: break-word;\n  opacity: 0;\n}\n.webcg-devtools .tooltip.show {\n  opacity: 0.9;\n}\n.webcg-devtools .tooltip .arrow {\n  position: absolute;\n  display: block;\n  width: 0.8rem;\n  height: 0.4rem;\n}\n.webcg-devtools .tooltip .arrow::before {\n  position: absolute;\n  content: \"\";\n  border-color: transparent;\n  border-style: solid;\n}\n.webcg-devtools .bs-tooltip-top, .webcg-devtools .bs-tooltip-auto[x-placement^=top] {\n  padding: 0.4rem 0;\n}\n.webcg-devtools .bs-tooltip-top .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=top] .arrow {\n  bottom: 0;\n}\n.webcg-devtools .bs-tooltip-top .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=top] .arrow::before {\n  top: 0;\n  border-width: 0.4rem 0.4rem 0;\n  border-top-color: #000;\n}\n.webcg-devtools .bs-tooltip-right, .webcg-devtools .bs-tooltip-auto[x-placement^=right] {\n  padding: 0 0.4rem;\n}\n.webcg-devtools .bs-tooltip-right .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=right] .arrow {\n  left: 0;\n  width: 0.4rem;\n  height: 0.8rem;\n}\n.webcg-devtools .bs-tooltip-right .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=right] .arrow::before {\n  right: 0;\n  border-width: 0.4rem 0.4rem 0.4rem 0;\n  border-right-color: #000;\n}\n.webcg-devtools .bs-tooltip-bottom, .webcg-devtools .bs-tooltip-auto[x-placement^=bottom] {\n  padding: 0.4rem 0;\n}\n.webcg-devtools .bs-tooltip-bottom .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=bottom] .arrow {\n  top: 0;\n}\n.webcg-devtools .bs-tooltip-bottom .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=bottom] .arrow::before {\n  bottom: 0;\n  border-width: 0 0.4rem 0.4rem;\n  border-bottom-color: #000;\n}\n.webcg-devtools .bs-tooltip-left, .webcg-devtools .bs-tooltip-auto[x-placement^=left] {\n  padding: 0 0.4rem;\n}\n.webcg-devtools .bs-tooltip-left .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=left] .arrow {\n  right: 0;\n  width: 0.4rem;\n  height: 0.8rem;\n}\n.webcg-devtools .bs-tooltip-left .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=left] .arrow::before {\n  left: 0;\n  border-width: 0.4rem 0 0.4rem 0.4rem;\n  border-left-color: #000;\n}\n.webcg-devtools .tooltip-inner {\n  max-width: 200px;\n  padding: 0.25rem 0.5rem;\n  color: #fff;\n  text-align: center;\n  background-color: #000;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .popover {\n  position: absolute;\n  top: 0;\n  left: 0;\n  z-index: 1060;\n  display: block;\n  max-width: 276px;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  font-style: normal;\n  font-weight: 400;\n  line-height: 1.5;\n  text-align: left;\n  text-align: start;\n  text-decoration: none;\n  text-shadow: none;\n  text-transform: none;\n  letter-spacing: normal;\n  word-break: normal;\n  word-spacing: normal;\n  white-space: normal;\n  line-break: auto;\n  font-size: 0.875rem;\n  word-wrap: break-word;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 0.3rem;\n}\n.webcg-devtools .popover .arrow {\n  position: absolute;\n  display: block;\n  width: 1rem;\n  height: 0.5rem;\n  margin: 0 0.3rem;\n}\n.webcg-devtools .popover .arrow::before, .webcg-devtools .popover .arrow::after {\n  position: absolute;\n  display: block;\n  content: \"\";\n  border-color: transparent;\n  border-style: solid;\n}\n.webcg-devtools .bs-popover-top, .webcg-devtools .bs-popover-auto[x-placement^=top] {\n  margin-bottom: 0.5rem;\n}\n.webcg-devtools .bs-popover-top > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=top] > .arrow {\n  bottom: calc(-0.5rem - 1px);\n}\n.webcg-devtools .bs-popover-top > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=top] > .arrow::before {\n  bottom: 0;\n  border-width: 0.5rem 0.5rem 0;\n  border-top-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-top > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=top] > .arrow::after {\n  bottom: 1px;\n  border-width: 0.5rem 0.5rem 0;\n  border-top-color: #fff;\n}\n.webcg-devtools .bs-popover-right, .webcg-devtools .bs-popover-auto[x-placement^=right] {\n  margin-left: 0.5rem;\n}\n.webcg-devtools .bs-popover-right > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=right] > .arrow {\n  left: calc(-0.5rem - 1px);\n  width: 0.5rem;\n  height: 1rem;\n  margin: 0.3rem 0;\n}\n.webcg-devtools .bs-popover-right > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=right] > .arrow::before {\n  left: 0;\n  border-width: 0.5rem 0.5rem 0.5rem 0;\n  border-right-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-right > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=right] > .arrow::after {\n  left: 1px;\n  border-width: 0.5rem 0.5rem 0.5rem 0;\n  border-right-color: #fff;\n}\n.webcg-devtools .bs-popover-bottom, .webcg-devtools .bs-popover-auto[x-placement^=bottom] {\n  margin-top: 0.5rem;\n}\n.webcg-devtools .bs-popover-bottom > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=bottom] > .arrow {\n  top: calc(-0.5rem - 1px);\n}\n.webcg-devtools .bs-popover-bottom > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=bottom] > .arrow::before {\n  top: 0;\n  border-width: 0 0.5rem 0.5rem 0.5rem;\n  border-bottom-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-bottom > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=bottom] > .arrow::after {\n  top: 1px;\n  border-width: 0 0.5rem 0.5rem 0.5rem;\n  border-bottom-color: #fff;\n}\n.webcg-devtools .bs-popover-bottom .popover-header::before, .webcg-devtools .bs-popover-auto[x-placement^=bottom] .popover-header::before {\n  position: absolute;\n  top: 0;\n  left: 50%;\n  display: block;\n  width: 1rem;\n  margin-left: -0.5rem;\n  content: \"\";\n  border-bottom: 1px solid #f7f7f7;\n}\n.webcg-devtools .bs-popover-left, .webcg-devtools .bs-popover-auto[x-placement^=left] {\n  margin-right: 0.5rem;\n}\n.webcg-devtools .bs-popover-left > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=left] > .arrow {\n  right: calc(-0.5rem - 1px);\n  width: 0.5rem;\n  height: 1rem;\n  margin: 0.3rem 0;\n}\n.webcg-devtools .bs-popover-left > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=left] > .arrow::before {\n  right: 0;\n  border-width: 0.5rem 0 0.5rem 0.5rem;\n  border-left-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-left > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=left] > .arrow::after {\n  right: 1px;\n  border-width: 0.5rem 0 0.5rem 0.5rem;\n  border-left-color: #fff;\n}\n.webcg-devtools .popover-header {\n  padding: 0.5rem 0.75rem;\n  margin-bottom: 0;\n  font-size: 1rem;\n  background-color: #f7f7f7;\n  border-bottom: 1px solid #ebebeb;\n  border-top-left-radius: calc(0.3rem - 1px);\n  border-top-right-radius: calc(0.3rem - 1px);\n}\n.webcg-devtools .popover-header:empty {\n  display: none;\n}\n.webcg-devtools .popover-body {\n  padding: 0.5rem 0.75rem;\n  color: #212529;\n}\n.webcg-devtools .carousel {\n  position: relative;\n}\n.webcg-devtools .carousel.pointer-event {\n  touch-action: pan-y;\n}\n.webcg-devtools .carousel-inner {\n  position: relative;\n  width: 100%;\n  overflow: hidden;\n}\n.webcg-devtools .carousel-inner::after {\n  display: block;\n  clear: both;\n  content: \"\";\n}\n.webcg-devtools .carousel-item {\n  position: relative;\n  display: none;\n  float: left;\n  width: 100%;\n  margin-right: -100%;\n  backface-visibility: hidden;\n  transition: transform 0.6s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .carousel-item {\n    transition: none;\n}\n}\n.webcg-devtools .carousel-item.active,\n.webcg-devtools .carousel-item-next,\n.webcg-devtools .carousel-item-prev {\n  display: block;\n}\n.webcg-devtools .carousel-item-next:not(.carousel-item-left),\n.webcg-devtools .active.carousel-item-right {\n  transform: translateX(100%);\n}\n.webcg-devtools .carousel-item-prev:not(.carousel-item-right),\n.webcg-devtools .active.carousel-item-left {\n  transform: translateX(-100%);\n}\n.webcg-devtools .carousel-fade .carousel-item {\n  opacity: 0;\n  transition-property: opacity;\n  transform: none;\n}\n.webcg-devtools .carousel-fade .carousel-item.active,\n.webcg-devtools .carousel-fade .carousel-item-next.carousel-item-left,\n.webcg-devtools .carousel-fade .carousel-item-prev.carousel-item-right {\n  z-index: 1;\n  opacity: 1;\n}\n.webcg-devtools .carousel-fade .active.carousel-item-left,\n.webcg-devtools .carousel-fade .active.carousel-item-right {\n  z-index: 0;\n  opacity: 0;\n  transition: opacity 0s 0.6s;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .carousel-fade .active.carousel-item-left,\n.webcg-devtools .carousel-fade .active.carousel-item-right {\n    transition: none;\n}\n}\n.webcg-devtools .carousel-control-prev,\n.webcg-devtools .carousel-control-next {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 15%;\n  color: #fff;\n  text-align: center;\n  opacity: 0.5;\n  transition: opacity 0.15s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .carousel-control-prev,\n.webcg-devtools .carousel-control-next {\n    transition: none;\n}\n}\n.webcg-devtools .carousel-control-prev:hover, .webcg-devtools .carousel-control-prev:focus,\n.webcg-devtools .carousel-control-next:hover,\n.webcg-devtools .carousel-control-next:focus {\n  color: #fff;\n  text-decoration: none;\n  outline: 0;\n  opacity: 0.9;\n}\n.webcg-devtools .carousel-control-prev {\n  left: 0;\n}\n.webcg-devtools .carousel-control-next {\n  right: 0;\n}\n.webcg-devtools .carousel-control-prev-icon,\n.webcg-devtools .carousel-control-next-icon {\n  display: inline-block;\n  width: 20px;\n  height: 20px;\n  background: no-repeat 50%/100% 100%;\n}\n.webcg-devtools .carousel-control-prev-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath d='M5.25 0l-4 4 4 4 1.5-1.5L4.25 4l2.5-2.5L5.25 0z'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .carousel-control-next-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath d='M2.75 0l-1.5 1.5L3.75 4l-2.5 2.5L2.75 8l4-4-4-4z'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .carousel-indicators {\n  position: absolute;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 15;\n  display: flex;\n  justify-content: center;\n  padding-left: 0;\n  margin-right: 15%;\n  margin-left: 15%;\n  list-style: none;\n}\n.webcg-devtools .carousel-indicators li {\n  box-sizing: content-box;\n  flex: 0 1 auto;\n  width: 30px;\n  height: 3px;\n  margin-right: 3px;\n  margin-left: 3px;\n  text-indent: -999px;\n  cursor: pointer;\n  background-color: #fff;\n  background-clip: padding-box;\n  border-top: 10px solid transparent;\n  border-bottom: 10px solid transparent;\n  opacity: 0.5;\n  transition: opacity 0.6s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n.webcg-devtools .carousel-indicators li {\n    transition: none;\n}\n}\n.webcg-devtools .carousel-indicators .active {\n  opacity: 1;\n}\n.webcg-devtools .carousel-caption {\n  position: absolute;\n  right: 15%;\n  bottom: 20px;\n  left: 15%;\n  z-index: 10;\n  padding-top: 20px;\n  padding-bottom: 20px;\n  color: #fff;\n  text-align: center;\n}\n@keyframes spinner-border {\nto {\n    transform: rotate(360deg);\n}\n}\n.webcg-devtools .spinner-border {\n  display: inline-block;\n  width: 2rem;\n  height: 2rem;\n  vertical-align: text-bottom;\n  border: 0.25em solid currentColor;\n  border-right-color: transparent;\n  border-radius: 50%;\n  animation: spinner-border 0.75s linear infinite;\n}\n.webcg-devtools .spinner-border-sm {\n  width: 1rem;\n  height: 1rem;\n  border-width: 0.2em;\n}\n@keyframes spinner-grow {\n0% {\n    transform: scale(0);\n}\n50% {\n    opacity: 1;\n}\n}\n.webcg-devtools .spinner-grow {\n  display: inline-block;\n  width: 2rem;\n  height: 2rem;\n  vertical-align: text-bottom;\n  background-color: currentColor;\n  border-radius: 50%;\n  opacity: 0;\n  animation: spinner-grow 0.75s linear infinite;\n}\n.webcg-devtools .spinner-grow-sm {\n  width: 1rem;\n  height: 1rem;\n}\n.webcg-devtools .align-baseline {\n  vertical-align: baseline !important;\n}\n.webcg-devtools .align-top {\n  vertical-align: top !important;\n}\n.webcg-devtools .align-middle {\n  vertical-align: middle !important;\n}\n.webcg-devtools .align-bottom {\n  vertical-align: bottom !important;\n}\n.webcg-devtools .align-text-bottom {\n  vertical-align: text-bottom !important;\n}\n.webcg-devtools .align-text-top {\n  vertical-align: text-top !important;\n}\n.webcg-devtools .bg-primary {\n  background-color: #007bff !important;\n}\n.webcg-devtools a.bg-primary:hover, .webcg-devtools a.bg-primary:focus,\n.webcg-devtools button.bg-primary:hover,\n.webcg-devtools button.bg-primary:focus {\n  background-color: #0062cc !important;\n}\n.webcg-devtools .bg-secondary {\n  background-color: #6c757d !important;\n}\n.webcg-devtools a.bg-secondary:hover, .webcg-devtools a.bg-secondary:focus,\n.webcg-devtools button.bg-secondary:hover,\n.webcg-devtools button.bg-secondary:focus {\n  background-color: #545b62 !important;\n}\n.webcg-devtools .bg-success {\n  background-color: #28a745 !important;\n}\n.webcg-devtools a.bg-success:hover, .webcg-devtools a.bg-success:focus,\n.webcg-devtools button.bg-success:hover,\n.webcg-devtools button.bg-success:focus {\n  background-color: #1e7e34 !important;\n}\n.webcg-devtools .bg-info {\n  background-color: #17a2b8 !important;\n}\n.webcg-devtools a.bg-info:hover, .webcg-devtools a.bg-info:focus,\n.webcg-devtools button.bg-info:hover,\n.webcg-devtools button.bg-info:focus {\n  background-color: #117a8b !important;\n}\n.webcg-devtools .bg-warning {\n  background-color: #ffc107 !important;\n}\n.webcg-devtools a.bg-warning:hover, .webcg-devtools a.bg-warning:focus,\n.webcg-devtools button.bg-warning:hover,\n.webcg-devtools button.bg-warning:focus {\n  background-color: #d39e00 !important;\n}\n.webcg-devtools .bg-danger {\n  background-color: #dc3545 !important;\n}\n.webcg-devtools a.bg-danger:hover, .webcg-devtools a.bg-danger:focus,\n.webcg-devtools button.bg-danger:hover,\n.webcg-devtools button.bg-danger:focus {\n  background-color: #bd2130 !important;\n}\n.webcg-devtools .bg-light {\n  background-color: #f8f9fa !important;\n}\n.webcg-devtools a.bg-light:hover, .webcg-devtools a.bg-light:focus,\n.webcg-devtools button.bg-light:hover,\n.webcg-devtools button.bg-light:focus {\n  background-color: #dae0e5 !important;\n}\n.webcg-devtools .bg-dark {\n  background-color: #343a40 !important;\n}\n.webcg-devtools a.bg-dark:hover, .webcg-devtools a.bg-dark:focus,\n.webcg-devtools button.bg-dark:hover,\n.webcg-devtools button.bg-dark:focus {\n  background-color: #1d2124 !important;\n}\n.webcg-devtools .bg-white {\n  background-color: #fff !important;\n}\n.webcg-devtools .bg-transparent {\n  background-color: transparent !important;\n}\n.webcg-devtools .border {\n  border: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-top {\n  border-top: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-right {\n  border-right: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-bottom {\n  border-bottom: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-left {\n  border-left: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-0 {\n  border: 0 !important;\n}\n.webcg-devtools .border-top-0 {\n  border-top: 0 !important;\n}\n.webcg-devtools .border-right-0 {\n  border-right: 0 !important;\n}\n.webcg-devtools .border-bottom-0 {\n  border-bottom: 0 !important;\n}\n.webcg-devtools .border-left-0 {\n  border-left: 0 !important;\n}\n.webcg-devtools .border-primary {\n  border-color: #007bff !important;\n}\n.webcg-devtools .border-secondary {\n  border-color: #6c757d !important;\n}\n.webcg-devtools .border-success {\n  border-color: #28a745 !important;\n}\n.webcg-devtools .border-info {\n  border-color: #17a2b8 !important;\n}\n.webcg-devtools .border-warning {\n  border-color: #ffc107 !important;\n}\n.webcg-devtools .border-danger {\n  border-color: #dc3545 !important;\n}\n.webcg-devtools .border-light {\n  border-color: #f8f9fa !important;\n}\n.webcg-devtools .border-dark {\n  border-color: #343a40 !important;\n}\n.webcg-devtools .border-white {\n  border-color: #fff !important;\n}\n.webcg-devtools .rounded-sm {\n  border-radius: 0.2rem !important;\n}\n.webcg-devtools .rounded {\n  border-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-top {\n  border-top-left-radius: 0.25rem !important;\n  border-top-right-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-right {\n  border-top-right-radius: 0.25rem !important;\n  border-bottom-right-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-bottom {\n  border-bottom-right-radius: 0.25rem !important;\n  border-bottom-left-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-left {\n  border-top-left-radius: 0.25rem !important;\n  border-bottom-left-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-lg {\n  border-radius: 0.3rem !important;\n}\n.webcg-devtools .rounded-circle {\n  border-radius: 50% !important;\n}\n.webcg-devtools .rounded-pill {\n  border-radius: 50rem !important;\n}\n.webcg-devtools .rounded-0 {\n  border-radius: 0 !important;\n}\n.webcg-devtools .clearfix::after {\n  display: block;\n  clear: both;\n  content: \"\";\n}\n.webcg-devtools .d-none {\n  display: none !important;\n}\n.webcg-devtools .d-inline {\n  display: inline !important;\n}\n.webcg-devtools .d-inline-block {\n  display: inline-block !important;\n}\n.webcg-devtools .d-block {\n  display: block !important;\n}\n.webcg-devtools .d-table {\n  display: table !important;\n}\n.webcg-devtools .d-table-row {\n  display: table-row !important;\n}\n.webcg-devtools .d-table-cell {\n  display: table-cell !important;\n}\n.webcg-devtools .d-flex {\n  display: flex !important;\n}\n.webcg-devtools .d-inline-flex {\n  display: inline-flex !important;\n}\n@media (min-width: 576px) {\n.webcg-devtools .d-sm-none {\n    display: none !important;\n}\n.webcg-devtools .d-sm-inline {\n    display: inline !important;\n}\n.webcg-devtools .d-sm-inline-block {\n    display: inline-block !important;\n}\n.webcg-devtools .d-sm-block {\n    display: block !important;\n}\n.webcg-devtools .d-sm-table {\n    display: table !important;\n}\n.webcg-devtools .d-sm-table-row {\n    display: table-row !important;\n}\n.webcg-devtools .d-sm-table-cell {\n    display: table-cell !important;\n}\n.webcg-devtools .d-sm-flex {\n    display: flex !important;\n}\n.webcg-devtools .d-sm-inline-flex {\n    display: inline-flex !important;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .d-md-none {\n    display: none !important;\n}\n.webcg-devtools .d-md-inline {\n    display: inline !important;\n}\n.webcg-devtools .d-md-inline-block {\n    display: inline-block !important;\n}\n.webcg-devtools .d-md-block {\n    display: block !important;\n}\n.webcg-devtools .d-md-table {\n    display: table !important;\n}\n.webcg-devtools .d-md-table-row {\n    display: table-row !important;\n}\n.webcg-devtools .d-md-table-cell {\n    display: table-cell !important;\n}\n.webcg-devtools .d-md-flex {\n    display: flex !important;\n}\n.webcg-devtools .d-md-inline-flex {\n    display: inline-flex !important;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .d-lg-none {\n    display: none !important;\n}\n.webcg-devtools .d-lg-inline {\n    display: inline !important;\n}\n.webcg-devtools .d-lg-inline-block {\n    display: inline-block !important;\n}\n.webcg-devtools .d-lg-block {\n    display: block !important;\n}\n.webcg-devtools .d-lg-table {\n    display: table !important;\n}\n.webcg-devtools .d-lg-table-row {\n    display: table-row !important;\n}\n.webcg-devtools .d-lg-table-cell {\n    display: table-cell !important;\n}\n.webcg-devtools .d-lg-flex {\n    display: flex !important;\n}\n.webcg-devtools .d-lg-inline-flex {\n    display: inline-flex !important;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .d-xl-none {\n    display: none !important;\n}\n.webcg-devtools .d-xl-inline {\n    display: inline !important;\n}\n.webcg-devtools .d-xl-inline-block {\n    display: inline-block !important;\n}\n.webcg-devtools .d-xl-block {\n    display: block !important;\n}\n.webcg-devtools .d-xl-table {\n    display: table !important;\n}\n.webcg-devtools .d-xl-table-row {\n    display: table-row !important;\n}\n.webcg-devtools .d-xl-table-cell {\n    display: table-cell !important;\n}\n.webcg-devtools .d-xl-flex {\n    display: flex !important;\n}\n.webcg-devtools .d-xl-inline-flex {\n    display: inline-flex !important;\n}\n}\n@media print {\n.webcg-devtools .d-print-none {\n    display: none !important;\n}\n.webcg-devtools .d-print-inline {\n    display: inline !important;\n}\n.webcg-devtools .d-print-inline-block {\n    display: inline-block !important;\n}\n.webcg-devtools .d-print-block {\n    display: block !important;\n}\n.webcg-devtools .d-print-table {\n    display: table !important;\n}\n.webcg-devtools .d-print-table-row {\n    display: table-row !important;\n}\n.webcg-devtools .d-print-table-cell {\n    display: table-cell !important;\n}\n.webcg-devtools .d-print-flex {\n    display: flex !important;\n}\n.webcg-devtools .d-print-inline-flex {\n    display: inline-flex !important;\n}\n}\n.webcg-devtools .embed-responsive {\n  position: relative;\n  display: block;\n  width: 100%;\n  padding: 0;\n  overflow: hidden;\n}\n.webcg-devtools .embed-responsive::before {\n  display: block;\n  content: \"\";\n}\n.webcg-devtools .embed-responsive .embed-responsive-item,\n.webcg-devtools .embed-responsive iframe,\n.webcg-devtools .embed-responsive embed,\n.webcg-devtools .embed-responsive object,\n.webcg-devtools .embed-responsive video {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  border: 0;\n}\n.webcg-devtools .embed-responsive-21by9::before {\n  padding-top: 42.8571428571%;\n}\n.webcg-devtools .embed-responsive-16by9::before {\n  padding-top: 56.25%;\n}\n.webcg-devtools .embed-responsive-4by3::before {\n  padding-top: 75%;\n}\n.webcg-devtools .embed-responsive-1by1::before {\n  padding-top: 100%;\n}\n.webcg-devtools .flex-row {\n  flex-direction: row !important;\n}\n.webcg-devtools .flex-column {\n  flex-direction: column !important;\n}\n.webcg-devtools .flex-row-reverse {\n  flex-direction: row-reverse !important;\n}\n.webcg-devtools .flex-column-reverse {\n  flex-direction: column-reverse !important;\n}\n.webcg-devtools .flex-wrap {\n  flex-wrap: wrap !important;\n}\n.webcg-devtools .flex-nowrap {\n  flex-wrap: nowrap !important;\n}\n.webcg-devtools .flex-wrap-reverse {\n  flex-wrap: wrap-reverse !important;\n}\n.webcg-devtools .flex-fill {\n  flex: 1 1 auto !important;\n}\n.webcg-devtools .flex-grow-0 {\n  flex-grow: 0 !important;\n}\n.webcg-devtools .flex-grow-1 {\n  flex-grow: 1 !important;\n}\n.webcg-devtools .flex-shrink-0 {\n  flex-shrink: 0 !important;\n}\n.webcg-devtools .flex-shrink-1 {\n  flex-shrink: 1 !important;\n}\n.webcg-devtools .justify-content-start {\n  justify-content: flex-start !important;\n}\n.webcg-devtools .justify-content-end {\n  justify-content: flex-end !important;\n}\n.webcg-devtools .justify-content-center {\n  justify-content: center !important;\n}\n.webcg-devtools .justify-content-between {\n  justify-content: space-between !important;\n}\n.webcg-devtools .justify-content-around {\n  justify-content: space-around !important;\n}\n.webcg-devtools .align-items-start {\n  align-items: flex-start !important;\n}\n.webcg-devtools .align-items-end {\n  align-items: flex-end !important;\n}\n.webcg-devtools .align-items-center {\n  align-items: center !important;\n}\n.webcg-devtools .align-items-baseline {\n  align-items: baseline !important;\n}\n.webcg-devtools .align-items-stretch {\n  align-items: stretch !important;\n}\n.webcg-devtools .align-content-start {\n  align-content: flex-start !important;\n}\n.webcg-devtools .align-content-end {\n  align-content: flex-end !important;\n}\n.webcg-devtools .align-content-center {\n  align-content: center !important;\n}\n.webcg-devtools .align-content-between {\n  align-content: space-between !important;\n}\n.webcg-devtools .align-content-around {\n  align-content: space-around !important;\n}\n.webcg-devtools .align-content-stretch {\n  align-content: stretch !important;\n}\n.webcg-devtools .align-self-auto {\n  align-self: auto !important;\n}\n.webcg-devtools .align-self-start {\n  align-self: flex-start !important;\n}\n.webcg-devtools .align-self-end {\n  align-self: flex-end !important;\n}\n.webcg-devtools .align-self-center {\n  align-self: center !important;\n}\n.webcg-devtools .align-self-baseline {\n  align-self: baseline !important;\n}\n.webcg-devtools .align-self-stretch {\n  align-self: stretch !important;\n}\n@media (min-width: 576px) {\n.webcg-devtools .flex-sm-row {\n    flex-direction: row !important;\n}\n.webcg-devtools .flex-sm-column {\n    flex-direction: column !important;\n}\n.webcg-devtools .flex-sm-row-reverse {\n    flex-direction: row-reverse !important;\n}\n.webcg-devtools .flex-sm-column-reverse {\n    flex-direction: column-reverse !important;\n}\n.webcg-devtools .flex-sm-wrap {\n    flex-wrap: wrap !important;\n}\n.webcg-devtools .flex-sm-nowrap {\n    flex-wrap: nowrap !important;\n}\n.webcg-devtools .flex-sm-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n}\n.webcg-devtools .flex-sm-fill {\n    flex: 1 1 auto !important;\n}\n.webcg-devtools .flex-sm-grow-0 {\n    flex-grow: 0 !important;\n}\n.webcg-devtools .flex-sm-grow-1 {\n    flex-grow: 1 !important;\n}\n.webcg-devtools .flex-sm-shrink-0 {\n    flex-shrink: 0 !important;\n}\n.webcg-devtools .flex-sm-shrink-1 {\n    flex-shrink: 1 !important;\n}\n.webcg-devtools .justify-content-sm-start {\n    justify-content: flex-start !important;\n}\n.webcg-devtools .justify-content-sm-end {\n    justify-content: flex-end !important;\n}\n.webcg-devtools .justify-content-sm-center {\n    justify-content: center !important;\n}\n.webcg-devtools .justify-content-sm-between {\n    justify-content: space-between !important;\n}\n.webcg-devtools .justify-content-sm-around {\n    justify-content: space-around !important;\n}\n.webcg-devtools .align-items-sm-start {\n    align-items: flex-start !important;\n}\n.webcg-devtools .align-items-sm-end {\n    align-items: flex-end !important;\n}\n.webcg-devtools .align-items-sm-center {\n    align-items: center !important;\n}\n.webcg-devtools .align-items-sm-baseline {\n    align-items: baseline !important;\n}\n.webcg-devtools .align-items-sm-stretch {\n    align-items: stretch !important;\n}\n.webcg-devtools .align-content-sm-start {\n    align-content: flex-start !important;\n}\n.webcg-devtools .align-content-sm-end {\n    align-content: flex-end !important;\n}\n.webcg-devtools .align-content-sm-center {\n    align-content: center !important;\n}\n.webcg-devtools .align-content-sm-between {\n    align-content: space-between !important;\n}\n.webcg-devtools .align-content-sm-around {\n    align-content: space-around !important;\n}\n.webcg-devtools .align-content-sm-stretch {\n    align-content: stretch !important;\n}\n.webcg-devtools .align-self-sm-auto {\n    align-self: auto !important;\n}\n.webcg-devtools .align-self-sm-start {\n    align-self: flex-start !important;\n}\n.webcg-devtools .align-self-sm-end {\n    align-self: flex-end !important;\n}\n.webcg-devtools .align-self-sm-center {\n    align-self: center !important;\n}\n.webcg-devtools .align-self-sm-baseline {\n    align-self: baseline !important;\n}\n.webcg-devtools .align-self-sm-stretch {\n    align-self: stretch !important;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .flex-md-row {\n    flex-direction: row !important;\n}\n.webcg-devtools .flex-md-column {\n    flex-direction: column !important;\n}\n.webcg-devtools .flex-md-row-reverse {\n    flex-direction: row-reverse !important;\n}\n.webcg-devtools .flex-md-column-reverse {\n    flex-direction: column-reverse !important;\n}\n.webcg-devtools .flex-md-wrap {\n    flex-wrap: wrap !important;\n}\n.webcg-devtools .flex-md-nowrap {\n    flex-wrap: nowrap !important;\n}\n.webcg-devtools .flex-md-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n}\n.webcg-devtools .flex-md-fill {\n    flex: 1 1 auto !important;\n}\n.webcg-devtools .flex-md-grow-0 {\n    flex-grow: 0 !important;\n}\n.webcg-devtools .flex-md-grow-1 {\n    flex-grow: 1 !important;\n}\n.webcg-devtools .flex-md-shrink-0 {\n    flex-shrink: 0 !important;\n}\n.webcg-devtools .flex-md-shrink-1 {\n    flex-shrink: 1 !important;\n}\n.webcg-devtools .justify-content-md-start {\n    justify-content: flex-start !important;\n}\n.webcg-devtools .justify-content-md-end {\n    justify-content: flex-end !important;\n}\n.webcg-devtools .justify-content-md-center {\n    justify-content: center !important;\n}\n.webcg-devtools .justify-content-md-between {\n    justify-content: space-between !important;\n}\n.webcg-devtools .justify-content-md-around {\n    justify-content: space-around !important;\n}\n.webcg-devtools .align-items-md-start {\n    align-items: flex-start !important;\n}\n.webcg-devtools .align-items-md-end {\n    align-items: flex-end !important;\n}\n.webcg-devtools .align-items-md-center {\n    align-items: center !important;\n}\n.webcg-devtools .align-items-md-baseline {\n    align-items: baseline !important;\n}\n.webcg-devtools .align-items-md-stretch {\n    align-items: stretch !important;\n}\n.webcg-devtools .align-content-md-start {\n    align-content: flex-start !important;\n}\n.webcg-devtools .align-content-md-end {\n    align-content: flex-end !important;\n}\n.webcg-devtools .align-content-md-center {\n    align-content: center !important;\n}\n.webcg-devtools .align-content-md-between {\n    align-content: space-between !important;\n}\n.webcg-devtools .align-content-md-around {\n    align-content: space-around !important;\n}\n.webcg-devtools .align-content-md-stretch {\n    align-content: stretch !important;\n}\n.webcg-devtools .align-self-md-auto {\n    align-self: auto !important;\n}\n.webcg-devtools .align-self-md-start {\n    align-self: flex-start !important;\n}\n.webcg-devtools .align-self-md-end {\n    align-self: flex-end !important;\n}\n.webcg-devtools .align-self-md-center {\n    align-self: center !important;\n}\n.webcg-devtools .align-self-md-baseline {\n    align-self: baseline !important;\n}\n.webcg-devtools .align-self-md-stretch {\n    align-self: stretch !important;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .flex-lg-row {\n    flex-direction: row !important;\n}\n.webcg-devtools .flex-lg-column {\n    flex-direction: column !important;\n}\n.webcg-devtools .flex-lg-row-reverse {\n    flex-direction: row-reverse !important;\n}\n.webcg-devtools .flex-lg-column-reverse {\n    flex-direction: column-reverse !important;\n}\n.webcg-devtools .flex-lg-wrap {\n    flex-wrap: wrap !important;\n}\n.webcg-devtools .flex-lg-nowrap {\n    flex-wrap: nowrap !important;\n}\n.webcg-devtools .flex-lg-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n}\n.webcg-devtools .flex-lg-fill {\n    flex: 1 1 auto !important;\n}\n.webcg-devtools .flex-lg-grow-0 {\n    flex-grow: 0 !important;\n}\n.webcg-devtools .flex-lg-grow-1 {\n    flex-grow: 1 !important;\n}\n.webcg-devtools .flex-lg-shrink-0 {\n    flex-shrink: 0 !important;\n}\n.webcg-devtools .flex-lg-shrink-1 {\n    flex-shrink: 1 !important;\n}\n.webcg-devtools .justify-content-lg-start {\n    justify-content: flex-start !important;\n}\n.webcg-devtools .justify-content-lg-end {\n    justify-content: flex-end !important;\n}\n.webcg-devtools .justify-content-lg-center {\n    justify-content: center !important;\n}\n.webcg-devtools .justify-content-lg-between {\n    justify-content: space-between !important;\n}\n.webcg-devtools .justify-content-lg-around {\n    justify-content: space-around !important;\n}\n.webcg-devtools .align-items-lg-start {\n    align-items: flex-start !important;\n}\n.webcg-devtools .align-items-lg-end {\n    align-items: flex-end !important;\n}\n.webcg-devtools .align-items-lg-center {\n    align-items: center !important;\n}\n.webcg-devtools .align-items-lg-baseline {\n    align-items: baseline !important;\n}\n.webcg-devtools .align-items-lg-stretch {\n    align-items: stretch !important;\n}\n.webcg-devtools .align-content-lg-start {\n    align-content: flex-start !important;\n}\n.webcg-devtools .align-content-lg-end {\n    align-content: flex-end !important;\n}\n.webcg-devtools .align-content-lg-center {\n    align-content: center !important;\n}\n.webcg-devtools .align-content-lg-between {\n    align-content: space-between !important;\n}\n.webcg-devtools .align-content-lg-around {\n    align-content: space-around !important;\n}\n.webcg-devtools .align-content-lg-stretch {\n    align-content: stretch !important;\n}\n.webcg-devtools .align-self-lg-auto {\n    align-self: auto !important;\n}\n.webcg-devtools .align-self-lg-start {\n    align-self: flex-start !important;\n}\n.webcg-devtools .align-self-lg-end {\n    align-self: flex-end !important;\n}\n.webcg-devtools .align-self-lg-center {\n    align-self: center !important;\n}\n.webcg-devtools .align-self-lg-baseline {\n    align-self: baseline !important;\n}\n.webcg-devtools .align-self-lg-stretch {\n    align-self: stretch !important;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .flex-xl-row {\n    flex-direction: row !important;\n}\n.webcg-devtools .flex-xl-column {\n    flex-direction: column !important;\n}\n.webcg-devtools .flex-xl-row-reverse {\n    flex-direction: row-reverse !important;\n}\n.webcg-devtools .flex-xl-column-reverse {\n    flex-direction: column-reverse !important;\n}\n.webcg-devtools .flex-xl-wrap {\n    flex-wrap: wrap !important;\n}\n.webcg-devtools .flex-xl-nowrap {\n    flex-wrap: nowrap !important;\n}\n.webcg-devtools .flex-xl-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n}\n.webcg-devtools .flex-xl-fill {\n    flex: 1 1 auto !important;\n}\n.webcg-devtools .flex-xl-grow-0 {\n    flex-grow: 0 !important;\n}\n.webcg-devtools .flex-xl-grow-1 {\n    flex-grow: 1 !important;\n}\n.webcg-devtools .flex-xl-shrink-0 {\n    flex-shrink: 0 !important;\n}\n.webcg-devtools .flex-xl-shrink-1 {\n    flex-shrink: 1 !important;\n}\n.webcg-devtools .justify-content-xl-start {\n    justify-content: flex-start !important;\n}\n.webcg-devtools .justify-content-xl-end {\n    justify-content: flex-end !important;\n}\n.webcg-devtools .justify-content-xl-center {\n    justify-content: center !important;\n}\n.webcg-devtools .justify-content-xl-between {\n    justify-content: space-between !important;\n}\n.webcg-devtools .justify-content-xl-around {\n    justify-content: space-around !important;\n}\n.webcg-devtools .align-items-xl-start {\n    align-items: flex-start !important;\n}\n.webcg-devtools .align-items-xl-end {\n    align-items: flex-end !important;\n}\n.webcg-devtools .align-items-xl-center {\n    align-items: center !important;\n}\n.webcg-devtools .align-items-xl-baseline {\n    align-items: baseline !important;\n}\n.webcg-devtools .align-items-xl-stretch {\n    align-items: stretch !important;\n}\n.webcg-devtools .align-content-xl-start {\n    align-content: flex-start !important;\n}\n.webcg-devtools .align-content-xl-end {\n    align-content: flex-end !important;\n}\n.webcg-devtools .align-content-xl-center {\n    align-content: center !important;\n}\n.webcg-devtools .align-content-xl-between {\n    align-content: space-between !important;\n}\n.webcg-devtools .align-content-xl-around {\n    align-content: space-around !important;\n}\n.webcg-devtools .align-content-xl-stretch {\n    align-content: stretch !important;\n}\n.webcg-devtools .align-self-xl-auto {\n    align-self: auto !important;\n}\n.webcg-devtools .align-self-xl-start {\n    align-self: flex-start !important;\n}\n.webcg-devtools .align-self-xl-end {\n    align-self: flex-end !important;\n}\n.webcg-devtools .align-self-xl-center {\n    align-self: center !important;\n}\n.webcg-devtools .align-self-xl-baseline {\n    align-self: baseline !important;\n}\n.webcg-devtools .align-self-xl-stretch {\n    align-self: stretch !important;\n}\n}\n.webcg-devtools .float-left {\n  float: left !important;\n}\n.webcg-devtools .float-right {\n  float: right !important;\n}\n.webcg-devtools .float-none {\n  float: none !important;\n}\n@media (min-width: 576px) {\n.webcg-devtools .float-sm-left {\n    float: left !important;\n}\n.webcg-devtools .float-sm-right {\n    float: right !important;\n}\n.webcg-devtools .float-sm-none {\n    float: none !important;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .float-md-left {\n    float: left !important;\n}\n.webcg-devtools .float-md-right {\n    float: right !important;\n}\n.webcg-devtools .float-md-none {\n    float: none !important;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .float-lg-left {\n    float: left !important;\n}\n.webcg-devtools .float-lg-right {\n    float: right !important;\n}\n.webcg-devtools .float-lg-none {\n    float: none !important;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .float-xl-left {\n    float: left !important;\n}\n.webcg-devtools .float-xl-right {\n    float: right !important;\n}\n.webcg-devtools .float-xl-none {\n    float: none !important;\n}\n}\n.webcg-devtools .overflow-auto {\n  overflow: auto !important;\n}\n.webcg-devtools .overflow-hidden {\n  overflow: hidden !important;\n}\n.webcg-devtools .position-static {\n  position: static !important;\n}\n.webcg-devtools .position-relative {\n  position: relative !important;\n}\n.webcg-devtools .position-absolute {\n  position: absolute !important;\n}\n.webcg-devtools .position-fixed {\n  position: fixed !important;\n}\n.webcg-devtools .position-sticky {\n  position: sticky !important;\n}\n.webcg-devtools .fixed-top {\n  position: fixed;\n  top: 0;\n  right: 0;\n  left: 0;\n  z-index: 1030;\n}\n.webcg-devtools .fixed-bottom {\n  position: fixed;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1030;\n}\n@supports (position: sticky) {\n.webcg-devtools .sticky-top {\n    position: sticky;\n    top: 0;\n    z-index: 1020;\n}\n}\n.webcg-devtools .sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n.webcg-devtools .sr-only-focusable:active, .webcg-devtools .sr-only-focusable:focus {\n  position: static;\n  width: auto;\n  height: auto;\n  overflow: visible;\n  clip: auto;\n  white-space: normal;\n}\n.webcg-devtools .shadow-sm {\n  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;\n}\n.webcg-devtools .shadow {\n  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;\n}\n.webcg-devtools .shadow-lg {\n  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;\n}\n.webcg-devtools .shadow-none {\n  box-shadow: none !important;\n}\n.webcg-devtools .w-25 {\n  width: 25% !important;\n}\n.webcg-devtools .w-50 {\n  width: 50% !important;\n}\n.webcg-devtools .w-75 {\n  width: 75% !important;\n}\n.webcg-devtools .w-100 {\n  width: 100% !important;\n}\n.webcg-devtools .w-auto {\n  width: auto !important;\n}\n.webcg-devtools .h-25 {\n  height: 25% !important;\n}\n.webcg-devtools .h-50 {\n  height: 50% !important;\n}\n.webcg-devtools .h-75 {\n  height: 75% !important;\n}\n.webcg-devtools .h-100 {\n  height: 100% !important;\n}\n.webcg-devtools .h-auto {\n  height: auto !important;\n}\n.webcg-devtools .mw-100 {\n  max-width: 100% !important;\n}\n.webcg-devtools .mh-100 {\n  max-height: 100% !important;\n}\n.webcg-devtools .min-vw-100 {\n  min-width: 100vw !important;\n}\n.webcg-devtools .min-vh-100 {\n  min-height: 100vh !important;\n}\n.webcg-devtools .vw-100 {\n  width: 100vw !important;\n}\n.webcg-devtools .vh-100 {\n  height: 100vh !important;\n}\n.webcg-devtools .stretched-link::after {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1;\n  pointer-events: auto;\n  content: \"\";\n  background-color: rgba(0, 0, 0, 0);\n}\n.webcg-devtools .m-0 {\n  margin: 0 !important;\n}\n.webcg-devtools .mt-0,\n.webcg-devtools .my-0 {\n  margin-top: 0 !important;\n}\n.webcg-devtools .mr-0,\n.webcg-devtools .mx-0 {\n  margin-right: 0 !important;\n}\n.webcg-devtools .mb-0,\n.webcg-devtools .my-0 {\n  margin-bottom: 0 !important;\n}\n.webcg-devtools .ml-0,\n.webcg-devtools .mx-0 {\n  margin-left: 0 !important;\n}\n.webcg-devtools .m-1 {\n  margin: 0.25rem !important;\n}\n.webcg-devtools .mt-1,\n.webcg-devtools .my-1 {\n  margin-top: 0.25rem !important;\n}\n.webcg-devtools .mr-1,\n.webcg-devtools .mx-1 {\n  margin-right: 0.25rem !important;\n}\n.webcg-devtools .mb-1,\n.webcg-devtools .my-1 {\n  margin-bottom: 0.25rem !important;\n}\n.webcg-devtools .ml-1,\n.webcg-devtools .mx-1 {\n  margin-left: 0.25rem !important;\n}\n.webcg-devtools .m-2 {\n  margin: 0.5rem !important;\n}\n.webcg-devtools .mt-2,\n.webcg-devtools .my-2 {\n  margin-top: 0.5rem !important;\n}\n.webcg-devtools .mr-2,\n.webcg-devtools .mx-2 {\n  margin-right: 0.5rem !important;\n}\n.webcg-devtools .mb-2,\n.webcg-devtools .my-2 {\n  margin-bottom: 0.5rem !important;\n}\n.webcg-devtools .ml-2,\n.webcg-devtools .mx-2 {\n  margin-left: 0.5rem !important;\n}\n.webcg-devtools .m-3 {\n  margin: 1rem !important;\n}\n.webcg-devtools .mt-3,\n.webcg-devtools .my-3 {\n  margin-top: 1rem !important;\n}\n.webcg-devtools .mr-3,\n.webcg-devtools .mx-3 {\n  margin-right: 1rem !important;\n}\n.webcg-devtools .mb-3,\n.webcg-devtools .my-3 {\n  margin-bottom: 1rem !important;\n}\n.webcg-devtools .ml-3,\n.webcg-devtools .mx-3 {\n  margin-left: 1rem !important;\n}\n.webcg-devtools .m-4 {\n  margin: 1.5rem !important;\n}\n.webcg-devtools .mt-4,\n.webcg-devtools .my-4 {\n  margin-top: 1.5rem !important;\n}\n.webcg-devtools .mr-4,\n.webcg-devtools .mx-4 {\n  margin-right: 1.5rem !important;\n}\n.webcg-devtools .mb-4,\n.webcg-devtools .my-4 {\n  margin-bottom: 1.5rem !important;\n}\n.webcg-devtools .ml-4,\n.webcg-devtools .mx-4 {\n  margin-left: 1.5rem !important;\n}\n.webcg-devtools .m-5 {\n  margin: 3rem !important;\n}\n.webcg-devtools .mt-5,\n.webcg-devtools .my-5 {\n  margin-top: 3rem !important;\n}\n.webcg-devtools .mr-5,\n.webcg-devtools .mx-5 {\n  margin-right: 3rem !important;\n}\n.webcg-devtools .mb-5,\n.webcg-devtools .my-5 {\n  margin-bottom: 3rem !important;\n}\n.webcg-devtools .ml-5,\n.webcg-devtools .mx-5 {\n  margin-left: 3rem !important;\n}\n.webcg-devtools .p-0 {\n  padding: 0 !important;\n}\n.webcg-devtools .pt-0,\n.webcg-devtools .py-0 {\n  padding-top: 0 !important;\n}\n.webcg-devtools .pr-0,\n.webcg-devtools .px-0 {\n  padding-right: 0 !important;\n}\n.webcg-devtools .pb-0,\n.webcg-devtools .py-0 {\n  padding-bottom: 0 !important;\n}\n.webcg-devtools .pl-0,\n.webcg-devtools .px-0 {\n  padding-left: 0 !important;\n}\n.webcg-devtools .p-1 {\n  padding: 0.25rem !important;\n}\n.webcg-devtools .pt-1,\n.webcg-devtools .py-1 {\n  padding-top: 0.25rem !important;\n}\n.webcg-devtools .pr-1,\n.webcg-devtools .px-1 {\n  padding-right: 0.25rem !important;\n}\n.webcg-devtools .pb-1,\n.webcg-devtools .py-1 {\n  padding-bottom: 0.25rem !important;\n}\n.webcg-devtools .pl-1,\n.webcg-devtools .px-1 {\n  padding-left: 0.25rem !important;\n}\n.webcg-devtools .p-2 {\n  padding: 0.5rem !important;\n}\n.webcg-devtools .pt-2,\n.webcg-devtools .py-2 {\n  padding-top: 0.5rem !important;\n}\n.webcg-devtools .pr-2,\n.webcg-devtools .px-2 {\n  padding-right: 0.5rem !important;\n}\n.webcg-devtools .pb-2,\n.webcg-devtools .py-2 {\n  padding-bottom: 0.5rem !important;\n}\n.webcg-devtools .pl-2,\n.webcg-devtools .px-2 {\n  padding-left: 0.5rem !important;\n}\n.webcg-devtools .p-3 {\n  padding: 1rem !important;\n}\n.webcg-devtools .pt-3,\n.webcg-devtools .py-3 {\n  padding-top: 1rem !important;\n}\n.webcg-devtools .pr-3,\n.webcg-devtools .px-3 {\n  padding-right: 1rem !important;\n}\n.webcg-devtools .pb-3,\n.webcg-devtools .py-3 {\n  padding-bottom: 1rem !important;\n}\n.webcg-devtools .pl-3,\n.webcg-devtools .px-3 {\n  padding-left: 1rem !important;\n}\n.webcg-devtools .p-4 {\n  padding: 1.5rem !important;\n}\n.webcg-devtools .pt-4,\n.webcg-devtools .py-4 {\n  padding-top: 1.5rem !important;\n}\n.webcg-devtools .pr-4,\n.webcg-devtools .px-4 {\n  padding-right: 1.5rem !important;\n}\n.webcg-devtools .pb-4,\n.webcg-devtools .py-4 {\n  padding-bottom: 1.5rem !important;\n}\n.webcg-devtools .pl-4,\n.webcg-devtools .px-4 {\n  padding-left: 1.5rem !important;\n}\n.webcg-devtools .p-5 {\n  padding: 3rem !important;\n}\n.webcg-devtools .pt-5,\n.webcg-devtools .py-5 {\n  padding-top: 3rem !important;\n}\n.webcg-devtools .pr-5,\n.webcg-devtools .px-5 {\n  padding-right: 3rem !important;\n}\n.webcg-devtools .pb-5,\n.webcg-devtools .py-5 {\n  padding-bottom: 3rem !important;\n}\n.webcg-devtools .pl-5,\n.webcg-devtools .px-5 {\n  padding-left: 3rem !important;\n}\n.webcg-devtools .m-n1 {\n  margin: -0.25rem !important;\n}\n.webcg-devtools .mt-n1,\n.webcg-devtools .my-n1 {\n  margin-top: -0.25rem !important;\n}\n.webcg-devtools .mr-n1,\n.webcg-devtools .mx-n1 {\n  margin-right: -0.25rem !important;\n}\n.webcg-devtools .mb-n1,\n.webcg-devtools .my-n1 {\n  margin-bottom: -0.25rem !important;\n}\n.webcg-devtools .ml-n1,\n.webcg-devtools .mx-n1 {\n  margin-left: -0.25rem !important;\n}\n.webcg-devtools .m-n2 {\n  margin: -0.5rem !important;\n}\n.webcg-devtools .mt-n2,\n.webcg-devtools .my-n2 {\n  margin-top: -0.5rem !important;\n}\n.webcg-devtools .mr-n2,\n.webcg-devtools .mx-n2 {\n  margin-right: -0.5rem !important;\n}\n.webcg-devtools .mb-n2,\n.webcg-devtools .my-n2 {\n  margin-bottom: -0.5rem !important;\n}\n.webcg-devtools .ml-n2,\n.webcg-devtools .mx-n2 {\n  margin-left: -0.5rem !important;\n}\n.webcg-devtools .m-n3 {\n  margin: -1rem !important;\n}\n.webcg-devtools .mt-n3,\n.webcg-devtools .my-n3 {\n  margin-top: -1rem !important;\n}\n.webcg-devtools .mr-n3,\n.webcg-devtools .mx-n3 {\n  margin-right: -1rem !important;\n}\n.webcg-devtools .mb-n3,\n.webcg-devtools .my-n3 {\n  margin-bottom: -1rem !important;\n}\n.webcg-devtools .ml-n3,\n.webcg-devtools .mx-n3 {\n  margin-left: -1rem !important;\n}\n.webcg-devtools .m-n4 {\n  margin: -1.5rem !important;\n}\n.webcg-devtools .mt-n4,\n.webcg-devtools .my-n4 {\n  margin-top: -1.5rem !important;\n}\n.webcg-devtools .mr-n4,\n.webcg-devtools .mx-n4 {\n  margin-right: -1.5rem !important;\n}\n.webcg-devtools .mb-n4,\n.webcg-devtools .my-n4 {\n  margin-bottom: -1.5rem !important;\n}\n.webcg-devtools .ml-n4,\n.webcg-devtools .mx-n4 {\n  margin-left: -1.5rem !important;\n}\n.webcg-devtools .m-n5 {\n  margin: -3rem !important;\n}\n.webcg-devtools .mt-n5,\n.webcg-devtools .my-n5 {\n  margin-top: -3rem !important;\n}\n.webcg-devtools .mr-n5,\n.webcg-devtools .mx-n5 {\n  margin-right: -3rem !important;\n}\n.webcg-devtools .mb-n5,\n.webcg-devtools .my-n5 {\n  margin-bottom: -3rem !important;\n}\n.webcg-devtools .ml-n5,\n.webcg-devtools .mx-n5 {\n  margin-left: -3rem !important;\n}\n.webcg-devtools .m-auto {\n  margin: auto !important;\n}\n.webcg-devtools .mt-auto,\n.webcg-devtools .my-auto {\n  margin-top: auto !important;\n}\n.webcg-devtools .mr-auto,\n.webcg-devtools .mx-auto {\n  margin-right: auto !important;\n}\n.webcg-devtools .mb-auto,\n.webcg-devtools .my-auto {\n  margin-bottom: auto !important;\n}\n.webcg-devtools .ml-auto,\n.webcg-devtools .mx-auto {\n  margin-left: auto !important;\n}\n@media (min-width: 576px) {\n.webcg-devtools .m-sm-0 {\n    margin: 0 !important;\n}\n.webcg-devtools .mt-sm-0,\n.webcg-devtools .my-sm-0 {\n    margin-top: 0 !important;\n}\n.webcg-devtools .mr-sm-0,\n.webcg-devtools .mx-sm-0 {\n    margin-right: 0 !important;\n}\n.webcg-devtools .mb-sm-0,\n.webcg-devtools .my-sm-0 {\n    margin-bottom: 0 !important;\n}\n.webcg-devtools .ml-sm-0,\n.webcg-devtools .mx-sm-0 {\n    margin-left: 0 !important;\n}\n.webcg-devtools .m-sm-1 {\n    margin: 0.25rem !important;\n}\n.webcg-devtools .mt-sm-1,\n.webcg-devtools .my-sm-1 {\n    margin-top: 0.25rem !important;\n}\n.webcg-devtools .mr-sm-1,\n.webcg-devtools .mx-sm-1 {\n    margin-right: 0.25rem !important;\n}\n.webcg-devtools .mb-sm-1,\n.webcg-devtools .my-sm-1 {\n    margin-bottom: 0.25rem !important;\n}\n.webcg-devtools .ml-sm-1,\n.webcg-devtools .mx-sm-1 {\n    margin-left: 0.25rem !important;\n}\n.webcg-devtools .m-sm-2 {\n    margin: 0.5rem !important;\n}\n.webcg-devtools .mt-sm-2,\n.webcg-devtools .my-sm-2 {\n    margin-top: 0.5rem !important;\n}\n.webcg-devtools .mr-sm-2,\n.webcg-devtools .mx-sm-2 {\n    margin-right: 0.5rem !important;\n}\n.webcg-devtools .mb-sm-2,\n.webcg-devtools .my-sm-2 {\n    margin-bottom: 0.5rem !important;\n}\n.webcg-devtools .ml-sm-2,\n.webcg-devtools .mx-sm-2 {\n    margin-left: 0.5rem !important;\n}\n.webcg-devtools .m-sm-3 {\n    margin: 1rem !important;\n}\n.webcg-devtools .mt-sm-3,\n.webcg-devtools .my-sm-3 {\n    margin-top: 1rem !important;\n}\n.webcg-devtools .mr-sm-3,\n.webcg-devtools .mx-sm-3 {\n    margin-right: 1rem !important;\n}\n.webcg-devtools .mb-sm-3,\n.webcg-devtools .my-sm-3 {\n    margin-bottom: 1rem !important;\n}\n.webcg-devtools .ml-sm-3,\n.webcg-devtools .mx-sm-3 {\n    margin-left: 1rem !important;\n}\n.webcg-devtools .m-sm-4 {\n    margin: 1.5rem !important;\n}\n.webcg-devtools .mt-sm-4,\n.webcg-devtools .my-sm-4 {\n    margin-top: 1.5rem !important;\n}\n.webcg-devtools .mr-sm-4,\n.webcg-devtools .mx-sm-4 {\n    margin-right: 1.5rem !important;\n}\n.webcg-devtools .mb-sm-4,\n.webcg-devtools .my-sm-4 {\n    margin-bottom: 1.5rem !important;\n}\n.webcg-devtools .ml-sm-4,\n.webcg-devtools .mx-sm-4 {\n    margin-left: 1.5rem !important;\n}\n.webcg-devtools .m-sm-5 {\n    margin: 3rem !important;\n}\n.webcg-devtools .mt-sm-5,\n.webcg-devtools .my-sm-5 {\n    margin-top: 3rem !important;\n}\n.webcg-devtools .mr-sm-5,\n.webcg-devtools .mx-sm-5 {\n    margin-right: 3rem !important;\n}\n.webcg-devtools .mb-sm-5,\n.webcg-devtools .my-sm-5 {\n    margin-bottom: 3rem !important;\n}\n.webcg-devtools .ml-sm-5,\n.webcg-devtools .mx-sm-5 {\n    margin-left: 3rem !important;\n}\n.webcg-devtools .p-sm-0 {\n    padding: 0 !important;\n}\n.webcg-devtools .pt-sm-0,\n.webcg-devtools .py-sm-0 {\n    padding-top: 0 !important;\n}\n.webcg-devtools .pr-sm-0,\n.webcg-devtools .px-sm-0 {\n    padding-right: 0 !important;\n}\n.webcg-devtools .pb-sm-0,\n.webcg-devtools .py-sm-0 {\n    padding-bottom: 0 !important;\n}\n.webcg-devtools .pl-sm-0,\n.webcg-devtools .px-sm-0 {\n    padding-left: 0 !important;\n}\n.webcg-devtools .p-sm-1 {\n    padding: 0.25rem !important;\n}\n.webcg-devtools .pt-sm-1,\n.webcg-devtools .py-sm-1 {\n    padding-top: 0.25rem !important;\n}\n.webcg-devtools .pr-sm-1,\n.webcg-devtools .px-sm-1 {\n    padding-right: 0.25rem !important;\n}\n.webcg-devtools .pb-sm-1,\n.webcg-devtools .py-sm-1 {\n    padding-bottom: 0.25rem !important;\n}\n.webcg-devtools .pl-sm-1,\n.webcg-devtools .px-sm-1 {\n    padding-left: 0.25rem !important;\n}\n.webcg-devtools .p-sm-2 {\n    padding: 0.5rem !important;\n}\n.webcg-devtools .pt-sm-2,\n.webcg-devtools .py-sm-2 {\n    padding-top: 0.5rem !important;\n}\n.webcg-devtools .pr-sm-2,\n.webcg-devtools .px-sm-2 {\n    padding-right: 0.5rem !important;\n}\n.webcg-devtools .pb-sm-2,\n.webcg-devtools .py-sm-2 {\n    padding-bottom: 0.5rem !important;\n}\n.webcg-devtools .pl-sm-2,\n.webcg-devtools .px-sm-2 {\n    padding-left: 0.5rem !important;\n}\n.webcg-devtools .p-sm-3 {\n    padding: 1rem !important;\n}\n.webcg-devtools .pt-sm-3,\n.webcg-devtools .py-sm-3 {\n    padding-top: 1rem !important;\n}\n.webcg-devtools .pr-sm-3,\n.webcg-devtools .px-sm-3 {\n    padding-right: 1rem !important;\n}\n.webcg-devtools .pb-sm-3,\n.webcg-devtools .py-sm-3 {\n    padding-bottom: 1rem !important;\n}\n.webcg-devtools .pl-sm-3,\n.webcg-devtools .px-sm-3 {\n    padding-left: 1rem !important;\n}\n.webcg-devtools .p-sm-4 {\n    padding: 1.5rem !important;\n}\n.webcg-devtools .pt-sm-4,\n.webcg-devtools .py-sm-4 {\n    padding-top: 1.5rem !important;\n}\n.webcg-devtools .pr-sm-4,\n.webcg-devtools .px-sm-4 {\n    padding-right: 1.5rem !important;\n}\n.webcg-devtools .pb-sm-4,\n.webcg-devtools .py-sm-4 {\n    padding-bottom: 1.5rem !important;\n}\n.webcg-devtools .pl-sm-4,\n.webcg-devtools .px-sm-4 {\n    padding-left: 1.5rem !important;\n}\n.webcg-devtools .p-sm-5 {\n    padding: 3rem !important;\n}\n.webcg-devtools .pt-sm-5,\n.webcg-devtools .py-sm-5 {\n    padding-top: 3rem !important;\n}\n.webcg-devtools .pr-sm-5,\n.webcg-devtools .px-sm-5 {\n    padding-right: 3rem !important;\n}\n.webcg-devtools .pb-sm-5,\n.webcg-devtools .py-sm-5 {\n    padding-bottom: 3rem !important;\n}\n.webcg-devtools .pl-sm-5,\n.webcg-devtools .px-sm-5 {\n    padding-left: 3rem !important;\n}\n.webcg-devtools .m-sm-n1 {\n    margin: -0.25rem !important;\n}\n.webcg-devtools .mt-sm-n1,\n.webcg-devtools .my-sm-n1 {\n    margin-top: -0.25rem !important;\n}\n.webcg-devtools .mr-sm-n1,\n.webcg-devtools .mx-sm-n1 {\n    margin-right: -0.25rem !important;\n}\n.webcg-devtools .mb-sm-n1,\n.webcg-devtools .my-sm-n1 {\n    margin-bottom: -0.25rem !important;\n}\n.webcg-devtools .ml-sm-n1,\n.webcg-devtools .mx-sm-n1 {\n    margin-left: -0.25rem !important;\n}\n.webcg-devtools .m-sm-n2 {\n    margin: -0.5rem !important;\n}\n.webcg-devtools .mt-sm-n2,\n.webcg-devtools .my-sm-n2 {\n    margin-top: -0.5rem !important;\n}\n.webcg-devtools .mr-sm-n2,\n.webcg-devtools .mx-sm-n2 {\n    margin-right: -0.5rem !important;\n}\n.webcg-devtools .mb-sm-n2,\n.webcg-devtools .my-sm-n2 {\n    margin-bottom: -0.5rem !important;\n}\n.webcg-devtools .ml-sm-n2,\n.webcg-devtools .mx-sm-n2 {\n    margin-left: -0.5rem !important;\n}\n.webcg-devtools .m-sm-n3 {\n    margin: -1rem !important;\n}\n.webcg-devtools .mt-sm-n3,\n.webcg-devtools .my-sm-n3 {\n    margin-top: -1rem !important;\n}\n.webcg-devtools .mr-sm-n3,\n.webcg-devtools .mx-sm-n3 {\n    margin-right: -1rem !important;\n}\n.webcg-devtools .mb-sm-n3,\n.webcg-devtools .my-sm-n3 {\n    margin-bottom: -1rem !important;\n}\n.webcg-devtools .ml-sm-n3,\n.webcg-devtools .mx-sm-n3 {\n    margin-left: -1rem !important;\n}\n.webcg-devtools .m-sm-n4 {\n    margin: -1.5rem !important;\n}\n.webcg-devtools .mt-sm-n4,\n.webcg-devtools .my-sm-n4 {\n    margin-top: -1.5rem !important;\n}\n.webcg-devtools .mr-sm-n4,\n.webcg-devtools .mx-sm-n4 {\n    margin-right: -1.5rem !important;\n}\n.webcg-devtools .mb-sm-n4,\n.webcg-devtools .my-sm-n4 {\n    margin-bottom: -1.5rem !important;\n}\n.webcg-devtools .ml-sm-n4,\n.webcg-devtools .mx-sm-n4 {\n    margin-left: -1.5rem !important;\n}\n.webcg-devtools .m-sm-n5 {\n    margin: -3rem !important;\n}\n.webcg-devtools .mt-sm-n5,\n.webcg-devtools .my-sm-n5 {\n    margin-top: -3rem !important;\n}\n.webcg-devtools .mr-sm-n5,\n.webcg-devtools .mx-sm-n5 {\n    margin-right: -3rem !important;\n}\n.webcg-devtools .mb-sm-n5,\n.webcg-devtools .my-sm-n5 {\n    margin-bottom: -3rem !important;\n}\n.webcg-devtools .ml-sm-n5,\n.webcg-devtools .mx-sm-n5 {\n    margin-left: -3rem !important;\n}\n.webcg-devtools .m-sm-auto {\n    margin: auto !important;\n}\n.webcg-devtools .mt-sm-auto,\n.webcg-devtools .my-sm-auto {\n    margin-top: auto !important;\n}\n.webcg-devtools .mr-sm-auto,\n.webcg-devtools .mx-sm-auto {\n    margin-right: auto !important;\n}\n.webcg-devtools .mb-sm-auto,\n.webcg-devtools .my-sm-auto {\n    margin-bottom: auto !important;\n}\n.webcg-devtools .ml-sm-auto,\n.webcg-devtools .mx-sm-auto {\n    margin-left: auto !important;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .m-md-0 {\n    margin: 0 !important;\n}\n.webcg-devtools .mt-md-0,\n.webcg-devtools .my-md-0 {\n    margin-top: 0 !important;\n}\n.webcg-devtools .mr-md-0,\n.webcg-devtools .mx-md-0 {\n    margin-right: 0 !important;\n}\n.webcg-devtools .mb-md-0,\n.webcg-devtools .my-md-0 {\n    margin-bottom: 0 !important;\n}\n.webcg-devtools .ml-md-0,\n.webcg-devtools .mx-md-0 {\n    margin-left: 0 !important;\n}\n.webcg-devtools .m-md-1 {\n    margin: 0.25rem !important;\n}\n.webcg-devtools .mt-md-1,\n.webcg-devtools .my-md-1 {\n    margin-top: 0.25rem !important;\n}\n.webcg-devtools .mr-md-1,\n.webcg-devtools .mx-md-1 {\n    margin-right: 0.25rem !important;\n}\n.webcg-devtools .mb-md-1,\n.webcg-devtools .my-md-1 {\n    margin-bottom: 0.25rem !important;\n}\n.webcg-devtools .ml-md-1,\n.webcg-devtools .mx-md-1 {\n    margin-left: 0.25rem !important;\n}\n.webcg-devtools .m-md-2 {\n    margin: 0.5rem !important;\n}\n.webcg-devtools .mt-md-2,\n.webcg-devtools .my-md-2 {\n    margin-top: 0.5rem !important;\n}\n.webcg-devtools .mr-md-2,\n.webcg-devtools .mx-md-2 {\n    margin-right: 0.5rem !important;\n}\n.webcg-devtools .mb-md-2,\n.webcg-devtools .my-md-2 {\n    margin-bottom: 0.5rem !important;\n}\n.webcg-devtools .ml-md-2,\n.webcg-devtools .mx-md-2 {\n    margin-left: 0.5rem !important;\n}\n.webcg-devtools .m-md-3 {\n    margin: 1rem !important;\n}\n.webcg-devtools .mt-md-3,\n.webcg-devtools .my-md-3 {\n    margin-top: 1rem !important;\n}\n.webcg-devtools .mr-md-3,\n.webcg-devtools .mx-md-3 {\n    margin-right: 1rem !important;\n}\n.webcg-devtools .mb-md-3,\n.webcg-devtools .my-md-3 {\n    margin-bottom: 1rem !important;\n}\n.webcg-devtools .ml-md-3,\n.webcg-devtools .mx-md-3 {\n    margin-left: 1rem !important;\n}\n.webcg-devtools .m-md-4 {\n    margin: 1.5rem !important;\n}\n.webcg-devtools .mt-md-4,\n.webcg-devtools .my-md-4 {\n    margin-top: 1.5rem !important;\n}\n.webcg-devtools .mr-md-4,\n.webcg-devtools .mx-md-4 {\n    margin-right: 1.5rem !important;\n}\n.webcg-devtools .mb-md-4,\n.webcg-devtools .my-md-4 {\n    margin-bottom: 1.5rem !important;\n}\n.webcg-devtools .ml-md-4,\n.webcg-devtools .mx-md-4 {\n    margin-left: 1.5rem !important;\n}\n.webcg-devtools .m-md-5 {\n    margin: 3rem !important;\n}\n.webcg-devtools .mt-md-5,\n.webcg-devtools .my-md-5 {\n    margin-top: 3rem !important;\n}\n.webcg-devtools .mr-md-5,\n.webcg-devtools .mx-md-5 {\n    margin-right: 3rem !important;\n}\n.webcg-devtools .mb-md-5,\n.webcg-devtools .my-md-5 {\n    margin-bottom: 3rem !important;\n}\n.webcg-devtools .ml-md-5,\n.webcg-devtools .mx-md-5 {\n    margin-left: 3rem !important;\n}\n.webcg-devtools .p-md-0 {\n    padding: 0 !important;\n}\n.webcg-devtools .pt-md-0,\n.webcg-devtools .py-md-0 {\n    padding-top: 0 !important;\n}\n.webcg-devtools .pr-md-0,\n.webcg-devtools .px-md-0 {\n    padding-right: 0 !important;\n}\n.webcg-devtools .pb-md-0,\n.webcg-devtools .py-md-0 {\n    padding-bottom: 0 !important;\n}\n.webcg-devtools .pl-md-0,\n.webcg-devtools .px-md-0 {\n    padding-left: 0 !important;\n}\n.webcg-devtools .p-md-1 {\n    padding: 0.25rem !important;\n}\n.webcg-devtools .pt-md-1,\n.webcg-devtools .py-md-1 {\n    padding-top: 0.25rem !important;\n}\n.webcg-devtools .pr-md-1,\n.webcg-devtools .px-md-1 {\n    padding-right: 0.25rem !important;\n}\n.webcg-devtools .pb-md-1,\n.webcg-devtools .py-md-1 {\n    padding-bottom: 0.25rem !important;\n}\n.webcg-devtools .pl-md-1,\n.webcg-devtools .px-md-1 {\n    padding-left: 0.25rem !important;\n}\n.webcg-devtools .p-md-2 {\n    padding: 0.5rem !important;\n}\n.webcg-devtools .pt-md-2,\n.webcg-devtools .py-md-2 {\n    padding-top: 0.5rem !important;\n}\n.webcg-devtools .pr-md-2,\n.webcg-devtools .px-md-2 {\n    padding-right: 0.5rem !important;\n}\n.webcg-devtools .pb-md-2,\n.webcg-devtools .py-md-2 {\n    padding-bottom: 0.5rem !important;\n}\n.webcg-devtools .pl-md-2,\n.webcg-devtools .px-md-2 {\n    padding-left: 0.5rem !important;\n}\n.webcg-devtools .p-md-3 {\n    padding: 1rem !important;\n}\n.webcg-devtools .pt-md-3,\n.webcg-devtools .py-md-3 {\n    padding-top: 1rem !important;\n}\n.webcg-devtools .pr-md-3,\n.webcg-devtools .px-md-3 {\n    padding-right: 1rem !important;\n}\n.webcg-devtools .pb-md-3,\n.webcg-devtools .py-md-3 {\n    padding-bottom: 1rem !important;\n}\n.webcg-devtools .pl-md-3,\n.webcg-devtools .px-md-3 {\n    padding-left: 1rem !important;\n}\n.webcg-devtools .p-md-4 {\n    padding: 1.5rem !important;\n}\n.webcg-devtools .pt-md-4,\n.webcg-devtools .py-md-4 {\n    padding-top: 1.5rem !important;\n}\n.webcg-devtools .pr-md-4,\n.webcg-devtools .px-md-4 {\n    padding-right: 1.5rem !important;\n}\n.webcg-devtools .pb-md-4,\n.webcg-devtools .py-md-4 {\n    padding-bottom: 1.5rem !important;\n}\n.webcg-devtools .pl-md-4,\n.webcg-devtools .px-md-4 {\n    padding-left: 1.5rem !important;\n}\n.webcg-devtools .p-md-5 {\n    padding: 3rem !important;\n}\n.webcg-devtools .pt-md-5,\n.webcg-devtools .py-md-5 {\n    padding-top: 3rem !important;\n}\n.webcg-devtools .pr-md-5,\n.webcg-devtools .px-md-5 {\n    padding-right: 3rem !important;\n}\n.webcg-devtools .pb-md-5,\n.webcg-devtools .py-md-5 {\n    padding-bottom: 3rem !important;\n}\n.webcg-devtools .pl-md-5,\n.webcg-devtools .px-md-5 {\n    padding-left: 3rem !important;\n}\n.webcg-devtools .m-md-n1 {\n    margin: -0.25rem !important;\n}\n.webcg-devtools .mt-md-n1,\n.webcg-devtools .my-md-n1 {\n    margin-top: -0.25rem !important;\n}\n.webcg-devtools .mr-md-n1,\n.webcg-devtools .mx-md-n1 {\n    margin-right: -0.25rem !important;\n}\n.webcg-devtools .mb-md-n1,\n.webcg-devtools .my-md-n1 {\n    margin-bottom: -0.25rem !important;\n}\n.webcg-devtools .ml-md-n1,\n.webcg-devtools .mx-md-n1 {\n    margin-left: -0.25rem !important;\n}\n.webcg-devtools .m-md-n2 {\n    margin: -0.5rem !important;\n}\n.webcg-devtools .mt-md-n2,\n.webcg-devtools .my-md-n2 {\n    margin-top: -0.5rem !important;\n}\n.webcg-devtools .mr-md-n2,\n.webcg-devtools .mx-md-n2 {\n    margin-right: -0.5rem !important;\n}\n.webcg-devtools .mb-md-n2,\n.webcg-devtools .my-md-n2 {\n    margin-bottom: -0.5rem !important;\n}\n.webcg-devtools .ml-md-n2,\n.webcg-devtools .mx-md-n2 {\n    margin-left: -0.5rem !important;\n}\n.webcg-devtools .m-md-n3 {\n    margin: -1rem !important;\n}\n.webcg-devtools .mt-md-n3,\n.webcg-devtools .my-md-n3 {\n    margin-top: -1rem !important;\n}\n.webcg-devtools .mr-md-n3,\n.webcg-devtools .mx-md-n3 {\n    margin-right: -1rem !important;\n}\n.webcg-devtools .mb-md-n3,\n.webcg-devtools .my-md-n3 {\n    margin-bottom: -1rem !important;\n}\n.webcg-devtools .ml-md-n3,\n.webcg-devtools .mx-md-n3 {\n    margin-left: -1rem !important;\n}\n.webcg-devtools .m-md-n4 {\n    margin: -1.5rem !important;\n}\n.webcg-devtools .mt-md-n4,\n.webcg-devtools .my-md-n4 {\n    margin-top: -1.5rem !important;\n}\n.webcg-devtools .mr-md-n4,\n.webcg-devtools .mx-md-n4 {\n    margin-right: -1.5rem !important;\n}\n.webcg-devtools .mb-md-n4,\n.webcg-devtools .my-md-n4 {\n    margin-bottom: -1.5rem !important;\n}\n.webcg-devtools .ml-md-n4,\n.webcg-devtools .mx-md-n4 {\n    margin-left: -1.5rem !important;\n}\n.webcg-devtools .m-md-n5 {\n    margin: -3rem !important;\n}\n.webcg-devtools .mt-md-n5,\n.webcg-devtools .my-md-n5 {\n    margin-top: -3rem !important;\n}\n.webcg-devtools .mr-md-n5,\n.webcg-devtools .mx-md-n5 {\n    margin-right: -3rem !important;\n}\n.webcg-devtools .mb-md-n5,\n.webcg-devtools .my-md-n5 {\n    margin-bottom: -3rem !important;\n}\n.webcg-devtools .ml-md-n5,\n.webcg-devtools .mx-md-n5 {\n    margin-left: -3rem !important;\n}\n.webcg-devtools .m-md-auto {\n    margin: auto !important;\n}\n.webcg-devtools .mt-md-auto,\n.webcg-devtools .my-md-auto {\n    margin-top: auto !important;\n}\n.webcg-devtools .mr-md-auto,\n.webcg-devtools .mx-md-auto {\n    margin-right: auto !important;\n}\n.webcg-devtools .mb-md-auto,\n.webcg-devtools .my-md-auto {\n    margin-bottom: auto !important;\n}\n.webcg-devtools .ml-md-auto,\n.webcg-devtools .mx-md-auto {\n    margin-left: auto !important;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .m-lg-0 {\n    margin: 0 !important;\n}\n.webcg-devtools .mt-lg-0,\n.webcg-devtools .my-lg-0 {\n    margin-top: 0 !important;\n}\n.webcg-devtools .mr-lg-0,\n.webcg-devtools .mx-lg-0 {\n    margin-right: 0 !important;\n}\n.webcg-devtools .mb-lg-0,\n.webcg-devtools .my-lg-0 {\n    margin-bottom: 0 !important;\n}\n.webcg-devtools .ml-lg-0,\n.webcg-devtools .mx-lg-0 {\n    margin-left: 0 !important;\n}\n.webcg-devtools .m-lg-1 {\n    margin: 0.25rem !important;\n}\n.webcg-devtools .mt-lg-1,\n.webcg-devtools .my-lg-1 {\n    margin-top: 0.25rem !important;\n}\n.webcg-devtools .mr-lg-1,\n.webcg-devtools .mx-lg-1 {\n    margin-right: 0.25rem !important;\n}\n.webcg-devtools .mb-lg-1,\n.webcg-devtools .my-lg-1 {\n    margin-bottom: 0.25rem !important;\n}\n.webcg-devtools .ml-lg-1,\n.webcg-devtools .mx-lg-1 {\n    margin-left: 0.25rem !important;\n}\n.webcg-devtools .m-lg-2 {\n    margin: 0.5rem !important;\n}\n.webcg-devtools .mt-lg-2,\n.webcg-devtools .my-lg-2 {\n    margin-top: 0.5rem !important;\n}\n.webcg-devtools .mr-lg-2,\n.webcg-devtools .mx-lg-2 {\n    margin-right: 0.5rem !important;\n}\n.webcg-devtools .mb-lg-2,\n.webcg-devtools .my-lg-2 {\n    margin-bottom: 0.5rem !important;\n}\n.webcg-devtools .ml-lg-2,\n.webcg-devtools .mx-lg-2 {\n    margin-left: 0.5rem !important;\n}\n.webcg-devtools .m-lg-3 {\n    margin: 1rem !important;\n}\n.webcg-devtools .mt-lg-3,\n.webcg-devtools .my-lg-3 {\n    margin-top: 1rem !important;\n}\n.webcg-devtools .mr-lg-3,\n.webcg-devtools .mx-lg-3 {\n    margin-right: 1rem !important;\n}\n.webcg-devtools .mb-lg-3,\n.webcg-devtools .my-lg-3 {\n    margin-bottom: 1rem !important;\n}\n.webcg-devtools .ml-lg-3,\n.webcg-devtools .mx-lg-3 {\n    margin-left: 1rem !important;\n}\n.webcg-devtools .m-lg-4 {\n    margin: 1.5rem !important;\n}\n.webcg-devtools .mt-lg-4,\n.webcg-devtools .my-lg-4 {\n    margin-top: 1.5rem !important;\n}\n.webcg-devtools .mr-lg-4,\n.webcg-devtools .mx-lg-4 {\n    margin-right: 1.5rem !important;\n}\n.webcg-devtools .mb-lg-4,\n.webcg-devtools .my-lg-4 {\n    margin-bottom: 1.5rem !important;\n}\n.webcg-devtools .ml-lg-4,\n.webcg-devtools .mx-lg-4 {\n    margin-left: 1.5rem !important;\n}\n.webcg-devtools .m-lg-5 {\n    margin: 3rem !important;\n}\n.webcg-devtools .mt-lg-5,\n.webcg-devtools .my-lg-5 {\n    margin-top: 3rem !important;\n}\n.webcg-devtools .mr-lg-5,\n.webcg-devtools .mx-lg-5 {\n    margin-right: 3rem !important;\n}\n.webcg-devtools .mb-lg-5,\n.webcg-devtools .my-lg-5 {\n    margin-bottom: 3rem !important;\n}\n.webcg-devtools .ml-lg-5,\n.webcg-devtools .mx-lg-5 {\n    margin-left: 3rem !important;\n}\n.webcg-devtools .p-lg-0 {\n    padding: 0 !important;\n}\n.webcg-devtools .pt-lg-0,\n.webcg-devtools .py-lg-0 {\n    padding-top: 0 !important;\n}\n.webcg-devtools .pr-lg-0,\n.webcg-devtools .px-lg-0 {\n    padding-right: 0 !important;\n}\n.webcg-devtools .pb-lg-0,\n.webcg-devtools .py-lg-0 {\n    padding-bottom: 0 !important;\n}\n.webcg-devtools .pl-lg-0,\n.webcg-devtools .px-lg-0 {\n    padding-left: 0 !important;\n}\n.webcg-devtools .p-lg-1 {\n    padding: 0.25rem !important;\n}\n.webcg-devtools .pt-lg-1,\n.webcg-devtools .py-lg-1 {\n    padding-top: 0.25rem !important;\n}\n.webcg-devtools .pr-lg-1,\n.webcg-devtools .px-lg-1 {\n    padding-right: 0.25rem !important;\n}\n.webcg-devtools .pb-lg-1,\n.webcg-devtools .py-lg-1 {\n    padding-bottom: 0.25rem !important;\n}\n.webcg-devtools .pl-lg-1,\n.webcg-devtools .px-lg-1 {\n    padding-left: 0.25rem !important;\n}\n.webcg-devtools .p-lg-2 {\n    padding: 0.5rem !important;\n}\n.webcg-devtools .pt-lg-2,\n.webcg-devtools .py-lg-2 {\n    padding-top: 0.5rem !important;\n}\n.webcg-devtools .pr-lg-2,\n.webcg-devtools .px-lg-2 {\n    padding-right: 0.5rem !important;\n}\n.webcg-devtools .pb-lg-2,\n.webcg-devtools .py-lg-2 {\n    padding-bottom: 0.5rem !important;\n}\n.webcg-devtools .pl-lg-2,\n.webcg-devtools .px-lg-2 {\n    padding-left: 0.5rem !important;\n}\n.webcg-devtools .p-lg-3 {\n    padding: 1rem !important;\n}\n.webcg-devtools .pt-lg-3,\n.webcg-devtools .py-lg-3 {\n    padding-top: 1rem !important;\n}\n.webcg-devtools .pr-lg-3,\n.webcg-devtools .px-lg-3 {\n    padding-right: 1rem !important;\n}\n.webcg-devtools .pb-lg-3,\n.webcg-devtools .py-lg-3 {\n    padding-bottom: 1rem !important;\n}\n.webcg-devtools .pl-lg-3,\n.webcg-devtools .px-lg-3 {\n    padding-left: 1rem !important;\n}\n.webcg-devtools .p-lg-4 {\n    padding: 1.5rem !important;\n}\n.webcg-devtools .pt-lg-4,\n.webcg-devtools .py-lg-4 {\n    padding-top: 1.5rem !important;\n}\n.webcg-devtools .pr-lg-4,\n.webcg-devtools .px-lg-4 {\n    padding-right: 1.5rem !important;\n}\n.webcg-devtools .pb-lg-4,\n.webcg-devtools .py-lg-4 {\n    padding-bottom: 1.5rem !important;\n}\n.webcg-devtools .pl-lg-4,\n.webcg-devtools .px-lg-4 {\n    padding-left: 1.5rem !important;\n}\n.webcg-devtools .p-lg-5 {\n    padding: 3rem !important;\n}\n.webcg-devtools .pt-lg-5,\n.webcg-devtools .py-lg-5 {\n    padding-top: 3rem !important;\n}\n.webcg-devtools .pr-lg-5,\n.webcg-devtools .px-lg-5 {\n    padding-right: 3rem !important;\n}\n.webcg-devtools .pb-lg-5,\n.webcg-devtools .py-lg-5 {\n    padding-bottom: 3rem !important;\n}\n.webcg-devtools .pl-lg-5,\n.webcg-devtools .px-lg-5 {\n    padding-left: 3rem !important;\n}\n.webcg-devtools .m-lg-n1 {\n    margin: -0.25rem !important;\n}\n.webcg-devtools .mt-lg-n1,\n.webcg-devtools .my-lg-n1 {\n    margin-top: -0.25rem !important;\n}\n.webcg-devtools .mr-lg-n1,\n.webcg-devtools .mx-lg-n1 {\n    margin-right: -0.25rem !important;\n}\n.webcg-devtools .mb-lg-n1,\n.webcg-devtools .my-lg-n1 {\n    margin-bottom: -0.25rem !important;\n}\n.webcg-devtools .ml-lg-n1,\n.webcg-devtools .mx-lg-n1 {\n    margin-left: -0.25rem !important;\n}\n.webcg-devtools .m-lg-n2 {\n    margin: -0.5rem !important;\n}\n.webcg-devtools .mt-lg-n2,\n.webcg-devtools .my-lg-n2 {\n    margin-top: -0.5rem !important;\n}\n.webcg-devtools .mr-lg-n2,\n.webcg-devtools .mx-lg-n2 {\n    margin-right: -0.5rem !important;\n}\n.webcg-devtools .mb-lg-n2,\n.webcg-devtools .my-lg-n2 {\n    margin-bottom: -0.5rem !important;\n}\n.webcg-devtools .ml-lg-n2,\n.webcg-devtools .mx-lg-n2 {\n    margin-left: -0.5rem !important;\n}\n.webcg-devtools .m-lg-n3 {\n    margin: -1rem !important;\n}\n.webcg-devtools .mt-lg-n3,\n.webcg-devtools .my-lg-n3 {\n    margin-top: -1rem !important;\n}\n.webcg-devtools .mr-lg-n3,\n.webcg-devtools .mx-lg-n3 {\n    margin-right: -1rem !important;\n}\n.webcg-devtools .mb-lg-n3,\n.webcg-devtools .my-lg-n3 {\n    margin-bottom: -1rem !important;\n}\n.webcg-devtools .ml-lg-n3,\n.webcg-devtools .mx-lg-n3 {\n    margin-left: -1rem !important;\n}\n.webcg-devtools .m-lg-n4 {\n    margin: -1.5rem !important;\n}\n.webcg-devtools .mt-lg-n4,\n.webcg-devtools .my-lg-n4 {\n    margin-top: -1.5rem !important;\n}\n.webcg-devtools .mr-lg-n4,\n.webcg-devtools .mx-lg-n4 {\n    margin-right: -1.5rem !important;\n}\n.webcg-devtools .mb-lg-n4,\n.webcg-devtools .my-lg-n4 {\n    margin-bottom: -1.5rem !important;\n}\n.webcg-devtools .ml-lg-n4,\n.webcg-devtools .mx-lg-n4 {\n    margin-left: -1.5rem !important;\n}\n.webcg-devtools .m-lg-n5 {\n    margin: -3rem !important;\n}\n.webcg-devtools .mt-lg-n5,\n.webcg-devtools .my-lg-n5 {\n    margin-top: -3rem !important;\n}\n.webcg-devtools .mr-lg-n5,\n.webcg-devtools .mx-lg-n5 {\n    margin-right: -3rem !important;\n}\n.webcg-devtools .mb-lg-n5,\n.webcg-devtools .my-lg-n5 {\n    margin-bottom: -3rem !important;\n}\n.webcg-devtools .ml-lg-n5,\n.webcg-devtools .mx-lg-n5 {\n    margin-left: -3rem !important;\n}\n.webcg-devtools .m-lg-auto {\n    margin: auto !important;\n}\n.webcg-devtools .mt-lg-auto,\n.webcg-devtools .my-lg-auto {\n    margin-top: auto !important;\n}\n.webcg-devtools .mr-lg-auto,\n.webcg-devtools .mx-lg-auto {\n    margin-right: auto !important;\n}\n.webcg-devtools .mb-lg-auto,\n.webcg-devtools .my-lg-auto {\n    margin-bottom: auto !important;\n}\n.webcg-devtools .ml-lg-auto,\n.webcg-devtools .mx-lg-auto {\n    margin-left: auto !important;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .m-xl-0 {\n    margin: 0 !important;\n}\n.webcg-devtools .mt-xl-0,\n.webcg-devtools .my-xl-0 {\n    margin-top: 0 !important;\n}\n.webcg-devtools .mr-xl-0,\n.webcg-devtools .mx-xl-0 {\n    margin-right: 0 !important;\n}\n.webcg-devtools .mb-xl-0,\n.webcg-devtools .my-xl-0 {\n    margin-bottom: 0 !important;\n}\n.webcg-devtools .ml-xl-0,\n.webcg-devtools .mx-xl-0 {\n    margin-left: 0 !important;\n}\n.webcg-devtools .m-xl-1 {\n    margin: 0.25rem !important;\n}\n.webcg-devtools .mt-xl-1,\n.webcg-devtools .my-xl-1 {\n    margin-top: 0.25rem !important;\n}\n.webcg-devtools .mr-xl-1,\n.webcg-devtools .mx-xl-1 {\n    margin-right: 0.25rem !important;\n}\n.webcg-devtools .mb-xl-1,\n.webcg-devtools .my-xl-1 {\n    margin-bottom: 0.25rem !important;\n}\n.webcg-devtools .ml-xl-1,\n.webcg-devtools .mx-xl-1 {\n    margin-left: 0.25rem !important;\n}\n.webcg-devtools .m-xl-2 {\n    margin: 0.5rem !important;\n}\n.webcg-devtools .mt-xl-2,\n.webcg-devtools .my-xl-2 {\n    margin-top: 0.5rem !important;\n}\n.webcg-devtools .mr-xl-2,\n.webcg-devtools .mx-xl-2 {\n    margin-right: 0.5rem !important;\n}\n.webcg-devtools .mb-xl-2,\n.webcg-devtools .my-xl-2 {\n    margin-bottom: 0.5rem !important;\n}\n.webcg-devtools .ml-xl-2,\n.webcg-devtools .mx-xl-2 {\n    margin-left: 0.5rem !important;\n}\n.webcg-devtools .m-xl-3 {\n    margin: 1rem !important;\n}\n.webcg-devtools .mt-xl-3,\n.webcg-devtools .my-xl-3 {\n    margin-top: 1rem !important;\n}\n.webcg-devtools .mr-xl-3,\n.webcg-devtools .mx-xl-3 {\n    margin-right: 1rem !important;\n}\n.webcg-devtools .mb-xl-3,\n.webcg-devtools .my-xl-3 {\n    margin-bottom: 1rem !important;\n}\n.webcg-devtools .ml-xl-3,\n.webcg-devtools .mx-xl-3 {\n    margin-left: 1rem !important;\n}\n.webcg-devtools .m-xl-4 {\n    margin: 1.5rem !important;\n}\n.webcg-devtools .mt-xl-4,\n.webcg-devtools .my-xl-4 {\n    margin-top: 1.5rem !important;\n}\n.webcg-devtools .mr-xl-4,\n.webcg-devtools .mx-xl-4 {\n    margin-right: 1.5rem !important;\n}\n.webcg-devtools .mb-xl-4,\n.webcg-devtools .my-xl-4 {\n    margin-bottom: 1.5rem !important;\n}\n.webcg-devtools .ml-xl-4,\n.webcg-devtools .mx-xl-4 {\n    margin-left: 1.5rem !important;\n}\n.webcg-devtools .m-xl-5 {\n    margin: 3rem !important;\n}\n.webcg-devtools .mt-xl-5,\n.webcg-devtools .my-xl-5 {\n    margin-top: 3rem !important;\n}\n.webcg-devtools .mr-xl-5,\n.webcg-devtools .mx-xl-5 {\n    margin-right: 3rem !important;\n}\n.webcg-devtools .mb-xl-5,\n.webcg-devtools .my-xl-5 {\n    margin-bottom: 3rem !important;\n}\n.webcg-devtools .ml-xl-5,\n.webcg-devtools .mx-xl-5 {\n    margin-left: 3rem !important;\n}\n.webcg-devtools .p-xl-0 {\n    padding: 0 !important;\n}\n.webcg-devtools .pt-xl-0,\n.webcg-devtools .py-xl-0 {\n    padding-top: 0 !important;\n}\n.webcg-devtools .pr-xl-0,\n.webcg-devtools .px-xl-0 {\n    padding-right: 0 !important;\n}\n.webcg-devtools .pb-xl-0,\n.webcg-devtools .py-xl-0 {\n    padding-bottom: 0 !important;\n}\n.webcg-devtools .pl-xl-0,\n.webcg-devtools .px-xl-0 {\n    padding-left: 0 !important;\n}\n.webcg-devtools .p-xl-1 {\n    padding: 0.25rem !important;\n}\n.webcg-devtools .pt-xl-1,\n.webcg-devtools .py-xl-1 {\n    padding-top: 0.25rem !important;\n}\n.webcg-devtools .pr-xl-1,\n.webcg-devtools .px-xl-1 {\n    padding-right: 0.25rem !important;\n}\n.webcg-devtools .pb-xl-1,\n.webcg-devtools .py-xl-1 {\n    padding-bottom: 0.25rem !important;\n}\n.webcg-devtools .pl-xl-1,\n.webcg-devtools .px-xl-1 {\n    padding-left: 0.25rem !important;\n}\n.webcg-devtools .p-xl-2 {\n    padding: 0.5rem !important;\n}\n.webcg-devtools .pt-xl-2,\n.webcg-devtools .py-xl-2 {\n    padding-top: 0.5rem !important;\n}\n.webcg-devtools .pr-xl-2,\n.webcg-devtools .px-xl-2 {\n    padding-right: 0.5rem !important;\n}\n.webcg-devtools .pb-xl-2,\n.webcg-devtools .py-xl-2 {\n    padding-bottom: 0.5rem !important;\n}\n.webcg-devtools .pl-xl-2,\n.webcg-devtools .px-xl-2 {\n    padding-left: 0.5rem !important;\n}\n.webcg-devtools .p-xl-3 {\n    padding: 1rem !important;\n}\n.webcg-devtools .pt-xl-3,\n.webcg-devtools .py-xl-3 {\n    padding-top: 1rem !important;\n}\n.webcg-devtools .pr-xl-3,\n.webcg-devtools .px-xl-3 {\n    padding-right: 1rem !important;\n}\n.webcg-devtools .pb-xl-3,\n.webcg-devtools .py-xl-3 {\n    padding-bottom: 1rem !important;\n}\n.webcg-devtools .pl-xl-3,\n.webcg-devtools .px-xl-3 {\n    padding-left: 1rem !important;\n}\n.webcg-devtools .p-xl-4 {\n    padding: 1.5rem !important;\n}\n.webcg-devtools .pt-xl-4,\n.webcg-devtools .py-xl-4 {\n    padding-top: 1.5rem !important;\n}\n.webcg-devtools .pr-xl-4,\n.webcg-devtools .px-xl-4 {\n    padding-right: 1.5rem !important;\n}\n.webcg-devtools .pb-xl-4,\n.webcg-devtools .py-xl-4 {\n    padding-bottom: 1.5rem !important;\n}\n.webcg-devtools .pl-xl-4,\n.webcg-devtools .px-xl-4 {\n    padding-left: 1.5rem !important;\n}\n.webcg-devtools .p-xl-5 {\n    padding: 3rem !important;\n}\n.webcg-devtools .pt-xl-5,\n.webcg-devtools .py-xl-5 {\n    padding-top: 3rem !important;\n}\n.webcg-devtools .pr-xl-5,\n.webcg-devtools .px-xl-5 {\n    padding-right: 3rem !important;\n}\n.webcg-devtools .pb-xl-5,\n.webcg-devtools .py-xl-5 {\n    padding-bottom: 3rem !important;\n}\n.webcg-devtools .pl-xl-5,\n.webcg-devtools .px-xl-5 {\n    padding-left: 3rem !important;\n}\n.webcg-devtools .m-xl-n1 {\n    margin: -0.25rem !important;\n}\n.webcg-devtools .mt-xl-n1,\n.webcg-devtools .my-xl-n1 {\n    margin-top: -0.25rem !important;\n}\n.webcg-devtools .mr-xl-n1,\n.webcg-devtools .mx-xl-n1 {\n    margin-right: -0.25rem !important;\n}\n.webcg-devtools .mb-xl-n1,\n.webcg-devtools .my-xl-n1 {\n    margin-bottom: -0.25rem !important;\n}\n.webcg-devtools .ml-xl-n1,\n.webcg-devtools .mx-xl-n1 {\n    margin-left: -0.25rem !important;\n}\n.webcg-devtools .m-xl-n2 {\n    margin: -0.5rem !important;\n}\n.webcg-devtools .mt-xl-n2,\n.webcg-devtools .my-xl-n2 {\n    margin-top: -0.5rem !important;\n}\n.webcg-devtools .mr-xl-n2,\n.webcg-devtools .mx-xl-n2 {\n    margin-right: -0.5rem !important;\n}\n.webcg-devtools .mb-xl-n2,\n.webcg-devtools .my-xl-n2 {\n    margin-bottom: -0.5rem !important;\n}\n.webcg-devtools .ml-xl-n2,\n.webcg-devtools .mx-xl-n2 {\n    margin-left: -0.5rem !important;\n}\n.webcg-devtools .m-xl-n3 {\n    margin: -1rem !important;\n}\n.webcg-devtools .mt-xl-n3,\n.webcg-devtools .my-xl-n3 {\n    margin-top: -1rem !important;\n}\n.webcg-devtools .mr-xl-n3,\n.webcg-devtools .mx-xl-n3 {\n    margin-right: -1rem !important;\n}\n.webcg-devtools .mb-xl-n3,\n.webcg-devtools .my-xl-n3 {\n    margin-bottom: -1rem !important;\n}\n.webcg-devtools .ml-xl-n3,\n.webcg-devtools .mx-xl-n3 {\n    margin-left: -1rem !important;\n}\n.webcg-devtools .m-xl-n4 {\n    margin: -1.5rem !important;\n}\n.webcg-devtools .mt-xl-n4,\n.webcg-devtools .my-xl-n4 {\n    margin-top: -1.5rem !important;\n}\n.webcg-devtools .mr-xl-n4,\n.webcg-devtools .mx-xl-n4 {\n    margin-right: -1.5rem !important;\n}\n.webcg-devtools .mb-xl-n4,\n.webcg-devtools .my-xl-n4 {\n    margin-bottom: -1.5rem !important;\n}\n.webcg-devtools .ml-xl-n4,\n.webcg-devtools .mx-xl-n4 {\n    margin-left: -1.5rem !important;\n}\n.webcg-devtools .m-xl-n5 {\n    margin: -3rem !important;\n}\n.webcg-devtools .mt-xl-n5,\n.webcg-devtools .my-xl-n5 {\n    margin-top: -3rem !important;\n}\n.webcg-devtools .mr-xl-n5,\n.webcg-devtools .mx-xl-n5 {\n    margin-right: -3rem !important;\n}\n.webcg-devtools .mb-xl-n5,\n.webcg-devtools .my-xl-n5 {\n    margin-bottom: -3rem !important;\n}\n.webcg-devtools .ml-xl-n5,\n.webcg-devtools .mx-xl-n5 {\n    margin-left: -3rem !important;\n}\n.webcg-devtools .m-xl-auto {\n    margin: auto !important;\n}\n.webcg-devtools .mt-xl-auto,\n.webcg-devtools .my-xl-auto {\n    margin-top: auto !important;\n}\n.webcg-devtools .mr-xl-auto,\n.webcg-devtools .mx-xl-auto {\n    margin-right: auto !important;\n}\n.webcg-devtools .mb-xl-auto,\n.webcg-devtools .my-xl-auto {\n    margin-bottom: auto !important;\n}\n.webcg-devtools .ml-xl-auto,\n.webcg-devtools .mx-xl-auto {\n    margin-left: auto !important;\n}\n}\n.webcg-devtools .text-monospace {\n  font-family: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace !important;\n}\n.webcg-devtools .text-justify {\n  text-align: justify !important;\n}\n.webcg-devtools .text-wrap {\n  white-space: normal !important;\n}\n.webcg-devtools .text-nowrap {\n  white-space: nowrap !important;\n}\n.webcg-devtools .text-truncate {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.webcg-devtools .text-left {\n  text-align: left !important;\n}\n.webcg-devtools .text-right {\n  text-align: right !important;\n}\n.webcg-devtools .text-center {\n  text-align: center !important;\n}\n@media (min-width: 576px) {\n.webcg-devtools .text-sm-left {\n    text-align: left !important;\n}\n.webcg-devtools .text-sm-right {\n    text-align: right !important;\n}\n.webcg-devtools .text-sm-center {\n    text-align: center !important;\n}\n}\n@media (min-width: 768px) {\n.webcg-devtools .text-md-left {\n    text-align: left !important;\n}\n.webcg-devtools .text-md-right {\n    text-align: right !important;\n}\n.webcg-devtools .text-md-center {\n    text-align: center !important;\n}\n}\n@media (min-width: 992px) {\n.webcg-devtools .text-lg-left {\n    text-align: left !important;\n}\n.webcg-devtools .text-lg-right {\n    text-align: right !important;\n}\n.webcg-devtools .text-lg-center {\n    text-align: center !important;\n}\n}\n@media (min-width: 1200px) {\n.webcg-devtools .text-xl-left {\n    text-align: left !important;\n}\n.webcg-devtools .text-xl-right {\n    text-align: right !important;\n}\n.webcg-devtools .text-xl-center {\n    text-align: center !important;\n}\n}\n.webcg-devtools .text-lowercase {\n  text-transform: lowercase !important;\n}\n.webcg-devtools .text-uppercase {\n  text-transform: uppercase !important;\n}\n.webcg-devtools .text-capitalize {\n  text-transform: capitalize !important;\n}\n.webcg-devtools .font-weight-light {\n  font-weight: 300 !important;\n}\n.webcg-devtools .font-weight-lighter {\n  font-weight: lighter !important;\n}\n.webcg-devtools .font-weight-normal {\n  font-weight: 400 !important;\n}\n.webcg-devtools .font-weight-bold {\n  font-weight: 700 !important;\n}\n.webcg-devtools .font-weight-bolder {\n  font-weight: bolder !important;\n}\n.webcg-devtools .font-italic {\n  font-style: italic !important;\n}\n.webcg-devtools .text-white {\n  color: #fff !important;\n}\n.webcg-devtools .text-primary {\n  color: #007bff !important;\n}\n.webcg-devtools a.text-primary:hover, .webcg-devtools a.text-primary:focus {\n  color: #0056b3 !important;\n}\n.webcg-devtools .text-secondary {\n  color: #6c757d !important;\n}\n.webcg-devtools a.text-secondary:hover, .webcg-devtools a.text-secondary:focus {\n  color: #494f54 !important;\n}\n.webcg-devtools .text-success {\n  color: #28a745 !important;\n}\n.webcg-devtools a.text-success:hover, .webcg-devtools a.text-success:focus {\n  color: #19692c !important;\n}\n.webcg-devtools .text-info {\n  color: #17a2b8 !important;\n}\n.webcg-devtools a.text-info:hover, .webcg-devtools a.text-info:focus {\n  color: #0f6674 !important;\n}\n.webcg-devtools .text-warning {\n  color: #ffc107 !important;\n}\n.webcg-devtools a.text-warning:hover, .webcg-devtools a.text-warning:focus {\n  color: #ba8b00 !important;\n}\n.webcg-devtools .text-danger {\n  color: #dc3545 !important;\n}\n.webcg-devtools a.text-danger:hover, .webcg-devtools a.text-danger:focus {\n  color: #a71d2a !important;\n}\n.webcg-devtools .text-light {\n  color: #f8f9fa !important;\n}\n.webcg-devtools a.text-light:hover, .webcg-devtools a.text-light:focus {\n  color: #cbd3da !important;\n}\n.webcg-devtools .text-dark {\n  color: #343a40 !important;\n}\n.webcg-devtools a.text-dark:hover, .webcg-devtools a.text-dark:focus {\n  color: #121416 !important;\n}\n.webcg-devtools .text-body {\n  color: #212529 !important;\n}\n.webcg-devtools .text-muted {\n  color: #6c757d !important;\n}\n.webcg-devtools .text-black-50 {\n  color: rgba(0, 0, 0, 0.5) !important;\n}\n.webcg-devtools .text-white-50 {\n  color: rgba(255, 255, 255, 0.5) !important;\n}\n.webcg-devtools .text-hide {\n  font: 0/0 a;\n  color: transparent;\n  text-shadow: none;\n  background-color: transparent;\n  border: 0;\n}\n.webcg-devtools .text-decoration-none {\n  text-decoration: none !important;\n}\n.webcg-devtools .text-break {\n  word-break: break-word !important;\n  overflow-wrap: break-word !important;\n}\n.webcg-devtools .text-reset {\n  color: inherit !important;\n}\n.webcg-devtools .visible {\n  visibility: visible !important;\n}\n.webcg-devtools .invisible {\n  visibility: hidden !important;\n}\n@media print {\n.webcg-devtools *,\n.webcg-devtools *::before,\n.webcg-devtools *::after {\n    text-shadow: none !important;\n    box-shadow: none !important;\n}\n.webcg-devtools a:not(.btn) {\n    text-decoration: underline;\n}\n.webcg-devtools abbr[title]::after {\n    content: \" (\" attr(title) \")\";\n}\n.webcg-devtools pre {\n    white-space: pre-wrap !important;\n}\n.webcg-devtools pre,\n.webcg-devtools blockquote {\n    border: 1px solid #adb5bd;\n    page-break-inside: avoid;\n}\n.webcg-devtools thead {\n    display: table-header-group;\n}\n.webcg-devtools tr,\n.webcg-devtools img {\n    page-break-inside: avoid;\n}\n.webcg-devtools p,\n.webcg-devtools h2,\n.webcg-devtools h3 {\n    orphans: 3;\n    widows: 3;\n}\n.webcg-devtools h2,\n.webcg-devtools h3 {\n    page-break-after: avoid;\n}\n@page {\n.webcg-devtools {\n      size: a3;\n}\n}\n.webcg-devtools body {\n    min-width: 992px !important;\n}\n.webcg-devtools .container {\n    min-width: 992px !important;\n}\n.webcg-devtools .navbar {\n    display: none;\n}\n.webcg-devtools .badge {\n    border: 1px solid #000;\n}\n.webcg-devtools .table {\n    border-collapse: collapse !important;\n}\n.webcg-devtools .table td,\n.webcg-devtools .table th {\n    background-color: #fff !important;\n}\n.webcg-devtools .table-bordered th,\n.webcg-devtools .table-bordered td {\n    border: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .table-dark {\n    color: inherit;\n}\n.webcg-devtools .table-dark th,\n.webcg-devtools .table-dark td,\n.webcg-devtools .table-dark thead th,\n.webcg-devtools .table-dark tbody + tbody {\n    border-color: #dee2e6;\n}\n.webcg-devtools .table .thead-dark th {\n    color: inherit;\n    border-color: #dee2e6;\n}\n}\n.webcg-devtools h1, .webcg-devtools h2, .webcg-devtools h3, .webcg-devtools h4, .webcg-devtools h5, .webcg-devtools h6,\n.webcg-devtools .h1, .webcg-devtools .h2, .webcg-devtools .h3, .webcg-devtools .h4, .webcg-devtools .h5, .webcg-devtools .h6 {\n  margin-bottom: 8px;\n  /* 0.5rem */\n}\n.webcg-devtools h1, .webcg-devtools .h1 {\n  font-size: 40px;\n  /* 2.5rem */\n}\n.webcg-devtools h2, .webcg-devtools .h2 {\n  font-size: 32px;\n  /* 2rem */\n}\n.webcg-devtools h3, .webcg-devtools .h3 {\n  font-size: 28px;\n  /* 1.75rem */\n}\n.webcg-devtools h4, .webcg-devtools .h4 {\n  font-size: 24px;\n  /* 1.5rem */\n}\n.webcg-devtools h5, .webcg-devtools .h5 {\n  font-size: 20px;\n  /* 1.25rem */\n}\n.webcg-devtools h6, .webcg-devtools .h6 {\n  font-size: 16px;\n  /* 1rem */\n}\n.webcg-devtools .btn {\n  padding: 6px 12px;\n  /* 0.375rem 0.75rem */\n  font-size: 16px;\n  /* 1rem */\n  border-radius: 4px;\n  /* 0.25rem */\n}\n.webcg-devtools .btn-sm, .webcg-devtools .btn-group-sm > .btn {\n  padding: 4px 8px;\n  /* 0.25rem 0.5rem */\n  font-size: 14px;\n  /* 0.875rem */\n  border-radius: 3.2px;\n}\n.webcg-devtools .btn:focus {\n  box-shadow: 0 0 0 3.2px rgba(0, 123, 255, 0.25);\n  /* 0.2rem */\n}\n.webcg-devtools .form-group {\n  margin-bottom: 16px;\n  /* 1rem */\n}\n.webcg-devtools .form-control {\n  height: 38px;\n  /* calc(2.25rem + 2px); */\n  padding: 6px 12px;\n  /* 0.375rem 0.75rem */\n  font-size: 16px;\n  /* 1rem */\n  border-radius: 4px;\n  /* 0.25rem */\n}\n.webcg-devtools .form-control:focus {\n  box-shadow: 0 0 0 3.2px rgba(0, 123, 255, 0.25);\n  /* 0.2rem */\n}\n.webcg-devtools .nav-tabs .nav-link {\n  border-top-left-radius: 4px;\n  /* 0.25rem */\n  border-top-right-radius: 4px;\n  /* 0.25rem */\n}\n.webcg-devtools .nav-link {\n  padding: 8px 16px;\n  /* 0.5rem 1rem */\n}\n.webcg-devtools .modal {\n  display: block;\n  top: auto;\n  right: auto;\n  bottom: auto;\n  left: auto;\n}\n.webcg-devtools .modal-header {\n  padding: 16px;\n  /* 1rem */\n  border-top-left-radius: 4.8px;\n  /* 0.3rem */\n  border-top-right-radius: 4.8px;\n  /* 0.3rem */\n}\n.webcg-devtools .modal-body {\n  padding: 16px;\n  /* 1rem */\n}\n.webcg-devtools .modal-content {\n  border-radius: 4.8px;\n  /* 0.3rem */\n}\n.webcg-devtools .modal-footer {\n  padding: 16px;\n  /* 1rem */\n}\n.webcg-devtools .table {\n  margin-bottom: 16px;\n  /* 1rem */\n}\n.webcg-devtools .table th, .webcg-devtools .table td {\n  padding: 12px;\n  /* 0.75rem */\n}\n.webcg-devtools .table-sm th, .webcg-devtools .table-sm td {\n  padding: 4.8px;\n  /* 0.3rem */\n}\n.webcg-devtools {\n  background: white;\n  color: black;\n  font-size: 16px;\n  line-height: normal;\n}\n.webcg-devtools .btn-sm, .webcg-devtools .btn-group-sm > .btn {\n  min-width: 32px;\n  /* 2rem */\n}\n.webcg-devtools .flex-columns {\n  display: flex;\n  flex-direction: column;\n  flex: 1 0 auto;\n}\n.webcg-devtools .form-row {\n  flex: 0 0 auto;\n}\n.webcg-devtools .modal {\n  height: auto;\n  width: auto;\n  box-shadow: 0 20px 32px -8px rgba(9, 45, 66, 0.25);\n}\n.webcg-devtools .modal .modal-content {\n  resize: both;\n  overflow: hidden;\n  height: 100%;\n  min-width: 410px;\n  min-height: 63px;\n}\n.webcg-devtools .modal .modal-content .modal-header {\n  flex: 0 0 auto;\n  border-bottom: 0;\n}\n.webcg-devtools .modal .modal-content .modal-navbar .nav {\n  padding: 0 16px;\n  /* 0 1rem */\n}\n.webcg-devtools .modal .modal-content .modal-body {\n  position: static;\n  display: flex;\n  flex-direction: column;\n  overflow: auto;\n  padding-bottom: 0;\n}\n.webcg-devtools .modal .modal-content .modal-footer {\n  flex: 0 0 auto;\n  justify-content: center;\n  padding: 12px;\n  font-size: 12px;\n}\n.webcg-devtools .draggable {\n  position: absolute;\n  z-index: auto;\n}\n.webcg-devtools .drag-handle {\n  cursor: grab;\n  cursor: -webkit-grab;\n}\n.webcg-devtools .dragging .drag-handle {\n  cursor: grabbing;\n  cursor: -webkit-grabbing;\n}\n\n/*# sourceMappingURL=dev-tools.vue.map */", map: {"version":3,"sources":["dev-tools.vue","/home/reto/Develop/Upstream/webcg/webcg-devtools/src/dev-tools.vue"],"names":[],"mappings":"AAAA,gBAAgB;AAChB;EACE;;;;;IAKE;AACJ;AACA;EACE,eAAe;EACf,iBAAiB;EACjB,iBAAiB;EACjB,eAAe;EACf,cAAc;EACd,iBAAiB;EACjB,iBAAiB;EACjB,gBAAgB;EAChB,eAAe;EACf,eAAe;EACf,aAAa;EACb,eAAe;EACf,oBAAoB;EACpB,kBAAkB;EAClB,oBAAoB;EACpB,kBAAkB;EAClB,eAAe;EACf,kBAAkB;EAClB,iBAAiB;EACjB,gBAAgB;EAChB,eAAe;EACf,kBAAkB;EAClB,sBAAsB;EACtB,sBAAsB;EACtB,sBAAsB;EACtB,uBAAuB;EACvB,+MAA+M;EAC/M,6GAA6G;AAC/G;AACA;;;EAGE,sBAAsB;AACxB;AACA;EACE,uBAAuB;EACvB,iBAAiB;EACjB,8BAA8B;EAC9B,6CAA6C;AAC/C;AACA;EACE,cAAc;AAChB;AACA;EACE,SAAS;EACT,kMAAkM;EAClM,eAAe;EACf,gBAAgB;EAChB,gBAAgB;EAChB,cAAc;EACd,gBAAgB;EAChB,sBAAsB;AACxB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,uBAAuB;EACvB,SAAS;EACT,iBAAiB;AACnB;AACA;EACE,aAAa;EACb,qBAAqB;AACvB;AACA;EACE,aAAa;EACb,mBAAmB;AACrB;AACA;;EAEE,0BAA0B;EAC1B,iCAAiC;EACjC,YAAY;EACZ,gBAAgB;EAChB,8BAA8B;AAChC;AACA;EACE,mBAAmB;EACnB,kBAAkB;EAClB,oBAAoB;AACtB;AACA;;;EAGE,aAAa;EACb,mBAAmB;AACrB;AACA;;;;EAIE,gBAAgB;AAClB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,qBAAqB;EACrB,cAAc;AAChB;AACA;EACE,gBAAgB;AAClB;AACA;;EAEE,mBAAmB;AACrB;AACA;EACE,cAAc;AAChB;AACA;;EAEE,kBAAkB;EAClB,cAAc;EACd,cAAc;EACd,wBAAwB;AAC1B;AACA;EACE,eAAe;AACjB;AACA;EACE,WAAW;AACb;AACA;EACE,cAAc;EACd,qBAAqB;EACrB,6BAA6B;AAC/B;AACA;EACE,cAAc;EACd,0BAA0B;AAC5B;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;;;;EAIE,iGAAiG;EACjG,cAAc;AAChB;AACA;EACE,aAAa;EACb,mBAAmB;EACnB,cAAc;AAChB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,sBAAsB;EACtB,kBAAkB;AACpB;AACA;EACE,gBAAgB;EAChB,sBAAsB;AACxB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,oBAAoB;EACpB,uBAAuB;EACvB,cAAc;EACd,gBAAgB;EAChB,oBAAoB;AACtB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,qBAAqB;EACrB,qBAAqB;AACvB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,mBAAmB;EACnB,0CAA0C;AAC5C;AACA;;;;;EAKE,SAAS;EACT,oBAAoB;EACpB,kBAAkB;EAClB,oBAAoB;AACtB;AACA;;EAEE,iBAAiB;AACnB;AACA;;EAEE,oBAAoB;AACtB;AACA;EACE,iBAAiB;AACnB;AACA;;;;EAIE,0BAA0B;AAC5B;AACA;;;;EAIE,eAAe;AACjB;AACA;;;;EAIE,UAAU;EACV,kBAAkB;AACpB;AACA;;EAEE,sBAAsB;EACtB,UAAU;AACZ;AACA;;;;EAIE,2BAA2B;AAC7B;AACA;EACE,cAAc;EACd,gBAAgB;AAClB;AACA;EACE,YAAY;EACZ,UAAU;EACV,SAAS;EACT,SAAS;AACX;AACA;EACE,cAAc;EACd,WAAW;EACX,eAAe;EACf,UAAU;EACV,qBAAqB;EACrB,iBAAiB;EACjB,oBAAoB;EACpB,cAAc;EACd,mBAAmB;AACrB;AACA;EACE,wBAAwB;AAC1B;AACA;;EAEE,YAAY;AACd;AACA;EACE,oBAAoB;EACpB,wBAAwB;AAC1B;AACA;EACE,wBAAwB;AAC1B;AACA;EACE,aAAa;EACb,0BAA0B;AAC5B;AACA;EACE,qBAAqB;AACvB;AACA;EACE,kBAAkB;EAClB,eAAe;AACjB;AACA;EACE,aAAa;AACf;AACA;EACE,wBAAwB;AAC1B;AACA;;EAEE,qBAAqB;EACrB,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,eAAe;AACjB;AACA;EACE,kBAAkB;AACpB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,kBAAkB;AACpB;AACA;EACE,eAAe;AACjB;AACA;EACE,kBAAkB;EAClB,gBAAgB;AAClB;AACA;EACE,eAAe;EACf,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,iBAAiB;EACjB,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,iBAAiB;EACjB,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,iBAAiB;EACjB,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,gBAAgB;EAChB,mBAAmB;EACnB,SAAS;EACT,wCAAwC;AAC1C;AACA;;EAEE,cAAc;EACd,gBAAgB;AAClB;AACA;;EAEE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,eAAe;EACf,gBAAgB;AAClB;AACA;EACE,eAAe;EACf,gBAAgB;AAClB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,oBAAoB;AACtB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,mBAAmB;EACnB,kBAAkB;AACpB;AACA;EACE,cAAc;EACd,cAAc;EACd,cAAc;AAChB;AACA;EACE,aAAa;AACf;AACA;EACE,eAAe;EACf,YAAY;AACd;AACA;EACE,gBAAgB;EAChB,sBAAsB;EACtB,yBAAyB;EACzB,sBAAsB;EACtB,eAAe;EACf,YAAY;AACd;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,cAAc;AAChB;AACA;EACE,cAAc;EACd,cAAc;AAChB;AACA;EACE,gBAAgB;EAChB,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,cAAc;AAChB;AACA;EACE,sBAAsB;EACtB,gBAAgB;EAChB,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,UAAU;EACV,eAAe;EACf,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,gBAAgB;EAChB,cAAc;AAChB;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,kBAAkB;AACpB;AACA;EACE,iBAAiB;EACjB,kBAAkB;AACpB;AACA;EACE,WAAW;EACX,mBAAmB;EACnB,kBAAkB;EAClB,kBAAkB;EAClB,iBAAiB;AACnB;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,iBAAiB;AACnB;AACF;AACA;EACE,WAAW;EACX,mBAAmB;EACnB,kBAAkB;EAClB,kBAAkB;EAClB,iBAAiB;AACnB;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,iBAAiB;AACnB;AACF;AACA;EACE,aAAa;EACb,eAAe;EACf,mBAAmB;EACnB,kBAAkB;AACpB;AACA;EACE,eAAe;EACf,cAAc;AAChB;AACA;;EAEE,gBAAgB;EAChB,eAAe;AACjB;AACA;;;;;;EAME,kBAAkB;EAClB,WAAW;EACX,mBAAmB;EACnB,kBAAkB;AACpB;AACA;EACE,aAAa;EACb,YAAY;EACZ,eAAe;AACjB;AACA;EACE,cAAc;EACd,eAAe;AACjB;AACA;EACE,aAAa;EACb,cAAc;AAChB;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,aAAa;EACb,cAAc;AAChB;AACA;EACE,aAAa;EACb,cAAc;AAChB;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,WAAW;EACX,eAAe;AACjB;AACA;EACE,uBAAuB;EACvB,wBAAwB;AAC1B;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,aAAa;EACb,cAAc;AAChB;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,aAAa;EACb,cAAc;AAChB;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,aAAa;EACb,cAAc;AAChB;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,wBAAwB;EACxB,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,eAAe;AACjB;AACA;EACE,SAAS;AACX;AACA;EACE,SAAS;AACX;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,QAAQ;AACV;AACA;EACE,SAAS;AACX;AACA;EACE,SAAS;AACX;AACA;EACE,SAAS;AACX;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,gBAAgB;AAClB;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,gBAAgB;AAClB;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,gBAAgB;AAClB;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,2BAA2B;AAC7B;AACA;AACE;IACE,aAAa;IACb,YAAY;IACZ,eAAe;AACjB;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,WAAW;IACX,eAAe;AACjB;AACA;IACE,uBAAuB;IACvB,wBAAwB;AAC1B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,cAAc;AAChB;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACF;AACA;AACE;IACE,aAAa;IACb,YAAY;IACZ,eAAe;AACjB;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,WAAW;IACX,eAAe;AACjB;AACA;IACE,uBAAuB;IACvB,wBAAwB;AAC1B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,cAAc;AAChB;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACF;AACA;AACE;IACE,aAAa;IACb,YAAY;IACZ,eAAe;AACjB;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,WAAW;IACX,eAAe;AACjB;AACA;IACE,uBAAuB;IACvB,wBAAwB;AAC1B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,cAAc;AAChB;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACF;AACA;AACE;IACE,aAAa;IACb,YAAY;IACZ,eAAe;AACjB;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,WAAW;IACX,eAAe;AACjB;AACA;IACE,uBAAuB;IACvB,wBAAwB;AAC1B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,aAAa;IACb,cAAc;AAChB;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,wBAAwB;IACxB,yBAAyB;AAC3B;AACA;IACE,cAAc;IACd,eAAe;AACjB;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,QAAQ;AACV;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,SAAS;AACX;AACA;IACE,cAAc;AAChB;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,gBAAgB;AAClB;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACF;AACA;EACE,WAAW;EACX,mBAAmB;EACnB,cAAc;AAChB;AACA;;EAEE,gBAAgB;EAChB,mBAAmB;EACnB,6BAA6B;AAC/B;AACA;EACE,sBAAsB;EACtB,gCAAgC;AAClC;AACA;EACE,6BAA6B;AAC/B;AACA;;EAEE,eAAe;AACjB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;EAEE,wBAAwB;AAC1B;AACA;;;;EAIE,SAAS;AACX;AACA;EACE,qCAAqC;AACvC;AACA;EACE,cAAc;EACd,sCAAsC;AACxC;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,yBAAyB;AAC3B;AACA;;;;EAIE,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,yBAAyB;AAC3B;AACA;;;EAGE,sCAAsC;AACxC;AACA;EACE,sCAAsC;AACxC;AACA;;EAEE,sCAAsC;AACxC;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;;;EAGE,qBAAqB;AACvB;AACA;EACE,SAAS;AACX;AACA;EACE,2CAA2C;AAC7C;AACA;EACE,WAAW;EACX,4CAA4C;AAC9C;AACA;AACE;IACE,cAAc;IACd,WAAW;IACX,gBAAgB;IAChB,iCAAiC;AACnC;AACA;IACE,SAAS;AACX;AACF;AACA;AACE;IACE,cAAc;IACd,WAAW;IACX,gBAAgB;IAChB,iCAAiC;AACnC;AACA;IACE,SAAS;AACX;AACF;AACA;AACE;IACE,cAAc;IACd,WAAW;IACX,gBAAgB;IAChB,iCAAiC;AACnC;AACA;IACE,SAAS;AACX;AACF;AACA;AACE;IACE,cAAc;IACd,WAAW;IACX,gBAAgB;IAChB,iCAAiC;AACnC;AACA;IACE,SAAS;AACX;AACF;AACA;EACE,cAAc;EACd,WAAW;EACX,gBAAgB;EAChB,iCAAiC;AACnC;AACA;EACE,SAAS;AACX;AACA;EACE,cAAc;EACd,WAAW;EACX,mCAAmC;EACnC,yBAAyB;EACzB,eAAe;EACf,gBAAgB;EAChB,gBAAgB;EAChB,cAAc;EACd,sBAAsB;EACtB,4BAA4B;EAC5B,yBAAyB;EACzB,sBAAsB;EACtB,wEAAwE;AAC1E;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,6BAA6B;EAC7B,SAAS;AACX;AACA;EACE,kBAAkB;EAClB,0BAA0B;AAC5B;AACA;EACE,cAAc;EACd,sBAAsB;EACtB,qBAAqB;EACrB,UAAU;EACV,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,UAAU;AACZ;AACA;EACE,yBAAyB;EACzB,UAAU;AACZ;AACA;EACE,cAAc;EACd,sBAAsB;AACxB;AACA;;EAEE,cAAc;EACd,WAAW;AACb;AACA;EACE,iCAAiC;EACjC,oCAAoC;EACpC,gBAAgB;EAChB,kBAAkB;EAClB,gBAAgB;AAClB;AACA;EACE,+BAA+B;EAC/B,kCAAkC;EAClC,kBAAkB;EAClB,gBAAgB;AAClB;AACA;EACE,gCAAgC;EAChC,mCAAmC;EACnC,mBAAmB;EACnB,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,WAAW;EACX,mBAAmB;EACnB,gBAAgB;EAChB,eAAe;EACf,gBAAgB;EAChB,cAAc;EACd,6BAA6B;EAC7B,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,gBAAgB;EAChB,eAAe;AACjB;AACA;EACE,kCAAkC;EAClC,uBAAuB;EACvB,mBAAmB;EACnB,gBAAgB;EAChB,qBAAqB;AACvB;AACA;EACE,gCAAgC;EAChC,oBAAoB;EACpB,kBAAkB;EAClB,gBAAgB;EAChB,qBAAqB;AACvB;AACA;EACE,YAAY;AACd;AACA;EACE,YAAY;AACd;AACA;EACE,mBAAmB;AACrB;AACA;EACE,cAAc;EACd,mBAAmB;AACrB;AACA;EACE,aAAa;EACb,eAAe;EACf,kBAAkB;EAClB,iBAAiB;AACnB;AACA;;EAEE,kBAAkB;EAClB,iBAAiB;AACnB;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,kBAAkB;EAClB,kBAAkB;EAClB,qBAAqB;AACvB;AACA;EACE,cAAc;AAChB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,oBAAoB;EACpB,mBAAmB;EACnB,eAAe;EACf,qBAAqB;AACvB;AACA;EACE,gBAAgB;EAChB,aAAa;EACb,uBAAuB;EACvB,cAAc;AAChB;AACA;EACE,aAAa;EACb,WAAW;EACX,mBAAmB;EACnB,cAAc;EACd,cAAc;AAChB;AACA;EACE,kBAAkB;EAClB,SAAS;EACT,UAAU;EACV,aAAa;EACb,eAAe;EACf,uBAAuB;EACvB,kBAAkB;EAClB,mBAAmB;EACnB,gBAAgB;EAChB,WAAW;EACX,wCAAwC;EACxC,sBAAsB;AACxB;AACA;;;EAGE,cAAc;AAChB;AACA;EACE,qBAAqB;EACrB,oCAAoC;EACpC,iRAAiR;EACjR,4BAA4B;EAC5B,2DAA2D;EAC3D,gEAAgE;AAClE;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,oCAAoC;EACpC,kFAAkF;AACpF;AACA;EACE,qBAAqB;EACrB,uCAAuC;EC5rDzC,ujBAAA;AD8rDA;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,cAAc;AAChB;AACA;;;EAGE,cAAc;AAChB;AACA;EACE,cAAc;AAChB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,gDAAgD;AAClD;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,aAAa;EACb,WAAW;EACX,mBAAmB;EACnB,cAAc;EACd,cAAc;AAChB;AACA;EACE,kBAAkB;EAClB,SAAS;EACT,UAAU;EACV,aAAa;EACb,eAAe;EACf,uBAAuB;EACvB,kBAAkB;EAClB,mBAAmB;EACnB,gBAAgB;EAChB,WAAW;EACX,wCAAwC;EACxC,sBAAsB;AACxB;AACA;;;EAGE,cAAc;AAChB;AACA;EACE,qBAAqB;EACrB,oCAAoC;EACpC,4UAA4U;EAC5U,4BAA4B;EAC5B,2DAA2D;EAC3D,gEAAgE;AAClE;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,oCAAoC;EACpC,kFAAkF;AACpF;AACA;EACE,qBAAqB;EACrB,uCAAuC;EC9wDzC,knBAAA;ADgxDA;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,cAAc;AAChB;AACA;;;EAGE,cAAc;AAChB;AACA;EACE,cAAc;AAChB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,gDAAgD;AAClD;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,aAAa;EACb,mBAAmB;EACnB,mBAAmB;AACrB;AACA;EACE,WAAW;AACb;AACA;AACE;IACE,aAAa;IACb,mBAAmB;IACnB,uBAAuB;IACvB,gBAAgB;AAClB;AACA;IACE,aAAa;IACb,cAAc;IACd,mBAAmB;IACnB,mBAAmB;IACnB,gBAAgB;AAClB;AACA;IACE,qBAAqB;IACrB,WAAW;IACX,sBAAsB;AACxB;AACA;IACE,qBAAqB;AACvB;AACA;;IAEE,WAAW;AACb;AACA;IACE,aAAa;IACb,mBAAmB;IACnB,uBAAuB;IACvB,WAAW;IACX,eAAe;AACjB;AACA;IACE,kBAAkB;IAClB,cAAc;IACd,aAAa;IACb,qBAAqB;IACrB,cAAc;AAChB;AACA;IACE,mBAAmB;IACnB,uBAAuB;AACzB;AACA;IACE,gBAAgB;AAClB;AACF;AACA;EACE,qBAAqB;EACrB,gBAAgB;EAChB,cAAc;EACd,kBAAkB;EAClB,sBAAsB;EACtB,eAAe;EACf,iBAAiB;EACjB,6BAA6B;EAC7B,6BAA6B;EAC7B,yBAAyB;EACzB,eAAe;EACf,gBAAgB;EAChB,sBAAsB;EACtB,qIAAqI;AACvI;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,UAAU;EACV,gDAAgD;AAClD;AACA;EACE,aAAa;AACf;AACA;;EAEE,oBAAoB;AACtB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,gDAAgD;AAClD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;EACrB,iDAAiD;AACnD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,iDAAiD;AACnD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;EACrB,+CAA+C;AACjD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,gDAAgD;AAClD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;EACrB,+CAA+C;AACjD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;EACrB,iDAAiD;AACnD;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,iDAAiD;AACnD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;EACrB,8CAA8C;AAChD;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,8CAA8C;AAChD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,iDAAiD;AACnD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,iDAAiD;AACnD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,+CAA+C;AACjD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,iDAAiD;AACnD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,iDAAiD;AACnD;AACA;EACE,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,8CAA8C;AAChD;AACA;EACE,cAAc;EACd,6BAA6B;AAC/B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,8CAA8C;AAChD;AACA;EACE,gBAAgB;EAChB,cAAc;EACd,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,0BAA0B;AAC5B;AACA;EACE,0BAA0B;EAC1B,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,oBAAoB;AACtB;AACA;EACE,oBAAoB;EACpB,kBAAkB;EAClB,gBAAgB;EAChB,qBAAqB;AACvB;AACA;EACE,uBAAuB;EACvB,mBAAmB;EACnB,gBAAgB;EAChB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,WAAW;AACb;AACA;EACE,kBAAkB;AACpB;AACA;;;EAGE,WAAW;AACb;AACA;EACE,gCAAgC;AAClC;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,UAAU;AACZ;AACA;EACE,aAAa;AACf;AACA;EACE,kBAAkB;EAClB,SAAS;EACT,gBAAgB;EAChB,6BAA6B;AAC/B;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;;;;EAIE,kBAAkB;AACpB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,qBAAqB;EACrB,oBAAoB;EACpB,uBAAuB;EACvB,WAAW;EACX,uBAAuB;EACvB,qCAAqC;EACrC,gBAAgB;EAChB,oCAAoC;AACtC;AACA;EACE,cAAc;AAChB;AACA;EACE,kBAAkB;EAClB,SAAS;EACT,OAAO;EACP,aAAa;EACb,aAAa;EACb,WAAW;EACX,gBAAgB;EAChB,iBAAiB;EACjB,oBAAoB;EACpB,eAAe;EACf,cAAc;EACd,gBAAgB;EAChB,gBAAgB;EAChB,sBAAsB;EACtB,4BAA4B;EAC5B,qCAAqC;EACrC,sBAAsB;AACxB;AACA;EACE,WAAW;EACX,OAAO;AACT;AACA;EACE,QAAQ;EACR,UAAU;AACZ;AACA;AACE;IACE,WAAW;IACX,OAAO;AACT;AACA;IACE,QAAQ;IACR,UAAU;AACZ;AACF;AACA;AACE;IACE,WAAW;IACX,OAAO;AACT;AACA;IACE,QAAQ;IACR,UAAU;AACZ;AACF;AACA;AACE;IACE,WAAW;IACX,OAAO;AACT;AACA;IACE,QAAQ;IACR,UAAU;AACZ;AACF;AACA;AACE;IACE,WAAW;IACX,OAAO;AACT;AACA;IACE,QAAQ;IACR,UAAU;AACZ;AACF;AACA;EACE,SAAS;EACT,YAAY;EACZ,aAAa;EACb,uBAAuB;AACzB;AACA;EACE,qBAAqB;EACrB,oBAAoB;EACpB,uBAAuB;EACvB,WAAW;EACX,aAAa;EACb,qCAAqC;EACrC,0BAA0B;EAC1B,oCAAoC;AACtC;AACA;EACE,cAAc;AAChB;AACA;EACE,MAAM;EACN,WAAW;EACX,UAAU;EACV,aAAa;EACb,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,oBAAoB;EACpB,uBAAuB;EACvB,WAAW;EACX,mCAAmC;EACnC,eAAe;EACf,sCAAsC;EACtC,wBAAwB;AAC1B;AACA;EACE,cAAc;AAChB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,MAAM;EACN,WAAW;EACX,UAAU;EACV,aAAa;EACb,sBAAsB;AACxB;AACA;EACE,qBAAqB;EACrB,oBAAoB;EACpB,uBAAuB;EACvB,WAAW;AACb;AACA;EACE,aAAa;AACf;AACA;EACE,qBAAqB;EACrB,qBAAqB;EACrB,uBAAuB;EACvB,WAAW;EACX,mCAAmC;EACnC,yBAAyB;EACzB,sCAAsC;AACxC;AACA;EACE,cAAc;AAChB;AACA;EACE,iBAAiB;AACnB;AACA;EC5hFA,WAAA;EACA,YAAA;AD8hFA;AACA;EACE,SAAS;EACT,gBAAgB;EAChB,gBAAgB;EAChB,6BAA6B;AAC/B;AACA;EACE,cAAc;EACd,WAAW;EACX,uBAAuB;EACvB,WAAW;EACX,gBAAgB;EAChB,cAAc;EACd,mBAAmB;EACnB,mBAAmB;EACnB,6BAA6B;EAC7B,SAAS;AACX;AACA;EACE,cAAc;EACd,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,oBAAoB;EACpB,6BAA6B;AAC/B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,sBAAsB;EACtB,gBAAgB;EAChB,mBAAmB;EACnB,cAAc;EACd,mBAAmB;AACrB;AACA;EACE,cAAc;EACd,uBAAuB;EACvB,cAAc;AAChB;AACA;;EAEE,kBAAkB;EAClB,oBAAoB;EACpB,sBAAsB;AACxB;AACA;;EAEE,kBAAkB;EAClB,cAAc;AAChB;AACA;;EAEE,UAAU;AACZ;AACA;;;;EAIE,UAAU;AACZ;AACA;EACE,aAAa;EACb,eAAe;EACf,2BAA2B;AAC7B;AACA;EACE,WAAW;AACb;AACA;;EAEE,iBAAiB;AACnB;AACA;;EAEE,0BAA0B;EAC1B,6BAA6B;AAC/B;AACA;;EAEE,yBAAyB;EACzB,4BAA4B;AAC9B;AACA;EACE,wBAAwB;EACxB,uBAAuB;AACzB;AACA;EACE,cAAc;AAChB;AACA;EACE,eAAe;AACjB;AACA;EACE,uBAAuB;EACvB,sBAAsB;AACxB;AACA;EACE,sBAAsB;EACtB,qBAAqB;AACvB;AC5oFA;ED8oFE,sBAAsB;EACtB,uBAAuB;EACvB,uBAAuB;AACzB;AACA;;EAEE,WAAW;AACb;AACA;;EAEE,gBAAgB;AAClB;AACA;;EAEE,6BAA6B;EAC7B,4BAA4B;AAC9B;AACA;;EAEE,yBAAyB;EACzB,0BAA0B;AAC5B;AACA;;EAEE,gBAAgB;AAClB;AACA;;;;EAIE,kBAAkB;EAClB,sBAAsB;EACtB,oBAAoB;AACtB;AACA;EACE,kBAAkB;EAClB,aAAa;EACb,eAAe;EACf,oBAAoB;EACpB,WAAW;AACb;AACA;;;;EAIE,kBAAkB;EAClB,YAAY;EACZ,YAAY;EACZ,gBAAgB;AAClB;AACA;;;;;;;;;;;;EAYE,iBAAiB;AACnB;AACA;;;EAGE,UAAU;AACZ;AACA;EACE,UAAU;AACZ;AACA;;EAEE,0BAA0B;EAC1B,6BAA6B;AAC/B;AACA;;EAEE,yBAAyB;EACzB,4BAA4B;AAC9B;AACA;EACE,aAAa;EACb,mBAAmB;AACrB;AACA;EACE,0BAA0B;EAC1B,6BAA6B;AAC/B;AACA;EACE,yBAAyB;EACzB,4BAA4B;AAC9B;AACA;;EAEE,aAAa;AACf;AACA;;EAEE,kBAAkB;EAClB,UAAU;AACZ;AACA;;EAEE,UAAU;AACZ;AACA;;;;;;;;EAQE,iBAAiB;AACnB;AACA;EACE,kBAAkB;AACpB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,aAAa;EACb,mBAAmB;EACnB,yBAAyB;EACzB,gBAAgB;EAChB,eAAe;EACf,gBAAgB;EAChB,gBAAgB;EAChB,cAAc;EACd,kBAAkB;ECnxFpB,mBAAA;EACA,yBAAA;EDqxFE,yBAAyB;EACzB,sBAAsB;AACxB;AACA;;EAEE,aAAa;AACf;AACA;;EAEE,gCAAgC;AAClC;AACA;;;;;;EAME,oBAAoB;EACpB,kBAAkB;EAClB,gBAAgB;EAChB,qBAAqB;AACvB;AACA;;EAEE,kCAAkC;AACpC;AACA;;;;;;EAME,uBAAuB;EACvB,mBAAmB;EACnB,gBAAgB;EAChB,qBAAqB;AACvB;AACA;;EAEE,sBAAsB;AACxB;AACA;;;;;;EAME,0BAA0B;EAC1B,6BAA6B;AAC/B;AACA;;;;;;EAME,yBAAyB;EACzB,4BAA4B;AAC9B;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,kBAAkB;EAClB,oBAAoB;AACtB;AACA;EACE,oBAAoB;EACpB,kBAAkB;AACpB;AACA;EACE,kBAAkB;EAClB,OAAO;EACP,WAAW;EACX,WAAW;EACX,eAAe;EACf,UAAU;AACZ;AACA;EACE,WAAW;EACX,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,gDAAgD;AAClD;AACA;EACE,qBAAqB;AACvB;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;AAChB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,kBAAkB;EAClB,gBAAgB;EAChB,mBAAmB;AACrB;AACA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,cAAc;EACd,WAAW;EACX,YAAY;EACZ,oBAAoB;EACpB,WAAW;EACX,sBAAsB;EACtB,yBAAyB;AAC3B;AACA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,cAAc;EACd,WAAW;EACX,YAAY;EACZ,WAAW;EACX,iCAAiC;AACnC;AACA;EACE,sBAAsB;AACxB;AACA;EACE,kOAAkO;AACpO;AACA;EACE,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,+KAA+K;AACjL;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,kBAAkB;AACpB;AACA;EACE,8KAA8K;AAChL;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,cAAc;EACd,mBAAmB;EACnB,qBAAqB;AACvB;AACA;EACE,wBAAwB;EACxB,0BAA0B;EAC1B,uBAAuB;EACvB,wBAAwB;EACxB,yBAAyB;EACzB,qBAAqB;EACrB,yIAAyI;AAC3I;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,sBAAsB;EACtB,8BAA8B;AAChC;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,qBAAqB;EACrB,WAAW;EACX,mCAAmC;EACnC,0CAA0C;EAC1C,eAAe;EACf,gBAAgB;EAChB,gBAAgB;EAChB,cAAc;EACd,sBAAsB;EACtB,uOAAuO;EACvO,yBAAyB;EACzB,sBAAsB;EACtB,gBAAgB;AAClB;AACA;EACE,qBAAqB;EACrB,UAAU;EACV,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,sBAAsB;AACxB;AACA;EACE,YAAY;EACZ,sBAAsB;EACtB,sBAAsB;AACxB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,aAAa;AACf;AACA;EACE,kBAAkB;EAClB,0BAA0B;AAC5B;AACA;EACE,kCAAkC;EAClC,oBAAoB;EACpB,uBAAuB;EACvB,oBAAoB;EACpB,mBAAmB;AACrB;AACA;EACE,gCAAgC;EAChC,mBAAmB;EACnB,sBAAsB;EACtB,kBAAkB;EAClB,kBAAkB;AACpB;AACA;EACE,kBAAkB;EAClB,qBAAqB;EACrB,WAAW;EACX,mCAAmC;EACnC,gBAAgB;AAClB;AACA;EACE,kBAAkB;EAClB,UAAU;EACV,WAAW;EACX,mCAAmC;EACnC,SAAS;EACT,UAAU;AACZ;AACA;EACE,qBAAqB;EACrB,gDAAgD;AAClD;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,iBAAiB;AACnB;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,QAAQ;EACR,OAAO;EACP,UAAU;EACV,mCAAmC;EACnC,yBAAyB;EACzB,gBAAgB;EAChB,gBAAgB;EAChB,cAAc;EACd,sBAAsB;EACtB,yBAAyB;EACzB,sBAAsB;AACxB;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,QAAQ;EACR,SAAS;EACT,UAAU;EACV,cAAc;EACd,6BAA6B;EAC7B,yBAAyB;EACzB,gBAAgB;EAChB,cAAc;EACd,iBAAiB;EACjB,yBAAyB;EACzB,oBAAoB;EACpB,kCAAkC;AACpC;AACA;EACE,WAAW;EACX,cAAc;EACd,UAAU;EACV,6BAA6B;EAC7B,gBAAgB;AAClB;AACA;EACE,aAAa;AACf;AACA;EACE,gEAAgE;AAClE;AACA;EACE,gEAAgE;AAClE;AACA;EACE,gEAAgE;AAClE;AACA;EACE,SAAS;AACX;AACA;EACE,WAAW;EACX,YAAY;EACZ,oBAAoB;EACpB,yBAAyB;EACzB,SAAS;EACT,mBAAmB;EACnB,4GAA4G;EAC5G,gBAAgB;AAClB;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,cAAc;EACd,kBAAkB;EAClB,eAAe;EACf,yBAAyB;EACzB,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,WAAW;EACX,YAAY;EACZ,yBAAyB;EACzB,SAAS;EACT,mBAAmB;EACnB,4GAA4G;EAC5G,gBAAgB;AAClB;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,cAAc;EACd,kBAAkB;EAClB,eAAe;EACf,yBAAyB;EACzB,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,WAAW;EACX,YAAY;EACZ,aAAa;EACb,oBAAoB;EACpB,mBAAmB;EACnB,yBAAyB;EACzB,SAAS;EACT,mBAAmB;EACnB,4GAA4G;EAC5G,gBAAgB;AAClB;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,cAAc;EACd,kBAAkB;EAClB,eAAe;EACf,6BAA6B;EAC7B,yBAAyB;EACzB,oBAAoB;AACtB;AACA;EACE,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,kBAAkB;EAClB,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,eAAe;AACjB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,eAAe;AACjB;AACA;EACE,yBAAyB;AAC3B;AACA;;;EAGE,4GAA4G;AAC9G;AACA;AACE;;;IAGE,gBAAgB;AAClB;AACF;AACA;EACE,aAAa;EACb,eAAe;EACf,eAAe;EACf,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,oBAAoB;AACtB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,oBAAoB;EACpB,eAAe;AACjB;AACA;EACE,gCAAgC;AAClC;AACA;EACE,mBAAmB;AACrB;AACA;EACE,6BAA6B;EAC7B,+BAA+B;EAC/B,gCAAgC;AAClC;AACA;EACE,qCAAqC;AACvC;AACA;EACE,cAAc;EACd,6BAA6B;EAC7B,yBAAyB;AAC3B;AACA;;EAEE,cAAc;EACd,sBAAsB;EACtB,kCAAkC;AACpC;AACA;EACE,gBAAgB;EAChB,yBAAyB;EACzB,0BAA0B;AAC5B;AACA;EACE,sBAAsB;AACxB;AACA;;EAEE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,kBAAkB;AACpB;AACA;EACE,aAAa;EACb,YAAY;EACZ,kBAAkB;AACpB;AACA;EACE,aAAa;AACf;AACA;EACE,cAAc;AAChB;AACA;EACE,kBAAkB;EAClB,aAAa;EACb,eAAe;EACf,mBAAmB;EACnB,8BAA8B;EAC9B,oBAAoB;AACtB;AACA;;;;;;EAME,aAAa;EACb,eAAe;EACf,mBAAmB;EACnB,8BAA8B;AAChC;AACA;EACE,qBAAqB;EACrB,sBAAsB;EACtB,yBAAyB;EACzB,kBAAkB;EAClB,kBAAkB;EAClB,oBAAoB;EACpB,mBAAmB;AACrB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,aAAa;EACb,sBAAsB;EACtB,eAAe;EACf,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,gBAAgB;EAChB,eAAe;AACjB;AACA;EACE,gBAAgB;EAChB,WAAW;AACb;AACA;EACE,qBAAqB;EACrB,mBAAmB;EACnB,sBAAsB;AACxB;AACA;ECt0GA,gBAAA;EACA,YAAA;EDw0GE,mBAAmB;AACrB;AACA;EACE,wBAAwB;EACxB,kBAAkB;EAClB,cAAc;EACd,6BAA6B;EAC7B,6BAA6B;EAC7B,sBAAsB;AACxB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;EACrB,YAAY;EACZ,aAAa;EACb,sBAAsB;EACtB,WAAW;EACX,mCAAmC;EACnC,0BAA0B;AAC5B;AACA;AACE;;;;;;IAME,gBAAgB;IAChB,eAAe;AACjB;AACF;AACA;AACE;IACE,qBAAqB;IACrB,2BAA2B;AAC7B;AACA;IACE,mBAAmB;AACrB;AACA;IACE,kBAAkB;AACpB;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;;;;;;IAME,iBAAiB;AACnB;AACA;IACE,wBAAwB;IACxB,gBAAgB;AAClB;AACA;IACE,aAAa;AACf;AACF;AACA;AACE;;;;;;IAME,gBAAgB;IAChB,eAAe;AACjB;AACF;AACA;AACE;IACE,qBAAqB;IACrB,2BAA2B;AAC7B;AACA;IACE,mBAAmB;AACrB;AACA;IACE,kBAAkB;AACpB;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;;;;;;IAME,iBAAiB;AACnB;AACA;IACE,wBAAwB;IACxB,gBAAgB;AAClB;AACA;IACE,aAAa;AACf;AACF;AACA;AACE;;;;;;IAME,gBAAgB;IAChB,eAAe;AACjB;AACF;AACA;AACE;IACE,qBAAqB;IACrB,2BAA2B;AAC7B;AACA;IACE,mBAAmB;AACrB;AACA;IACE,kBAAkB;AACpB;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;;;;;;IAME,iBAAiB;AACnB;AACA;IACE,wBAAwB;IACxB,gBAAgB;AAClB;AACA;IACE,aAAa;AACf;AACF;AACA;AACE;;;;;;IAME,gBAAgB;IAChB,eAAe;AACjB;AACF;AACA;AACE;IACE,qBAAqB;IACrB,2BAA2B;AAC7B;AACA;IACE,mBAAmB;AACrB;AACA;IACE,kBAAkB;AACpB;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;;;;;;IAME,iBAAiB;AACnB;AACA;IACE,wBAAwB;IACxB,gBAAgB;AAClB;AACA;IACE,aAAa;AACf;AACF;AACA;EACE,qBAAqB;EACrB,2BAA2B;AAC7B;AACA;;;;;;EAME,gBAAgB;EAChB,eAAe;AACjB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,kBAAkB;AACpB;AACA;EACE,qBAAqB;EACrB,oBAAoB;AACtB;AACA;;;;;;EAME,iBAAiB;AACnB;AACA;EACE,wBAAwB;EACxB,gBAAgB;AAClB;AACA;EACE,aAAa;AACf;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;;;;EAIE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;EACzB,gCAAgC;AAClC;AACA;EACE,+QAA+Q;AACjR;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,WAAW;AACb;AACA;EACE,WAAW;AACb;AACA;EACE,+BAA+B;AACjC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;;;;EAIE,WAAW;AACb;AACA;EACE,+BAA+B;EAC/B,sCAAsC;AACxC;AACA;EACE,qRAAqR;AACvR;AACA;EACE,+BAA+B;AACjC;AACA;EACE,WAAW;AACb;AACA;EACE,WAAW;AACb;AACA;EACE,kBAAkB;EAClB,aAAa;EACb,sBAAsB;EACtB,YAAY;EACZ,qBAAqB;EACrB,sBAAsB;EACtB,2BAA2B;EAC3B,sCAAsC;EACtC,sBAAsB;AACxB;AACA;EACE,eAAe;EACf,cAAc;AAChB;AACA;EACE,+BAA+B;EAC/B,gCAAgC;AAClC;AACA;EACE,mCAAmC;EACnC,kCAAkC;AACpC;AACA;EACE,cAAc;EACd,eAAe;EACf,gBAAgB;AAClB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,qBAAqB;EACrB,gBAAgB;AAClB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,oBAAoB;AACtB;AACA;EACE,wBAAwB;EACxB,gBAAgB;EAChB,qCAAqC;EACrC,6CAA6C;AAC/C;AACA;EACE,0DAA0D;AAC5D;AACA;EACE,aAAa;AACf;AACA;EACE,wBAAwB;EACxB,qCAAqC;EACrC,0CAA0C;AAC5C;AACA;EACE,0DAA0D;AAC5D;AACA;EACE,uBAAuB;EACvB,uBAAuB;EACvB,sBAAsB;EC1rHxB,gBAAA;AD4rHA;AACA;EACE,uBAAuB;EACvB,sBAAsB;AACxB;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,QAAQ;EACR,SAAS;EACT,OAAO;EACP,gBAAgB;AAClB;AACA;;;EAGE,cAAc;EACd,WAAW;AACb;AACA;;EAEE,2CAA2C;EAC3C,4CAA4C;AAC9C;AACA;;EAEE,+CAA+C;EAC/C,8CAA8C;AAChD;AACA;EACE,mBAAmB;AACrB;AACA;AACE;IACE,aAAa;IACb,mBAAmB;IACnB,mBAAmB;IACnB,kBAAkB;AACpB;AACA;IACE,YAAY;IACZ,kBAAkB;IAClB,gBAAgB;IAChB,iBAAiB;AACnB;AACF;AACA;EACE,mBAAmB;AACrB;AACA;AACE;IACE,aAAa;IACb,mBAAmB;AACrB;AACA;IACE,YAAY;IACZ,gBAAgB;AAClB;AACA;IACE,cAAc;IACd,cAAc;AAChB;AACA;IACE,0BAA0B;IAC1B,6BAA6B;AAC/B;AACA;;IAEE,0BAA0B;AAC5B;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,yBAAyB;IACzB,4BAA4B;AAC9B;AACA;;IAEE,yBAAyB;AAC3B;AACA;;IAEE,4BAA4B;AAC9B;AACF;AACA;EACE,sBAAsB;AACxB;AACA;AACE;IACE,eAAe;IACf,mBAAmB;IACnB,UAAU;IACV,SAAS;AACX;AACA;IACE,qBAAqB;IACrB,WAAW;AACb;AACF;AACA;EACE,gBAAgB;AAClB;AACA;EACE,gBAAgB;EAChB,6BAA6B;EAC7B,4BAA4B;AAC9B;AACA;EACE,yBAAyB;EACzB,0BAA0B;AAC5B;AACA;EACE,gBAAgB;EAChB,mBAAmB;AACrB;AACA;EACE,aAAa;EACb,eAAe;EACf,qBAAqB;EACrB,mBAAmB;EACnB,gBAAgB;EAChB,yBAAyB;EACzB,sBAAsB;AACxB;AACA;EACE,oBAAoB;AACtB;AACA;EACE,qBAAqB;EACrB,qBAAqB;EACrB,cAAc;EACd,YAAY;AACd;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,qBAAqB;AACvB;AACA;EACE,cAAc;AAChB;AACA;EACE,aAAa;EACb,eAAe;EACf,gBAAgB;EAChB,sBAAsB;AACxB;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,uBAAuB;EACvB,iBAAiB;EACjB,iBAAiB;EACjB,cAAc;EACd,sBAAsB;EACtB,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,cAAc;EACd,qBAAqB;EACrB,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,UAAU;EACV,UAAU;EACV,gDAAgD;AAClD;AACA;EACE,cAAc;EACd,+BAA+B;EAC/B,kCAAkC;AACpC;AACA;EACE,gCAAgC;EAChC,mCAAmC;AACrC;AACA;EACE,UAAU;EACV,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,oBAAoB;EACpB,YAAY;EACZ,sBAAsB;EACtB,qBAAqB;AACvB;AACA;EACE,uBAAuB;EACvB,kBAAkB;EAClB,gBAAgB;AAClB;AACA;EACE,8BAA8B;EAC9B,iCAAiC;AACnC;AACA;EACE,+BAA+B;EAC/B,kCAAkC;AACpC;AACA;EACE,uBAAuB;EACvB,mBAAmB;EACnB,gBAAgB;AAClB;AACA;EACE,8BAA8B;EAC9B,iCAAiC;AACnC;AACA;EACE,+BAA+B;EAC/B,kCAAkC;AACpC;AACA;EACE,qBAAqB;EACrB,qBAAqB;EACrB,cAAc;EACd,gBAAgB;EAChB,cAAc;EACd,kBAAkB;EAClB,mBAAmB;EACnB,wBAAwB;EACxB,sBAAsB;EACtB,qIAAqI;AACvI;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,qBAAqB;AACvB;AAEA;EACE,aAAa;AACf;AACA;EACE,kBAAkB;EAClB,SAAS;AACX;AACA;EACE,oBAAoB;EACpB,mBAAmB;EACnB,oBAAoB;AACtB;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,+CAA+C;AACjD;AAEA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,iDAAiD;AACnD;AAEA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,+CAA+C;AACjD;AAEA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,gDAAgD;AAClD;AAEA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,+CAA+C;AACjD;AAEA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,+CAA+C;AACjD;AAEA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,iDAAiD;AACnD;AAEA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;AAC3B;AACA;EACE,UAAU;EACV,8CAA8C;AAChD;AAEA;EACE,kBAAkB;EAClB,mBAAmB;EACnB,yBAAyB;EACzB,qBAAqB;AACvB;AACA;AACE;IACE,kBAAkB;AACpB;AACF;AACA;EACE,gBAAgB;EAChB,eAAe;EACf,gBAAgB;AAClB;AACA;EACE,kBAAkB;EAClB,wBAAwB;EACxB,mBAAmB;EACnB,6BAA6B;EAC7B,sBAAsB;AACxB;AACA;EACE,cAAc;AAChB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,QAAQ;EACR,wBAAwB;EACxB,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;EACE,cAAc;EACd,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,cAAc;AAChB;AACA;AACE;IACE,2BAA2B;AAC7B;AACA;IACE,wBAAwB;AAC1B;AACF;AACA;EACE,aAAa;EACb,YAAY;EACZ,gBAAgB;EAChB,kBAAkB;EAClB,yBAAyB;EACzB,sBAAsB;AACxB;AACA;EACE,aAAa;EACb,sBAAsB;EACtB,uBAAuB;EACvB,gBAAgB;EAChB,WAAW;EACX,kBAAkB;EAClB,mBAAmB;EACnB,yBAAyB;EACzB,2BAA2B;AAC7B;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,qMAAqM;EACrM,0BAA0B;AAC5B;AACA;EACE,kDAAkD;AACpD;AACA;AACE;IACE,eAAe;AACjB;AACF;AACA;EACE,aAAa;EACb,uBAAuB;AACzB;AACA;EACE,OAAO;AACT;AACA;EACE,aAAa;EACb,sBAAsB;EACtB,eAAe;EACf,gBAAgB;AAClB;AACA;EACE,WAAW;EACX,cAAc;EACd,mBAAmB;AACrB;AACA;EACE,UAAU;EACV,cAAc;EACd,qBAAqB;EACrB,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,wBAAwB;EACxB,sBAAsB;EACtB,sCAAsC;AACxC;AACA;EACE,+BAA+B;EAC/B,gCAAgC;AAClC;AACA;EACE,mCAAmC;EACnC,kCAAkC;AACpC;AACA;EACE,cAAc;EACd,oBAAoB;EACpB,sBAAsB;AACxB;AACA;EACE,UAAU;EACV,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,gBAAgB;EAChB,qBAAqB;AACvB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,kCAAkC;EAClC,0BAA0B;AAC5B;AACA;EACE,gCAAgC;EAChC,4BAA4B;AAC9B;AACA;EACE,aAAa;AACf;AACA;EACE,qBAAqB;EACrB,oBAAoB;AACtB;AACA;EACE,iBAAiB;EACjB,sBAAsB;AACxB;AACA;AACE;IACE,mBAAmB;AACrB;AACA;IACE,kCAAkC;IAClC,0BAA0B;AAC5B;AACA;IACE,gCAAgC;IAChC,4BAA4B;AAC9B;AACA;IACE,aAAa;AACf;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;IACE,iBAAiB;IACjB,sBAAsB;AACxB;AACF;AACA;AACE;IACE,mBAAmB;AACrB;AACA;IACE,kCAAkC;IAClC,0BAA0B;AAC5B;AACA;IACE,gCAAgC;IAChC,4BAA4B;AAC9B;AACA;IACE,aAAa;AACf;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;IACE,iBAAiB;IACjB,sBAAsB;AACxB;AACF;AACA;AACE;IACE,mBAAmB;AACrB;AACA;IACE,kCAAkC;IAClC,0BAA0B;AAC5B;AACA;IACE,gCAAgC;IAChC,4BAA4B;AAC9B;AACA;IACE,aAAa;AACf;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;IACE,iBAAiB;IACjB,sBAAsB;AACxB;AACF;AACA;AACE;IACE,mBAAmB;AACrB;AACA;IACE,kCAAkC;IAClC,0BAA0B;AAC5B;AACA;IACE,gCAAgC;IAChC,4BAA4B;AAC9B;AACA;IACE,aAAa;AACf;AACA;IACE,qBAAqB;IACrB,oBAAoB;AACtB;AACA;IACE,iBAAiB;IACjB,sBAAsB;AACxB;AACF;AACA;EACE,qBAAqB;EACrB,oBAAoB;EACpB,gBAAgB;AAClB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,cAAc;EACd,yBAAyB;AAC3B;AACA;EACE,WAAW;EACX,yBAAyB;EACzB,qBAAqB;AACvB;AACA;EACE,YAAY;EACZ,iBAAiB;EACjB,gBAAgB;EAChB,cAAc;EACd,WAAW;EACX,yBAAyB;EACzB,YAAY;AACd;AACA;EACE,WAAW;EACX,qBAAqB;AACvB;AACA;EACE,aAAa;AACf;AACA;EACE,UAAU;EACV,6BAA6B;EAC7B,SAAS;EACT,gBAAgB;AAClB;AACA;EACE,oBAAoB;AACtB;AACA;EACE,gBAAgB;EAChB,gBAAgB;EAChB,mBAAmB;EACnB,2CAA2C;EAC3C,4BAA4B;EAC5B,oCAAoC;EACpC,gDAAgD;EAChD,2BAA2B;EAC3B,UAAU;EACV,sBAAsB;AACxB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,UAAU;AACZ;AACA;EACE,cAAc;EACd,UAAU;AACZ;AACA;EACE,aAAa;AACf;AACA;EACE,aAAa;EACb,mBAAmB;EACnB,wBAAwB;EACxB,cAAc;EACd,2CAA2C;EAC3C,4BAA4B;EAC5B,4CAA4C;AAC9C;AACA;EACE,gBAAgB;AAClB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,kBAAkB;EAClB,gBAAgB;AAClB;AACA;EACE,eAAe;EACf,MAAM;EACN,OAAO;EACP,aAAa;EACb,aAAa;EACb,WAAW;EACX,YAAY;EACZ,gBAAgB;EAChB,UAAU;AACZ;AACA;EACE,kBAAkB;EAClB,WAAW;EACX,cAAc;EACd,oBAAoB;AACtB;AACA;EACE,mCAAmC;EACnC,8BAA8B;AAChC;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,eAAe;AACjB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,aAAa;EACb,6BAA6B;AAC/B;AACA;EACE,8BAA8B;EAC9B,gBAAgB;AAClB;AACA;;EAEE,cAAc;AAChB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,aAAa;EACb,mBAAmB;EACnB,6BAA6B;AAC/B;AACA;EACE,cAAc;EACd,0BAA0B;EAC1B,WAAW;AACb;AACA;EACE,sBAAsB;EACtB,uBAAuB;EACvB,YAAY;AACd;AACA;EACE,gBAAgB;AAClB;AACA;EACE,aAAa;AACf;AACA;EACE,kBAAkB;EAClB,aAAa;EACb,sBAAsB;EC/nJxB,WAAA;EDioJE,oBAAoB;EACpB,sBAAsB;EACtB,4BAA4B;EAC5B,oCAAoC;EACpC,qBAAqB;EACrB,UAAU;AACZ;AACA;EACE,eAAe;EACf,MAAM;EACN,OAAO;EACP,aAAa;EACb,YAAY;EACZ,aAAa;EACb,sBAAsB;AACxB;AACA;EACE,UAAU;AACZ;AACA;EACE,YAAY;AACd;AACA;EACE,aAAa;EACb,uBAAuB;EACvB,8BAA8B;EAC9B,kBAAkB;EAClB,gCAAgC;EAChC,0CAA0C;EAC1C,2CAA2C;AAC7C;AACA;EACE,kBAAkB;EAClB,8BAA8B;AAChC;AACA;EACE,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,aAAa;AACf;AACA;EACE,aAAa;EACb,eAAe;EACf,mBAAmB;EACnB,yBAAyB;EACzB,gBAAgB;EAChB,6BAA6B;EAC7B,8CAA8C;EAC9C,6CAA6C;AAC/C;AACA;EACE,eAAe;AACjB;AACA;EACE,kBAAkB;EAClB,YAAY;EACZ,WAAW;EACX,YAAY;EACZ,gBAAgB;AAClB;AACA;AACE;IACE,gBAAgB;IAChB,oBAAoB;AACtB;AACA;IACE,+BAA+B;AACjC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,gBAAgB;AAClB;AACF;AACA;AACE;;IAEE,gBAAgB;AAClB;AACF;AACA;AACE;IACE,iBAAiB;AACnB;AACF;AACA;EACE,kBAAkB;EAClB,aAAa;EACb,cAAc;EACd,SAAS;EACT,kMAAkM;EAClM,kBAAkB;EAClB,gBAAgB;EAChB,gBAAgB;EAChB,gBAAgB;EAChB,iBAAiB;EACjB,qBAAqB;EACrB,iBAAiB;EACjB,oBAAoB;EACpB,sBAAsB;EACtB,kBAAkB;EAClB,oBAAoB;EACpB,mBAAmB;EACnB,gBAAgB;EAChB,mBAAmB;EACnB,qBAAqB;EACrB,UAAU;AACZ;AACA;EACE,YAAY;AACd;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,aAAa;EACb,cAAc;AAChB;AACA;EACE,kBAAkB;EAClB,WAAW;EACX,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,SAAS;AACX;AACA;EACE,MAAM;EACN,6BAA6B;EAC7B,sBAAsB;AACxB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,OAAO;EACP,aAAa;EACb,cAAc;AAChB;AACA;EACE,QAAQ;EACR,oCAAoC;EACpC,wBAAwB;AAC1B;AACA;EACE,iBAAiB;AACnB;AACA;EACE,MAAM;AACR;AACA;EACE,SAAS;EACT,6BAA6B;EAC7B,yBAAyB;AAC3B;AACA;EACE,iBAAiB;AACnB;AACA;EACE,QAAQ;EACR,aAAa;EACb,cAAc;AAChB;AACA;EACE,OAAO;EACP,oCAAoC;EACpC,uBAAuB;AACzB;AACA;EACE,gBAAgB;ECxzJlB,uBAAA;EACA,WAAA;ED0zJE,kBAAkB;EAClB,sBAAsB;EACtB,sBAAsB;AACxB;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,OAAO;EACP,aAAa;EACb,cAAc;EACd,gBAAgB;EAChB,kMAAkM;EAClM,kBAAkB;EAClB,gBAAgB;EAChB,gBAAgB;EAChB,gBAAgB;EAChB,iBAAiB;EACjB,qBAAqB;EACrB,iBAAiB;EACjB,oBAAoB;EACpB,sBAAsB;EACtB,kBAAkB;EAClB,oBAAoB;EACpB,mBAAmB;EACnB,gBAAgB;EAChB,mBAAmB;EACnB,qBAAqB;EACrB,sBAAsB;EACtB,4BAA4B;EAC5B,oCAAoC;EACpC,qBAAqB;AACvB;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,WAAW;EACX,cAAc;EACd,gBAAgB;AAClB;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,WAAW;EACX,yBAAyB;EACzB,mBAAmB;AACrB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,SAAS;EACT,6BAA6B;EAC7B,qCAAqC;AACvC;AACA;EACE,WAAW;EACX,6BAA6B;EAC7B,sBAAsB;AACxB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,yBAAyB;EACzB,aAAa;EACb,YAAY;EACZ,gBAAgB;AAClB;AACA;EACE,OAAO;EACP,oCAAoC;EACpC,uCAAuC;AACzC;AACA;EACE,SAAS;EACT,oCAAoC;EACpC,wBAAwB;AAC1B;AACA;EACE,kBAAkB;AACpB;AACA;EACE,wBAAwB;AAC1B;AACA;EACE,MAAM;EACN,oCAAoC;EACpC,wCAAwC;AAC1C;AACA;EACE,QAAQ;EACR,oCAAoC;EACpC,yBAAyB;AAC3B;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,SAAS;EACT,cAAc;EACd,WAAW;EACX,oBAAoB;EACpB,WAAW;EACX,gCAAgC;AAClC;AACA;EACE,oBAAoB;AACtB;AACA;EACE,0BAA0B;EAC1B,aAAa;EACb,YAAY;EACZ,gBAAgB;AAClB;AACA;EACE,QAAQ;EACR,oCAAoC;EACpC,sCAAsC;AACxC;AACA;EACE,UAAU;EACV,oCAAoC;EACpC,uBAAuB;AACzB;AACA;EACE,uBAAuB;EACvB,gBAAgB;EAChB,eAAe;EACf,yBAAyB;EACzB,gCAAgC;EAChC,0CAA0C;EAC1C,2CAA2C;AAC7C;AACA;EACE,aAAa;AACf;AACA;EACE,uBAAuB;EACvB,cAAc;AAChB;AACA;EACE,kBAAkB;AACpB;AACA;EACE,mBAAmB;AACrB;AACA;EACE,kBAAkB;EAClB,WAAW;EACX,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,WAAW;EACX,WAAW;AACb;AACA;EACE,kBAAkB;EAClB,aAAa;EACb,WAAW;EACX,WAAW;EACX,mBAAmB;EACnB,2BAA2B;EAC3B,sCAAsC;AACxC;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;;;EAGE,cAAc;AAChB;AACA;;EAEE,2BAA2B;AAC7B;AACA;;EAEE,4BAA4B;AAC9B;AACA;EACE,UAAU;EACV,4BAA4B;EAC5B,eAAe;AACjB;AACA;;;EAGE,UAAU;EACV,UAAU;AACZ;AACA;;EAEE,UAAU;EACV,UAAU;EACV,2BAA2B;AAC7B;AACA;AACE;;IAEE,gBAAgB;AAClB;AACF;AACA;;EAEE,kBAAkB;EAClB,MAAM;EACN,SAAS;EACT,UAAU;EACV,aAAa;EACb,mBAAmB;EACnB,uBAAuB;EACvB,UAAU;EACV,WAAW;EACX,kBAAkB;EAClB,YAAY;EACZ,8BAA8B;AAChC;AACA;AACE;;IAEE,gBAAgB;AAClB;AACF;AACA;;;EAGE,WAAW;EACX,qBAAqB;EACrB,UAAU;EACV,YAAY;AACd;ACtiKA;EDwiKE,OAAO;AACT;AACA;EACE,QAAQ;AACV;AACA;;EAEE,qBAAqB;EACrB,WAAW;EACX,YAAY;EACZ,mCAAmC;AACrC;AACA;EACE,sNAAsN;AACxN;AACA;EACE,uNAAuN;AACzN;AACA;EACE,kBAAkB;EAClB,QAAQ;EACR,SAAS;EACT,OAAO;EACP,WAAW;EACX,aAAa;EACb,uBAAuB;EACvB,eAAe;EACf,iBAAiB;EACjB,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,uBAAuB;EACvB,cAAc;EACd,WAAW;EACX,WAAW;EACX,iBAAiB;EACjB,gBAAgB;EAChB,mBAAmB;EACnB,eAAe;EACf,sBAAsB;EACtB,4BAA4B;EAC5B,kCAAkC;EAClC,qCAAqC;EACrC,YAAY;EACZ,6BAA6B;AAC/B;AACA;AACE;IACE,gBAAgB;AAClB;AACF;AACA;EACE,UAAU;AACZ;AACA;EACE,kBAAkB;EAClB,UAAU;EACV,YAAY;EACZ,SAAS;EACT,WAAW;EACX,iBAAiB;EACjB,oBAAoB;EACpB,WAAW;EACX,kBAAkB;AACpB;AACA;AACE;IACE,yBAAyB;AAC3B;AACF;AACA;EACE,qBAAqB;EACrB,WAAW;EACX,YAAY;EACZ,2BAA2B;EAC3B,iCAAiC;EACjC,+BAA+B;EAC/B,kBAAkB;EAClB,+CAA+C;AACjD;AACA;EACE,WAAW;EACX,YAAY;EACZ,mBAAmB;AACrB;AACA;AACE;IACE,mBAAmB;AACrB;AACA;IACE,UAAU;AACZ;AACF;AACA;EACE,qBAAqB;EACrB,WAAW;EACX,YAAY;EACZ,2BAA2B;EAC3B,8BAA8B;EAC9B,kBAAkB;EAClB,UAAU;EACV,6CAA6C;AAC/C;AACA;EACE,WAAW;EACX,YAAY;AACd;AACA;EACE,mCAAmC;AACrC;AACA;EACE,8BAA8B;AAChC;AACA;EACE,iCAAiC;AACnC;AACA;EACE,iCAAiC;AACnC;AACA;EACE,sCAAsC;AACxC;AACA;EACE,mCAAmC;AACrC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;;;EAGE,oCAAoC;AACtC;AACA;EACE,iCAAiC;AACnC;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,oCAAoC;AACtC;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,0CAA0C;AAC5C;AACA;EACE,2CAA2C;AAC7C;AACA;EACE,yCAAyC;AAC3C;AACA;EACE,oBAAoB;AACtB;AACA;EACE,wBAAwB;AAC1B;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,gCAAgC;AAClC;AACA;EACE,iCAAiC;AACnC;AACA;EACE,0CAA0C;EAC1C,2CAA2C;AAC7C;AACA;EACE,2CAA2C;EAC3C,8CAA8C;AAChD;AACA;EACE,8CAA8C;EAC9C,6CAA6C;AAC/C;AACA;EACE,0CAA0C;EAC1C,6CAA6C;AAC/C;AACA;EACE,gCAAgC;AAClC;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,+BAA+B;AACjC;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,cAAc;EACd,WAAW;EACX,WAAW;AACb;AACA;EACE,wBAAwB;AAC1B;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,gCAAgC;AAClC;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,8BAA8B;AAChC;AACA;EACE,wBAAwB;AAC1B;AACA;EACE,+BAA+B;AACjC;AACA;AACE;IACE,wBAAwB;AAC1B;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,gCAAgC;AAClC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,8BAA8B;AAChC;AACA;IACE,wBAAwB;AAC1B;AACA;IACE,+BAA+B;AACjC;AACF;AACA;AACE;IACE,wBAAwB;AAC1B;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,gCAAgC;AAClC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,8BAA8B;AAChC;AACA;IACE,wBAAwB;AAC1B;AACA;IACE,+BAA+B;AACjC;AACF;AACA;AACE;IACE,wBAAwB;AAC1B;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,gCAAgC;AAClC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,8BAA8B;AAChC;AACA;IACE,wBAAwB;AAC1B;AACA;IACE,+BAA+B;AACjC;AACF;AACA;AACE;IACE,wBAAwB;AAC1B;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,gCAAgC;AAClC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,8BAA8B;AAChC;AACA;IACE,wBAAwB;AAC1B;AACA;IACE,+BAA+B;AACjC;AACF;AACA;AACE;IACE,wBAAwB;AAC1B;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,gCAAgC;AAClC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,8BAA8B;AAChC;AACA;IACE,wBAAwB;AAC1B;AACA;IACE,+BAA+B;AACjC;AACF;AACA;EACE,kBAAkB;EAClB,cAAc;EACd,WAAW;EACX,UAAU;EACV,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,WAAW;AACb;AACA;;;;;EAKE,kBAAkB;EAClB,MAAM;EACN,SAAS;EACT,OAAO;EACP,WAAW;EACX,YAAY;EACZ,SAAS;AACX;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,mBAAmB;AACrB;AACA;EACE,gBAAgB;AAClB;AACA;EACE,iBAAiB;AACnB;AACA;EACE,8BAA8B;AAChC;AACA;EACE,iCAAiC;AACnC;AACA;EACE,sCAAsC;AACxC;AACA;EACE,yCAAyC;AAC3C;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,4BAA4B;AAC9B;AACA;EACE,kCAAkC;AACpC;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,uBAAuB;AACzB;AACA;EACE,uBAAuB;AACzB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,sCAAsC;AACxC;AACA;EACE,oCAAoC;AACtC;AACA;EACE,kCAAkC;AACpC;AACA;EACE,yCAAyC;AAC3C;AACA;EACE,wCAAwC;AAC1C;AACA;EACE,kCAAkC;AACpC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,8BAA8B;AAChC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,+BAA+B;AACjC;AACA;EACE,oCAAoC;AACtC;AACA;EACE,kCAAkC;AACpC;AACA;EACE,gCAAgC;AAClC;AACA;EACE,uCAAuC;AACzC;AACA;EACE,sCAAsC;AACxC;AACA;EACE,iCAAiC;AACnC;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,iCAAiC;AACnC;AACA;EACE,+BAA+B;AACjC;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,+BAA+B;AACjC;AACA;EACE,8BAA8B;AAChC;AACA;AACE;IACE,8BAA8B;AAChC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,uBAAuB;AACzB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,sCAAsC;AACxC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,wCAAwC;AAC1C;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,8BAA8B;AAChC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,uCAAuC;AACzC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,iCAAiC;AACnC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,+BAA+B;AACjC;AACA;IACE,8BAA8B;AAChC;AACF;AACA;AACE;IACE,8BAA8B;AAChC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,uBAAuB;AACzB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,sCAAsC;AACxC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,wCAAwC;AAC1C;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,8BAA8B;AAChC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,uCAAuC;AACzC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,iCAAiC;AACnC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,+BAA+B;AACjC;AACA;IACE,8BAA8B;AAChC;AACF;AACA;AACE;IACE,8BAA8B;AAChC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,uBAAuB;AACzB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,sCAAsC;AACxC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,wCAAwC;AAC1C;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,8BAA8B;AAChC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,uCAAuC;AACzC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,iCAAiC;AACnC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,+BAA+B;AACjC;AACA;IACE,8BAA8B;AAChC;AACF;AACA;AACE;IACE,8BAA8B;AAChC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,uBAAuB;AACzB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,yBAAyB;AAC3B;AACA;IACE,sCAAsC;AACxC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,yCAAyC;AAC3C;AACA;IACE,wCAAwC;AAC1C;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,8BAA8B;AAChC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,oCAAoC;AACtC;AACA;IACE,kCAAkC;AACpC;AACA;IACE,gCAAgC;AAClC;AACA;IACE,uCAAuC;AACzC;AACA;IACE,sCAAsC;AACxC;AACA;IACE,iCAAiC;AACnC;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,iCAAiC;AACnC;AACA;IACE,+BAA+B;AACjC;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,+BAA+B;AACjC;AACA;IACE,8BAA8B;AAChC;AACF;AACA;EACE,sBAAsB;AACxB;AACA;EACE,uBAAuB;AACzB;AACA;EACE,sBAAsB;AACxB;AACA;AACE;IACE,sBAAsB;AACxB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,sBAAsB;AACxB;AACF;AACA;AACE;IACE,sBAAsB;AACxB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,sBAAsB;AACxB;AACF;AACA;AACE;IACE,sBAAsB;AACxB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,sBAAsB;AACxB;AACF;AACA;AACE;IACE,sBAAsB;AACxB;AACA;IACE,uBAAuB;AACzB;AACA;IACE,sBAAsB;AACxB;AACF;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,eAAe;EACf,MAAM;EACN,QAAQ;EACR,OAAO;EACP,aAAa;AACf;AACA;EACE,eAAe;EACf,QAAQ;EACR,SAAS;EACT,OAAO;EACP,aAAa;AACf;AACA;AACE;IACE,gBAAgB;IAChB,MAAM;IACN,aAAa;AACf;AACF;AACA;EACE,kBAAkB;EAClB,UAAU;EACV,WAAW;EACX,UAAU;EACV,YAAY;EACZ,gBAAgB;EAChB,sBAAsB;EACtB,mBAAmB;EACnB,SAAS;AACX;AACA;EACE,gBAAgB;EAChB,WAAW;EACX,YAAY;EACZ,iBAAiB;EACjB,UAAU;EACV,mBAAmB;AACrB;AACA;EACE,8DAA8D;AAChE;AACA;EACE,wDAAwD;AAC1D;AACA;EACE,uDAAuD;AACzD;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,qBAAqB;AACvB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,sBAAsB;AACxB;AACA;EACE,uBAAuB;AACzB;AACA;EACE,uBAAuB;AACzB;AACA;EACE,0BAA0B;AAC5B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,4BAA4B;AAC9B;AACA;EACE,uBAAuB;AACzB;AACA;EACE,wBAAwB;AAC1B;AACA;EACE,kBAAkB;EAClB,MAAM;EACN,QAAQ;EACR,SAAS;EACT,OAAO;EACP,UAAU;EACV,oBAAoB;EACpB,WAAW;EACX,kCAAkC;AACpC;AACA;EACE,oBAAoB;AACtB;AACA;;EAEE,wBAAwB;AAC1B;AACA;;EAEE,0BAA0B;AAC5B;AACA;;EAEE,2BAA2B;AAC7B;AACA;;EAEE,yBAAyB;AAC3B;AACA;EACE,0BAA0B;AAC5B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,+BAA+B;AACjC;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,6BAA6B;AAC/B;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,8BAA8B;AAChC;AACA;EACE,uBAAuB;AACzB;AACA;;EAEE,2BAA2B;AAC7B;AACA;;EAEE,6BAA6B;AAC/B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,4BAA4B;AAC9B;AACA;EACE,yBAAyB;AAC3B;AACA;;EAEE,6BAA6B;AAC/B;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,8BAA8B;AAChC;AACA;EACE,uBAAuB;AACzB;AACA;;EAEE,2BAA2B;AAC7B;AACA;;EAEE,6BAA6B;AAC/B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,4BAA4B;AAC9B;AACA;EACE,qBAAqB;AACvB;AACA;;EAEE,yBAAyB;AAC3B;AACA;;EAEE,2BAA2B;AAC7B;AACA;;EAEE,4BAA4B;AAC9B;AACA;;EAEE,0BAA0B;AAC5B;AACA;EACE,2BAA2B;AAC7B;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,kCAAkC;AACpC;AACA;;EAEE,gCAAgC;AAClC;AACA;EACE,0BAA0B;AAC5B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,+BAA+B;AACjC;AACA;EACE,wBAAwB;AAC1B;AACA;;EAEE,4BAA4B;AAC9B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,6BAA6B;AAC/B;AACA;EACE,0BAA0B;AAC5B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,+BAA+B;AACjC;AACA;EACE,wBAAwB;AAC1B;AACA;;EAEE,4BAA4B;AAC9B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,6BAA6B;AAC/B;AACA;EACE,2BAA2B;AAC7B;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,kCAAkC;AACpC;AACA;;EAEE,gCAAgC;AAClC;AACA;EACE,0BAA0B;AAC5B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,+BAA+B;AACjC;AACA;EACE,wBAAwB;AAC1B;AACA;;EAEE,4BAA4B;AAC9B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,6BAA6B;AAC/B;AACA;EACE,0BAA0B;AAC5B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,gCAAgC;AAClC;AACA;;EAEE,iCAAiC;AACnC;AACA;;EAEE,+BAA+B;AACjC;AACA;EACE,wBAAwB;AAC1B;AACA;;EAEE,4BAA4B;AAC9B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,+BAA+B;AACjC;AACA;;EAEE,6BAA6B;AAC/B;AACA;EACE,uBAAuB;AACzB;AACA;;EAEE,2BAA2B;AAC7B;AACA;;EAEE,6BAA6B;AAC/B;AACA;;EAEE,8BAA8B;AAChC;AACA;;EAEE,4BAA4B;AAC9B;AACA;AACE;IACE,oBAAoB;AACtB;AACA;;IAEE,wBAAwB;AAC1B;AACA;;IAEE,0BAA0B;AAC5B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,yBAAyB;AAC3B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,qBAAqB;AACvB;AACA;;IAEE,yBAAyB;AAC3B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACF;AACA;AACE;IACE,oBAAoB;AACtB;AACA;;IAEE,wBAAwB;AAC1B;AACA;;IAEE,0BAA0B;AAC5B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,yBAAyB;AAC3B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,qBAAqB;AACvB;AACA;;IAEE,yBAAyB;AAC3B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACF;AACA;AACE;IACE,oBAAoB;AACtB;AACA;;IAEE,wBAAwB;AAC1B;AACA;;IAEE,0BAA0B;AAC5B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,yBAAyB;AAC3B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,qBAAqB;AACvB;AACA;;IAEE,yBAAyB;AAC3B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACF;AACA;AACE;IACE,oBAAoB;AACtB;AACA;;IAEE,wBAAwB;AAC1B;AACA;;IAEE,0BAA0B;AAC5B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,yBAAyB;AAC3B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,yBAAyB;AAC3B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,8BAA8B;AAChC;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACA;IACE,qBAAqB;AACvB;AACA;;IAEE,yBAAyB;AAC3B;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,0BAA0B;AAC5B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,kCAAkC;AACpC;AACA;;IAEE,gCAAgC;AAClC;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,0BAA0B;AAC5B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,gCAAgC;AAClC;AACA;;IAEE,iCAAiC;AACnC;AACA;;IAEE,+BAA+B;AACjC;AACA;IACE,wBAAwB;AAC1B;AACA;;IAEE,4BAA4B;AAC9B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,+BAA+B;AACjC;AACA;;IAEE,6BAA6B;AAC/B;AACA;IACE,uBAAuB;AACzB;AACA;;IAEE,2BAA2B;AAC7B;AACA;;IAEE,6BAA6B;AAC/B;AACA;;IAEE,8BAA8B;AAChC;AACA;;IAEE,4BAA4B;AAC9B;AACF;AACA;EACE,4GAA4G;AAC9G;AACA;EACE,8BAA8B;AAChC;AACA;EACE,8BAA8B;AAChC;AACA;EACE,8BAA8B;AAChC;AACA;EACE,gBAAgB;EAChB,uBAAuB;EACvB,mBAAmB;AACrB;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,4BAA4B;AAC9B;AACA;EACE,6BAA6B;AAC/B;AACA;AACE;IACE,2BAA2B;AAC7B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,6BAA6B;AAC/B;AACF;AACA;AACE;IACE,2BAA2B;AAC7B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,6BAA6B;AAC/B;AACF;AACA;AACE;IACE,2BAA2B;AAC7B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,6BAA6B;AAC/B;AACF;AACA;AACE;IACE,2BAA2B;AAC7B;AACA;IACE,4BAA4B;AAC9B;AACA;IACE,6BAA6B;AAC/B;AACF;AACA;EACE,oCAAoC;AACtC;AACA;EACE,oCAAoC;AACtC;AACA;EACE,qCAAqC;AACvC;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,+BAA+B;AACjC;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,2BAA2B;AAC7B;AACA;EACE,8BAA8B;AAChC;AACA;EACE,6BAA6B;AAC/B;AACA;EACE,sBAAsB;AACxB;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,oCAAoC;AACtC;AACA;EACE,0CAA0C;AAC5C;AACA;EACE,WAAW;EACX,kBAAkB;EAClB,iBAAiB;EACjB,6BAA6B;EAC7B,SAAS;AACX;AACA;EACE,gCAAgC;AAClC;AACA;EACE,iCAAiC;EACjC,oCAAoC;AACtC;AACA;EACE,yBAAyB;AAC3B;AACA;EACE,8BAA8B;AAChC;AACA;EACE,6BAA6B;AAC/B;AACA;AACE;;;IAGE,4BAA4B;IAC5B,2BAA2B;AAC7B;AACA;IACE,0BAA0B;AAC5B;AACA;IACE,6BAA6B;AAC/B;AACA;IACE,gCAAgC;AAClC;AACA;;IAEE,yBAAyB;IACzB,wBAAwB;AAC1B;AACA;IACE,2BAA2B;AAC7B;AACA;;IAEE,wBAAwB;AAC1B;AACA;;;IAGE,UAAU;IACV,SAAS;AACX;AACA;;IAEE,uBAAuB;AACzB;AACA;AACE;MACE,QAAQ;AACV;AACF;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,2BAA2B;AAC7B;AACA;IACE,aAAa;AACf;AACA;IACE,sBAAsB;AACxB;AACA;IACE,oCAAoC;AACtC;ACloQF;;IDqoQI,iCAAiC;AACnC;AACA;;IAEE,oCAAoC;AACtC;AACA;IACE,cAAc;AAChB;AACA;;;;IAIE,qBAAqB;AACvB;AACA;IACE,cAAc;IACd,qBAAqB;AACvB;AACF;AACA;;EAEE,kBAAkB;EAClB,WAAW;AACb;AACA;EACE,eAAe;EACf,WAAW;AACb;AACA;EACE,eAAe;EACf,SAAS;AACX;AACA;EACE,eAAe;EACf,YAAY;AACd;AACA;EACE,eAAe;EACf,WAAW;AACb;AACA;EACE,eAAe;EACf,YAAY;AACd;AACA;EACE,eAAe;EACf,SAAS;AACX;AACA;EACE,iBAAiB;EACjB,qBAAqB;EACrB,eAAe;EACf,SAAS;EACT,kBAAkB;EAClB,YAAY;AACd;AACA;EACE,gBAAgB;EAChB,mBAAmB;EACnB,eAAe;EACf,aAAa;EACb,oBAAoB;AACtB;AACA;EACE,+CAA+C;EAC/C,WAAW;AACb;AACA;EACE,mBAAmB;EACnB,SAAS;AACX;AACA;EACE,YAAY;EACZ,yBAAyB;EACzB,iBAAiB;EACjB,qBAAqB;EACrB,eAAe;EACf,SAAS;EACT,kBAAkB;EAClB,YAAY;AACd;AACA;EACE,+CAA+C;EAC/C,WAAW;AACb;AACA;EACE,2BAA2B;EAC3B,YAAY;EACZ,4BAA4B;EAC5B,YAAY;AACd;AACA;EACE,iBAAiB;EACjB,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,SAAS;EACT,WAAW;EACX,YAAY;EACZ,UAAU;AACZ;AACA;EACE,aAAa;EACb,SAAS;EACT,6BAA6B;EAC7B,WAAW;EACX,8BAA8B;EAC9B,WAAW;AACb;AACA;EACE,aAAa;EACb,SAAS;AACX;AACA;EACE,oBAAoB;EACpB,WAAW;AACb;AACA;EACE,aAAa;EACb,SAAS;AACX;AACA;EACE,mBAAmB;EACnB,SAAS;AACX;AACA;EACE,aAAa;EACb,YAAY;AACd;AACA;EACE,cAAc;EACd,WAAW;AACb;AAEA;EACE,iBAAiB;EACjB,YAAY;EACZ,eAAe;EACf,mBAAmB;AACrB;AACA;EACE,eAAe;EACf,SAAS;AACX;AACA;EACE,aAAa;EACb,sBAAsB;EACtB,cAAc;AAChB;AACA;EACE,cAAc;AAChB;AACA;EACE,YAAY;EACZ,WAAW;EACX,kDAAkD;AACpD;AACA;EACE,YAAY;EACZ,gBAAgB;EAChB,YAAY;EACZ,gBAAgB;EAChB,gBAAgB;AAClB;AACA;EACE,cAAc;EACd,gBAAgB;AAClB;AACA;EACE,eAAe;EACf,WAAW;AACb;AACA;EACE,gBAAgB;EAChB,aAAa;EACb,sBAAsB;EACtB,cAAc;EACd,iBAAiB;AACnB;AACA;EACE,cAAc;EACd,uBAAuB;EACvB,aAAa;EACb,eAAe;AACjB;AACA;EACE,kBAAkB;EAClB,aAAa;AACf;AACA;EACE,YAAY;EACZ,oBAAoB;AACtB;AACA;EACE,gBAAgB;EAChB,wBAAwB;AAC1B;;AAEA,wCAAwC","file":"dev-tools.vue","sourcesContent":["@charset \"UTF-8\";\n.webcg-devtools {\n  /*!\n   * Bootstrap v4.4.1 (https://getbootstrap.com/)\n   * Copyright 2011-2019 The Bootstrap Authors\n   * Copyright 2011-2019 Twitter, Inc.\n   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)\n   */\n}\n.webcg-devtools :root {\n  --blue: #007bff;\n  --indigo: #6610f2;\n  --purple: #6f42c1;\n  --pink: #e83e8c;\n  --red: #dc3545;\n  --orange: #fd7e14;\n  --yellow: #ffc107;\n  --green: #28a745;\n  --teal: #20c997;\n  --cyan: #17a2b8;\n  --white: #fff;\n  --gray: #6c757d;\n  --gray-dark: #343a40;\n  --primary: #007bff;\n  --secondary: #6c757d;\n  --success: #28a745;\n  --info: #17a2b8;\n  --warning: #ffc107;\n  --danger: #dc3545;\n  --light: #f8f9fa;\n  --dark: #343a40;\n  --breakpoint-xs: 0;\n  --breakpoint-sm: 576px;\n  --breakpoint-md: 768px;\n  --breakpoint-lg: 992px;\n  --breakpoint-xl: 1200px;\n  --font-family-sans-serif: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  --font-family-monospace: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\n}\n.webcg-devtools *,\n.webcg-devtools *::before,\n.webcg-devtools *::after {\n  box-sizing: border-box;\n}\n.webcg-devtools html {\n  font-family: sans-serif;\n  line-height: 1.15;\n  -webkit-text-size-adjust: 100%;\n  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n}\n.webcg-devtools article, .webcg-devtools aside, .webcg-devtools figcaption, .webcg-devtools figure, .webcg-devtools footer, .webcg-devtools header, .webcg-devtools hgroup, .webcg-devtools main, .webcg-devtools nav, .webcg-devtools section {\n  display: block;\n}\n.webcg-devtools body {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #212529;\n  text-align: left;\n  background-color: #fff;\n}\n.webcg-devtools [tabindex=\"-1\"]:focus:not(:focus-visible) {\n  outline: 0 !important;\n}\n.webcg-devtools hr {\n  box-sizing: content-box;\n  height: 0;\n  overflow: visible;\n}\n.webcg-devtools h1, .webcg-devtools h2, .webcg-devtools h3, .webcg-devtools h4, .webcg-devtools h5, .webcg-devtools h6 {\n  margin-top: 0;\n  margin-bottom: 0.5rem;\n}\n.webcg-devtools p {\n  margin-top: 0;\n  margin-bottom: 1rem;\n}\n.webcg-devtools abbr[title],\n.webcg-devtools abbr[data-original-title] {\n  text-decoration: underline;\n  text-decoration: underline dotted;\n  cursor: help;\n  border-bottom: 0;\n  text-decoration-skip-ink: none;\n}\n.webcg-devtools address {\n  margin-bottom: 1rem;\n  font-style: normal;\n  line-height: inherit;\n}\n.webcg-devtools ol,\n.webcg-devtools ul,\n.webcg-devtools dl {\n  margin-top: 0;\n  margin-bottom: 1rem;\n}\n.webcg-devtools ol ol,\n.webcg-devtools ul ul,\n.webcg-devtools ol ul,\n.webcg-devtools ul ol {\n  margin-bottom: 0;\n}\n.webcg-devtools dt {\n  font-weight: 700;\n}\n.webcg-devtools dd {\n  margin-bottom: 0.5rem;\n  margin-left: 0;\n}\n.webcg-devtools blockquote {\n  margin: 0 0 1rem;\n}\n.webcg-devtools b,\n.webcg-devtools strong {\n  font-weight: bolder;\n}\n.webcg-devtools small {\n  font-size: 80%;\n}\n.webcg-devtools sub,\n.webcg-devtools sup {\n  position: relative;\n  font-size: 75%;\n  line-height: 0;\n  vertical-align: baseline;\n}\n.webcg-devtools sub {\n  bottom: -0.25em;\n}\n.webcg-devtools sup {\n  top: -0.5em;\n}\n.webcg-devtools a {\n  color: #007bff;\n  text-decoration: none;\n  background-color: transparent;\n}\n.webcg-devtools a:hover {\n  color: #0056b3;\n  text-decoration: underline;\n}\n.webcg-devtools a:not([href]) {\n  color: inherit;\n  text-decoration: none;\n}\n.webcg-devtools a:not([href]):hover {\n  color: inherit;\n  text-decoration: none;\n}\n.webcg-devtools pre,\n.webcg-devtools code,\n.webcg-devtools kbd,\n.webcg-devtools samp {\n  font-family: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\n  font-size: 1em;\n}\n.webcg-devtools pre {\n  margin-top: 0;\n  margin-bottom: 1rem;\n  overflow: auto;\n}\n.webcg-devtools figure {\n  margin: 0 0 1rem;\n}\n.webcg-devtools img {\n  vertical-align: middle;\n  border-style: none;\n}\n.webcg-devtools svg {\n  overflow: hidden;\n  vertical-align: middle;\n}\n.webcg-devtools table {\n  border-collapse: collapse;\n}\n.webcg-devtools caption {\n  padding-top: 0.75rem;\n  padding-bottom: 0.75rem;\n  color: #6c757d;\n  text-align: left;\n  caption-side: bottom;\n}\n.webcg-devtools th {\n  text-align: inherit;\n}\n.webcg-devtools label {\n  display: inline-block;\n  margin-bottom: 0.5rem;\n}\n.webcg-devtools button {\n  border-radius: 0;\n}\n.webcg-devtools button:focus {\n  outline: 1px dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n}\n.webcg-devtools input,\n.webcg-devtools button,\n.webcg-devtools select,\n.webcg-devtools optgroup,\n.webcg-devtools textarea {\n  margin: 0;\n  font-family: inherit;\n  font-size: inherit;\n  line-height: inherit;\n}\n.webcg-devtools button,\n.webcg-devtools input {\n  overflow: visible;\n}\n.webcg-devtools button,\n.webcg-devtools select {\n  text-transform: none;\n}\n.webcg-devtools select {\n  word-wrap: normal;\n}\n.webcg-devtools button,\n.webcg-devtools [type=button],\n.webcg-devtools [type=reset],\n.webcg-devtools [type=submit] {\n  -webkit-appearance: button;\n}\n.webcg-devtools button:not(:disabled),\n.webcg-devtools [type=button]:not(:disabled),\n.webcg-devtools [type=reset]:not(:disabled),\n.webcg-devtools [type=submit]:not(:disabled) {\n  cursor: pointer;\n}\n.webcg-devtools button::-moz-focus-inner,\n.webcg-devtools [type=button]::-moz-focus-inner,\n.webcg-devtools [type=reset]::-moz-focus-inner,\n.webcg-devtools [type=submit]::-moz-focus-inner {\n  padding: 0;\n  border-style: none;\n}\n.webcg-devtools input[type=radio],\n.webcg-devtools input[type=checkbox] {\n  box-sizing: border-box;\n  padding: 0;\n}\n.webcg-devtools input[type=date],\n.webcg-devtools input[type=time],\n.webcg-devtools input[type=datetime-local],\n.webcg-devtools input[type=month] {\n  -webkit-appearance: listbox;\n}\n.webcg-devtools textarea {\n  overflow: auto;\n  resize: vertical;\n}\n.webcg-devtools fieldset {\n  min-width: 0;\n  padding: 0;\n  margin: 0;\n  border: 0;\n}\n.webcg-devtools legend {\n  display: block;\n  width: 100%;\n  max-width: 100%;\n  padding: 0;\n  margin-bottom: 0.5rem;\n  font-size: 1.5rem;\n  line-height: inherit;\n  color: inherit;\n  white-space: normal;\n}\n.webcg-devtools progress {\n  vertical-align: baseline;\n}\n.webcg-devtools [type=number]::-webkit-inner-spin-button,\n.webcg-devtools [type=number]::-webkit-outer-spin-button {\n  height: auto;\n}\n.webcg-devtools [type=search] {\n  outline-offset: -2px;\n  -webkit-appearance: none;\n}\n.webcg-devtools [type=search]::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n.webcg-devtools ::-webkit-file-upload-button {\n  font: inherit;\n  -webkit-appearance: button;\n}\n.webcg-devtools output {\n  display: inline-block;\n}\n.webcg-devtools summary {\n  display: list-item;\n  cursor: pointer;\n}\n.webcg-devtools template {\n  display: none;\n}\n.webcg-devtools [hidden] {\n  display: none !important;\n}\n.webcg-devtools h1, .webcg-devtools h2, .webcg-devtools h3, .webcg-devtools h4, .webcg-devtools h5, .webcg-devtools h6,\n.webcg-devtools .h1, .webcg-devtools .h2, .webcg-devtools .h3, .webcg-devtools .h4, .webcg-devtools .h5, .webcg-devtools .h6 {\n  margin-bottom: 0.5rem;\n  font-weight: 500;\n  line-height: 1.2;\n}\n.webcg-devtools h1, .webcg-devtools .h1 {\n  font-size: 2.5rem;\n}\n.webcg-devtools h2, .webcg-devtools .h2 {\n  font-size: 2rem;\n}\n.webcg-devtools h3, .webcg-devtools .h3 {\n  font-size: 1.75rem;\n}\n.webcg-devtools h4, .webcg-devtools .h4 {\n  font-size: 1.5rem;\n}\n.webcg-devtools h5, .webcg-devtools .h5 {\n  font-size: 1.25rem;\n}\n.webcg-devtools h6, .webcg-devtools .h6 {\n  font-size: 1rem;\n}\n.webcg-devtools .lead {\n  font-size: 1.25rem;\n  font-weight: 300;\n}\n.webcg-devtools .display-1 {\n  font-size: 6rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools .display-2 {\n  font-size: 5.5rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools .display-3 {\n  font-size: 4.5rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools .display-4 {\n  font-size: 3.5rem;\n  font-weight: 300;\n  line-height: 1.2;\n}\n.webcg-devtools hr {\n  margin-top: 1rem;\n  margin-bottom: 1rem;\n  border: 0;\n  border-top: 1px solid rgba(0, 0, 0, 0.1);\n}\n.webcg-devtools small,\n.webcg-devtools .small {\n  font-size: 80%;\n  font-weight: 400;\n}\n.webcg-devtools mark,\n.webcg-devtools .mark {\n  padding: 0.2em;\n  background-color: #fcf8e3;\n}\n.webcg-devtools .list-unstyled {\n  padding-left: 0;\n  list-style: none;\n}\n.webcg-devtools .list-inline {\n  padding-left: 0;\n  list-style: none;\n}\n.webcg-devtools .list-inline-item {\n  display: inline-block;\n}\n.webcg-devtools .list-inline-item:not(:last-child) {\n  margin-right: 0.5rem;\n}\n.webcg-devtools .initialism {\n  font-size: 90%;\n  text-transform: uppercase;\n}\n.webcg-devtools .blockquote {\n  margin-bottom: 1rem;\n  font-size: 1.25rem;\n}\n.webcg-devtools .blockquote-footer {\n  display: block;\n  font-size: 80%;\n  color: #6c757d;\n}\n.webcg-devtools .blockquote-footer::before {\n  content: \"— \";\n}\n.webcg-devtools .img-fluid {\n  max-width: 100%;\n  height: auto;\n}\n.webcg-devtools .img-thumbnail {\n  padding: 0.25rem;\n  background-color: #fff;\n  border: 1px solid #dee2e6;\n  border-radius: 0.25rem;\n  max-width: 100%;\n  height: auto;\n}\n.webcg-devtools .figure {\n  display: inline-block;\n}\n.webcg-devtools .figure-img {\n  margin-bottom: 0.5rem;\n  line-height: 1;\n}\n.webcg-devtools .figure-caption {\n  font-size: 90%;\n  color: #6c757d;\n}\n.webcg-devtools code {\n  font-size: 87.5%;\n  color: #e83e8c;\n  word-wrap: break-word;\n}\na > .webcg-devtools code {\n  color: inherit;\n}\n.webcg-devtools kbd {\n  padding: 0.2rem 0.4rem;\n  font-size: 87.5%;\n  color: #fff;\n  background-color: #212529;\n  border-radius: 0.2rem;\n}\n.webcg-devtools kbd kbd {\n  padding: 0;\n  font-size: 100%;\n  font-weight: 700;\n}\n.webcg-devtools pre {\n  display: block;\n  font-size: 87.5%;\n  color: #212529;\n}\n.webcg-devtools pre code {\n  font-size: inherit;\n  color: inherit;\n  word-break: normal;\n}\n.webcg-devtools .pre-scrollable {\n  max-height: 340px;\n  overflow-y: scroll;\n}\n.webcg-devtools .container {\n  width: 100%;\n  padding-right: 15px;\n  padding-left: 15px;\n  margin-right: auto;\n  margin-left: auto;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .container {\n    max-width: 540px;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .container {\n    max-width: 720px;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .container {\n    max-width: 960px;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .container {\n    max-width: 1140px;\n  }\n}\n.webcg-devtools .container-fluid, .webcg-devtools .container-xl, .webcg-devtools .container-lg, .webcg-devtools .container-md, .webcg-devtools .container-sm {\n  width: 100%;\n  padding-right: 15px;\n  padding-left: 15px;\n  margin-right: auto;\n  margin-left: auto;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 540px;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .container-md, .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 720px;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .container-lg, .webcg-devtools .container-md, .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 960px;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .container-xl, .webcg-devtools .container-lg, .webcg-devtools .container-md, .webcg-devtools .container-sm, .webcg-devtools .container {\n    max-width: 1140px;\n  }\n}\n.webcg-devtools .row {\n  display: flex;\n  flex-wrap: wrap;\n  margin-right: -15px;\n  margin-left: -15px;\n}\n.webcg-devtools .no-gutters {\n  margin-right: 0;\n  margin-left: 0;\n}\n.webcg-devtools .no-gutters > .col,\n.webcg-devtools .no-gutters > [class*=col-] {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .col-xl,\n.webcg-devtools .col-xl-auto, .webcg-devtools .col-xl-12, .webcg-devtools .col-xl-11, .webcg-devtools .col-xl-10, .webcg-devtools .col-xl-9, .webcg-devtools .col-xl-8, .webcg-devtools .col-xl-7, .webcg-devtools .col-xl-6, .webcg-devtools .col-xl-5, .webcg-devtools .col-xl-4, .webcg-devtools .col-xl-3, .webcg-devtools .col-xl-2, .webcg-devtools .col-xl-1, .webcg-devtools .col-lg,\n.webcg-devtools .col-lg-auto, .webcg-devtools .col-lg-12, .webcg-devtools .col-lg-11, .webcg-devtools .col-lg-10, .webcg-devtools .col-lg-9, .webcg-devtools .col-lg-8, .webcg-devtools .col-lg-7, .webcg-devtools .col-lg-6, .webcg-devtools .col-lg-5, .webcg-devtools .col-lg-4, .webcg-devtools .col-lg-3, .webcg-devtools .col-lg-2, .webcg-devtools .col-lg-1, .webcg-devtools .col-md,\n.webcg-devtools .col-md-auto, .webcg-devtools .col-md-12, .webcg-devtools .col-md-11, .webcg-devtools .col-md-10, .webcg-devtools .col-md-9, .webcg-devtools .col-md-8, .webcg-devtools .col-md-7, .webcg-devtools .col-md-6, .webcg-devtools .col-md-5, .webcg-devtools .col-md-4, .webcg-devtools .col-md-3, .webcg-devtools .col-md-2, .webcg-devtools .col-md-1, .webcg-devtools .col-sm,\n.webcg-devtools .col-sm-auto, .webcg-devtools .col-sm-12, .webcg-devtools .col-sm-11, .webcg-devtools .col-sm-10, .webcg-devtools .col-sm-9, .webcg-devtools .col-sm-8, .webcg-devtools .col-sm-7, .webcg-devtools .col-sm-6, .webcg-devtools .col-sm-5, .webcg-devtools .col-sm-4, .webcg-devtools .col-sm-3, .webcg-devtools .col-sm-2, .webcg-devtools .col-sm-1, .webcg-devtools .col,\n.webcg-devtools .col-auto, .webcg-devtools .col-12, .webcg-devtools .col-11, .webcg-devtools .col-10, .webcg-devtools .col-9, .webcg-devtools .col-8, .webcg-devtools .col-7, .webcg-devtools .col-6, .webcg-devtools .col-5, .webcg-devtools .col-4, .webcg-devtools .col-3, .webcg-devtools .col-2, .webcg-devtools .col-1 {\n  position: relative;\n  width: 100%;\n  padding-right: 15px;\n  padding-left: 15px;\n}\n.webcg-devtools .col {\n  flex-basis: 0;\n  flex-grow: 1;\n  max-width: 100%;\n}\n.webcg-devtools .row-cols-1 > * {\n  flex: 0 0 100%;\n  max-width: 100%;\n}\n.webcg-devtools .row-cols-2 > * {\n  flex: 0 0 50%;\n  max-width: 50%;\n}\n.webcg-devtools .row-cols-3 > * {\n  flex: 0 0 33.3333333333%;\n  max-width: 33.3333333333%;\n}\n.webcg-devtools .row-cols-4 > * {\n  flex: 0 0 25%;\n  max-width: 25%;\n}\n.webcg-devtools .row-cols-5 > * {\n  flex: 0 0 20%;\n  max-width: 20%;\n}\n.webcg-devtools .row-cols-6 > * {\n  flex: 0 0 16.6666666667%;\n  max-width: 16.6666666667%;\n}\n.webcg-devtools .col-auto {\n  flex: 0 0 auto;\n  width: auto;\n  max-width: 100%;\n}\n.webcg-devtools .col-1 {\n  flex: 0 0 8.3333333333%;\n  max-width: 8.3333333333%;\n}\n.webcg-devtools .col-2 {\n  flex: 0 0 16.6666666667%;\n  max-width: 16.6666666667%;\n}\n.webcg-devtools .col-3 {\n  flex: 0 0 25%;\n  max-width: 25%;\n}\n.webcg-devtools .col-4 {\n  flex: 0 0 33.3333333333%;\n  max-width: 33.3333333333%;\n}\n.webcg-devtools .col-5 {\n  flex: 0 0 41.6666666667%;\n  max-width: 41.6666666667%;\n}\n.webcg-devtools .col-6 {\n  flex: 0 0 50%;\n  max-width: 50%;\n}\n.webcg-devtools .col-7 {\n  flex: 0 0 58.3333333333%;\n  max-width: 58.3333333333%;\n}\n.webcg-devtools .col-8 {\n  flex: 0 0 66.6666666667%;\n  max-width: 66.6666666667%;\n}\n.webcg-devtools .col-9 {\n  flex: 0 0 75%;\n  max-width: 75%;\n}\n.webcg-devtools .col-10 {\n  flex: 0 0 83.3333333333%;\n  max-width: 83.3333333333%;\n}\n.webcg-devtools .col-11 {\n  flex: 0 0 91.6666666667%;\n  max-width: 91.6666666667%;\n}\n.webcg-devtools .col-12 {\n  flex: 0 0 100%;\n  max-width: 100%;\n}\n.webcg-devtools .order-first {\n  order: -1;\n}\n.webcg-devtools .order-last {\n  order: 13;\n}\n.webcg-devtools .order-0 {\n  order: 0;\n}\n.webcg-devtools .order-1 {\n  order: 1;\n}\n.webcg-devtools .order-2 {\n  order: 2;\n}\n.webcg-devtools .order-3 {\n  order: 3;\n}\n.webcg-devtools .order-4 {\n  order: 4;\n}\n.webcg-devtools .order-5 {\n  order: 5;\n}\n.webcg-devtools .order-6 {\n  order: 6;\n}\n.webcg-devtools .order-7 {\n  order: 7;\n}\n.webcg-devtools .order-8 {\n  order: 8;\n}\n.webcg-devtools .order-9 {\n  order: 9;\n}\n.webcg-devtools .order-10 {\n  order: 10;\n}\n.webcg-devtools .order-11 {\n  order: 11;\n}\n.webcg-devtools .order-12 {\n  order: 12;\n}\n.webcg-devtools .offset-1 {\n  margin-left: 8.3333333333%;\n}\n.webcg-devtools .offset-2 {\n  margin-left: 16.6666666667%;\n}\n.webcg-devtools .offset-3 {\n  margin-left: 25%;\n}\n.webcg-devtools .offset-4 {\n  margin-left: 33.3333333333%;\n}\n.webcg-devtools .offset-5 {\n  margin-left: 41.6666666667%;\n}\n.webcg-devtools .offset-6 {\n  margin-left: 50%;\n}\n.webcg-devtools .offset-7 {\n  margin-left: 58.3333333333%;\n}\n.webcg-devtools .offset-8 {\n  margin-left: 66.6666666667%;\n}\n.webcg-devtools .offset-9 {\n  margin-left: 75%;\n}\n.webcg-devtools .offset-10 {\n  margin-left: 83.3333333333%;\n}\n.webcg-devtools .offset-11 {\n  margin-left: 91.6666666667%;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .col-sm {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-sm-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-sm-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .row-cols-sm-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .row-cols-sm-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .row-cols-sm-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n  }\n  .webcg-devtools .row-cols-sm-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-sm-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n  }\n  .webcg-devtools .col-sm-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n  }\n  .webcg-devtools .col-sm-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-sm-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .col-sm-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .col-sm-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n  }\n  .webcg-devtools .col-sm-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .col-sm-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n  }\n  .webcg-devtools .col-sm-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n  }\n  .webcg-devtools .col-sm-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .webcg-devtools .col-sm-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n  }\n  .webcg-devtools .col-sm-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n  }\n  .webcg-devtools .col-sm-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .order-sm-first {\n    order: -1;\n  }\n  .webcg-devtools .order-sm-last {\n    order: 13;\n  }\n  .webcg-devtools .order-sm-0 {\n    order: 0;\n  }\n  .webcg-devtools .order-sm-1 {\n    order: 1;\n  }\n  .webcg-devtools .order-sm-2 {\n    order: 2;\n  }\n  .webcg-devtools .order-sm-3 {\n    order: 3;\n  }\n  .webcg-devtools .order-sm-4 {\n    order: 4;\n  }\n  .webcg-devtools .order-sm-5 {\n    order: 5;\n  }\n  .webcg-devtools .order-sm-6 {\n    order: 6;\n  }\n  .webcg-devtools .order-sm-7 {\n    order: 7;\n  }\n  .webcg-devtools .order-sm-8 {\n    order: 8;\n  }\n  .webcg-devtools .order-sm-9 {\n    order: 9;\n  }\n  .webcg-devtools .order-sm-10 {\n    order: 10;\n  }\n  .webcg-devtools .order-sm-11 {\n    order: 11;\n  }\n  .webcg-devtools .order-sm-12 {\n    order: 12;\n  }\n  .webcg-devtools .offset-sm-0 {\n    margin-left: 0;\n  }\n  .webcg-devtools .offset-sm-1 {\n    margin-left: 8.3333333333%;\n  }\n  .webcg-devtools .offset-sm-2 {\n    margin-left: 16.6666666667%;\n  }\n  .webcg-devtools .offset-sm-3 {\n    margin-left: 25%;\n  }\n  .webcg-devtools .offset-sm-4 {\n    margin-left: 33.3333333333%;\n  }\n  .webcg-devtools .offset-sm-5 {\n    margin-left: 41.6666666667%;\n  }\n  .webcg-devtools .offset-sm-6 {\n    margin-left: 50%;\n  }\n  .webcg-devtools .offset-sm-7 {\n    margin-left: 58.3333333333%;\n  }\n  .webcg-devtools .offset-sm-8 {\n    margin-left: 66.6666666667%;\n  }\n  .webcg-devtools .offset-sm-9 {\n    margin-left: 75%;\n  }\n  .webcg-devtools .offset-sm-10 {\n    margin-left: 83.3333333333%;\n  }\n  .webcg-devtools .offset-sm-11 {\n    margin-left: 91.6666666667%;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .col-md {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-md-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-md-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .row-cols-md-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .row-cols-md-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .row-cols-md-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n  }\n  .webcg-devtools .row-cols-md-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-md-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n  }\n  .webcg-devtools .col-md-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n  }\n  .webcg-devtools .col-md-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-md-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .col-md-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .col-md-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n  }\n  .webcg-devtools .col-md-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .col-md-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n  }\n  .webcg-devtools .col-md-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n  }\n  .webcg-devtools .col-md-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .webcg-devtools .col-md-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n  }\n  .webcg-devtools .col-md-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n  }\n  .webcg-devtools .col-md-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .order-md-first {\n    order: -1;\n  }\n  .webcg-devtools .order-md-last {\n    order: 13;\n  }\n  .webcg-devtools .order-md-0 {\n    order: 0;\n  }\n  .webcg-devtools .order-md-1 {\n    order: 1;\n  }\n  .webcg-devtools .order-md-2 {\n    order: 2;\n  }\n  .webcg-devtools .order-md-3 {\n    order: 3;\n  }\n  .webcg-devtools .order-md-4 {\n    order: 4;\n  }\n  .webcg-devtools .order-md-5 {\n    order: 5;\n  }\n  .webcg-devtools .order-md-6 {\n    order: 6;\n  }\n  .webcg-devtools .order-md-7 {\n    order: 7;\n  }\n  .webcg-devtools .order-md-8 {\n    order: 8;\n  }\n  .webcg-devtools .order-md-9 {\n    order: 9;\n  }\n  .webcg-devtools .order-md-10 {\n    order: 10;\n  }\n  .webcg-devtools .order-md-11 {\n    order: 11;\n  }\n  .webcg-devtools .order-md-12 {\n    order: 12;\n  }\n  .webcg-devtools .offset-md-0 {\n    margin-left: 0;\n  }\n  .webcg-devtools .offset-md-1 {\n    margin-left: 8.3333333333%;\n  }\n  .webcg-devtools .offset-md-2 {\n    margin-left: 16.6666666667%;\n  }\n  .webcg-devtools .offset-md-3 {\n    margin-left: 25%;\n  }\n  .webcg-devtools .offset-md-4 {\n    margin-left: 33.3333333333%;\n  }\n  .webcg-devtools .offset-md-5 {\n    margin-left: 41.6666666667%;\n  }\n  .webcg-devtools .offset-md-6 {\n    margin-left: 50%;\n  }\n  .webcg-devtools .offset-md-7 {\n    margin-left: 58.3333333333%;\n  }\n  .webcg-devtools .offset-md-8 {\n    margin-left: 66.6666666667%;\n  }\n  .webcg-devtools .offset-md-9 {\n    margin-left: 75%;\n  }\n  .webcg-devtools .offset-md-10 {\n    margin-left: 83.3333333333%;\n  }\n  .webcg-devtools .offset-md-11 {\n    margin-left: 91.6666666667%;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .col-lg {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-lg-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-lg-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .row-cols-lg-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .row-cols-lg-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .row-cols-lg-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n  }\n  .webcg-devtools .row-cols-lg-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-lg-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n  }\n  .webcg-devtools .col-lg-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n  }\n  .webcg-devtools .col-lg-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-lg-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .col-lg-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .col-lg-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n  }\n  .webcg-devtools .col-lg-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .col-lg-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n  }\n  .webcg-devtools .col-lg-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n  }\n  .webcg-devtools .col-lg-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .webcg-devtools .col-lg-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n  }\n  .webcg-devtools .col-lg-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n  }\n  .webcg-devtools .col-lg-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .order-lg-first {\n    order: -1;\n  }\n  .webcg-devtools .order-lg-last {\n    order: 13;\n  }\n  .webcg-devtools .order-lg-0 {\n    order: 0;\n  }\n  .webcg-devtools .order-lg-1 {\n    order: 1;\n  }\n  .webcg-devtools .order-lg-2 {\n    order: 2;\n  }\n  .webcg-devtools .order-lg-3 {\n    order: 3;\n  }\n  .webcg-devtools .order-lg-4 {\n    order: 4;\n  }\n  .webcg-devtools .order-lg-5 {\n    order: 5;\n  }\n  .webcg-devtools .order-lg-6 {\n    order: 6;\n  }\n  .webcg-devtools .order-lg-7 {\n    order: 7;\n  }\n  .webcg-devtools .order-lg-8 {\n    order: 8;\n  }\n  .webcg-devtools .order-lg-9 {\n    order: 9;\n  }\n  .webcg-devtools .order-lg-10 {\n    order: 10;\n  }\n  .webcg-devtools .order-lg-11 {\n    order: 11;\n  }\n  .webcg-devtools .order-lg-12 {\n    order: 12;\n  }\n  .webcg-devtools .offset-lg-0 {\n    margin-left: 0;\n  }\n  .webcg-devtools .offset-lg-1 {\n    margin-left: 8.3333333333%;\n  }\n  .webcg-devtools .offset-lg-2 {\n    margin-left: 16.6666666667%;\n  }\n  .webcg-devtools .offset-lg-3 {\n    margin-left: 25%;\n  }\n  .webcg-devtools .offset-lg-4 {\n    margin-left: 33.3333333333%;\n  }\n  .webcg-devtools .offset-lg-5 {\n    margin-left: 41.6666666667%;\n  }\n  .webcg-devtools .offset-lg-6 {\n    margin-left: 50%;\n  }\n  .webcg-devtools .offset-lg-7 {\n    margin-left: 58.3333333333%;\n  }\n  .webcg-devtools .offset-lg-8 {\n    margin-left: 66.6666666667%;\n  }\n  .webcg-devtools .offset-lg-9 {\n    margin-left: 75%;\n  }\n  .webcg-devtools .offset-lg-10 {\n    margin-left: 83.3333333333%;\n  }\n  .webcg-devtools .offset-lg-11 {\n    margin-left: 91.6666666667%;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .col-xl {\n    flex-basis: 0;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-xl-1 > * {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .row-cols-xl-2 > * {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .row-cols-xl-3 > * {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .row-cols-xl-4 > * {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .row-cols-xl-5 > * {\n    flex: 0 0 20%;\n    max-width: 20%;\n  }\n  .webcg-devtools .row-cols-xl-6 > * {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-xl-auto {\n    flex: 0 0 auto;\n    width: auto;\n    max-width: 100%;\n  }\n  .webcg-devtools .col-xl-1 {\n    flex: 0 0 8.3333333333%;\n    max-width: 8.3333333333%;\n  }\n  .webcg-devtools .col-xl-2 {\n    flex: 0 0 16.6666666667%;\n    max-width: 16.6666666667%;\n  }\n  .webcg-devtools .col-xl-3 {\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .webcg-devtools .col-xl-4 {\n    flex: 0 0 33.3333333333%;\n    max-width: 33.3333333333%;\n  }\n  .webcg-devtools .col-xl-5 {\n    flex: 0 0 41.6666666667%;\n    max-width: 41.6666666667%;\n  }\n  .webcg-devtools .col-xl-6 {\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .webcg-devtools .col-xl-7 {\n    flex: 0 0 58.3333333333%;\n    max-width: 58.3333333333%;\n  }\n  .webcg-devtools .col-xl-8 {\n    flex: 0 0 66.6666666667%;\n    max-width: 66.6666666667%;\n  }\n  .webcg-devtools .col-xl-9 {\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .webcg-devtools .col-xl-10 {\n    flex: 0 0 83.3333333333%;\n    max-width: 83.3333333333%;\n  }\n  .webcg-devtools .col-xl-11 {\n    flex: 0 0 91.6666666667%;\n    max-width: 91.6666666667%;\n  }\n  .webcg-devtools .col-xl-12 {\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n  .webcg-devtools .order-xl-first {\n    order: -1;\n  }\n  .webcg-devtools .order-xl-last {\n    order: 13;\n  }\n  .webcg-devtools .order-xl-0 {\n    order: 0;\n  }\n  .webcg-devtools .order-xl-1 {\n    order: 1;\n  }\n  .webcg-devtools .order-xl-2 {\n    order: 2;\n  }\n  .webcg-devtools .order-xl-3 {\n    order: 3;\n  }\n  .webcg-devtools .order-xl-4 {\n    order: 4;\n  }\n  .webcg-devtools .order-xl-5 {\n    order: 5;\n  }\n  .webcg-devtools .order-xl-6 {\n    order: 6;\n  }\n  .webcg-devtools .order-xl-7 {\n    order: 7;\n  }\n  .webcg-devtools .order-xl-8 {\n    order: 8;\n  }\n  .webcg-devtools .order-xl-9 {\n    order: 9;\n  }\n  .webcg-devtools .order-xl-10 {\n    order: 10;\n  }\n  .webcg-devtools .order-xl-11 {\n    order: 11;\n  }\n  .webcg-devtools .order-xl-12 {\n    order: 12;\n  }\n  .webcg-devtools .offset-xl-0 {\n    margin-left: 0;\n  }\n  .webcg-devtools .offset-xl-1 {\n    margin-left: 8.3333333333%;\n  }\n  .webcg-devtools .offset-xl-2 {\n    margin-left: 16.6666666667%;\n  }\n  .webcg-devtools .offset-xl-3 {\n    margin-left: 25%;\n  }\n  .webcg-devtools .offset-xl-4 {\n    margin-left: 33.3333333333%;\n  }\n  .webcg-devtools .offset-xl-5 {\n    margin-left: 41.6666666667%;\n  }\n  .webcg-devtools .offset-xl-6 {\n    margin-left: 50%;\n  }\n  .webcg-devtools .offset-xl-7 {\n    margin-left: 58.3333333333%;\n  }\n  .webcg-devtools .offset-xl-8 {\n    margin-left: 66.6666666667%;\n  }\n  .webcg-devtools .offset-xl-9 {\n    margin-left: 75%;\n  }\n  .webcg-devtools .offset-xl-10 {\n    margin-left: 83.3333333333%;\n  }\n  .webcg-devtools .offset-xl-11 {\n    margin-left: 91.6666666667%;\n  }\n}\n.webcg-devtools .table {\n  width: 100%;\n  margin-bottom: 1rem;\n  color: #212529;\n}\n.webcg-devtools .table th,\n.webcg-devtools .table td {\n  padding: 0.75rem;\n  vertical-align: top;\n  border-top: 1px solid #dee2e6;\n}\n.webcg-devtools .table thead th {\n  vertical-align: bottom;\n  border-bottom: 2px solid #dee2e6;\n}\n.webcg-devtools .table tbody + tbody {\n  border-top: 2px solid #dee2e6;\n}\n.webcg-devtools .table-sm th,\n.webcg-devtools .table-sm td {\n  padding: 0.3rem;\n}\n.webcg-devtools .table-bordered {\n  border: 1px solid #dee2e6;\n}\n.webcg-devtools .table-bordered th,\n.webcg-devtools .table-bordered td {\n  border: 1px solid #dee2e6;\n}\n.webcg-devtools .table-bordered thead th,\n.webcg-devtools .table-bordered thead td {\n  border-bottom-width: 2px;\n}\n.webcg-devtools .table-borderless th,\n.webcg-devtools .table-borderless td,\n.webcg-devtools .table-borderless thead th,\n.webcg-devtools .table-borderless tbody + tbody {\n  border: 0;\n}\n.webcg-devtools .table-striped tbody tr:nth-of-type(odd) {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n.webcg-devtools .table-hover tbody tr:hover {\n  color: #212529;\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table-primary,\n.webcg-devtools .table-primary > th,\n.webcg-devtools .table-primary > td {\n  background-color: #b8daff;\n}\n.webcg-devtools .table-primary th,\n.webcg-devtools .table-primary td,\n.webcg-devtools .table-primary thead th,\n.webcg-devtools .table-primary tbody + tbody {\n  border-color: #7abaff;\n}\n.webcg-devtools .table-hover .table-primary:hover {\n  background-color: #9fcdff;\n}\n.webcg-devtools .table-hover .table-primary:hover > td,\n.webcg-devtools .table-hover .table-primary:hover > th {\n  background-color: #9fcdff;\n}\n.webcg-devtools .table-secondary,\n.webcg-devtools .table-secondary > th,\n.webcg-devtools .table-secondary > td {\n  background-color: #d6d8db;\n}\n.webcg-devtools .table-secondary th,\n.webcg-devtools .table-secondary td,\n.webcg-devtools .table-secondary thead th,\n.webcg-devtools .table-secondary tbody + tbody {\n  border-color: #b3b7bb;\n}\n.webcg-devtools .table-hover .table-secondary:hover {\n  background-color: #c8cbcf;\n}\n.webcg-devtools .table-hover .table-secondary:hover > td,\n.webcg-devtools .table-hover .table-secondary:hover > th {\n  background-color: #c8cbcf;\n}\n.webcg-devtools .table-success,\n.webcg-devtools .table-success > th,\n.webcg-devtools .table-success > td {\n  background-color: #c3e6cb;\n}\n.webcg-devtools .table-success th,\n.webcg-devtools .table-success td,\n.webcg-devtools .table-success thead th,\n.webcg-devtools .table-success tbody + tbody {\n  border-color: #8fd19e;\n}\n.webcg-devtools .table-hover .table-success:hover {\n  background-color: #b1dfbb;\n}\n.webcg-devtools .table-hover .table-success:hover > td,\n.webcg-devtools .table-hover .table-success:hover > th {\n  background-color: #b1dfbb;\n}\n.webcg-devtools .table-info,\n.webcg-devtools .table-info > th,\n.webcg-devtools .table-info > td {\n  background-color: #bee5eb;\n}\n.webcg-devtools .table-info th,\n.webcg-devtools .table-info td,\n.webcg-devtools .table-info thead th,\n.webcg-devtools .table-info tbody + tbody {\n  border-color: #86cfda;\n}\n.webcg-devtools .table-hover .table-info:hover {\n  background-color: #abdde5;\n}\n.webcg-devtools .table-hover .table-info:hover > td,\n.webcg-devtools .table-hover .table-info:hover > th {\n  background-color: #abdde5;\n}\n.webcg-devtools .table-warning,\n.webcg-devtools .table-warning > th,\n.webcg-devtools .table-warning > td {\n  background-color: #ffeeba;\n}\n.webcg-devtools .table-warning th,\n.webcg-devtools .table-warning td,\n.webcg-devtools .table-warning thead th,\n.webcg-devtools .table-warning tbody + tbody {\n  border-color: #ffdf7e;\n}\n.webcg-devtools .table-hover .table-warning:hover {\n  background-color: #ffe8a1;\n}\n.webcg-devtools .table-hover .table-warning:hover > td,\n.webcg-devtools .table-hover .table-warning:hover > th {\n  background-color: #ffe8a1;\n}\n.webcg-devtools .table-danger,\n.webcg-devtools .table-danger > th,\n.webcg-devtools .table-danger > td {\n  background-color: #f5c6cb;\n}\n.webcg-devtools .table-danger th,\n.webcg-devtools .table-danger td,\n.webcg-devtools .table-danger thead th,\n.webcg-devtools .table-danger tbody + tbody {\n  border-color: #ed969e;\n}\n.webcg-devtools .table-hover .table-danger:hover {\n  background-color: #f1b0b7;\n}\n.webcg-devtools .table-hover .table-danger:hover > td,\n.webcg-devtools .table-hover .table-danger:hover > th {\n  background-color: #f1b0b7;\n}\n.webcg-devtools .table-light,\n.webcg-devtools .table-light > th,\n.webcg-devtools .table-light > td {\n  background-color: #fdfdfe;\n}\n.webcg-devtools .table-light th,\n.webcg-devtools .table-light td,\n.webcg-devtools .table-light thead th,\n.webcg-devtools .table-light tbody + tbody {\n  border-color: #fbfcfc;\n}\n.webcg-devtools .table-hover .table-light:hover {\n  background-color: #ececf6;\n}\n.webcg-devtools .table-hover .table-light:hover > td,\n.webcg-devtools .table-hover .table-light:hover > th {\n  background-color: #ececf6;\n}\n.webcg-devtools .table-dark,\n.webcg-devtools .table-dark > th,\n.webcg-devtools .table-dark > td {\n  background-color: #c6c8ca;\n}\n.webcg-devtools .table-dark th,\n.webcg-devtools .table-dark td,\n.webcg-devtools .table-dark thead th,\n.webcg-devtools .table-dark tbody + tbody {\n  border-color: #95999c;\n}\n.webcg-devtools .table-hover .table-dark:hover {\n  background-color: #b9bbbe;\n}\n.webcg-devtools .table-hover .table-dark:hover > td,\n.webcg-devtools .table-hover .table-dark:hover > th {\n  background-color: #b9bbbe;\n}\n.webcg-devtools .table-active,\n.webcg-devtools .table-active > th,\n.webcg-devtools .table-active > td {\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table-hover .table-active:hover {\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table-hover .table-active:hover > td,\n.webcg-devtools .table-hover .table-active:hover > th {\n  background-color: rgba(0, 0, 0, 0.075);\n}\n.webcg-devtools .table .thead-dark th {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #454d55;\n}\n.webcg-devtools .table .thead-light th {\n  color: #495057;\n  background-color: #e9ecef;\n  border-color: #dee2e6;\n}\n.webcg-devtools .table-dark {\n  color: #fff;\n  background-color: #343a40;\n}\n.webcg-devtools .table-dark th,\n.webcg-devtools .table-dark td,\n.webcg-devtools .table-dark thead th {\n  border-color: #454d55;\n}\n.webcg-devtools .table-dark.table-bordered {\n  border: 0;\n}\n.webcg-devtools .table-dark.table-striped tbody tr:nth-of-type(odd) {\n  background-color: rgba(255, 255, 255, 0.05);\n}\n.webcg-devtools .table-dark.table-hover tbody tr:hover {\n  color: #fff;\n  background-color: rgba(255, 255, 255, 0.075);\n}\n@media (max-width: 575.98px) {\n  .webcg-devtools .table-responsive-sm {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n  }\n  .webcg-devtools .table-responsive-sm > .table-bordered {\n    border: 0;\n  }\n}\n@media (max-width: 767.98px) {\n  .webcg-devtools .table-responsive-md {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n  }\n  .webcg-devtools .table-responsive-md > .table-bordered {\n    border: 0;\n  }\n}\n@media (max-width: 991.98px) {\n  .webcg-devtools .table-responsive-lg {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n  }\n  .webcg-devtools .table-responsive-lg > .table-bordered {\n    border: 0;\n  }\n}\n@media (max-width: 1199.98px) {\n  .webcg-devtools .table-responsive-xl {\n    display: block;\n    width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n  }\n  .webcg-devtools .table-responsive-xl > .table-bordered {\n    border: 0;\n  }\n}\n.webcg-devtools .table-responsive {\n  display: block;\n  width: 100%;\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n}\n.webcg-devtools .table-responsive > .table-bordered {\n  border: 0;\n}\n.webcg-devtools .form-control {\n  display: block;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  padding: 0.375rem 0.75rem;\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .form-control {\n    transition: none;\n  }\n}\n.webcg-devtools .form-control::-ms-expand {\n  background-color: transparent;\n  border: 0;\n}\n.webcg-devtools .form-control:-moz-focusring {\n  color: transparent;\n  text-shadow: 0 0 0 #495057;\n}\n.webcg-devtools .form-control:focus {\n  color: #495057;\n  background-color: #fff;\n  border-color: #80bdff;\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .form-control::placeholder {\n  color: #6c757d;\n  opacity: 1;\n}\n.webcg-devtools .form-control:disabled, .webcg-devtools .form-control[readonly] {\n  background-color: #e9ecef;\n  opacity: 1;\n}\n.webcg-devtools select.form-control:focus::-ms-value {\n  color: #495057;\n  background-color: #fff;\n}\n.webcg-devtools .form-control-file,\n.webcg-devtools .form-control-range {\n  display: block;\n  width: 100%;\n}\n.webcg-devtools .col-form-label {\n  padding-top: calc(0.375rem + 1px);\n  padding-bottom: calc(0.375rem + 1px);\n  margin-bottom: 0;\n  font-size: inherit;\n  line-height: 1.5;\n}\n.webcg-devtools .col-form-label-lg {\n  padding-top: calc(0.5rem + 1px);\n  padding-bottom: calc(0.5rem + 1px);\n  font-size: 1.25rem;\n  line-height: 1.5;\n}\n.webcg-devtools .col-form-label-sm {\n  padding-top: calc(0.25rem + 1px);\n  padding-bottom: calc(0.25rem + 1px);\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n.webcg-devtools .form-control-plaintext {\n  display: block;\n  width: 100%;\n  padding: 0.375rem 0;\n  margin-bottom: 0;\n  font-size: 1rem;\n  line-height: 1.5;\n  color: #212529;\n  background-color: transparent;\n  border: solid transparent;\n  border-width: 1px 0;\n}\n.webcg-devtools .form-control-plaintext.form-control-sm, .webcg-devtools .form-control-plaintext.form-control-lg {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .form-control-sm {\n  height: calc(1.5em + 0.5rem + 2px);\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  border-radius: 0.2rem;\n}\n.webcg-devtools .form-control-lg {\n  height: calc(1.5em + 1rem + 2px);\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n  border-radius: 0.3rem;\n}\n.webcg-devtools select.form-control[size], .webcg-devtools select.form-control[multiple] {\n  height: auto;\n}\n.webcg-devtools textarea.form-control {\n  height: auto;\n}\n.webcg-devtools .form-group {\n  margin-bottom: 1rem;\n}\n.webcg-devtools .form-text {\n  display: block;\n  margin-top: 0.25rem;\n}\n.webcg-devtools .form-row {\n  display: flex;\n  flex-wrap: wrap;\n  margin-right: -5px;\n  margin-left: -5px;\n}\n.webcg-devtools .form-row > .col,\n.webcg-devtools .form-row > [class*=col-] {\n  padding-right: 5px;\n  padding-left: 5px;\n}\n.webcg-devtools .form-check {\n  position: relative;\n  display: block;\n  padding-left: 1.25rem;\n}\n.webcg-devtools .form-check-input {\n  position: absolute;\n  margin-top: 0.3rem;\n  margin-left: -1.25rem;\n}\n.webcg-devtools .form-check-input[disabled] ~ .form-check-label, .webcg-devtools .form-check-input:disabled ~ .form-check-label {\n  color: #6c757d;\n}\n.webcg-devtools .form-check-label {\n  margin-bottom: 0;\n}\n.webcg-devtools .form-check-inline {\n  display: inline-flex;\n  align-items: center;\n  padding-left: 0;\n  margin-right: 0.75rem;\n}\n.webcg-devtools .form-check-inline .form-check-input {\n  position: static;\n  margin-top: 0;\n  margin-right: 0.3125rem;\n  margin-left: 0;\n}\n.webcg-devtools .valid-feedback {\n  display: none;\n  width: 100%;\n  margin-top: 0.25rem;\n  font-size: 80%;\n  color: #28a745;\n}\n.webcg-devtools .valid-tooltip {\n  position: absolute;\n  top: 100%;\n  z-index: 5;\n  display: none;\n  max-width: 100%;\n  padding: 0.25rem 0.5rem;\n  margin-top: 0.1rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: #fff;\n  background-color: rgba(40, 167, 69, 0.9);\n  border-radius: 0.25rem;\n}\n.was-validated .webcg-devtools:valid ~ .valid-feedback,\n.was-validated .webcg-devtools:valid ~ .valid-tooltip, .webcg-devtools.is-valid ~ .valid-feedback,\n.webcg-devtools.is-valid ~ .valid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .form-control:valid, .webcg-devtools .form-control.is-valid {\n  border-color: #28a745;\n  padding-right: calc(1.5em + 0.75rem);\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e\");\n  background-repeat: no-repeat;\n  background-position: right calc(0.375em + 0.1875rem) center;\n  background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .form-control:valid:focus, .webcg-devtools .form-control.is-valid:focus {\n  border-color: #28a745;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.was-validated .webcg-devtools textarea.form-control:valid, .webcg-devtools textarea.form-control.is-valid {\n  padding-right: calc(1.5em + 0.75rem);\n  background-position: top calc(0.375em + 0.1875rem) right calc(0.375em + 0.1875rem);\n}\n.was-validated .webcg-devtools .custom-select:valid, .webcg-devtools .custom-select.is-valid {\n  border-color: #28a745;\n  padding-right: calc(0.75em + 2.3125rem);\n  background: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\") no-repeat right 0.75rem center/8px 10px, url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e\") #fff no-repeat center right 1.75rem/calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .custom-select:valid:focus, .webcg-devtools .custom-select.is-valid:focus {\n  border-color: #28a745;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.was-validated .webcg-devtools .form-check-input:valid ~ .form-check-label, .webcg-devtools .form-check-input.is-valid ~ .form-check-label {\n  color: #28a745;\n}\n.was-validated .webcg-devtools .form-check-input:valid ~ .valid-feedback,\n.was-validated .webcg-devtools .form-check-input:valid ~ .valid-tooltip, .webcg-devtools .form-check-input.is-valid ~ .valid-feedback,\n.webcg-devtools .form-check-input.is-valid ~ .valid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .custom-control-input:valid ~ .custom-control-label, .webcg-devtools .custom-control-input.is-valid ~ .custom-control-label {\n  color: #28a745;\n}\n.was-validated .webcg-devtools .custom-control-input:valid ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid ~ .custom-control-label::before {\n  border-color: #28a745;\n}\n.was-validated .webcg-devtools .custom-control-input:valid:checked ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid:checked ~ .custom-control-label::before {\n  border-color: #34ce57;\n  background-color: #34ce57;\n}\n.was-validated .webcg-devtools .custom-control-input:valid:focus ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid:focus ~ .custom-control-label::before {\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.was-validated .webcg-devtools .custom-control-input:valid:focus:not(:checked) ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-valid:focus:not(:checked) ~ .custom-control-label::before {\n  border-color: #28a745;\n}\n.was-validated .webcg-devtools .custom-file-input:valid ~ .custom-file-label, .webcg-devtools .custom-file-input.is-valid ~ .custom-file-label {\n  border-color: #28a745;\n}\n.was-validated .webcg-devtools .custom-file-input:valid:focus ~ .custom-file-label, .webcg-devtools .custom-file-input.is-valid:focus ~ .custom-file-label {\n  border-color: #28a745;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);\n}\n.webcg-devtools .invalid-feedback {\n  display: none;\n  width: 100%;\n  margin-top: 0.25rem;\n  font-size: 80%;\n  color: #dc3545;\n}\n.webcg-devtools .invalid-tooltip {\n  position: absolute;\n  top: 100%;\n  z-index: 5;\n  display: none;\n  max-width: 100%;\n  padding: 0.25rem 0.5rem;\n  margin-top: 0.1rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: #fff;\n  background-color: rgba(220, 53, 69, 0.9);\n  border-radius: 0.25rem;\n}\n.was-validated .webcg-devtools:invalid ~ .invalid-feedback,\n.was-validated .webcg-devtools:invalid ~ .invalid-tooltip, .webcg-devtools.is-invalid ~ .invalid-feedback,\n.webcg-devtools.is-invalid ~ .invalid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .form-control:invalid, .webcg-devtools .form-control.is-invalid {\n  border-color: #dc3545;\n  padding-right: calc(1.5em + 0.75rem);\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e\");\n  background-repeat: no-repeat;\n  background-position: right calc(0.375em + 0.1875rem) center;\n  background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .form-control:invalid:focus, .webcg-devtools .form-control.is-invalid:focus {\n  border-color: #dc3545;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.was-validated .webcg-devtools textarea.form-control:invalid, .webcg-devtools textarea.form-control.is-invalid {\n  padding-right: calc(1.5em + 0.75rem);\n  background-position: top calc(0.375em + 0.1875rem) right calc(0.375em + 0.1875rem);\n}\n.was-validated .webcg-devtools .custom-select:invalid, .webcg-devtools .custom-select.is-invalid {\n  border-color: #dc3545;\n  padding-right: calc(0.75em + 2.3125rem);\n  background: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\") no-repeat right 0.75rem center/8px 10px, url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e\") #fff no-repeat center right 1.75rem/calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);\n}\n.was-validated .webcg-devtools .custom-select:invalid:focus, .webcg-devtools .custom-select.is-invalid:focus {\n  border-color: #dc3545;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.was-validated .webcg-devtools .form-check-input:invalid ~ .form-check-label, .webcg-devtools .form-check-input.is-invalid ~ .form-check-label {\n  color: #dc3545;\n}\n.was-validated .webcg-devtools .form-check-input:invalid ~ .invalid-feedback,\n.was-validated .webcg-devtools .form-check-input:invalid ~ .invalid-tooltip, .webcg-devtools .form-check-input.is-invalid ~ .invalid-feedback,\n.webcg-devtools .form-check-input.is-invalid ~ .invalid-tooltip {\n  display: block;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid ~ .custom-control-label, .webcg-devtools .custom-control-input.is-invalid ~ .custom-control-label {\n  color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid ~ .custom-control-label::before {\n  border-color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid:checked ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid:checked ~ .custom-control-label::before {\n  border-color: #e4606d;\n  background-color: #e4606d;\n}\n.was-validated .webcg-devtools .custom-control-input:invalid:focus ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid:focus ~ .custom-control-label::before {\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.was-validated .webcg-devtools .custom-control-input:invalid:focus:not(:checked) ~ .custom-control-label::before, .webcg-devtools .custom-control-input.is-invalid:focus:not(:checked) ~ .custom-control-label::before {\n  border-color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-file-input:invalid ~ .custom-file-label, .webcg-devtools .custom-file-input.is-invalid ~ .custom-file-label {\n  border-color: #dc3545;\n}\n.was-validated .webcg-devtools .custom-file-input:invalid:focus ~ .custom-file-label, .webcg-devtools .custom-file-input.is-invalid:focus ~ .custom-file-label {\n  border-color: #dc3545;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);\n}\n.webcg-devtools .form-inline {\n  display: flex;\n  flex-flow: row wrap;\n  align-items: center;\n}\n.webcg-devtools .form-inline .form-check {\n  width: 100%;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .form-inline label {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    margin-bottom: 0;\n  }\n  .webcg-devtools .form-inline .form-group {\n    display: flex;\n    flex: 0 0 auto;\n    flex-flow: row wrap;\n    align-items: center;\n    margin-bottom: 0;\n  }\n  .webcg-devtools .form-inline .form-control {\n    display: inline-block;\n    width: auto;\n    vertical-align: middle;\n  }\n  .webcg-devtools .form-inline .form-control-plaintext {\n    display: inline-block;\n  }\n  .webcg-devtools .form-inline .input-group,\n.webcg-devtools .form-inline .custom-select {\n    width: auto;\n  }\n  .webcg-devtools .form-inline .form-check {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    width: auto;\n    padding-left: 0;\n  }\n  .webcg-devtools .form-inline .form-check-input {\n    position: relative;\n    flex-shrink: 0;\n    margin-top: 0;\n    margin-right: 0.25rem;\n    margin-left: 0;\n  }\n  .webcg-devtools .form-inline .custom-control {\n    align-items: center;\n    justify-content: center;\n  }\n  .webcg-devtools .form-inline .custom-control-label {\n    margin-bottom: 0;\n  }\n}\n.webcg-devtools .btn {\n  display: inline-block;\n  font-weight: 400;\n  color: #212529;\n  text-align: center;\n  vertical-align: middle;\n  cursor: pointer;\n  user-select: none;\n  background-color: transparent;\n  border: 1px solid transparent;\n  padding: 0.375rem 0.75rem;\n  font-size: 1rem;\n  line-height: 1.5;\n  border-radius: 0.25rem;\n  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .btn {\n    transition: none;\n  }\n}\n.webcg-devtools .btn:hover {\n  color: #212529;\n  text-decoration: none;\n}\n.webcg-devtools .btn:focus, .webcg-devtools .btn.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .btn.disabled, .webcg-devtools .btn:disabled {\n  opacity: 0.65;\n}\n.webcg-devtools a.btn.disabled,\n.webcg-devtools fieldset:disabled a.btn {\n  pointer-events: none;\n}\n.webcg-devtools .btn-primary {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-primary:hover {\n  color: #fff;\n  background-color: #0069d9;\n  border-color: #0062cc;\n}\n.webcg-devtools .btn-primary:focus, .webcg-devtools .btn-primary.focus {\n  color: #fff;\n  background-color: #0069d9;\n  border-color: #0062cc;\n  box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5);\n}\n.webcg-devtools .btn-primary.disabled, .webcg-devtools .btn-primary:disabled {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-primary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-primary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-primary.dropdown-toggle {\n  color: #fff;\n  background-color: #0062cc;\n  border-color: #005cbf;\n}\n.webcg-devtools .btn-primary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-primary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-primary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5);\n}\n.webcg-devtools .btn-secondary {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-secondary:hover {\n  color: #fff;\n  background-color: #5a6268;\n  border-color: #545b62;\n}\n.webcg-devtools .btn-secondary:focus, .webcg-devtools .btn-secondary.focus {\n  color: #fff;\n  background-color: #5a6268;\n  border-color: #545b62;\n  box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5);\n}\n.webcg-devtools .btn-secondary.disabled, .webcg-devtools .btn-secondary:disabled {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-secondary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-secondary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-secondary.dropdown-toggle {\n  color: #fff;\n  background-color: #545b62;\n  border-color: #4e555b;\n}\n.webcg-devtools .btn-secondary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-secondary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-secondary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5);\n}\n.webcg-devtools .btn-success {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-success:hover {\n  color: #fff;\n  background-color: #218838;\n  border-color: #1e7e34;\n}\n.webcg-devtools .btn-success:focus, .webcg-devtools .btn-success.focus {\n  color: #fff;\n  background-color: #218838;\n  border-color: #1e7e34;\n  box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5);\n}\n.webcg-devtools .btn-success.disabled, .webcg-devtools .btn-success:disabled {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-success:not(:disabled):not(.disabled):active, .webcg-devtools .btn-success:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-success.dropdown-toggle {\n  color: #fff;\n  background-color: #1e7e34;\n  border-color: #1c7430;\n}\n.webcg-devtools .btn-success:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-success:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-success.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5);\n}\n.webcg-devtools .btn-info {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-info:hover {\n  color: #fff;\n  background-color: #138496;\n  border-color: #117a8b;\n}\n.webcg-devtools .btn-info:focus, .webcg-devtools .btn-info.focus {\n  color: #fff;\n  background-color: #138496;\n  border-color: #117a8b;\n  box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5);\n}\n.webcg-devtools .btn-info.disabled, .webcg-devtools .btn-info:disabled {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-info:not(:disabled):not(.disabled):active, .webcg-devtools .btn-info:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-info.dropdown-toggle {\n  color: #fff;\n  background-color: #117a8b;\n  border-color: #10707f;\n}\n.webcg-devtools .btn-info:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-info:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-info.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5);\n}\n.webcg-devtools .btn-warning {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-warning:hover {\n  color: #212529;\n  background-color: #e0a800;\n  border-color: #d39e00;\n}\n.webcg-devtools .btn-warning:focus, .webcg-devtools .btn-warning.focus {\n  color: #212529;\n  background-color: #e0a800;\n  border-color: #d39e00;\n  box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5);\n}\n.webcg-devtools .btn-warning.disabled, .webcg-devtools .btn-warning:disabled {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-warning:not(:disabled):not(.disabled):active, .webcg-devtools .btn-warning:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-warning.dropdown-toggle {\n  color: #212529;\n  background-color: #d39e00;\n  border-color: #c69500;\n}\n.webcg-devtools .btn-warning:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-warning:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-warning.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5);\n}\n.webcg-devtools .btn-danger {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-danger:hover {\n  color: #fff;\n  background-color: #c82333;\n  border-color: #bd2130;\n}\n.webcg-devtools .btn-danger:focus, .webcg-devtools .btn-danger.focus {\n  color: #fff;\n  background-color: #c82333;\n  border-color: #bd2130;\n  box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5);\n}\n.webcg-devtools .btn-danger.disabled, .webcg-devtools .btn-danger:disabled {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-danger:not(:disabled):not(.disabled):active, .webcg-devtools .btn-danger:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-danger.dropdown-toggle {\n  color: #fff;\n  background-color: #bd2130;\n  border-color: #b21f2d;\n}\n.webcg-devtools .btn-danger:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-danger:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-danger.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5);\n}\n.webcg-devtools .btn-light {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-light:hover {\n  color: #212529;\n  background-color: #e2e6ea;\n  border-color: #dae0e5;\n}\n.webcg-devtools .btn-light:focus, .webcg-devtools .btn-light.focus {\n  color: #212529;\n  background-color: #e2e6ea;\n  border-color: #dae0e5;\n  box-shadow: 0 0 0 0.2rem rgba(216, 217, 219, 0.5);\n}\n.webcg-devtools .btn-light.disabled, .webcg-devtools .btn-light:disabled {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-light:not(:disabled):not(.disabled):active, .webcg-devtools .btn-light:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-light.dropdown-toggle {\n  color: #212529;\n  background-color: #dae0e5;\n  border-color: #d3d9df;\n}\n.webcg-devtools .btn-light:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-light:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-light.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(216, 217, 219, 0.5);\n}\n.webcg-devtools .btn-dark {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-dark:hover {\n  color: #fff;\n  background-color: #23272b;\n  border-color: #1d2124;\n}\n.webcg-devtools .btn-dark:focus, .webcg-devtools .btn-dark.focus {\n  color: #fff;\n  background-color: #23272b;\n  border-color: #1d2124;\n  box-shadow: 0 0 0 0.2rem rgba(82, 88, 93, 0.5);\n}\n.webcg-devtools .btn-dark.disabled, .webcg-devtools .btn-dark:disabled {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-dark:not(:disabled):not(.disabled):active, .webcg-devtools .btn-dark:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-dark.dropdown-toggle {\n  color: #fff;\n  background-color: #1d2124;\n  border-color: #171a1d;\n}\n.webcg-devtools .btn-dark:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-dark:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-dark.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(82, 88, 93, 0.5);\n}\n.webcg-devtools .btn-outline-primary {\n  color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-outline-primary:hover {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-outline-primary:focus, .webcg-devtools .btn-outline-primary.focus {\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .btn-outline-primary.disabled, .webcg-devtools .btn-outline-primary:disabled {\n  color: #007bff;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-primary.dropdown-toggle {\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-primary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-primary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .btn-outline-secondary {\n  color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-outline-secondary:hover {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-outline-secondary:focus, .webcg-devtools .btn-outline-secondary.focus {\n  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);\n}\n.webcg-devtools .btn-outline-secondary.disabled, .webcg-devtools .btn-outline-secondary:disabled {\n  color: #6c757d;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-secondary.dropdown-toggle {\n  color: #fff;\n  background-color: #6c757d;\n  border-color: #6c757d;\n}\n.webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-secondary:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-secondary.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);\n}\n.webcg-devtools .btn-outline-success {\n  color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-outline-success:hover {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-outline-success:focus, .webcg-devtools .btn-outline-success.focus {\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);\n}\n.webcg-devtools .btn-outline-success.disabled, .webcg-devtools .btn-outline-success:disabled {\n  color: #28a745;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-success:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-success:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-success.dropdown-toggle {\n  color: #fff;\n  background-color: #28a745;\n  border-color: #28a745;\n}\n.webcg-devtools .btn-outline-success:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-success:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-success.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);\n}\n.webcg-devtools .btn-outline-info {\n  color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-outline-info:hover {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-outline-info:focus, .webcg-devtools .btn-outline-info.focus {\n  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);\n}\n.webcg-devtools .btn-outline-info.disabled, .webcg-devtools .btn-outline-info:disabled {\n  color: #17a2b8;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-info:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-info:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-info.dropdown-toggle {\n  color: #fff;\n  background-color: #17a2b8;\n  border-color: #17a2b8;\n}\n.webcg-devtools .btn-outline-info:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-info:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-info.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);\n}\n.webcg-devtools .btn-outline-warning {\n  color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-outline-warning:hover {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-outline-warning:focus, .webcg-devtools .btn-outline-warning.focus {\n  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);\n}\n.webcg-devtools .btn-outline-warning.disabled, .webcg-devtools .btn-outline-warning:disabled {\n  color: #ffc107;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-warning.dropdown-toggle {\n  color: #212529;\n  background-color: #ffc107;\n  border-color: #ffc107;\n}\n.webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-warning:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-warning.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);\n}\n.webcg-devtools .btn-outline-danger {\n  color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-outline-danger:hover {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-outline-danger:focus, .webcg-devtools .btn-outline-danger.focus {\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);\n}\n.webcg-devtools .btn-outline-danger.disabled, .webcg-devtools .btn-outline-danger:disabled {\n  color: #dc3545;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-danger.dropdown-toggle {\n  color: #fff;\n  background-color: #dc3545;\n  border-color: #dc3545;\n}\n.webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-danger:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-danger.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);\n}\n.webcg-devtools .btn-outline-light {\n  color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-outline-light:hover {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-outline-light:focus, .webcg-devtools .btn-outline-light.focus {\n  box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5);\n}\n.webcg-devtools .btn-outline-light.disabled, .webcg-devtools .btn-outline-light:disabled {\n  color: #f8f9fa;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-light:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-light:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-light.dropdown-toggle {\n  color: #212529;\n  background-color: #f8f9fa;\n  border-color: #f8f9fa;\n}\n.webcg-devtools .btn-outline-light:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-light:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-light.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5);\n}\n.webcg-devtools .btn-outline-dark {\n  color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-outline-dark:hover {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-outline-dark:focus, .webcg-devtools .btn-outline-dark.focus {\n  box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5);\n}\n.webcg-devtools .btn-outline-dark.disabled, .webcg-devtools .btn-outline-dark:disabled {\n  color: #343a40;\n  background-color: transparent;\n}\n.webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled):active, .webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled).active, .show > .webcg-devtools .btn-outline-dark.dropdown-toggle {\n  color: #fff;\n  background-color: #343a40;\n  border-color: #343a40;\n}\n.webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled):active:focus, .webcg-devtools .btn-outline-dark:not(:disabled):not(.disabled).active:focus, .show > .webcg-devtools .btn-outline-dark.dropdown-toggle:focus {\n  box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5);\n}\n.webcg-devtools .btn-link {\n  font-weight: 400;\n  color: #007bff;\n  text-decoration: none;\n}\n.webcg-devtools .btn-link:hover {\n  color: #0056b3;\n  text-decoration: underline;\n}\n.webcg-devtools .btn-link:focus, .webcg-devtools .btn-link.focus {\n  text-decoration: underline;\n  box-shadow: none;\n}\n.webcg-devtools .btn-link:disabled, .webcg-devtools .btn-link.disabled {\n  color: #6c757d;\n  pointer-events: none;\n}\n.webcg-devtools .btn-lg, .webcg-devtools .btn-group-lg > .btn {\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n  border-radius: 0.3rem;\n}\n.webcg-devtools .btn-sm, .webcg-devtools .btn-group-sm > .btn {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  border-radius: 0.2rem;\n}\n.webcg-devtools .btn-block {\n  display: block;\n  width: 100%;\n}\n.webcg-devtools .btn-block + .btn-block {\n  margin-top: 0.5rem;\n}\n.webcg-devtools input[type=submit].btn-block,\n.webcg-devtools input[type=reset].btn-block,\n.webcg-devtools input[type=button].btn-block {\n  width: 100%;\n}\n.webcg-devtools .fade {\n  transition: opacity 0.15s linear;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .fade {\n    transition: none;\n  }\n}\n.webcg-devtools .fade:not(.show) {\n  opacity: 0;\n}\n.webcg-devtools .collapse:not(.show) {\n  display: none;\n}\n.webcg-devtools .collapsing {\n  position: relative;\n  height: 0;\n  overflow: hidden;\n  transition: height 0.35s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .collapsing {\n    transition: none;\n  }\n}\n.webcg-devtools .dropup,\n.webcg-devtools .dropright,\n.webcg-devtools .dropdown,\n.webcg-devtools .dropleft {\n  position: relative;\n}\n.webcg-devtools .dropdown-toggle {\n  white-space: nowrap;\n}\n.webcg-devtools .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0.3em solid;\n  border-right: 0.3em solid transparent;\n  border-bottom: 0;\n  border-left: 0.3em solid transparent;\n}\n.webcg-devtools .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropdown-menu {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  z-index: 1000;\n  display: none;\n  float: left;\n  min-width: 10rem;\n  padding: 0.5rem 0;\n  margin: 0.125rem 0 0;\n  font-size: 1rem;\n  color: #212529;\n  text-align: left;\n  list-style: none;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.15);\n  border-radius: 0.25rem;\n}\n.webcg-devtools .dropdown-menu-left {\n  right: auto;\n  left: 0;\n}\n.webcg-devtools .dropdown-menu-right {\n  right: 0;\n  left: auto;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .dropdown-menu-sm-left {\n    right: auto;\n    left: 0;\n  }\n  .webcg-devtools .dropdown-menu-sm-right {\n    right: 0;\n    left: auto;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .dropdown-menu-md-left {\n    right: auto;\n    left: 0;\n  }\n  .webcg-devtools .dropdown-menu-md-right {\n    right: 0;\n    left: auto;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .dropdown-menu-lg-left {\n    right: auto;\n    left: 0;\n  }\n  .webcg-devtools .dropdown-menu-lg-right {\n    right: 0;\n    left: auto;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .dropdown-menu-xl-left {\n    right: auto;\n    left: 0;\n  }\n  .webcg-devtools .dropdown-menu-xl-right {\n    right: 0;\n    left: auto;\n  }\n}\n.webcg-devtools .dropup .dropdown-menu {\n  top: auto;\n  bottom: 100%;\n  margin-top: 0;\n  margin-bottom: 0.125rem;\n}\n.webcg-devtools .dropup .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0;\n  border-right: 0.3em solid transparent;\n  border-bottom: 0.3em solid;\n  border-left: 0.3em solid transparent;\n}\n.webcg-devtools .dropup .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropright .dropdown-menu {\n  top: 0;\n  right: auto;\n  left: 100%;\n  margin-top: 0;\n  margin-left: 0.125rem;\n}\n.webcg-devtools .dropright .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0.3em solid transparent;\n  border-right: 0;\n  border-bottom: 0.3em solid transparent;\n  border-left: 0.3em solid;\n}\n.webcg-devtools .dropright .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropright .dropdown-toggle::after {\n  vertical-align: 0;\n}\n.webcg-devtools .dropleft .dropdown-menu {\n  top: 0;\n  right: 100%;\n  left: auto;\n  margin-top: 0;\n  margin-right: 0.125rem;\n}\n.webcg-devtools .dropleft .dropdown-toggle::after {\n  display: inline-block;\n  margin-left: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n}\n.webcg-devtools .dropleft .dropdown-toggle::after {\n  display: none;\n}\n.webcg-devtools .dropleft .dropdown-toggle::before {\n  display: inline-block;\n  margin-right: 0.255em;\n  vertical-align: 0.255em;\n  content: \"\";\n  border-top: 0.3em solid transparent;\n  border-right: 0.3em solid;\n  border-bottom: 0.3em solid transparent;\n}\n.webcg-devtools .dropleft .dropdown-toggle:empty::after {\n  margin-left: 0;\n}\n.webcg-devtools .dropleft .dropdown-toggle::before {\n  vertical-align: 0;\n}\n.webcg-devtools .dropdown-menu[x-placement^=top], .webcg-devtools .dropdown-menu[x-placement^=right], .webcg-devtools .dropdown-menu[x-placement^=bottom], .webcg-devtools .dropdown-menu[x-placement^=left] {\n  right: auto;\n  bottom: auto;\n}\n.webcg-devtools .dropdown-divider {\n  height: 0;\n  margin: 0.5rem 0;\n  overflow: hidden;\n  border-top: 1px solid #e9ecef;\n}\n.webcg-devtools .dropdown-item {\n  display: block;\n  width: 100%;\n  padding: 0.25rem 1.5rem;\n  clear: both;\n  font-weight: 400;\n  color: #212529;\n  text-align: inherit;\n  white-space: nowrap;\n  background-color: transparent;\n  border: 0;\n}\n.webcg-devtools .dropdown-item:hover, .webcg-devtools .dropdown-item:focus {\n  color: #16181b;\n  text-decoration: none;\n  background-color: #f8f9fa;\n}\n.webcg-devtools .dropdown-item.active, .webcg-devtools .dropdown-item:active {\n  color: #fff;\n  text-decoration: none;\n  background-color: #007bff;\n}\n.webcg-devtools .dropdown-item.disabled, .webcg-devtools .dropdown-item:disabled {\n  color: #6c757d;\n  pointer-events: none;\n  background-color: transparent;\n}\n.webcg-devtools .dropdown-menu.show {\n  display: block;\n}\n.webcg-devtools .dropdown-header {\n  display: block;\n  padding: 0.5rem 1.5rem;\n  margin-bottom: 0;\n  font-size: 0.875rem;\n  color: #6c757d;\n  white-space: nowrap;\n}\n.webcg-devtools .dropdown-item-text {\n  display: block;\n  padding: 0.25rem 1.5rem;\n  color: #212529;\n}\n.webcg-devtools .btn-group,\n.webcg-devtools .btn-group-vertical {\n  position: relative;\n  display: inline-flex;\n  vertical-align: middle;\n}\n.webcg-devtools .btn-group > .btn,\n.webcg-devtools .btn-group-vertical > .btn {\n  position: relative;\n  flex: 1 1 auto;\n}\n.webcg-devtools .btn-group > .btn:hover,\n.webcg-devtools .btn-group-vertical > .btn:hover {\n  z-index: 1;\n}\n.webcg-devtools .btn-group > .btn:focus, .webcg-devtools .btn-group > .btn:active, .webcg-devtools .btn-group > .btn.active,\n.webcg-devtools .btn-group-vertical > .btn:focus,\n.webcg-devtools .btn-group-vertical > .btn:active,\n.webcg-devtools .btn-group-vertical > .btn.active {\n  z-index: 1;\n}\n.webcg-devtools .btn-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-start;\n}\n.webcg-devtools .btn-toolbar .input-group {\n  width: auto;\n}\n.webcg-devtools .btn-group > .btn:not(:first-child),\n.webcg-devtools .btn-group > .btn-group:not(:first-child) {\n  margin-left: -1px;\n}\n.webcg-devtools .btn-group > .btn:not(:last-child):not(.dropdown-toggle),\n.webcg-devtools .btn-group > .btn-group:not(:last-child) > .btn {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .btn-group > .btn:not(:first-child),\n.webcg-devtools .btn-group > .btn-group:not(:first-child) > .btn {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .dropdown-toggle-split {\n  padding-right: 0.5625rem;\n  padding-left: 0.5625rem;\n}\n.webcg-devtools .dropdown-toggle-split::after, .dropup .webcg-devtools .dropdown-toggle-split::after, .dropright .webcg-devtools .dropdown-toggle-split::after {\n  margin-left: 0;\n}\n.dropleft .webcg-devtools .dropdown-toggle-split::before {\n  margin-right: 0;\n}\n.webcg-devtools .btn-sm + .dropdown-toggle-split, .webcg-devtools .btn-group-sm > .btn + .dropdown-toggle-split {\n  padding-right: 0.375rem;\n  padding-left: 0.375rem;\n}\n.webcg-devtools .btn-lg + .dropdown-toggle-split, .webcg-devtools .btn-group-lg > .btn + .dropdown-toggle-split {\n  padding-right: 0.75rem;\n  padding-left: 0.75rem;\n}\n.webcg-devtools .btn-group-vertical {\n  flex-direction: column;\n  align-items: flex-start;\n  justify-content: center;\n}\n.webcg-devtools .btn-group-vertical > .btn,\n.webcg-devtools .btn-group-vertical > .btn-group {\n  width: 100%;\n}\n.webcg-devtools .btn-group-vertical > .btn:not(:first-child),\n.webcg-devtools .btn-group-vertical > .btn-group:not(:first-child) {\n  margin-top: -1px;\n}\n.webcg-devtools .btn-group-vertical > .btn:not(:last-child):not(.dropdown-toggle),\n.webcg-devtools .btn-group-vertical > .btn-group:not(:last-child) > .btn {\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .btn-group-vertical > .btn:not(:first-child),\n.webcg-devtools .btn-group-vertical > .btn-group:not(:first-child) > .btn {\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .btn-group-toggle > .btn,\n.webcg-devtools .btn-group-toggle > .btn-group > .btn {\n  margin-bottom: 0;\n}\n.webcg-devtools .btn-group-toggle > .btn input[type=radio],\n.webcg-devtools .btn-group-toggle > .btn input[type=checkbox],\n.webcg-devtools .btn-group-toggle > .btn-group > .btn input[type=radio],\n.webcg-devtools .btn-group-toggle > .btn-group > .btn input[type=checkbox] {\n  position: absolute;\n  clip: rect(0, 0, 0, 0);\n  pointer-events: none;\n}\n.webcg-devtools .input-group {\n  position: relative;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: stretch;\n  width: 100%;\n}\n.webcg-devtools .input-group > .form-control,\n.webcg-devtools .input-group > .form-control-plaintext,\n.webcg-devtools .input-group > .custom-select,\n.webcg-devtools .input-group > .custom-file {\n  position: relative;\n  flex: 1 1 0%;\n  min-width: 0;\n  margin-bottom: 0;\n}\n.webcg-devtools .input-group > .form-control + .form-control,\n.webcg-devtools .input-group > .form-control + .custom-select,\n.webcg-devtools .input-group > .form-control + .custom-file,\n.webcg-devtools .input-group > .form-control-plaintext + .form-control,\n.webcg-devtools .input-group > .form-control-plaintext + .custom-select,\n.webcg-devtools .input-group > .form-control-plaintext + .custom-file,\n.webcg-devtools .input-group > .custom-select + .form-control,\n.webcg-devtools .input-group > .custom-select + .custom-select,\n.webcg-devtools .input-group > .custom-select + .custom-file,\n.webcg-devtools .input-group > .custom-file + .form-control,\n.webcg-devtools .input-group > .custom-file + .custom-select,\n.webcg-devtools .input-group > .custom-file + .custom-file {\n  margin-left: -1px;\n}\n.webcg-devtools .input-group > .form-control:focus,\n.webcg-devtools .input-group > .custom-select:focus,\n.webcg-devtools .input-group > .custom-file .custom-file-input:focus ~ .custom-file-label {\n  z-index: 3;\n}\n.webcg-devtools .input-group > .custom-file .custom-file-input:focus {\n  z-index: 4;\n}\n.webcg-devtools .input-group > .form-control:not(:last-child),\n.webcg-devtools .input-group > .custom-select:not(:last-child) {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .input-group > .form-control:not(:first-child),\n.webcg-devtools .input-group > .custom-select:not(:first-child) {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .input-group > .custom-file {\n  display: flex;\n  align-items: center;\n}\n.webcg-devtools .input-group > .custom-file:not(:last-child) .custom-file-label, .webcg-devtools .input-group > .custom-file:not(:last-child) .custom-file-label::after {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .input-group > .custom-file:not(:first-child) .custom-file-label {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .input-group-prepend,\n.webcg-devtools .input-group-append {\n  display: flex;\n}\n.webcg-devtools .input-group-prepend .btn,\n.webcg-devtools .input-group-append .btn {\n  position: relative;\n  z-index: 2;\n}\n.webcg-devtools .input-group-prepend .btn:focus,\n.webcg-devtools .input-group-append .btn:focus {\n  z-index: 3;\n}\n.webcg-devtools .input-group-prepend .btn + .btn,\n.webcg-devtools .input-group-prepend .btn + .input-group-text,\n.webcg-devtools .input-group-prepend .input-group-text + .input-group-text,\n.webcg-devtools .input-group-prepend .input-group-text + .btn,\n.webcg-devtools .input-group-append .btn + .btn,\n.webcg-devtools .input-group-append .btn + .input-group-text,\n.webcg-devtools .input-group-append .input-group-text + .input-group-text,\n.webcg-devtools .input-group-append .input-group-text + .btn {\n  margin-left: -1px;\n}\n.webcg-devtools .input-group-prepend {\n  margin-right: -1px;\n}\n.webcg-devtools .input-group-append {\n  margin-left: -1px;\n}\n.webcg-devtools .input-group-text {\n  display: flex;\n  align-items: center;\n  padding: 0.375rem 0.75rem;\n  margin-bottom: 0;\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  text-align: center;\n  white-space: nowrap;\n  background-color: #e9ecef;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .input-group-text input[type=radio],\n.webcg-devtools .input-group-text input[type=checkbox] {\n  margin-top: 0;\n}\n.webcg-devtools .input-group-lg > .form-control:not(textarea),\n.webcg-devtools .input-group-lg > .custom-select {\n  height: calc(1.5em + 1rem + 2px);\n}\n.webcg-devtools .input-group-lg > .form-control,\n.webcg-devtools .input-group-lg > .custom-select,\n.webcg-devtools .input-group-lg > .input-group-prepend > .input-group-text,\n.webcg-devtools .input-group-lg > .input-group-append > .input-group-text,\n.webcg-devtools .input-group-lg > .input-group-prepend > .btn,\n.webcg-devtools .input-group-lg > .input-group-append > .btn {\n  padding: 0.5rem 1rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n  border-radius: 0.3rem;\n}\n.webcg-devtools .input-group-sm > .form-control:not(textarea),\n.webcg-devtools .input-group-sm > .custom-select {\n  height: calc(1.5em + 0.5rem + 2px);\n}\n.webcg-devtools .input-group-sm > .form-control,\n.webcg-devtools .input-group-sm > .custom-select,\n.webcg-devtools .input-group-sm > .input-group-prepend > .input-group-text,\n.webcg-devtools .input-group-sm > .input-group-append > .input-group-text,\n.webcg-devtools .input-group-sm > .input-group-prepend > .btn,\n.webcg-devtools .input-group-sm > .input-group-append > .btn {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  border-radius: 0.2rem;\n}\n.webcg-devtools .input-group-lg > .custom-select,\n.webcg-devtools .input-group-sm > .custom-select {\n  padding-right: 1.75rem;\n}\n.webcg-devtools .input-group > .input-group-prepend > .btn,\n.webcg-devtools .input-group > .input-group-prepend > .input-group-text,\n.webcg-devtools .input-group > .input-group-append:not(:last-child) > .btn,\n.webcg-devtools .input-group > .input-group-append:not(:last-child) > .input-group-text,\n.webcg-devtools .input-group > .input-group-append:last-child > .btn:not(:last-child):not(.dropdown-toggle),\n.webcg-devtools .input-group > .input-group-append:last-child > .input-group-text:not(:last-child) {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n.webcg-devtools .input-group > .input-group-append > .btn,\n.webcg-devtools .input-group > .input-group-append > .input-group-text,\n.webcg-devtools .input-group > .input-group-prepend:not(:first-child) > .btn,\n.webcg-devtools .input-group > .input-group-prepend:not(:first-child) > .input-group-text,\n.webcg-devtools .input-group > .input-group-prepend:first-child > .btn:not(:first-child),\n.webcg-devtools .input-group > .input-group-prepend:first-child > .input-group-text:not(:first-child) {\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .custom-control {\n  position: relative;\n  display: block;\n  min-height: 1.5rem;\n  padding-left: 1.5rem;\n}\n.webcg-devtools .custom-control-inline {\n  display: inline-flex;\n  margin-right: 1rem;\n}\n.webcg-devtools .custom-control-input {\n  position: absolute;\n  left: 0;\n  z-index: -1;\n  width: 1rem;\n  height: 1.25rem;\n  opacity: 0;\n}\n.webcg-devtools .custom-control-input:checked ~ .custom-control-label::before {\n  color: #fff;\n  border-color: #007bff;\n  background-color: #007bff;\n}\n.webcg-devtools .custom-control-input:focus ~ .custom-control-label::before {\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-control-input:focus:not(:checked) ~ .custom-control-label::before {\n  border-color: #80bdff;\n}\n.webcg-devtools .custom-control-input:not(:disabled):active ~ .custom-control-label::before {\n  color: #fff;\n  background-color: #b3d7ff;\n  border-color: #b3d7ff;\n}\n.webcg-devtools .custom-control-input[disabled] ~ .custom-control-label, .webcg-devtools .custom-control-input:disabled ~ .custom-control-label {\n  color: #6c757d;\n}\n.webcg-devtools .custom-control-input[disabled] ~ .custom-control-label::before, .webcg-devtools .custom-control-input:disabled ~ .custom-control-label::before {\n  background-color: #e9ecef;\n}\n.webcg-devtools .custom-control-label {\n  position: relative;\n  margin-bottom: 0;\n  vertical-align: top;\n}\n.webcg-devtools .custom-control-label::before {\n  position: absolute;\n  top: 0.25rem;\n  left: -1.5rem;\n  display: block;\n  width: 1rem;\n  height: 1rem;\n  pointer-events: none;\n  content: \"\";\n  background-color: #fff;\n  border: #adb5bd solid 1px;\n}\n.webcg-devtools .custom-control-label::after {\n  position: absolute;\n  top: 0.25rem;\n  left: -1.5rem;\n  display: block;\n  width: 1rem;\n  height: 1rem;\n  content: \"\";\n  background: no-repeat 50%/50% 50%;\n}\n.webcg-devtools .custom-checkbox .custom-control-label::before {\n  border-radius: 0.25rem;\n}\n.webcg-devtools .custom-checkbox .custom-control-input:checked ~ .custom-control-label::after {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .custom-checkbox .custom-control-input:indeterminate ~ .custom-control-label::before {\n  border-color: #007bff;\n  background-color: #007bff;\n}\n.webcg-devtools .custom-checkbox .custom-control-input:indeterminate ~ .custom-control-label::after {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3e%3cpath stroke='%23fff' d='M0 2h4'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .custom-checkbox .custom-control-input:disabled:checked ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-checkbox .custom-control-input:disabled:indeterminate ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-radio .custom-control-label::before {\n  border-radius: 50%;\n}\n.webcg-devtools .custom-radio .custom-control-input:checked ~ .custom-control-label::after {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .custom-radio .custom-control-input:disabled:checked ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-switch {\n  padding-left: 2.25rem;\n}\n.webcg-devtools .custom-switch .custom-control-label::before {\n  left: -2.25rem;\n  width: 1.75rem;\n  pointer-events: all;\n  border-radius: 0.5rem;\n}\n.webcg-devtools .custom-switch .custom-control-label::after {\n  top: calc(0.25rem + 2px);\n  left: calc(-2.25rem + 2px);\n  width: calc(1rem - 4px);\n  height: calc(1rem - 4px);\n  background-color: #adb5bd;\n  border-radius: 0.5rem;\n  transition: transform 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .custom-switch .custom-control-label::after {\n    transition: none;\n  }\n}\n.webcg-devtools .custom-switch .custom-control-input:checked ~ .custom-control-label::after {\n  background-color: #fff;\n  transform: translateX(0.75rem);\n}\n.webcg-devtools .custom-switch .custom-control-input:disabled:checked ~ .custom-control-label::before {\n  background-color: rgba(0, 123, 255, 0.5);\n}\n.webcg-devtools .custom-select {\n  display: inline-block;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  padding: 0.375rem 1.75rem 0.375rem 0.75rem;\n  font-size: 1rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  vertical-align: middle;\n  background: #fff url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\") no-repeat right 0.75rem center/8px 10px;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n  appearance: none;\n}\n.webcg-devtools .custom-select:focus {\n  border-color: #80bdff;\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-select:focus::-ms-value {\n  color: #495057;\n  background-color: #fff;\n}\n.webcg-devtools .custom-select[multiple], .webcg-devtools .custom-select[size]:not([size=\"1\"]) {\n  height: auto;\n  padding-right: 0.75rem;\n  background-image: none;\n}\n.webcg-devtools .custom-select:disabled {\n  color: #6c757d;\n  background-color: #e9ecef;\n}\n.webcg-devtools .custom-select::-ms-expand {\n  display: none;\n}\n.webcg-devtools .custom-select:-moz-focusring {\n  color: transparent;\n  text-shadow: 0 0 0 #495057;\n}\n.webcg-devtools .custom-select-sm {\n  height: calc(1.5em + 0.5rem + 2px);\n  padding-top: 0.25rem;\n  padding-bottom: 0.25rem;\n  padding-left: 0.5rem;\n  font-size: 0.875rem;\n}\n.webcg-devtools .custom-select-lg {\n  height: calc(1.5em + 1rem + 2px);\n  padding-top: 0.5rem;\n  padding-bottom: 0.5rem;\n  padding-left: 1rem;\n  font-size: 1.25rem;\n}\n.webcg-devtools .custom-file {\n  position: relative;\n  display: inline-block;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  margin-bottom: 0;\n}\n.webcg-devtools .custom-file-input {\n  position: relative;\n  z-index: 2;\n  width: 100%;\n  height: calc(1.5em + 0.75rem + 2px);\n  margin: 0;\n  opacity: 0;\n}\n.webcg-devtools .custom-file-input:focus ~ .custom-file-label {\n  border-color: #80bdff;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-file-input[disabled] ~ .custom-file-label, .webcg-devtools .custom-file-input:disabled ~ .custom-file-label {\n  background-color: #e9ecef;\n}\n.webcg-devtools .custom-file-input:lang(en) ~ .custom-file-label::after {\n  content: \"Browse\";\n}\n.webcg-devtools .custom-file-input ~ .custom-file-label[data-browse]::after {\n  content: attr(data-browse);\n}\n.webcg-devtools .custom-file-label {\n  position: absolute;\n  top: 0;\n  right: 0;\n  left: 0;\n  z-index: 1;\n  height: calc(1.5em + 0.75rem + 2px);\n  padding: 0.375rem 0.75rem;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #495057;\n  background-color: #fff;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .custom-file-label::after {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 3;\n  display: block;\n  height: calc(1.5em + 0.75rem);\n  padding: 0.375rem 0.75rem;\n  line-height: 1.5;\n  color: #495057;\n  content: \"Browse\";\n  background-color: #e9ecef;\n  border-left: inherit;\n  border-radius: 0 0.25rem 0.25rem 0;\n}\n.webcg-devtools .custom-range {\n  width: 100%;\n  height: 1.4rem;\n  padding: 0;\n  background-color: transparent;\n  appearance: none;\n}\n.webcg-devtools .custom-range:focus {\n  outline: none;\n}\n.webcg-devtools .custom-range:focus::-webkit-slider-thumb {\n  box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-range:focus::-moz-range-thumb {\n  box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-range:focus::-ms-thumb {\n  box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .custom-range::-moz-focus-outer {\n  border: 0;\n}\n.webcg-devtools .custom-range::-webkit-slider-thumb {\n  width: 1rem;\n  height: 1rem;\n  margin-top: -0.25rem;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 1rem;\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n  appearance: none;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .custom-range::-webkit-slider-thumb {\n    transition: none;\n  }\n}\n.webcg-devtools .custom-range::-webkit-slider-thumb:active {\n  background-color: #b3d7ff;\n}\n.webcg-devtools .custom-range::-webkit-slider-runnable-track {\n  width: 100%;\n  height: 0.5rem;\n  color: transparent;\n  cursor: pointer;\n  background-color: #dee2e6;\n  border-color: transparent;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range::-moz-range-thumb {\n  width: 1rem;\n  height: 1rem;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 1rem;\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n  appearance: none;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .custom-range::-moz-range-thumb {\n    transition: none;\n  }\n}\n.webcg-devtools .custom-range::-moz-range-thumb:active {\n  background-color: #b3d7ff;\n}\n.webcg-devtools .custom-range::-moz-range-track {\n  width: 100%;\n  height: 0.5rem;\n  color: transparent;\n  cursor: pointer;\n  background-color: #dee2e6;\n  border-color: transparent;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range::-ms-thumb {\n  width: 1rem;\n  height: 1rem;\n  margin-top: 0;\n  margin-right: 0.2rem;\n  margin-left: 0.2rem;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 1rem;\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n  appearance: none;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .custom-range::-ms-thumb {\n    transition: none;\n  }\n}\n.webcg-devtools .custom-range::-ms-thumb:active {\n  background-color: #b3d7ff;\n}\n.webcg-devtools .custom-range::-ms-track {\n  width: 100%;\n  height: 0.5rem;\n  color: transparent;\n  cursor: pointer;\n  background-color: transparent;\n  border-color: transparent;\n  border-width: 0.5rem;\n}\n.webcg-devtools .custom-range::-ms-fill-lower {\n  background-color: #dee2e6;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range::-ms-fill-upper {\n  margin-right: 15px;\n  background-color: #dee2e6;\n  border-radius: 1rem;\n}\n.webcg-devtools .custom-range:disabled::-webkit-slider-thumb {\n  background-color: #adb5bd;\n}\n.webcg-devtools .custom-range:disabled::-webkit-slider-runnable-track {\n  cursor: default;\n}\n.webcg-devtools .custom-range:disabled::-moz-range-thumb {\n  background-color: #adb5bd;\n}\n.webcg-devtools .custom-range:disabled::-moz-range-track {\n  cursor: default;\n}\n.webcg-devtools .custom-range:disabled::-ms-thumb {\n  background-color: #adb5bd;\n}\n.webcg-devtools .custom-control-label::before,\n.webcg-devtools .custom-file-label,\n.webcg-devtools .custom-select {\n  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .custom-control-label::before,\n.webcg-devtools .custom-file-label,\n.webcg-devtools .custom-select {\n    transition: none;\n  }\n}\n.webcg-devtools .nav {\n  display: flex;\n  flex-wrap: wrap;\n  padding-left: 0;\n  margin-bottom: 0;\n  list-style: none;\n}\n.webcg-devtools .nav-link {\n  display: block;\n  padding: 0.5rem 1rem;\n}\n.webcg-devtools .nav-link:hover, .webcg-devtools .nav-link:focus {\n  text-decoration: none;\n}\n.webcg-devtools .nav-link.disabled {\n  color: #6c757d;\n  pointer-events: none;\n  cursor: default;\n}\n.webcg-devtools .nav-tabs {\n  border-bottom: 1px solid #dee2e6;\n}\n.webcg-devtools .nav-tabs .nav-item {\n  margin-bottom: -1px;\n}\n.webcg-devtools .nav-tabs .nav-link {\n  border: 1px solid transparent;\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.webcg-devtools .nav-tabs .nav-link:hover, .webcg-devtools .nav-tabs .nav-link:focus {\n  border-color: #e9ecef #e9ecef #dee2e6;\n}\n.webcg-devtools .nav-tabs .nav-link.disabled {\n  color: #6c757d;\n  background-color: transparent;\n  border-color: transparent;\n}\n.webcg-devtools .nav-tabs .nav-link.active,\n.webcg-devtools .nav-tabs .nav-item.show .nav-link {\n  color: #495057;\n  background-color: #fff;\n  border-color: #dee2e6 #dee2e6 #fff;\n}\n.webcg-devtools .nav-tabs .dropdown-menu {\n  margin-top: -1px;\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .nav-pills .nav-link {\n  border-radius: 0.25rem;\n}\n.webcg-devtools .nav-pills .nav-link.active,\n.webcg-devtools .nav-pills .show > .nav-link {\n  color: #fff;\n  background-color: #007bff;\n}\n.webcg-devtools .nav-fill .nav-item {\n  flex: 1 1 auto;\n  text-align: center;\n}\n.webcg-devtools .nav-justified .nav-item {\n  flex-basis: 0;\n  flex-grow: 1;\n  text-align: center;\n}\n.webcg-devtools .tab-content > .tab-pane {\n  display: none;\n}\n.webcg-devtools .tab-content > .active {\n  display: block;\n}\n.webcg-devtools .navbar {\n  position: relative;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.5rem 1rem;\n}\n.webcg-devtools .navbar .container,\n.webcg-devtools .navbar .container-fluid,\n.webcg-devtools .navbar .container-sm,\n.webcg-devtools .navbar .container-md,\n.webcg-devtools .navbar .container-lg,\n.webcg-devtools .navbar .container-xl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n}\n.webcg-devtools .navbar-brand {\n  display: inline-block;\n  padding-top: 0.3125rem;\n  padding-bottom: 0.3125rem;\n  margin-right: 1rem;\n  font-size: 1.25rem;\n  line-height: inherit;\n  white-space: nowrap;\n}\n.webcg-devtools .navbar-brand:hover, .webcg-devtools .navbar-brand:focus {\n  text-decoration: none;\n}\n.webcg-devtools .navbar-nav {\n  display: flex;\n  flex-direction: column;\n  padding-left: 0;\n  margin-bottom: 0;\n  list-style: none;\n}\n.webcg-devtools .navbar-nav .nav-link {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .navbar-nav .dropdown-menu {\n  position: static;\n  float: none;\n}\n.webcg-devtools .navbar-text {\n  display: inline-block;\n  padding-top: 0.5rem;\n  padding-bottom: 0.5rem;\n}\n.webcg-devtools .navbar-collapse {\n  flex-basis: 100%;\n  flex-grow: 1;\n  align-items: center;\n}\n.webcg-devtools .navbar-toggler {\n  padding: 0.25rem 0.75rem;\n  font-size: 1.25rem;\n  line-height: 1;\n  background-color: transparent;\n  border: 1px solid transparent;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .navbar-toggler:hover, .webcg-devtools .navbar-toggler:focus {\n  text-decoration: none;\n}\n.webcg-devtools .navbar-toggler-icon {\n  display: inline-block;\n  width: 1.5em;\n  height: 1.5em;\n  vertical-align: middle;\n  content: \"\";\n  background: no-repeat center center;\n  background-size: 100% 100%;\n}\n@media (max-width: 575.98px) {\n  .webcg-devtools .navbar-expand-sm > .container,\n.webcg-devtools .navbar-expand-sm > .container-fluid,\n.webcg-devtools .navbar-expand-sm > .container-sm,\n.webcg-devtools .navbar-expand-sm > .container-md,\n.webcg-devtools .navbar-expand-sm > .container-lg,\n.webcg-devtools .navbar-expand-sm > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n  }\n}\n@media (min-width: 576px) {\n  .webcg-devtools .navbar-expand-sm {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n  }\n  .webcg-devtools .navbar-expand-sm .navbar-nav {\n    flex-direction: row;\n  }\n  .webcg-devtools .navbar-expand-sm .navbar-nav .dropdown-menu {\n    position: absolute;\n  }\n  .webcg-devtools .navbar-expand-sm .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n  }\n  .webcg-devtools .navbar-expand-sm > .container,\n.webcg-devtools .navbar-expand-sm > .container-fluid,\n.webcg-devtools .navbar-expand-sm > .container-sm,\n.webcg-devtools .navbar-expand-sm > .container-md,\n.webcg-devtools .navbar-expand-sm > .container-lg,\n.webcg-devtools .navbar-expand-sm > .container-xl {\n    flex-wrap: nowrap;\n  }\n  .webcg-devtools .navbar-expand-sm .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n  }\n  .webcg-devtools .navbar-expand-sm .navbar-toggler {\n    display: none;\n  }\n}\n@media (max-width: 767.98px) {\n  .webcg-devtools .navbar-expand-md > .container,\n.webcg-devtools .navbar-expand-md > .container-fluid,\n.webcg-devtools .navbar-expand-md > .container-sm,\n.webcg-devtools .navbar-expand-md > .container-md,\n.webcg-devtools .navbar-expand-md > .container-lg,\n.webcg-devtools .navbar-expand-md > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .navbar-expand-md {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n  }\n  .webcg-devtools .navbar-expand-md .navbar-nav {\n    flex-direction: row;\n  }\n  .webcg-devtools .navbar-expand-md .navbar-nav .dropdown-menu {\n    position: absolute;\n  }\n  .webcg-devtools .navbar-expand-md .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n  }\n  .webcg-devtools .navbar-expand-md > .container,\n.webcg-devtools .navbar-expand-md > .container-fluid,\n.webcg-devtools .navbar-expand-md > .container-sm,\n.webcg-devtools .navbar-expand-md > .container-md,\n.webcg-devtools .navbar-expand-md > .container-lg,\n.webcg-devtools .navbar-expand-md > .container-xl {\n    flex-wrap: nowrap;\n  }\n  .webcg-devtools .navbar-expand-md .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n  }\n  .webcg-devtools .navbar-expand-md .navbar-toggler {\n    display: none;\n  }\n}\n@media (max-width: 991.98px) {\n  .webcg-devtools .navbar-expand-lg > .container,\n.webcg-devtools .navbar-expand-lg > .container-fluid,\n.webcg-devtools .navbar-expand-lg > .container-sm,\n.webcg-devtools .navbar-expand-lg > .container-md,\n.webcg-devtools .navbar-expand-lg > .container-lg,\n.webcg-devtools .navbar-expand-lg > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .navbar-expand-lg {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n  }\n  .webcg-devtools .navbar-expand-lg .navbar-nav {\n    flex-direction: row;\n  }\n  .webcg-devtools .navbar-expand-lg .navbar-nav .dropdown-menu {\n    position: absolute;\n  }\n  .webcg-devtools .navbar-expand-lg .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n  }\n  .webcg-devtools .navbar-expand-lg > .container,\n.webcg-devtools .navbar-expand-lg > .container-fluid,\n.webcg-devtools .navbar-expand-lg > .container-sm,\n.webcg-devtools .navbar-expand-lg > .container-md,\n.webcg-devtools .navbar-expand-lg > .container-lg,\n.webcg-devtools .navbar-expand-lg > .container-xl {\n    flex-wrap: nowrap;\n  }\n  .webcg-devtools .navbar-expand-lg .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n  }\n  .webcg-devtools .navbar-expand-lg .navbar-toggler {\n    display: none;\n  }\n}\n@media (max-width: 1199.98px) {\n  .webcg-devtools .navbar-expand-xl > .container,\n.webcg-devtools .navbar-expand-xl > .container-fluid,\n.webcg-devtools .navbar-expand-xl > .container-sm,\n.webcg-devtools .navbar-expand-xl > .container-md,\n.webcg-devtools .navbar-expand-xl > .container-lg,\n.webcg-devtools .navbar-expand-xl > .container-xl {\n    padding-right: 0;\n    padding-left: 0;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .navbar-expand-xl {\n    flex-flow: row nowrap;\n    justify-content: flex-start;\n  }\n  .webcg-devtools .navbar-expand-xl .navbar-nav {\n    flex-direction: row;\n  }\n  .webcg-devtools .navbar-expand-xl .navbar-nav .dropdown-menu {\n    position: absolute;\n  }\n  .webcg-devtools .navbar-expand-xl .navbar-nav .nav-link {\n    padding-right: 0.5rem;\n    padding-left: 0.5rem;\n  }\n  .webcg-devtools .navbar-expand-xl > .container,\n.webcg-devtools .navbar-expand-xl > .container-fluid,\n.webcg-devtools .navbar-expand-xl > .container-sm,\n.webcg-devtools .navbar-expand-xl > .container-md,\n.webcg-devtools .navbar-expand-xl > .container-lg,\n.webcg-devtools .navbar-expand-xl > .container-xl {\n    flex-wrap: nowrap;\n  }\n  .webcg-devtools .navbar-expand-xl .navbar-collapse {\n    display: flex !important;\n    flex-basis: auto;\n  }\n  .webcg-devtools .navbar-expand-xl .navbar-toggler {\n    display: none;\n  }\n}\n.webcg-devtools .navbar-expand {\n  flex-flow: row nowrap;\n  justify-content: flex-start;\n}\n.webcg-devtools .navbar-expand > .container,\n.webcg-devtools .navbar-expand > .container-fluid,\n.webcg-devtools .navbar-expand > .container-sm,\n.webcg-devtools .navbar-expand > .container-md,\n.webcg-devtools .navbar-expand > .container-lg,\n.webcg-devtools .navbar-expand > .container-xl {\n  padding-right: 0;\n  padding-left: 0;\n}\n.webcg-devtools .navbar-expand .navbar-nav {\n  flex-direction: row;\n}\n.webcg-devtools .navbar-expand .navbar-nav .dropdown-menu {\n  position: absolute;\n}\n.webcg-devtools .navbar-expand .navbar-nav .nav-link {\n  padding-right: 0.5rem;\n  padding-left: 0.5rem;\n}\n.webcg-devtools .navbar-expand > .container,\n.webcg-devtools .navbar-expand > .container-fluid,\n.webcg-devtools .navbar-expand > .container-sm,\n.webcg-devtools .navbar-expand > .container-md,\n.webcg-devtools .navbar-expand > .container-lg,\n.webcg-devtools .navbar-expand > .container-xl {\n  flex-wrap: nowrap;\n}\n.webcg-devtools .navbar-expand .navbar-collapse {\n  display: flex !important;\n  flex-basis: auto;\n}\n.webcg-devtools .navbar-expand .navbar-toggler {\n  display: none;\n}\n.webcg-devtools .navbar-light .navbar-brand {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-brand:hover, .webcg-devtools .navbar-light .navbar-brand:focus {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-nav .nav-link {\n  color: rgba(0, 0, 0, 0.5);\n}\n.webcg-devtools .navbar-light .navbar-nav .nav-link:hover, .webcg-devtools .navbar-light .navbar-nav .nav-link:focus {\n  color: rgba(0, 0, 0, 0.7);\n}\n.webcg-devtools .navbar-light .navbar-nav .nav-link.disabled {\n  color: rgba(0, 0, 0, 0.3);\n}\n.webcg-devtools .navbar-light .navbar-nav .show > .nav-link,\n.webcg-devtools .navbar-light .navbar-nav .active > .nav-link,\n.webcg-devtools .navbar-light .navbar-nav .nav-link.show,\n.webcg-devtools .navbar-light .navbar-nav .nav-link.active {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-toggler {\n  color: rgba(0, 0, 0, 0.5);\n  border-color: rgba(0, 0, 0, 0.1);\n}\n.webcg-devtools .navbar-light .navbar-toggler-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(0, 0, 0, 0.5)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .navbar-light .navbar-text {\n  color: rgba(0, 0, 0, 0.5);\n}\n.webcg-devtools .navbar-light .navbar-text a {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-light .navbar-text a:hover, .webcg-devtools .navbar-light .navbar-text a:focus {\n  color: rgba(0, 0, 0, 0.9);\n}\n.webcg-devtools .navbar-dark .navbar-brand {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-brand:hover, .webcg-devtools .navbar-dark .navbar-brand:focus {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-nav .nav-link {\n  color: rgba(255, 255, 255, 0.5);\n}\n.webcg-devtools .navbar-dark .navbar-nav .nav-link:hover, .webcg-devtools .navbar-dark .navbar-nav .nav-link:focus {\n  color: rgba(255, 255, 255, 0.75);\n}\n.webcg-devtools .navbar-dark .navbar-nav .nav-link.disabled {\n  color: rgba(255, 255, 255, 0.25);\n}\n.webcg-devtools .navbar-dark .navbar-nav .show > .nav-link,\n.webcg-devtools .navbar-dark .navbar-nav .active > .nav-link,\n.webcg-devtools .navbar-dark .navbar-nav .nav-link.show,\n.webcg-devtools .navbar-dark .navbar-nav .nav-link.active {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-toggler {\n  color: rgba(255, 255, 255, 0.5);\n  border-color: rgba(255, 255, 255, 0.1);\n}\n.webcg-devtools .navbar-dark .navbar-toggler-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(255, 255, 255, 0.5)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .navbar-dark .navbar-text {\n  color: rgba(255, 255, 255, 0.5);\n}\n.webcg-devtools .navbar-dark .navbar-text a {\n  color: #fff;\n}\n.webcg-devtools .navbar-dark .navbar-text a:hover, .webcg-devtools .navbar-dark .navbar-text a:focus {\n  color: #fff;\n}\n.webcg-devtools .card {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  word-wrap: break-word;\n  background-color: #fff;\n  background-clip: border-box;\n  border: 1px solid rgba(0, 0, 0, 0.125);\n  border-radius: 0.25rem;\n}\n.webcg-devtools .card > hr {\n  margin-right: 0;\n  margin-left: 0;\n}\n.webcg-devtools .card > .list-group:first-child .list-group-item:first-child {\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.webcg-devtools .card > .list-group:last-child .list-group-item:last-child {\n  border-bottom-right-radius: 0.25rem;\n  border-bottom-left-radius: 0.25rem;\n}\n.webcg-devtools .card-body {\n  flex: 1 1 auto;\n  min-height: 1px;\n  padding: 1.25rem;\n}\n.webcg-devtools .card-title {\n  margin-bottom: 0.75rem;\n}\n.webcg-devtools .card-subtitle {\n  margin-top: -0.375rem;\n  margin-bottom: 0;\n}\n.webcg-devtools .card-text:last-child {\n  margin-bottom: 0;\n}\n.webcg-devtools .card-link:hover {\n  text-decoration: none;\n}\n.webcg-devtools .card-link + .card-link {\n  margin-left: 1.25rem;\n}\n.webcg-devtools .card-header {\n  padding: 0.75rem 1.25rem;\n  margin-bottom: 0;\n  background-color: rgba(0, 0, 0, 0.03);\n  border-bottom: 1px solid rgba(0, 0, 0, 0.125);\n}\n.webcg-devtools .card-header:first-child {\n  border-radius: calc(0.25rem - 1px) calc(0.25rem - 1px) 0 0;\n}\n.webcg-devtools .card-header + .list-group .list-group-item:first-child {\n  border-top: 0;\n}\n.webcg-devtools .card-footer {\n  padding: 0.75rem 1.25rem;\n  background-color: rgba(0, 0, 0, 0.03);\n  border-top: 1px solid rgba(0, 0, 0, 0.125);\n}\n.webcg-devtools .card-footer:last-child {\n  border-radius: 0 0 calc(0.25rem - 1px) calc(0.25rem - 1px);\n}\n.webcg-devtools .card-header-tabs {\n  margin-right: -0.625rem;\n  margin-bottom: -0.75rem;\n  margin-left: -0.625rem;\n  border-bottom: 0;\n}\n.webcg-devtools .card-header-pills {\n  margin-right: -0.625rem;\n  margin-left: -0.625rem;\n}\n.webcg-devtools .card-img-overlay {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  padding: 1.25rem;\n}\n.webcg-devtools .card-img,\n.webcg-devtools .card-img-top,\n.webcg-devtools .card-img-bottom {\n  flex-shrink: 0;\n  width: 100%;\n}\n.webcg-devtools .card-img,\n.webcg-devtools .card-img-top {\n  border-top-left-radius: calc(0.25rem - 1px);\n  border-top-right-radius: calc(0.25rem - 1px);\n}\n.webcg-devtools .card-img,\n.webcg-devtools .card-img-bottom {\n  border-bottom-right-radius: calc(0.25rem - 1px);\n  border-bottom-left-radius: calc(0.25rem - 1px);\n}\n.webcg-devtools .card-deck .card {\n  margin-bottom: 15px;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .card-deck {\n    display: flex;\n    flex-flow: row wrap;\n    margin-right: -15px;\n    margin-left: -15px;\n  }\n  .webcg-devtools .card-deck .card {\n    flex: 1 0 0%;\n    margin-right: 15px;\n    margin-bottom: 0;\n    margin-left: 15px;\n  }\n}\n.webcg-devtools .card-group > .card {\n  margin-bottom: 15px;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .card-group {\n    display: flex;\n    flex-flow: row wrap;\n  }\n  .webcg-devtools .card-group > .card {\n    flex: 1 0 0%;\n    margin-bottom: 0;\n  }\n  .webcg-devtools .card-group > .card + .card {\n    margin-left: 0;\n    border-left: 0;\n  }\n  .webcg-devtools .card-group > .card:not(:last-child) {\n    border-top-right-radius: 0;\n    border-bottom-right-radius: 0;\n  }\n  .webcg-devtools .card-group > .card:not(:last-child) .card-img-top,\n.webcg-devtools .card-group > .card:not(:last-child) .card-header {\n    border-top-right-radius: 0;\n  }\n  .webcg-devtools .card-group > .card:not(:last-child) .card-img-bottom,\n.webcg-devtools .card-group > .card:not(:last-child) .card-footer {\n    border-bottom-right-radius: 0;\n  }\n  .webcg-devtools .card-group > .card:not(:first-child) {\n    border-top-left-radius: 0;\n    border-bottom-left-radius: 0;\n  }\n  .webcg-devtools .card-group > .card:not(:first-child) .card-img-top,\n.webcg-devtools .card-group > .card:not(:first-child) .card-header {\n    border-top-left-radius: 0;\n  }\n  .webcg-devtools .card-group > .card:not(:first-child) .card-img-bottom,\n.webcg-devtools .card-group > .card:not(:first-child) .card-footer {\n    border-bottom-left-radius: 0;\n  }\n}\n.webcg-devtools .card-columns .card {\n  margin-bottom: 0.75rem;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .card-columns {\n    column-count: 3;\n    column-gap: 1.25rem;\n    orphans: 1;\n    widows: 1;\n  }\n  .webcg-devtools .card-columns .card {\n    display: inline-block;\n    width: 100%;\n  }\n}\n.webcg-devtools .accordion > .card {\n  overflow: hidden;\n}\n.webcg-devtools .accordion > .card:not(:last-of-type) {\n  border-bottom: 0;\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .accordion > .card:not(:first-of-type) {\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .accordion > .card > .card-header {\n  border-radius: 0;\n  margin-bottom: -1px;\n}\n.webcg-devtools .breadcrumb {\n  display: flex;\n  flex-wrap: wrap;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  list-style: none;\n  background-color: #e9ecef;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item {\n  padding-left: 0.5rem;\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item::before {\n  display: inline-block;\n  padding-right: 0.5rem;\n  color: #6c757d;\n  content: \"/\";\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item:hover::before {\n  text-decoration: underline;\n}\n.webcg-devtools .breadcrumb-item + .breadcrumb-item:hover::before {\n  text-decoration: none;\n}\n.webcg-devtools .breadcrumb-item.active {\n  color: #6c757d;\n}\n.webcg-devtools .pagination {\n  display: flex;\n  padding-left: 0;\n  list-style: none;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .page-link {\n  position: relative;\n  display: block;\n  padding: 0.5rem 0.75rem;\n  margin-left: -1px;\n  line-height: 1.25;\n  color: #007bff;\n  background-color: #fff;\n  border: 1px solid #dee2e6;\n}\n.webcg-devtools .page-link:hover {\n  z-index: 2;\n  color: #0056b3;\n  text-decoration: none;\n  background-color: #e9ecef;\n  border-color: #dee2e6;\n}\n.webcg-devtools .page-link:focus {\n  z-index: 3;\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);\n}\n.webcg-devtools .page-item:first-child .page-link {\n  margin-left: 0;\n  border-top-left-radius: 0.25rem;\n  border-bottom-left-radius: 0.25rem;\n}\n.webcg-devtools .page-item:last-child .page-link {\n  border-top-right-radius: 0.25rem;\n  border-bottom-right-radius: 0.25rem;\n}\n.webcg-devtools .page-item.active .page-link {\n  z-index: 3;\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .page-item.disabled .page-link {\n  color: #6c757d;\n  pointer-events: none;\n  cursor: auto;\n  background-color: #fff;\n  border-color: #dee2e6;\n}\n.webcg-devtools .pagination-lg .page-link {\n  padding: 0.75rem 1.5rem;\n  font-size: 1.25rem;\n  line-height: 1.5;\n}\n.webcg-devtools .pagination-lg .page-item:first-child .page-link {\n  border-top-left-radius: 0.3rem;\n  border-bottom-left-radius: 0.3rem;\n}\n.webcg-devtools .pagination-lg .page-item:last-child .page-link {\n  border-top-right-radius: 0.3rem;\n  border-bottom-right-radius: 0.3rem;\n}\n.webcg-devtools .pagination-sm .page-link {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n.webcg-devtools .pagination-sm .page-item:first-child .page-link {\n  border-top-left-radius: 0.2rem;\n  border-bottom-left-radius: 0.2rem;\n}\n.webcg-devtools .pagination-sm .page-item:last-child .page-link {\n  border-top-right-radius: 0.2rem;\n  border-bottom-right-radius: 0.2rem;\n}\n.webcg-devtools .badge {\n  display: inline-block;\n  padding: 0.25em 0.4em;\n  font-size: 75%;\n  font-weight: 700;\n  line-height: 1;\n  text-align: center;\n  white-space: nowrap;\n  vertical-align: baseline;\n  border-radius: 0.25rem;\n  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .badge {\n    transition: none;\n  }\n}\na.webcg-devtools .badge:hover, a.webcg-devtools .badge:focus {\n  text-decoration: none;\n}\n\n.webcg-devtools .badge:empty {\n  display: none;\n}\n.webcg-devtools .btn .badge {\n  position: relative;\n  top: -1px;\n}\n.webcg-devtools .badge-pill {\n  padding-right: 0.6em;\n  padding-left: 0.6em;\n  border-radius: 10rem;\n}\n.webcg-devtools .badge-primary {\n  color: #fff;\n  background-color: #007bff;\n}\na.webcg-devtools .badge-primary:hover, a.webcg-devtools .badge-primary:focus {\n  color: #fff;\n  background-color: #0062cc;\n}\na.webcg-devtools .badge-primary:focus, a.webcg-devtools .badge-primary.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);\n}\n\n.webcg-devtools .badge-secondary {\n  color: #fff;\n  background-color: #6c757d;\n}\na.webcg-devtools .badge-secondary:hover, a.webcg-devtools .badge-secondary:focus {\n  color: #fff;\n  background-color: #545b62;\n}\na.webcg-devtools .badge-secondary:focus, a.webcg-devtools .badge-secondary.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);\n}\n\n.webcg-devtools .badge-success {\n  color: #fff;\n  background-color: #28a745;\n}\na.webcg-devtools .badge-success:hover, a.webcg-devtools .badge-success:focus {\n  color: #fff;\n  background-color: #1e7e34;\n}\na.webcg-devtools .badge-success:focus, a.webcg-devtools .badge-success.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);\n}\n\n.webcg-devtools .badge-info {\n  color: #fff;\n  background-color: #17a2b8;\n}\na.webcg-devtools .badge-info:hover, a.webcg-devtools .badge-info:focus {\n  color: #fff;\n  background-color: #117a8b;\n}\na.webcg-devtools .badge-info:focus, a.webcg-devtools .badge-info.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);\n}\n\n.webcg-devtools .badge-warning {\n  color: #212529;\n  background-color: #ffc107;\n}\na.webcg-devtools .badge-warning:hover, a.webcg-devtools .badge-warning:focus {\n  color: #212529;\n  background-color: #d39e00;\n}\na.webcg-devtools .badge-warning:focus, a.webcg-devtools .badge-warning.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);\n}\n\n.webcg-devtools .badge-danger {\n  color: #fff;\n  background-color: #dc3545;\n}\na.webcg-devtools .badge-danger:hover, a.webcg-devtools .badge-danger:focus {\n  color: #fff;\n  background-color: #bd2130;\n}\na.webcg-devtools .badge-danger:focus, a.webcg-devtools .badge-danger.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);\n}\n\n.webcg-devtools .badge-light {\n  color: #212529;\n  background-color: #f8f9fa;\n}\na.webcg-devtools .badge-light:hover, a.webcg-devtools .badge-light:focus {\n  color: #212529;\n  background-color: #dae0e5;\n}\na.webcg-devtools .badge-light:focus, a.webcg-devtools .badge-light.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5);\n}\n\n.webcg-devtools .badge-dark {\n  color: #fff;\n  background-color: #343a40;\n}\na.webcg-devtools .badge-dark:hover, a.webcg-devtools .badge-dark:focus {\n  color: #fff;\n  background-color: #1d2124;\n}\na.webcg-devtools .badge-dark:focus, a.webcg-devtools .badge-dark.focus {\n  outline: 0;\n  box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5);\n}\n\n.webcg-devtools .jumbotron {\n  padding: 2rem 1rem;\n  margin-bottom: 2rem;\n  background-color: #e9ecef;\n  border-radius: 0.3rem;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .jumbotron {\n    padding: 4rem 2rem;\n  }\n}\n.webcg-devtools .jumbotron-fluid {\n  padding-right: 0;\n  padding-left: 0;\n  border-radius: 0;\n}\n.webcg-devtools .alert {\n  position: relative;\n  padding: 0.75rem 1.25rem;\n  margin-bottom: 1rem;\n  border: 1px solid transparent;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .alert-heading {\n  color: inherit;\n}\n.webcg-devtools .alert-link {\n  font-weight: 700;\n}\n.webcg-devtools .alert-dismissible {\n  padding-right: 4rem;\n}\n.webcg-devtools .alert-dismissible .close {\n  position: absolute;\n  top: 0;\n  right: 0;\n  padding: 0.75rem 1.25rem;\n  color: inherit;\n}\n.webcg-devtools .alert-primary {\n  color: #004085;\n  background-color: #cce5ff;\n  border-color: #b8daff;\n}\n.webcg-devtools .alert-primary hr {\n  border-top-color: #9fcdff;\n}\n.webcg-devtools .alert-primary .alert-link {\n  color: #002752;\n}\n.webcg-devtools .alert-secondary {\n  color: #383d41;\n  background-color: #e2e3e5;\n  border-color: #d6d8db;\n}\n.webcg-devtools .alert-secondary hr {\n  border-top-color: #c8cbcf;\n}\n.webcg-devtools .alert-secondary .alert-link {\n  color: #202326;\n}\n.webcg-devtools .alert-success {\n  color: #155724;\n  background-color: #d4edda;\n  border-color: #c3e6cb;\n}\n.webcg-devtools .alert-success hr {\n  border-top-color: #b1dfbb;\n}\n.webcg-devtools .alert-success .alert-link {\n  color: #0b2e13;\n}\n.webcg-devtools .alert-info {\n  color: #0c5460;\n  background-color: #d1ecf1;\n  border-color: #bee5eb;\n}\n.webcg-devtools .alert-info hr {\n  border-top-color: #abdde5;\n}\n.webcg-devtools .alert-info .alert-link {\n  color: #062c33;\n}\n.webcg-devtools .alert-warning {\n  color: #856404;\n  background-color: #fff3cd;\n  border-color: #ffeeba;\n}\n.webcg-devtools .alert-warning hr {\n  border-top-color: #ffe8a1;\n}\n.webcg-devtools .alert-warning .alert-link {\n  color: #533f03;\n}\n.webcg-devtools .alert-danger {\n  color: #721c24;\n  background-color: #f8d7da;\n  border-color: #f5c6cb;\n}\n.webcg-devtools .alert-danger hr {\n  border-top-color: #f1b0b7;\n}\n.webcg-devtools .alert-danger .alert-link {\n  color: #491217;\n}\n.webcg-devtools .alert-light {\n  color: #818182;\n  background-color: #fefefe;\n  border-color: #fdfdfe;\n}\n.webcg-devtools .alert-light hr {\n  border-top-color: #ececf6;\n}\n.webcg-devtools .alert-light .alert-link {\n  color: #686868;\n}\n.webcg-devtools .alert-dark {\n  color: #1b1e21;\n  background-color: #d6d8d9;\n  border-color: #c6c8ca;\n}\n.webcg-devtools .alert-dark hr {\n  border-top-color: #b9bbbe;\n}\n.webcg-devtools .alert-dark .alert-link {\n  color: #040505;\n}\n@keyframes progress-bar-stripes {\n  from {\n    background-position: 1rem 0;\n  }\n  to {\n    background-position: 0 0;\n  }\n}\n.webcg-devtools .progress {\n  display: flex;\n  height: 1rem;\n  overflow: hidden;\n  font-size: 0.75rem;\n  background-color: #e9ecef;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .progress-bar {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  overflow: hidden;\n  color: #fff;\n  text-align: center;\n  white-space: nowrap;\n  background-color: #007bff;\n  transition: width 0.6s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .progress-bar {\n    transition: none;\n  }\n}\n.webcg-devtools .progress-bar-striped {\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-size: 1rem 1rem;\n}\n.webcg-devtools .progress-bar-animated {\n  animation: progress-bar-stripes 1s linear infinite;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .progress-bar-animated {\n    animation: none;\n  }\n}\n.webcg-devtools .media {\n  display: flex;\n  align-items: flex-start;\n}\n.webcg-devtools .media-body {\n  flex: 1;\n}\n.webcg-devtools .list-group {\n  display: flex;\n  flex-direction: column;\n  padding-left: 0;\n  margin-bottom: 0;\n}\n.webcg-devtools .list-group-item-action {\n  width: 100%;\n  color: #495057;\n  text-align: inherit;\n}\n.webcg-devtools .list-group-item-action:hover, .webcg-devtools .list-group-item-action:focus {\n  z-index: 1;\n  color: #495057;\n  text-decoration: none;\n  background-color: #f8f9fa;\n}\n.webcg-devtools .list-group-item-action:active {\n  color: #212529;\n  background-color: #e9ecef;\n}\n.webcg-devtools .list-group-item {\n  position: relative;\n  display: block;\n  padding: 0.75rem 1.25rem;\n  background-color: #fff;\n  border: 1px solid rgba(0, 0, 0, 0.125);\n}\n.webcg-devtools .list-group-item:first-child {\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.webcg-devtools .list-group-item:last-child {\n  border-bottom-right-radius: 0.25rem;\n  border-bottom-left-radius: 0.25rem;\n}\n.webcg-devtools .list-group-item.disabled, .webcg-devtools .list-group-item:disabled {\n  color: #6c757d;\n  pointer-events: none;\n  background-color: #fff;\n}\n.webcg-devtools .list-group-item.active {\n  z-index: 2;\n  color: #fff;\n  background-color: #007bff;\n  border-color: #007bff;\n}\n.webcg-devtools .list-group-item + .webcg-devtools .list-group-item {\n  border-top-width: 0;\n}\n.webcg-devtools .list-group-item + .webcg-devtools .list-group-item.active {\n  margin-top: -1px;\n  border-top-width: 1px;\n}\n.webcg-devtools .list-group-horizontal {\n  flex-direction: row;\n}\n.webcg-devtools .list-group-horizontal .list-group-item:first-child {\n  border-bottom-left-radius: 0.25rem;\n  border-top-right-radius: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item:last-child {\n  border-top-right-radius: 0.25rem;\n  border-bottom-left-radius: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item.active {\n  margin-top: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item + .list-group-item {\n  border-top-width: 1px;\n  border-left-width: 0;\n}\n.webcg-devtools .list-group-horizontal .list-group-item + .list-group-item.active {\n  margin-left: -1px;\n  border-left-width: 1px;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .list-group-horizontal-sm {\n    flex-direction: row;\n  }\n  .webcg-devtools .list-group-horizontal-sm .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-sm .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-sm .list-group-item.active {\n    margin-top: 0;\n  }\n  .webcg-devtools .list-group-horizontal-sm .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n  }\n  .webcg-devtools .list-group-horizontal-sm .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .list-group-horizontal-md {\n    flex-direction: row;\n  }\n  .webcg-devtools .list-group-horizontal-md .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-md .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-md .list-group-item.active {\n    margin-top: 0;\n  }\n  .webcg-devtools .list-group-horizontal-md .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n  }\n  .webcg-devtools .list-group-horizontal-md .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .list-group-horizontal-lg {\n    flex-direction: row;\n  }\n  .webcg-devtools .list-group-horizontal-lg .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-lg .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-lg .list-group-item.active {\n    margin-top: 0;\n  }\n  .webcg-devtools .list-group-horizontal-lg .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n  }\n  .webcg-devtools .list-group-horizontal-lg .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .list-group-horizontal-xl {\n    flex-direction: row;\n  }\n  .webcg-devtools .list-group-horizontal-xl .list-group-item:first-child {\n    border-bottom-left-radius: 0.25rem;\n    border-top-right-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-xl .list-group-item:last-child {\n    border-top-right-radius: 0.25rem;\n    border-bottom-left-radius: 0;\n  }\n  .webcg-devtools .list-group-horizontal-xl .list-group-item.active {\n    margin-top: 0;\n  }\n  .webcg-devtools .list-group-horizontal-xl .list-group-item + .list-group-item {\n    border-top-width: 1px;\n    border-left-width: 0;\n  }\n  .webcg-devtools .list-group-horizontal-xl .list-group-item + .list-group-item.active {\n    margin-left: -1px;\n    border-left-width: 1px;\n  }\n}\n.webcg-devtools .list-group-flush .list-group-item {\n  border-right-width: 0;\n  border-left-width: 0;\n  border-radius: 0;\n}\n.webcg-devtools .list-group-flush .list-group-item:first-child {\n  border-top-width: 0;\n}\n.webcg-devtools .list-group-flush:last-child .list-group-item:last-child {\n  border-bottom-width: 0;\n}\n.webcg-devtools .list-group-item-primary {\n  color: #004085;\n  background-color: #b8daff;\n}\n.webcg-devtools .list-group-item-primary.list-group-item-action:hover, .webcg-devtools .list-group-item-primary.list-group-item-action:focus {\n  color: #004085;\n  background-color: #9fcdff;\n}\n.webcg-devtools .list-group-item-primary.list-group-item-action.active {\n  color: #fff;\n  background-color: #004085;\n  border-color: #004085;\n}\n.webcg-devtools .list-group-item-secondary {\n  color: #383d41;\n  background-color: #d6d8db;\n}\n.webcg-devtools .list-group-item-secondary.list-group-item-action:hover, .webcg-devtools .list-group-item-secondary.list-group-item-action:focus {\n  color: #383d41;\n  background-color: #c8cbcf;\n}\n.webcg-devtools .list-group-item-secondary.list-group-item-action.active {\n  color: #fff;\n  background-color: #383d41;\n  border-color: #383d41;\n}\n.webcg-devtools .list-group-item-success {\n  color: #155724;\n  background-color: #c3e6cb;\n}\n.webcg-devtools .list-group-item-success.list-group-item-action:hover, .webcg-devtools .list-group-item-success.list-group-item-action:focus {\n  color: #155724;\n  background-color: #b1dfbb;\n}\n.webcg-devtools .list-group-item-success.list-group-item-action.active {\n  color: #fff;\n  background-color: #155724;\n  border-color: #155724;\n}\n.webcg-devtools .list-group-item-info {\n  color: #0c5460;\n  background-color: #bee5eb;\n}\n.webcg-devtools .list-group-item-info.list-group-item-action:hover, .webcg-devtools .list-group-item-info.list-group-item-action:focus {\n  color: #0c5460;\n  background-color: #abdde5;\n}\n.webcg-devtools .list-group-item-info.list-group-item-action.active {\n  color: #fff;\n  background-color: #0c5460;\n  border-color: #0c5460;\n}\n.webcg-devtools .list-group-item-warning {\n  color: #856404;\n  background-color: #ffeeba;\n}\n.webcg-devtools .list-group-item-warning.list-group-item-action:hover, .webcg-devtools .list-group-item-warning.list-group-item-action:focus {\n  color: #856404;\n  background-color: #ffe8a1;\n}\n.webcg-devtools .list-group-item-warning.list-group-item-action.active {\n  color: #fff;\n  background-color: #856404;\n  border-color: #856404;\n}\n.webcg-devtools .list-group-item-danger {\n  color: #721c24;\n  background-color: #f5c6cb;\n}\n.webcg-devtools .list-group-item-danger.list-group-item-action:hover, .webcg-devtools .list-group-item-danger.list-group-item-action:focus {\n  color: #721c24;\n  background-color: #f1b0b7;\n}\n.webcg-devtools .list-group-item-danger.list-group-item-action.active {\n  color: #fff;\n  background-color: #721c24;\n  border-color: #721c24;\n}\n.webcg-devtools .list-group-item-light {\n  color: #818182;\n  background-color: #fdfdfe;\n}\n.webcg-devtools .list-group-item-light.list-group-item-action:hover, .webcg-devtools .list-group-item-light.list-group-item-action:focus {\n  color: #818182;\n  background-color: #ececf6;\n}\n.webcg-devtools .list-group-item-light.list-group-item-action.active {\n  color: #fff;\n  background-color: #818182;\n  border-color: #818182;\n}\n.webcg-devtools .list-group-item-dark {\n  color: #1b1e21;\n  background-color: #c6c8ca;\n}\n.webcg-devtools .list-group-item-dark.list-group-item-action:hover, .webcg-devtools .list-group-item-dark.list-group-item-action:focus {\n  color: #1b1e21;\n  background-color: #b9bbbe;\n}\n.webcg-devtools .list-group-item-dark.list-group-item-action.active {\n  color: #fff;\n  background-color: #1b1e21;\n  border-color: #1b1e21;\n}\n.webcg-devtools .close {\n  float: right;\n  font-size: 1.5rem;\n  font-weight: 700;\n  line-height: 1;\n  color: #000;\n  text-shadow: 0 1px 0 #fff;\n  opacity: 0.5;\n}\n.webcg-devtools .close:hover {\n  color: #000;\n  text-decoration: none;\n}\n.webcg-devtools .close:not(:disabled):not(.disabled):hover, .webcg-devtools .close:not(:disabled):not(.disabled):focus {\n  opacity: 0.75;\n}\n.webcg-devtools button.close {\n  padding: 0;\n  background-color: transparent;\n  border: 0;\n  appearance: none;\n}\n.webcg-devtools a.close.disabled {\n  pointer-events: none;\n}\n.webcg-devtools .toast {\n  max-width: 350px;\n  overflow: hidden;\n  font-size: 0.875rem;\n  background-color: rgba(255, 255, 255, 0.85);\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.1);\n  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);\n  backdrop-filter: blur(10px);\n  opacity: 0;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .toast:not(:last-child) {\n  margin-bottom: 0.75rem;\n}\n.webcg-devtools .toast.showing {\n  opacity: 1;\n}\n.webcg-devtools .toast.show {\n  display: block;\n  opacity: 1;\n}\n.webcg-devtools .toast.hide {\n  display: none;\n}\n.webcg-devtools .toast-header {\n  display: flex;\n  align-items: center;\n  padding: 0.25rem 0.75rem;\n  color: #6c757d;\n  background-color: rgba(255, 255, 255, 0.85);\n  background-clip: padding-box;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.05);\n}\n.webcg-devtools .toast-body {\n  padding: 0.75rem;\n}\n.webcg-devtools .modal-open {\n  overflow: hidden;\n}\n.webcg-devtools .modal-open .modal {\n  overflow-x: hidden;\n  overflow-y: auto;\n}\n.webcg-devtools .modal {\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 1050;\n  display: none;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  outline: 0;\n}\n.webcg-devtools .modal-dialog {\n  position: relative;\n  width: auto;\n  margin: 0.5rem;\n  pointer-events: none;\n}\n.modal.fade .webcg-devtools .modal-dialog {\n  transition: transform 0.3s ease-out;\n  transform: translate(0, -50px);\n}\n@media (prefers-reduced-motion: reduce) {\n  .modal.fade .webcg-devtools .modal-dialog {\n    transition: none;\n  }\n}\n.modal.show .webcg-devtools .modal-dialog {\n  transform: none;\n}\n.modal.modal-static .webcg-devtools .modal-dialog {\n  transform: scale(1.02);\n}\n.webcg-devtools .modal-dialog-scrollable {\n  display: flex;\n  max-height: calc(100% - 1rem);\n}\n.webcg-devtools .modal-dialog-scrollable .modal-content {\n  max-height: calc(100vh - 1rem);\n  overflow: hidden;\n}\n.webcg-devtools .modal-dialog-scrollable .modal-header,\n.webcg-devtools .modal-dialog-scrollable .modal-footer {\n  flex-shrink: 0;\n}\n.webcg-devtools .modal-dialog-scrollable .modal-body {\n  overflow-y: auto;\n}\n.webcg-devtools .modal-dialog-centered {\n  display: flex;\n  align-items: center;\n  min-height: calc(100% - 1rem);\n}\n.webcg-devtools .modal-dialog-centered::before {\n  display: block;\n  height: calc(100vh - 1rem);\n  content: \"\";\n}\n.webcg-devtools .modal-dialog-centered.modal-dialog-scrollable {\n  flex-direction: column;\n  justify-content: center;\n  height: 100%;\n}\n.webcg-devtools .modal-dialog-centered.modal-dialog-scrollable .modal-content {\n  max-height: none;\n}\n.webcg-devtools .modal-dialog-centered.modal-dialog-scrollable::before {\n  content: none;\n}\n.webcg-devtools .modal-content {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  width: 100%;\n  pointer-events: auto;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 0.3rem;\n  outline: 0;\n}\n.webcg-devtools .modal-backdrop {\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 1040;\n  width: 100vw;\n  height: 100vh;\n  background-color: #000;\n}\n.webcg-devtools .modal-backdrop.fade {\n  opacity: 0;\n}\n.webcg-devtools .modal-backdrop.show {\n  opacity: 0.5;\n}\n.webcg-devtools .modal-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  padding: 1rem 1rem;\n  border-bottom: 1px solid #dee2e6;\n  border-top-left-radius: calc(0.3rem - 1px);\n  border-top-right-radius: calc(0.3rem - 1px);\n}\n.webcg-devtools .modal-header .close {\n  padding: 1rem 1rem;\n  margin: -1rem -1rem -1rem auto;\n}\n.webcg-devtools .modal-title {\n  margin-bottom: 0;\n  line-height: 1.5;\n}\n.webcg-devtools .modal-body {\n  position: relative;\n  flex: 1 1 auto;\n  padding: 1rem;\n}\n.webcg-devtools .modal-footer {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: flex-end;\n  padding: 0.75rem;\n  border-top: 1px solid #dee2e6;\n  border-bottom-right-radius: calc(0.3rem - 1px);\n  border-bottom-left-radius: calc(0.3rem - 1px);\n}\n.webcg-devtools .modal-footer > * {\n  margin: 0.25rem;\n}\n.webcg-devtools .modal-scrollbar-measure {\n  position: absolute;\n  top: -9999px;\n  width: 50px;\n  height: 50px;\n  overflow: scroll;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .modal-dialog {\n    max-width: 500px;\n    margin: 1.75rem auto;\n  }\n  .webcg-devtools .modal-dialog-scrollable {\n    max-height: calc(100% - 3.5rem);\n  }\n  .webcg-devtools .modal-dialog-scrollable .modal-content {\n    max-height: calc(100vh - 3.5rem);\n  }\n  .webcg-devtools .modal-dialog-centered {\n    min-height: calc(100% - 3.5rem);\n  }\n  .webcg-devtools .modal-dialog-centered::before {\n    height: calc(100vh - 3.5rem);\n  }\n  .webcg-devtools .modal-sm {\n    max-width: 300px;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .modal-lg,\n.webcg-devtools .modal-xl {\n    max-width: 800px;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .modal-xl {\n    max-width: 1140px;\n  }\n}\n.webcg-devtools .tooltip {\n  position: absolute;\n  z-index: 1070;\n  display: block;\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  font-style: normal;\n  font-weight: 400;\n  line-height: 1.5;\n  text-align: left;\n  text-align: start;\n  text-decoration: none;\n  text-shadow: none;\n  text-transform: none;\n  letter-spacing: normal;\n  word-break: normal;\n  word-spacing: normal;\n  white-space: normal;\n  line-break: auto;\n  font-size: 0.875rem;\n  word-wrap: break-word;\n  opacity: 0;\n}\n.webcg-devtools .tooltip.show {\n  opacity: 0.9;\n}\n.webcg-devtools .tooltip .arrow {\n  position: absolute;\n  display: block;\n  width: 0.8rem;\n  height: 0.4rem;\n}\n.webcg-devtools .tooltip .arrow::before {\n  position: absolute;\n  content: \"\";\n  border-color: transparent;\n  border-style: solid;\n}\n.webcg-devtools .bs-tooltip-top, .webcg-devtools .bs-tooltip-auto[x-placement^=top] {\n  padding: 0.4rem 0;\n}\n.webcg-devtools .bs-tooltip-top .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=top] .arrow {\n  bottom: 0;\n}\n.webcg-devtools .bs-tooltip-top .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=top] .arrow::before {\n  top: 0;\n  border-width: 0.4rem 0.4rem 0;\n  border-top-color: #000;\n}\n.webcg-devtools .bs-tooltip-right, .webcg-devtools .bs-tooltip-auto[x-placement^=right] {\n  padding: 0 0.4rem;\n}\n.webcg-devtools .bs-tooltip-right .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=right] .arrow {\n  left: 0;\n  width: 0.4rem;\n  height: 0.8rem;\n}\n.webcg-devtools .bs-tooltip-right .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=right] .arrow::before {\n  right: 0;\n  border-width: 0.4rem 0.4rem 0.4rem 0;\n  border-right-color: #000;\n}\n.webcg-devtools .bs-tooltip-bottom, .webcg-devtools .bs-tooltip-auto[x-placement^=bottom] {\n  padding: 0.4rem 0;\n}\n.webcg-devtools .bs-tooltip-bottom .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=bottom] .arrow {\n  top: 0;\n}\n.webcg-devtools .bs-tooltip-bottom .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=bottom] .arrow::before {\n  bottom: 0;\n  border-width: 0 0.4rem 0.4rem;\n  border-bottom-color: #000;\n}\n.webcg-devtools .bs-tooltip-left, .webcg-devtools .bs-tooltip-auto[x-placement^=left] {\n  padding: 0 0.4rem;\n}\n.webcg-devtools .bs-tooltip-left .arrow, .webcg-devtools .bs-tooltip-auto[x-placement^=left] .arrow {\n  right: 0;\n  width: 0.4rem;\n  height: 0.8rem;\n}\n.webcg-devtools .bs-tooltip-left .arrow::before, .webcg-devtools .bs-tooltip-auto[x-placement^=left] .arrow::before {\n  left: 0;\n  border-width: 0.4rem 0 0.4rem 0.4rem;\n  border-left-color: #000;\n}\n.webcg-devtools .tooltip-inner {\n  max-width: 200px;\n  padding: 0.25rem 0.5rem;\n  color: #fff;\n  text-align: center;\n  background-color: #000;\n  border-radius: 0.25rem;\n}\n.webcg-devtools .popover {\n  position: absolute;\n  top: 0;\n  left: 0;\n  z-index: 1060;\n  display: block;\n  max-width: 276px;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n  font-style: normal;\n  font-weight: 400;\n  line-height: 1.5;\n  text-align: left;\n  text-align: start;\n  text-decoration: none;\n  text-shadow: none;\n  text-transform: none;\n  letter-spacing: normal;\n  word-break: normal;\n  word-spacing: normal;\n  white-space: normal;\n  line-break: auto;\n  font-size: 0.875rem;\n  word-wrap: break-word;\n  background-color: #fff;\n  background-clip: padding-box;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 0.3rem;\n}\n.webcg-devtools .popover .arrow {\n  position: absolute;\n  display: block;\n  width: 1rem;\n  height: 0.5rem;\n  margin: 0 0.3rem;\n}\n.webcg-devtools .popover .arrow::before, .webcg-devtools .popover .arrow::after {\n  position: absolute;\n  display: block;\n  content: \"\";\n  border-color: transparent;\n  border-style: solid;\n}\n.webcg-devtools .bs-popover-top, .webcg-devtools .bs-popover-auto[x-placement^=top] {\n  margin-bottom: 0.5rem;\n}\n.webcg-devtools .bs-popover-top > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=top] > .arrow {\n  bottom: calc(-0.5rem - 1px);\n}\n.webcg-devtools .bs-popover-top > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=top] > .arrow::before {\n  bottom: 0;\n  border-width: 0.5rem 0.5rem 0;\n  border-top-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-top > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=top] > .arrow::after {\n  bottom: 1px;\n  border-width: 0.5rem 0.5rem 0;\n  border-top-color: #fff;\n}\n.webcg-devtools .bs-popover-right, .webcg-devtools .bs-popover-auto[x-placement^=right] {\n  margin-left: 0.5rem;\n}\n.webcg-devtools .bs-popover-right > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=right] > .arrow {\n  left: calc(-0.5rem - 1px);\n  width: 0.5rem;\n  height: 1rem;\n  margin: 0.3rem 0;\n}\n.webcg-devtools .bs-popover-right > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=right] > .arrow::before {\n  left: 0;\n  border-width: 0.5rem 0.5rem 0.5rem 0;\n  border-right-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-right > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=right] > .arrow::after {\n  left: 1px;\n  border-width: 0.5rem 0.5rem 0.5rem 0;\n  border-right-color: #fff;\n}\n.webcg-devtools .bs-popover-bottom, .webcg-devtools .bs-popover-auto[x-placement^=bottom] {\n  margin-top: 0.5rem;\n}\n.webcg-devtools .bs-popover-bottom > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=bottom] > .arrow {\n  top: calc(-0.5rem - 1px);\n}\n.webcg-devtools .bs-popover-bottom > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=bottom] > .arrow::before {\n  top: 0;\n  border-width: 0 0.5rem 0.5rem 0.5rem;\n  border-bottom-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-bottom > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=bottom] > .arrow::after {\n  top: 1px;\n  border-width: 0 0.5rem 0.5rem 0.5rem;\n  border-bottom-color: #fff;\n}\n.webcg-devtools .bs-popover-bottom .popover-header::before, .webcg-devtools .bs-popover-auto[x-placement^=bottom] .popover-header::before {\n  position: absolute;\n  top: 0;\n  left: 50%;\n  display: block;\n  width: 1rem;\n  margin-left: -0.5rem;\n  content: \"\";\n  border-bottom: 1px solid #f7f7f7;\n}\n.webcg-devtools .bs-popover-left, .webcg-devtools .bs-popover-auto[x-placement^=left] {\n  margin-right: 0.5rem;\n}\n.webcg-devtools .bs-popover-left > .arrow, .webcg-devtools .bs-popover-auto[x-placement^=left] > .arrow {\n  right: calc(-0.5rem - 1px);\n  width: 0.5rem;\n  height: 1rem;\n  margin: 0.3rem 0;\n}\n.webcg-devtools .bs-popover-left > .arrow::before, .webcg-devtools .bs-popover-auto[x-placement^=left] > .arrow::before {\n  right: 0;\n  border-width: 0.5rem 0 0.5rem 0.5rem;\n  border-left-color: rgba(0, 0, 0, 0.25);\n}\n.webcg-devtools .bs-popover-left > .arrow::after, .webcg-devtools .bs-popover-auto[x-placement^=left] > .arrow::after {\n  right: 1px;\n  border-width: 0.5rem 0 0.5rem 0.5rem;\n  border-left-color: #fff;\n}\n.webcg-devtools .popover-header {\n  padding: 0.5rem 0.75rem;\n  margin-bottom: 0;\n  font-size: 1rem;\n  background-color: #f7f7f7;\n  border-bottom: 1px solid #ebebeb;\n  border-top-left-radius: calc(0.3rem - 1px);\n  border-top-right-radius: calc(0.3rem - 1px);\n}\n.webcg-devtools .popover-header:empty {\n  display: none;\n}\n.webcg-devtools .popover-body {\n  padding: 0.5rem 0.75rem;\n  color: #212529;\n}\n.webcg-devtools .carousel {\n  position: relative;\n}\n.webcg-devtools .carousel.pointer-event {\n  touch-action: pan-y;\n}\n.webcg-devtools .carousel-inner {\n  position: relative;\n  width: 100%;\n  overflow: hidden;\n}\n.webcg-devtools .carousel-inner::after {\n  display: block;\n  clear: both;\n  content: \"\";\n}\n.webcg-devtools .carousel-item {\n  position: relative;\n  display: none;\n  float: left;\n  width: 100%;\n  margin-right: -100%;\n  backface-visibility: hidden;\n  transition: transform 0.6s ease-in-out;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .carousel-item {\n    transition: none;\n  }\n}\n.webcg-devtools .carousel-item.active,\n.webcg-devtools .carousel-item-next,\n.webcg-devtools .carousel-item-prev {\n  display: block;\n}\n.webcg-devtools .carousel-item-next:not(.carousel-item-left),\n.webcg-devtools .active.carousel-item-right {\n  transform: translateX(100%);\n}\n.webcg-devtools .carousel-item-prev:not(.carousel-item-right),\n.webcg-devtools .active.carousel-item-left {\n  transform: translateX(-100%);\n}\n.webcg-devtools .carousel-fade .carousel-item {\n  opacity: 0;\n  transition-property: opacity;\n  transform: none;\n}\n.webcg-devtools .carousel-fade .carousel-item.active,\n.webcg-devtools .carousel-fade .carousel-item-next.carousel-item-left,\n.webcg-devtools .carousel-fade .carousel-item-prev.carousel-item-right {\n  z-index: 1;\n  opacity: 1;\n}\n.webcg-devtools .carousel-fade .active.carousel-item-left,\n.webcg-devtools .carousel-fade .active.carousel-item-right {\n  z-index: 0;\n  opacity: 0;\n  transition: opacity 0s 0.6s;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .carousel-fade .active.carousel-item-left,\n.webcg-devtools .carousel-fade .active.carousel-item-right {\n    transition: none;\n  }\n}\n.webcg-devtools .carousel-control-prev,\n.webcg-devtools .carousel-control-next {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 15%;\n  color: #fff;\n  text-align: center;\n  opacity: 0.5;\n  transition: opacity 0.15s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .carousel-control-prev,\n.webcg-devtools .carousel-control-next {\n    transition: none;\n  }\n}\n.webcg-devtools .carousel-control-prev:hover, .webcg-devtools .carousel-control-prev:focus,\n.webcg-devtools .carousel-control-next:hover,\n.webcg-devtools .carousel-control-next:focus {\n  color: #fff;\n  text-decoration: none;\n  outline: 0;\n  opacity: 0.9;\n}\n.webcg-devtools .carousel-control-prev {\n  left: 0;\n}\n.webcg-devtools .carousel-control-next {\n  right: 0;\n}\n.webcg-devtools .carousel-control-prev-icon,\n.webcg-devtools .carousel-control-next-icon {\n  display: inline-block;\n  width: 20px;\n  height: 20px;\n  background: no-repeat 50%/100% 100%;\n}\n.webcg-devtools .carousel-control-prev-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath d='M5.25 0l-4 4 4 4 1.5-1.5L4.25 4l2.5-2.5L5.25 0z'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .carousel-control-next-icon {\n  background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath d='M2.75 0l-1.5 1.5L3.75 4l-2.5 2.5L2.75 8l4-4-4-4z'/%3e%3c/svg%3e\");\n}\n.webcg-devtools .carousel-indicators {\n  position: absolute;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 15;\n  display: flex;\n  justify-content: center;\n  padding-left: 0;\n  margin-right: 15%;\n  margin-left: 15%;\n  list-style: none;\n}\n.webcg-devtools .carousel-indicators li {\n  box-sizing: content-box;\n  flex: 0 1 auto;\n  width: 30px;\n  height: 3px;\n  margin-right: 3px;\n  margin-left: 3px;\n  text-indent: -999px;\n  cursor: pointer;\n  background-color: #fff;\n  background-clip: padding-box;\n  border-top: 10px solid transparent;\n  border-bottom: 10px solid transparent;\n  opacity: 0.5;\n  transition: opacity 0.6s ease;\n}\n@media (prefers-reduced-motion: reduce) {\n  .webcg-devtools .carousel-indicators li {\n    transition: none;\n  }\n}\n.webcg-devtools .carousel-indicators .active {\n  opacity: 1;\n}\n.webcg-devtools .carousel-caption {\n  position: absolute;\n  right: 15%;\n  bottom: 20px;\n  left: 15%;\n  z-index: 10;\n  padding-top: 20px;\n  padding-bottom: 20px;\n  color: #fff;\n  text-align: center;\n}\n@keyframes spinner-border {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.webcg-devtools .spinner-border {\n  display: inline-block;\n  width: 2rem;\n  height: 2rem;\n  vertical-align: text-bottom;\n  border: 0.25em solid currentColor;\n  border-right-color: transparent;\n  border-radius: 50%;\n  animation: spinner-border 0.75s linear infinite;\n}\n.webcg-devtools .spinner-border-sm {\n  width: 1rem;\n  height: 1rem;\n  border-width: 0.2em;\n}\n@keyframes spinner-grow {\n  0% {\n    transform: scale(0);\n  }\n  50% {\n    opacity: 1;\n  }\n}\n.webcg-devtools .spinner-grow {\n  display: inline-block;\n  width: 2rem;\n  height: 2rem;\n  vertical-align: text-bottom;\n  background-color: currentColor;\n  border-radius: 50%;\n  opacity: 0;\n  animation: spinner-grow 0.75s linear infinite;\n}\n.webcg-devtools .spinner-grow-sm {\n  width: 1rem;\n  height: 1rem;\n}\n.webcg-devtools .align-baseline {\n  vertical-align: baseline !important;\n}\n.webcg-devtools .align-top {\n  vertical-align: top !important;\n}\n.webcg-devtools .align-middle {\n  vertical-align: middle !important;\n}\n.webcg-devtools .align-bottom {\n  vertical-align: bottom !important;\n}\n.webcg-devtools .align-text-bottom {\n  vertical-align: text-bottom !important;\n}\n.webcg-devtools .align-text-top {\n  vertical-align: text-top !important;\n}\n.webcg-devtools .bg-primary {\n  background-color: #007bff !important;\n}\n.webcg-devtools a.bg-primary:hover, .webcg-devtools a.bg-primary:focus,\n.webcg-devtools button.bg-primary:hover,\n.webcg-devtools button.bg-primary:focus {\n  background-color: #0062cc !important;\n}\n.webcg-devtools .bg-secondary {\n  background-color: #6c757d !important;\n}\n.webcg-devtools a.bg-secondary:hover, .webcg-devtools a.bg-secondary:focus,\n.webcg-devtools button.bg-secondary:hover,\n.webcg-devtools button.bg-secondary:focus {\n  background-color: #545b62 !important;\n}\n.webcg-devtools .bg-success {\n  background-color: #28a745 !important;\n}\n.webcg-devtools a.bg-success:hover, .webcg-devtools a.bg-success:focus,\n.webcg-devtools button.bg-success:hover,\n.webcg-devtools button.bg-success:focus {\n  background-color: #1e7e34 !important;\n}\n.webcg-devtools .bg-info {\n  background-color: #17a2b8 !important;\n}\n.webcg-devtools a.bg-info:hover, .webcg-devtools a.bg-info:focus,\n.webcg-devtools button.bg-info:hover,\n.webcg-devtools button.bg-info:focus {\n  background-color: #117a8b !important;\n}\n.webcg-devtools .bg-warning {\n  background-color: #ffc107 !important;\n}\n.webcg-devtools a.bg-warning:hover, .webcg-devtools a.bg-warning:focus,\n.webcg-devtools button.bg-warning:hover,\n.webcg-devtools button.bg-warning:focus {\n  background-color: #d39e00 !important;\n}\n.webcg-devtools .bg-danger {\n  background-color: #dc3545 !important;\n}\n.webcg-devtools a.bg-danger:hover, .webcg-devtools a.bg-danger:focus,\n.webcg-devtools button.bg-danger:hover,\n.webcg-devtools button.bg-danger:focus {\n  background-color: #bd2130 !important;\n}\n.webcg-devtools .bg-light {\n  background-color: #f8f9fa !important;\n}\n.webcg-devtools a.bg-light:hover, .webcg-devtools a.bg-light:focus,\n.webcg-devtools button.bg-light:hover,\n.webcg-devtools button.bg-light:focus {\n  background-color: #dae0e5 !important;\n}\n.webcg-devtools .bg-dark {\n  background-color: #343a40 !important;\n}\n.webcg-devtools a.bg-dark:hover, .webcg-devtools a.bg-dark:focus,\n.webcg-devtools button.bg-dark:hover,\n.webcg-devtools button.bg-dark:focus {\n  background-color: #1d2124 !important;\n}\n.webcg-devtools .bg-white {\n  background-color: #fff !important;\n}\n.webcg-devtools .bg-transparent {\n  background-color: transparent !important;\n}\n.webcg-devtools .border {\n  border: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-top {\n  border-top: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-right {\n  border-right: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-bottom {\n  border-bottom: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-left {\n  border-left: 1px solid #dee2e6 !important;\n}\n.webcg-devtools .border-0 {\n  border: 0 !important;\n}\n.webcg-devtools .border-top-0 {\n  border-top: 0 !important;\n}\n.webcg-devtools .border-right-0 {\n  border-right: 0 !important;\n}\n.webcg-devtools .border-bottom-0 {\n  border-bottom: 0 !important;\n}\n.webcg-devtools .border-left-0 {\n  border-left: 0 !important;\n}\n.webcg-devtools .border-primary {\n  border-color: #007bff !important;\n}\n.webcg-devtools .border-secondary {\n  border-color: #6c757d !important;\n}\n.webcg-devtools .border-success {\n  border-color: #28a745 !important;\n}\n.webcg-devtools .border-info {\n  border-color: #17a2b8 !important;\n}\n.webcg-devtools .border-warning {\n  border-color: #ffc107 !important;\n}\n.webcg-devtools .border-danger {\n  border-color: #dc3545 !important;\n}\n.webcg-devtools .border-light {\n  border-color: #f8f9fa !important;\n}\n.webcg-devtools .border-dark {\n  border-color: #343a40 !important;\n}\n.webcg-devtools .border-white {\n  border-color: #fff !important;\n}\n.webcg-devtools .rounded-sm {\n  border-radius: 0.2rem !important;\n}\n.webcg-devtools .rounded {\n  border-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-top {\n  border-top-left-radius: 0.25rem !important;\n  border-top-right-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-right {\n  border-top-right-radius: 0.25rem !important;\n  border-bottom-right-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-bottom {\n  border-bottom-right-radius: 0.25rem !important;\n  border-bottom-left-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-left {\n  border-top-left-radius: 0.25rem !important;\n  border-bottom-left-radius: 0.25rem !important;\n}\n.webcg-devtools .rounded-lg {\n  border-radius: 0.3rem !important;\n}\n.webcg-devtools .rounded-circle {\n  border-radius: 50% !important;\n}\n.webcg-devtools .rounded-pill {\n  border-radius: 50rem !important;\n}\n.webcg-devtools .rounded-0 {\n  border-radius: 0 !important;\n}\n.webcg-devtools .clearfix::after {\n  display: block;\n  clear: both;\n  content: \"\";\n}\n.webcg-devtools .d-none {\n  display: none !important;\n}\n.webcg-devtools .d-inline {\n  display: inline !important;\n}\n.webcg-devtools .d-inline-block {\n  display: inline-block !important;\n}\n.webcg-devtools .d-block {\n  display: block !important;\n}\n.webcg-devtools .d-table {\n  display: table !important;\n}\n.webcg-devtools .d-table-row {\n  display: table-row !important;\n}\n.webcg-devtools .d-table-cell {\n  display: table-cell !important;\n}\n.webcg-devtools .d-flex {\n  display: flex !important;\n}\n.webcg-devtools .d-inline-flex {\n  display: inline-flex !important;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .d-sm-none {\n    display: none !important;\n  }\n  .webcg-devtools .d-sm-inline {\n    display: inline !important;\n  }\n  .webcg-devtools .d-sm-inline-block {\n    display: inline-block !important;\n  }\n  .webcg-devtools .d-sm-block {\n    display: block !important;\n  }\n  .webcg-devtools .d-sm-table {\n    display: table !important;\n  }\n  .webcg-devtools .d-sm-table-row {\n    display: table-row !important;\n  }\n  .webcg-devtools .d-sm-table-cell {\n    display: table-cell !important;\n  }\n  .webcg-devtools .d-sm-flex {\n    display: flex !important;\n  }\n  .webcg-devtools .d-sm-inline-flex {\n    display: inline-flex !important;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .d-md-none {\n    display: none !important;\n  }\n  .webcg-devtools .d-md-inline {\n    display: inline !important;\n  }\n  .webcg-devtools .d-md-inline-block {\n    display: inline-block !important;\n  }\n  .webcg-devtools .d-md-block {\n    display: block !important;\n  }\n  .webcg-devtools .d-md-table {\n    display: table !important;\n  }\n  .webcg-devtools .d-md-table-row {\n    display: table-row !important;\n  }\n  .webcg-devtools .d-md-table-cell {\n    display: table-cell !important;\n  }\n  .webcg-devtools .d-md-flex {\n    display: flex !important;\n  }\n  .webcg-devtools .d-md-inline-flex {\n    display: inline-flex !important;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .d-lg-none {\n    display: none !important;\n  }\n  .webcg-devtools .d-lg-inline {\n    display: inline !important;\n  }\n  .webcg-devtools .d-lg-inline-block {\n    display: inline-block !important;\n  }\n  .webcg-devtools .d-lg-block {\n    display: block !important;\n  }\n  .webcg-devtools .d-lg-table {\n    display: table !important;\n  }\n  .webcg-devtools .d-lg-table-row {\n    display: table-row !important;\n  }\n  .webcg-devtools .d-lg-table-cell {\n    display: table-cell !important;\n  }\n  .webcg-devtools .d-lg-flex {\n    display: flex !important;\n  }\n  .webcg-devtools .d-lg-inline-flex {\n    display: inline-flex !important;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .d-xl-none {\n    display: none !important;\n  }\n  .webcg-devtools .d-xl-inline {\n    display: inline !important;\n  }\n  .webcg-devtools .d-xl-inline-block {\n    display: inline-block !important;\n  }\n  .webcg-devtools .d-xl-block {\n    display: block !important;\n  }\n  .webcg-devtools .d-xl-table {\n    display: table !important;\n  }\n  .webcg-devtools .d-xl-table-row {\n    display: table-row !important;\n  }\n  .webcg-devtools .d-xl-table-cell {\n    display: table-cell !important;\n  }\n  .webcg-devtools .d-xl-flex {\n    display: flex !important;\n  }\n  .webcg-devtools .d-xl-inline-flex {\n    display: inline-flex !important;\n  }\n}\n@media print {\n  .webcg-devtools .d-print-none {\n    display: none !important;\n  }\n  .webcg-devtools .d-print-inline {\n    display: inline !important;\n  }\n  .webcg-devtools .d-print-inline-block {\n    display: inline-block !important;\n  }\n  .webcg-devtools .d-print-block {\n    display: block !important;\n  }\n  .webcg-devtools .d-print-table {\n    display: table !important;\n  }\n  .webcg-devtools .d-print-table-row {\n    display: table-row !important;\n  }\n  .webcg-devtools .d-print-table-cell {\n    display: table-cell !important;\n  }\n  .webcg-devtools .d-print-flex {\n    display: flex !important;\n  }\n  .webcg-devtools .d-print-inline-flex {\n    display: inline-flex !important;\n  }\n}\n.webcg-devtools .embed-responsive {\n  position: relative;\n  display: block;\n  width: 100%;\n  padding: 0;\n  overflow: hidden;\n}\n.webcg-devtools .embed-responsive::before {\n  display: block;\n  content: \"\";\n}\n.webcg-devtools .embed-responsive .embed-responsive-item,\n.webcg-devtools .embed-responsive iframe,\n.webcg-devtools .embed-responsive embed,\n.webcg-devtools .embed-responsive object,\n.webcg-devtools .embed-responsive video {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  border: 0;\n}\n.webcg-devtools .embed-responsive-21by9::before {\n  padding-top: 42.8571428571%;\n}\n.webcg-devtools .embed-responsive-16by9::before {\n  padding-top: 56.25%;\n}\n.webcg-devtools .embed-responsive-4by3::before {\n  padding-top: 75%;\n}\n.webcg-devtools .embed-responsive-1by1::before {\n  padding-top: 100%;\n}\n.webcg-devtools .flex-row {\n  flex-direction: row !important;\n}\n.webcg-devtools .flex-column {\n  flex-direction: column !important;\n}\n.webcg-devtools .flex-row-reverse {\n  flex-direction: row-reverse !important;\n}\n.webcg-devtools .flex-column-reverse {\n  flex-direction: column-reverse !important;\n}\n.webcg-devtools .flex-wrap {\n  flex-wrap: wrap !important;\n}\n.webcg-devtools .flex-nowrap {\n  flex-wrap: nowrap !important;\n}\n.webcg-devtools .flex-wrap-reverse {\n  flex-wrap: wrap-reverse !important;\n}\n.webcg-devtools .flex-fill {\n  flex: 1 1 auto !important;\n}\n.webcg-devtools .flex-grow-0 {\n  flex-grow: 0 !important;\n}\n.webcg-devtools .flex-grow-1 {\n  flex-grow: 1 !important;\n}\n.webcg-devtools .flex-shrink-0 {\n  flex-shrink: 0 !important;\n}\n.webcg-devtools .flex-shrink-1 {\n  flex-shrink: 1 !important;\n}\n.webcg-devtools .justify-content-start {\n  justify-content: flex-start !important;\n}\n.webcg-devtools .justify-content-end {\n  justify-content: flex-end !important;\n}\n.webcg-devtools .justify-content-center {\n  justify-content: center !important;\n}\n.webcg-devtools .justify-content-between {\n  justify-content: space-between !important;\n}\n.webcg-devtools .justify-content-around {\n  justify-content: space-around !important;\n}\n.webcg-devtools .align-items-start {\n  align-items: flex-start !important;\n}\n.webcg-devtools .align-items-end {\n  align-items: flex-end !important;\n}\n.webcg-devtools .align-items-center {\n  align-items: center !important;\n}\n.webcg-devtools .align-items-baseline {\n  align-items: baseline !important;\n}\n.webcg-devtools .align-items-stretch {\n  align-items: stretch !important;\n}\n.webcg-devtools .align-content-start {\n  align-content: flex-start !important;\n}\n.webcg-devtools .align-content-end {\n  align-content: flex-end !important;\n}\n.webcg-devtools .align-content-center {\n  align-content: center !important;\n}\n.webcg-devtools .align-content-between {\n  align-content: space-between !important;\n}\n.webcg-devtools .align-content-around {\n  align-content: space-around !important;\n}\n.webcg-devtools .align-content-stretch {\n  align-content: stretch !important;\n}\n.webcg-devtools .align-self-auto {\n  align-self: auto !important;\n}\n.webcg-devtools .align-self-start {\n  align-self: flex-start !important;\n}\n.webcg-devtools .align-self-end {\n  align-self: flex-end !important;\n}\n.webcg-devtools .align-self-center {\n  align-self: center !important;\n}\n.webcg-devtools .align-self-baseline {\n  align-self: baseline !important;\n}\n.webcg-devtools .align-self-stretch {\n  align-self: stretch !important;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .flex-sm-row {\n    flex-direction: row !important;\n  }\n  .webcg-devtools .flex-sm-column {\n    flex-direction: column !important;\n  }\n  .webcg-devtools .flex-sm-row-reverse {\n    flex-direction: row-reverse !important;\n  }\n  .webcg-devtools .flex-sm-column-reverse {\n    flex-direction: column-reverse !important;\n  }\n  .webcg-devtools .flex-sm-wrap {\n    flex-wrap: wrap !important;\n  }\n  .webcg-devtools .flex-sm-nowrap {\n    flex-wrap: nowrap !important;\n  }\n  .webcg-devtools .flex-sm-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n  }\n  .webcg-devtools .flex-sm-fill {\n    flex: 1 1 auto !important;\n  }\n  .webcg-devtools .flex-sm-grow-0 {\n    flex-grow: 0 !important;\n  }\n  .webcg-devtools .flex-sm-grow-1 {\n    flex-grow: 1 !important;\n  }\n  .webcg-devtools .flex-sm-shrink-0 {\n    flex-shrink: 0 !important;\n  }\n  .webcg-devtools .flex-sm-shrink-1 {\n    flex-shrink: 1 !important;\n  }\n  .webcg-devtools .justify-content-sm-start {\n    justify-content: flex-start !important;\n  }\n  .webcg-devtools .justify-content-sm-end {\n    justify-content: flex-end !important;\n  }\n  .webcg-devtools .justify-content-sm-center {\n    justify-content: center !important;\n  }\n  .webcg-devtools .justify-content-sm-between {\n    justify-content: space-between !important;\n  }\n  .webcg-devtools .justify-content-sm-around {\n    justify-content: space-around !important;\n  }\n  .webcg-devtools .align-items-sm-start {\n    align-items: flex-start !important;\n  }\n  .webcg-devtools .align-items-sm-end {\n    align-items: flex-end !important;\n  }\n  .webcg-devtools .align-items-sm-center {\n    align-items: center !important;\n  }\n  .webcg-devtools .align-items-sm-baseline {\n    align-items: baseline !important;\n  }\n  .webcg-devtools .align-items-sm-stretch {\n    align-items: stretch !important;\n  }\n  .webcg-devtools .align-content-sm-start {\n    align-content: flex-start !important;\n  }\n  .webcg-devtools .align-content-sm-end {\n    align-content: flex-end !important;\n  }\n  .webcg-devtools .align-content-sm-center {\n    align-content: center !important;\n  }\n  .webcg-devtools .align-content-sm-between {\n    align-content: space-between !important;\n  }\n  .webcg-devtools .align-content-sm-around {\n    align-content: space-around !important;\n  }\n  .webcg-devtools .align-content-sm-stretch {\n    align-content: stretch !important;\n  }\n  .webcg-devtools .align-self-sm-auto {\n    align-self: auto !important;\n  }\n  .webcg-devtools .align-self-sm-start {\n    align-self: flex-start !important;\n  }\n  .webcg-devtools .align-self-sm-end {\n    align-self: flex-end !important;\n  }\n  .webcg-devtools .align-self-sm-center {\n    align-self: center !important;\n  }\n  .webcg-devtools .align-self-sm-baseline {\n    align-self: baseline !important;\n  }\n  .webcg-devtools .align-self-sm-stretch {\n    align-self: stretch !important;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .flex-md-row {\n    flex-direction: row !important;\n  }\n  .webcg-devtools .flex-md-column {\n    flex-direction: column !important;\n  }\n  .webcg-devtools .flex-md-row-reverse {\n    flex-direction: row-reverse !important;\n  }\n  .webcg-devtools .flex-md-column-reverse {\n    flex-direction: column-reverse !important;\n  }\n  .webcg-devtools .flex-md-wrap {\n    flex-wrap: wrap !important;\n  }\n  .webcg-devtools .flex-md-nowrap {\n    flex-wrap: nowrap !important;\n  }\n  .webcg-devtools .flex-md-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n  }\n  .webcg-devtools .flex-md-fill {\n    flex: 1 1 auto !important;\n  }\n  .webcg-devtools .flex-md-grow-0 {\n    flex-grow: 0 !important;\n  }\n  .webcg-devtools .flex-md-grow-1 {\n    flex-grow: 1 !important;\n  }\n  .webcg-devtools .flex-md-shrink-0 {\n    flex-shrink: 0 !important;\n  }\n  .webcg-devtools .flex-md-shrink-1 {\n    flex-shrink: 1 !important;\n  }\n  .webcg-devtools .justify-content-md-start {\n    justify-content: flex-start !important;\n  }\n  .webcg-devtools .justify-content-md-end {\n    justify-content: flex-end !important;\n  }\n  .webcg-devtools .justify-content-md-center {\n    justify-content: center !important;\n  }\n  .webcg-devtools .justify-content-md-between {\n    justify-content: space-between !important;\n  }\n  .webcg-devtools .justify-content-md-around {\n    justify-content: space-around !important;\n  }\n  .webcg-devtools .align-items-md-start {\n    align-items: flex-start !important;\n  }\n  .webcg-devtools .align-items-md-end {\n    align-items: flex-end !important;\n  }\n  .webcg-devtools .align-items-md-center {\n    align-items: center !important;\n  }\n  .webcg-devtools .align-items-md-baseline {\n    align-items: baseline !important;\n  }\n  .webcg-devtools .align-items-md-stretch {\n    align-items: stretch !important;\n  }\n  .webcg-devtools .align-content-md-start {\n    align-content: flex-start !important;\n  }\n  .webcg-devtools .align-content-md-end {\n    align-content: flex-end !important;\n  }\n  .webcg-devtools .align-content-md-center {\n    align-content: center !important;\n  }\n  .webcg-devtools .align-content-md-between {\n    align-content: space-between !important;\n  }\n  .webcg-devtools .align-content-md-around {\n    align-content: space-around !important;\n  }\n  .webcg-devtools .align-content-md-stretch {\n    align-content: stretch !important;\n  }\n  .webcg-devtools .align-self-md-auto {\n    align-self: auto !important;\n  }\n  .webcg-devtools .align-self-md-start {\n    align-self: flex-start !important;\n  }\n  .webcg-devtools .align-self-md-end {\n    align-self: flex-end !important;\n  }\n  .webcg-devtools .align-self-md-center {\n    align-self: center !important;\n  }\n  .webcg-devtools .align-self-md-baseline {\n    align-self: baseline !important;\n  }\n  .webcg-devtools .align-self-md-stretch {\n    align-self: stretch !important;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .flex-lg-row {\n    flex-direction: row !important;\n  }\n  .webcg-devtools .flex-lg-column {\n    flex-direction: column !important;\n  }\n  .webcg-devtools .flex-lg-row-reverse {\n    flex-direction: row-reverse !important;\n  }\n  .webcg-devtools .flex-lg-column-reverse {\n    flex-direction: column-reverse !important;\n  }\n  .webcg-devtools .flex-lg-wrap {\n    flex-wrap: wrap !important;\n  }\n  .webcg-devtools .flex-lg-nowrap {\n    flex-wrap: nowrap !important;\n  }\n  .webcg-devtools .flex-lg-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n  }\n  .webcg-devtools .flex-lg-fill {\n    flex: 1 1 auto !important;\n  }\n  .webcg-devtools .flex-lg-grow-0 {\n    flex-grow: 0 !important;\n  }\n  .webcg-devtools .flex-lg-grow-1 {\n    flex-grow: 1 !important;\n  }\n  .webcg-devtools .flex-lg-shrink-0 {\n    flex-shrink: 0 !important;\n  }\n  .webcg-devtools .flex-lg-shrink-1 {\n    flex-shrink: 1 !important;\n  }\n  .webcg-devtools .justify-content-lg-start {\n    justify-content: flex-start !important;\n  }\n  .webcg-devtools .justify-content-lg-end {\n    justify-content: flex-end !important;\n  }\n  .webcg-devtools .justify-content-lg-center {\n    justify-content: center !important;\n  }\n  .webcg-devtools .justify-content-lg-between {\n    justify-content: space-between !important;\n  }\n  .webcg-devtools .justify-content-lg-around {\n    justify-content: space-around !important;\n  }\n  .webcg-devtools .align-items-lg-start {\n    align-items: flex-start !important;\n  }\n  .webcg-devtools .align-items-lg-end {\n    align-items: flex-end !important;\n  }\n  .webcg-devtools .align-items-lg-center {\n    align-items: center !important;\n  }\n  .webcg-devtools .align-items-lg-baseline {\n    align-items: baseline !important;\n  }\n  .webcg-devtools .align-items-lg-stretch {\n    align-items: stretch !important;\n  }\n  .webcg-devtools .align-content-lg-start {\n    align-content: flex-start !important;\n  }\n  .webcg-devtools .align-content-lg-end {\n    align-content: flex-end !important;\n  }\n  .webcg-devtools .align-content-lg-center {\n    align-content: center !important;\n  }\n  .webcg-devtools .align-content-lg-between {\n    align-content: space-between !important;\n  }\n  .webcg-devtools .align-content-lg-around {\n    align-content: space-around !important;\n  }\n  .webcg-devtools .align-content-lg-stretch {\n    align-content: stretch !important;\n  }\n  .webcg-devtools .align-self-lg-auto {\n    align-self: auto !important;\n  }\n  .webcg-devtools .align-self-lg-start {\n    align-self: flex-start !important;\n  }\n  .webcg-devtools .align-self-lg-end {\n    align-self: flex-end !important;\n  }\n  .webcg-devtools .align-self-lg-center {\n    align-self: center !important;\n  }\n  .webcg-devtools .align-self-lg-baseline {\n    align-self: baseline !important;\n  }\n  .webcg-devtools .align-self-lg-stretch {\n    align-self: stretch !important;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .flex-xl-row {\n    flex-direction: row !important;\n  }\n  .webcg-devtools .flex-xl-column {\n    flex-direction: column !important;\n  }\n  .webcg-devtools .flex-xl-row-reverse {\n    flex-direction: row-reverse !important;\n  }\n  .webcg-devtools .flex-xl-column-reverse {\n    flex-direction: column-reverse !important;\n  }\n  .webcg-devtools .flex-xl-wrap {\n    flex-wrap: wrap !important;\n  }\n  .webcg-devtools .flex-xl-nowrap {\n    flex-wrap: nowrap !important;\n  }\n  .webcg-devtools .flex-xl-wrap-reverse {\n    flex-wrap: wrap-reverse !important;\n  }\n  .webcg-devtools .flex-xl-fill {\n    flex: 1 1 auto !important;\n  }\n  .webcg-devtools .flex-xl-grow-0 {\n    flex-grow: 0 !important;\n  }\n  .webcg-devtools .flex-xl-grow-1 {\n    flex-grow: 1 !important;\n  }\n  .webcg-devtools .flex-xl-shrink-0 {\n    flex-shrink: 0 !important;\n  }\n  .webcg-devtools .flex-xl-shrink-1 {\n    flex-shrink: 1 !important;\n  }\n  .webcg-devtools .justify-content-xl-start {\n    justify-content: flex-start !important;\n  }\n  .webcg-devtools .justify-content-xl-end {\n    justify-content: flex-end !important;\n  }\n  .webcg-devtools .justify-content-xl-center {\n    justify-content: center !important;\n  }\n  .webcg-devtools .justify-content-xl-between {\n    justify-content: space-between !important;\n  }\n  .webcg-devtools .justify-content-xl-around {\n    justify-content: space-around !important;\n  }\n  .webcg-devtools .align-items-xl-start {\n    align-items: flex-start !important;\n  }\n  .webcg-devtools .align-items-xl-end {\n    align-items: flex-end !important;\n  }\n  .webcg-devtools .align-items-xl-center {\n    align-items: center !important;\n  }\n  .webcg-devtools .align-items-xl-baseline {\n    align-items: baseline !important;\n  }\n  .webcg-devtools .align-items-xl-stretch {\n    align-items: stretch !important;\n  }\n  .webcg-devtools .align-content-xl-start {\n    align-content: flex-start !important;\n  }\n  .webcg-devtools .align-content-xl-end {\n    align-content: flex-end !important;\n  }\n  .webcg-devtools .align-content-xl-center {\n    align-content: center !important;\n  }\n  .webcg-devtools .align-content-xl-between {\n    align-content: space-between !important;\n  }\n  .webcg-devtools .align-content-xl-around {\n    align-content: space-around !important;\n  }\n  .webcg-devtools .align-content-xl-stretch {\n    align-content: stretch !important;\n  }\n  .webcg-devtools .align-self-xl-auto {\n    align-self: auto !important;\n  }\n  .webcg-devtools .align-self-xl-start {\n    align-self: flex-start !important;\n  }\n  .webcg-devtools .align-self-xl-end {\n    align-self: flex-end !important;\n  }\n  .webcg-devtools .align-self-xl-center {\n    align-self: center !important;\n  }\n  .webcg-devtools .align-self-xl-baseline {\n    align-self: baseline !important;\n  }\n  .webcg-devtools .align-self-xl-stretch {\n    align-self: stretch !important;\n  }\n}\n.webcg-devtools .float-left {\n  float: left !important;\n}\n.webcg-devtools .float-right {\n  float: right !important;\n}\n.webcg-devtools .float-none {\n  float: none !important;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .float-sm-left {\n    float: left !important;\n  }\n  .webcg-devtools .float-sm-right {\n    float: right !important;\n  }\n  .webcg-devtools .float-sm-none {\n    float: none !important;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .float-md-left {\n    float: left !important;\n  }\n  .webcg-devtools .float-md-right {\n    float: right !important;\n  }\n  .webcg-devtools .float-md-none {\n    float: none !important;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .float-lg-left {\n    float: left !important;\n  }\n  .webcg-devtools .float-lg-right {\n    float: right !important;\n  }\n  .webcg-devtools .float-lg-none {\n    float: none !important;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .float-xl-left {\n    float: left !important;\n  }\n  .webcg-devtools .float-xl-right {\n    float: right !important;\n  }\n  .webcg-devtools .float-xl-none {\n    float: none !important;\n  }\n}\n.webcg-devtools .overflow-auto {\n  overflow: auto !important;\n}\n.webcg-devtools .overflow-hidden {\n  overflow: hidden !important;\n}\n.webcg-devtools .position-static {\n  position: static !important;\n}\n.webcg-devtools .position-relative {\n  position: relative !important;\n}\n.webcg-devtools .position-absolute {\n  position: absolute !important;\n}\n.webcg-devtools .position-fixed {\n  position: fixed !important;\n}\n.webcg-devtools .position-sticky {\n  position: sticky !important;\n}\n.webcg-devtools .fixed-top {\n  position: fixed;\n  top: 0;\n  right: 0;\n  left: 0;\n  z-index: 1030;\n}\n.webcg-devtools .fixed-bottom {\n  position: fixed;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1030;\n}\n@supports (position: sticky) {\n  .webcg-devtools .sticky-top {\n    position: sticky;\n    top: 0;\n    z-index: 1020;\n  }\n}\n.webcg-devtools .sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n.webcg-devtools .sr-only-focusable:active, .webcg-devtools .sr-only-focusable:focus {\n  position: static;\n  width: auto;\n  height: auto;\n  overflow: visible;\n  clip: auto;\n  white-space: normal;\n}\n.webcg-devtools .shadow-sm {\n  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;\n}\n.webcg-devtools .shadow {\n  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;\n}\n.webcg-devtools .shadow-lg {\n  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;\n}\n.webcg-devtools .shadow-none {\n  box-shadow: none !important;\n}\n.webcg-devtools .w-25 {\n  width: 25% !important;\n}\n.webcg-devtools .w-50 {\n  width: 50% !important;\n}\n.webcg-devtools .w-75 {\n  width: 75% !important;\n}\n.webcg-devtools .w-100 {\n  width: 100% !important;\n}\n.webcg-devtools .w-auto {\n  width: auto !important;\n}\n.webcg-devtools .h-25 {\n  height: 25% !important;\n}\n.webcg-devtools .h-50 {\n  height: 50% !important;\n}\n.webcg-devtools .h-75 {\n  height: 75% !important;\n}\n.webcg-devtools .h-100 {\n  height: 100% !important;\n}\n.webcg-devtools .h-auto {\n  height: auto !important;\n}\n.webcg-devtools .mw-100 {\n  max-width: 100% !important;\n}\n.webcg-devtools .mh-100 {\n  max-height: 100% !important;\n}\n.webcg-devtools .min-vw-100 {\n  min-width: 100vw !important;\n}\n.webcg-devtools .min-vh-100 {\n  min-height: 100vh !important;\n}\n.webcg-devtools .vw-100 {\n  width: 100vw !important;\n}\n.webcg-devtools .vh-100 {\n  height: 100vh !important;\n}\n.webcg-devtools .stretched-link::after {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1;\n  pointer-events: auto;\n  content: \"\";\n  background-color: rgba(0, 0, 0, 0);\n}\n.webcg-devtools .m-0 {\n  margin: 0 !important;\n}\n.webcg-devtools .mt-0,\n.webcg-devtools .my-0 {\n  margin-top: 0 !important;\n}\n.webcg-devtools .mr-0,\n.webcg-devtools .mx-0 {\n  margin-right: 0 !important;\n}\n.webcg-devtools .mb-0,\n.webcg-devtools .my-0 {\n  margin-bottom: 0 !important;\n}\n.webcg-devtools .ml-0,\n.webcg-devtools .mx-0 {\n  margin-left: 0 !important;\n}\n.webcg-devtools .m-1 {\n  margin: 0.25rem !important;\n}\n.webcg-devtools .mt-1,\n.webcg-devtools .my-1 {\n  margin-top: 0.25rem !important;\n}\n.webcg-devtools .mr-1,\n.webcg-devtools .mx-1 {\n  margin-right: 0.25rem !important;\n}\n.webcg-devtools .mb-1,\n.webcg-devtools .my-1 {\n  margin-bottom: 0.25rem !important;\n}\n.webcg-devtools .ml-1,\n.webcg-devtools .mx-1 {\n  margin-left: 0.25rem !important;\n}\n.webcg-devtools .m-2 {\n  margin: 0.5rem !important;\n}\n.webcg-devtools .mt-2,\n.webcg-devtools .my-2 {\n  margin-top: 0.5rem !important;\n}\n.webcg-devtools .mr-2,\n.webcg-devtools .mx-2 {\n  margin-right: 0.5rem !important;\n}\n.webcg-devtools .mb-2,\n.webcg-devtools .my-2 {\n  margin-bottom: 0.5rem !important;\n}\n.webcg-devtools .ml-2,\n.webcg-devtools .mx-2 {\n  margin-left: 0.5rem !important;\n}\n.webcg-devtools .m-3 {\n  margin: 1rem !important;\n}\n.webcg-devtools .mt-3,\n.webcg-devtools .my-3 {\n  margin-top: 1rem !important;\n}\n.webcg-devtools .mr-3,\n.webcg-devtools .mx-3 {\n  margin-right: 1rem !important;\n}\n.webcg-devtools .mb-3,\n.webcg-devtools .my-3 {\n  margin-bottom: 1rem !important;\n}\n.webcg-devtools .ml-3,\n.webcg-devtools .mx-3 {\n  margin-left: 1rem !important;\n}\n.webcg-devtools .m-4 {\n  margin: 1.5rem !important;\n}\n.webcg-devtools .mt-4,\n.webcg-devtools .my-4 {\n  margin-top: 1.5rem !important;\n}\n.webcg-devtools .mr-4,\n.webcg-devtools .mx-4 {\n  margin-right: 1.5rem !important;\n}\n.webcg-devtools .mb-4,\n.webcg-devtools .my-4 {\n  margin-bottom: 1.5rem !important;\n}\n.webcg-devtools .ml-4,\n.webcg-devtools .mx-4 {\n  margin-left: 1.5rem !important;\n}\n.webcg-devtools .m-5 {\n  margin: 3rem !important;\n}\n.webcg-devtools .mt-5,\n.webcg-devtools .my-5 {\n  margin-top: 3rem !important;\n}\n.webcg-devtools .mr-5,\n.webcg-devtools .mx-5 {\n  margin-right: 3rem !important;\n}\n.webcg-devtools .mb-5,\n.webcg-devtools .my-5 {\n  margin-bottom: 3rem !important;\n}\n.webcg-devtools .ml-5,\n.webcg-devtools .mx-5 {\n  margin-left: 3rem !important;\n}\n.webcg-devtools .p-0 {\n  padding: 0 !important;\n}\n.webcg-devtools .pt-0,\n.webcg-devtools .py-0 {\n  padding-top: 0 !important;\n}\n.webcg-devtools .pr-0,\n.webcg-devtools .px-0 {\n  padding-right: 0 !important;\n}\n.webcg-devtools .pb-0,\n.webcg-devtools .py-0 {\n  padding-bottom: 0 !important;\n}\n.webcg-devtools .pl-0,\n.webcg-devtools .px-0 {\n  padding-left: 0 !important;\n}\n.webcg-devtools .p-1 {\n  padding: 0.25rem !important;\n}\n.webcg-devtools .pt-1,\n.webcg-devtools .py-1 {\n  padding-top: 0.25rem !important;\n}\n.webcg-devtools .pr-1,\n.webcg-devtools .px-1 {\n  padding-right: 0.25rem !important;\n}\n.webcg-devtools .pb-1,\n.webcg-devtools .py-1 {\n  padding-bottom: 0.25rem !important;\n}\n.webcg-devtools .pl-1,\n.webcg-devtools .px-1 {\n  padding-left: 0.25rem !important;\n}\n.webcg-devtools .p-2 {\n  padding: 0.5rem !important;\n}\n.webcg-devtools .pt-2,\n.webcg-devtools .py-2 {\n  padding-top: 0.5rem !important;\n}\n.webcg-devtools .pr-2,\n.webcg-devtools .px-2 {\n  padding-right: 0.5rem !important;\n}\n.webcg-devtools .pb-2,\n.webcg-devtools .py-2 {\n  padding-bottom: 0.5rem !important;\n}\n.webcg-devtools .pl-2,\n.webcg-devtools .px-2 {\n  padding-left: 0.5rem !important;\n}\n.webcg-devtools .p-3 {\n  padding: 1rem !important;\n}\n.webcg-devtools .pt-3,\n.webcg-devtools .py-3 {\n  padding-top: 1rem !important;\n}\n.webcg-devtools .pr-3,\n.webcg-devtools .px-3 {\n  padding-right: 1rem !important;\n}\n.webcg-devtools .pb-3,\n.webcg-devtools .py-3 {\n  padding-bottom: 1rem !important;\n}\n.webcg-devtools .pl-3,\n.webcg-devtools .px-3 {\n  padding-left: 1rem !important;\n}\n.webcg-devtools .p-4 {\n  padding: 1.5rem !important;\n}\n.webcg-devtools .pt-4,\n.webcg-devtools .py-4 {\n  padding-top: 1.5rem !important;\n}\n.webcg-devtools .pr-4,\n.webcg-devtools .px-4 {\n  padding-right: 1.5rem !important;\n}\n.webcg-devtools .pb-4,\n.webcg-devtools .py-4 {\n  padding-bottom: 1.5rem !important;\n}\n.webcg-devtools .pl-4,\n.webcg-devtools .px-4 {\n  padding-left: 1.5rem !important;\n}\n.webcg-devtools .p-5 {\n  padding: 3rem !important;\n}\n.webcg-devtools .pt-5,\n.webcg-devtools .py-5 {\n  padding-top: 3rem !important;\n}\n.webcg-devtools .pr-5,\n.webcg-devtools .px-5 {\n  padding-right: 3rem !important;\n}\n.webcg-devtools .pb-5,\n.webcg-devtools .py-5 {\n  padding-bottom: 3rem !important;\n}\n.webcg-devtools .pl-5,\n.webcg-devtools .px-5 {\n  padding-left: 3rem !important;\n}\n.webcg-devtools .m-n1 {\n  margin: -0.25rem !important;\n}\n.webcg-devtools .mt-n1,\n.webcg-devtools .my-n1 {\n  margin-top: -0.25rem !important;\n}\n.webcg-devtools .mr-n1,\n.webcg-devtools .mx-n1 {\n  margin-right: -0.25rem !important;\n}\n.webcg-devtools .mb-n1,\n.webcg-devtools .my-n1 {\n  margin-bottom: -0.25rem !important;\n}\n.webcg-devtools .ml-n1,\n.webcg-devtools .mx-n1 {\n  margin-left: -0.25rem !important;\n}\n.webcg-devtools .m-n2 {\n  margin: -0.5rem !important;\n}\n.webcg-devtools .mt-n2,\n.webcg-devtools .my-n2 {\n  margin-top: -0.5rem !important;\n}\n.webcg-devtools .mr-n2,\n.webcg-devtools .mx-n2 {\n  margin-right: -0.5rem !important;\n}\n.webcg-devtools .mb-n2,\n.webcg-devtools .my-n2 {\n  margin-bottom: -0.5rem !important;\n}\n.webcg-devtools .ml-n2,\n.webcg-devtools .mx-n2 {\n  margin-left: -0.5rem !important;\n}\n.webcg-devtools .m-n3 {\n  margin: -1rem !important;\n}\n.webcg-devtools .mt-n3,\n.webcg-devtools .my-n3 {\n  margin-top: -1rem !important;\n}\n.webcg-devtools .mr-n3,\n.webcg-devtools .mx-n3 {\n  margin-right: -1rem !important;\n}\n.webcg-devtools .mb-n3,\n.webcg-devtools .my-n3 {\n  margin-bottom: -1rem !important;\n}\n.webcg-devtools .ml-n3,\n.webcg-devtools .mx-n3 {\n  margin-left: -1rem !important;\n}\n.webcg-devtools .m-n4 {\n  margin: -1.5rem !important;\n}\n.webcg-devtools .mt-n4,\n.webcg-devtools .my-n4 {\n  margin-top: -1.5rem !important;\n}\n.webcg-devtools .mr-n4,\n.webcg-devtools .mx-n4 {\n  margin-right: -1.5rem !important;\n}\n.webcg-devtools .mb-n4,\n.webcg-devtools .my-n4 {\n  margin-bottom: -1.5rem !important;\n}\n.webcg-devtools .ml-n4,\n.webcg-devtools .mx-n4 {\n  margin-left: -1.5rem !important;\n}\n.webcg-devtools .m-n5 {\n  margin: -3rem !important;\n}\n.webcg-devtools .mt-n5,\n.webcg-devtools .my-n5 {\n  margin-top: -3rem !important;\n}\n.webcg-devtools .mr-n5,\n.webcg-devtools .mx-n5 {\n  margin-right: -3rem !important;\n}\n.webcg-devtools .mb-n5,\n.webcg-devtools .my-n5 {\n  margin-bottom: -3rem !important;\n}\n.webcg-devtools .ml-n5,\n.webcg-devtools .mx-n5 {\n  margin-left: -3rem !important;\n}\n.webcg-devtools .m-auto {\n  margin: auto !important;\n}\n.webcg-devtools .mt-auto,\n.webcg-devtools .my-auto {\n  margin-top: auto !important;\n}\n.webcg-devtools .mr-auto,\n.webcg-devtools .mx-auto {\n  margin-right: auto !important;\n}\n.webcg-devtools .mb-auto,\n.webcg-devtools .my-auto {\n  margin-bottom: auto !important;\n}\n.webcg-devtools .ml-auto,\n.webcg-devtools .mx-auto {\n  margin-left: auto !important;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .m-sm-0 {\n    margin: 0 !important;\n  }\n  .webcg-devtools .mt-sm-0,\n.webcg-devtools .my-sm-0 {\n    margin-top: 0 !important;\n  }\n  .webcg-devtools .mr-sm-0,\n.webcg-devtools .mx-sm-0 {\n    margin-right: 0 !important;\n  }\n  .webcg-devtools .mb-sm-0,\n.webcg-devtools .my-sm-0 {\n    margin-bottom: 0 !important;\n  }\n  .webcg-devtools .ml-sm-0,\n.webcg-devtools .mx-sm-0 {\n    margin-left: 0 !important;\n  }\n  .webcg-devtools .m-sm-1 {\n    margin: 0.25rem !important;\n  }\n  .webcg-devtools .mt-sm-1,\n.webcg-devtools .my-sm-1 {\n    margin-top: 0.25rem !important;\n  }\n  .webcg-devtools .mr-sm-1,\n.webcg-devtools .mx-sm-1 {\n    margin-right: 0.25rem !important;\n  }\n  .webcg-devtools .mb-sm-1,\n.webcg-devtools .my-sm-1 {\n    margin-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .ml-sm-1,\n.webcg-devtools .mx-sm-1 {\n    margin-left: 0.25rem !important;\n  }\n  .webcg-devtools .m-sm-2 {\n    margin: 0.5rem !important;\n  }\n  .webcg-devtools .mt-sm-2,\n.webcg-devtools .my-sm-2 {\n    margin-top: 0.5rem !important;\n  }\n  .webcg-devtools .mr-sm-2,\n.webcg-devtools .mx-sm-2 {\n    margin-right: 0.5rem !important;\n  }\n  .webcg-devtools .mb-sm-2,\n.webcg-devtools .my-sm-2 {\n    margin-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .ml-sm-2,\n.webcg-devtools .mx-sm-2 {\n    margin-left: 0.5rem !important;\n  }\n  .webcg-devtools .m-sm-3 {\n    margin: 1rem !important;\n  }\n  .webcg-devtools .mt-sm-3,\n.webcg-devtools .my-sm-3 {\n    margin-top: 1rem !important;\n  }\n  .webcg-devtools .mr-sm-3,\n.webcg-devtools .mx-sm-3 {\n    margin-right: 1rem !important;\n  }\n  .webcg-devtools .mb-sm-3,\n.webcg-devtools .my-sm-3 {\n    margin-bottom: 1rem !important;\n  }\n  .webcg-devtools .ml-sm-3,\n.webcg-devtools .mx-sm-3 {\n    margin-left: 1rem !important;\n  }\n  .webcg-devtools .m-sm-4 {\n    margin: 1.5rem !important;\n  }\n  .webcg-devtools .mt-sm-4,\n.webcg-devtools .my-sm-4 {\n    margin-top: 1.5rem !important;\n  }\n  .webcg-devtools .mr-sm-4,\n.webcg-devtools .mx-sm-4 {\n    margin-right: 1.5rem !important;\n  }\n  .webcg-devtools .mb-sm-4,\n.webcg-devtools .my-sm-4 {\n    margin-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .ml-sm-4,\n.webcg-devtools .mx-sm-4 {\n    margin-left: 1.5rem !important;\n  }\n  .webcg-devtools .m-sm-5 {\n    margin: 3rem !important;\n  }\n  .webcg-devtools .mt-sm-5,\n.webcg-devtools .my-sm-5 {\n    margin-top: 3rem !important;\n  }\n  .webcg-devtools .mr-sm-5,\n.webcg-devtools .mx-sm-5 {\n    margin-right: 3rem !important;\n  }\n  .webcg-devtools .mb-sm-5,\n.webcg-devtools .my-sm-5 {\n    margin-bottom: 3rem !important;\n  }\n  .webcg-devtools .ml-sm-5,\n.webcg-devtools .mx-sm-5 {\n    margin-left: 3rem !important;\n  }\n  .webcg-devtools .p-sm-0 {\n    padding: 0 !important;\n  }\n  .webcg-devtools .pt-sm-0,\n.webcg-devtools .py-sm-0 {\n    padding-top: 0 !important;\n  }\n  .webcg-devtools .pr-sm-0,\n.webcg-devtools .px-sm-0 {\n    padding-right: 0 !important;\n  }\n  .webcg-devtools .pb-sm-0,\n.webcg-devtools .py-sm-0 {\n    padding-bottom: 0 !important;\n  }\n  .webcg-devtools .pl-sm-0,\n.webcg-devtools .px-sm-0 {\n    padding-left: 0 !important;\n  }\n  .webcg-devtools .p-sm-1 {\n    padding: 0.25rem !important;\n  }\n  .webcg-devtools .pt-sm-1,\n.webcg-devtools .py-sm-1 {\n    padding-top: 0.25rem !important;\n  }\n  .webcg-devtools .pr-sm-1,\n.webcg-devtools .px-sm-1 {\n    padding-right: 0.25rem !important;\n  }\n  .webcg-devtools .pb-sm-1,\n.webcg-devtools .py-sm-1 {\n    padding-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .pl-sm-1,\n.webcg-devtools .px-sm-1 {\n    padding-left: 0.25rem !important;\n  }\n  .webcg-devtools .p-sm-2 {\n    padding: 0.5rem !important;\n  }\n  .webcg-devtools .pt-sm-2,\n.webcg-devtools .py-sm-2 {\n    padding-top: 0.5rem !important;\n  }\n  .webcg-devtools .pr-sm-2,\n.webcg-devtools .px-sm-2 {\n    padding-right: 0.5rem !important;\n  }\n  .webcg-devtools .pb-sm-2,\n.webcg-devtools .py-sm-2 {\n    padding-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .pl-sm-2,\n.webcg-devtools .px-sm-2 {\n    padding-left: 0.5rem !important;\n  }\n  .webcg-devtools .p-sm-3 {\n    padding: 1rem !important;\n  }\n  .webcg-devtools .pt-sm-3,\n.webcg-devtools .py-sm-3 {\n    padding-top: 1rem !important;\n  }\n  .webcg-devtools .pr-sm-3,\n.webcg-devtools .px-sm-3 {\n    padding-right: 1rem !important;\n  }\n  .webcg-devtools .pb-sm-3,\n.webcg-devtools .py-sm-3 {\n    padding-bottom: 1rem !important;\n  }\n  .webcg-devtools .pl-sm-3,\n.webcg-devtools .px-sm-3 {\n    padding-left: 1rem !important;\n  }\n  .webcg-devtools .p-sm-4 {\n    padding: 1.5rem !important;\n  }\n  .webcg-devtools .pt-sm-4,\n.webcg-devtools .py-sm-4 {\n    padding-top: 1.5rem !important;\n  }\n  .webcg-devtools .pr-sm-4,\n.webcg-devtools .px-sm-4 {\n    padding-right: 1.5rem !important;\n  }\n  .webcg-devtools .pb-sm-4,\n.webcg-devtools .py-sm-4 {\n    padding-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .pl-sm-4,\n.webcg-devtools .px-sm-4 {\n    padding-left: 1.5rem !important;\n  }\n  .webcg-devtools .p-sm-5 {\n    padding: 3rem !important;\n  }\n  .webcg-devtools .pt-sm-5,\n.webcg-devtools .py-sm-5 {\n    padding-top: 3rem !important;\n  }\n  .webcg-devtools .pr-sm-5,\n.webcg-devtools .px-sm-5 {\n    padding-right: 3rem !important;\n  }\n  .webcg-devtools .pb-sm-5,\n.webcg-devtools .py-sm-5 {\n    padding-bottom: 3rem !important;\n  }\n  .webcg-devtools .pl-sm-5,\n.webcg-devtools .px-sm-5 {\n    padding-left: 3rem !important;\n  }\n  .webcg-devtools .m-sm-n1 {\n    margin: -0.25rem !important;\n  }\n  .webcg-devtools .mt-sm-n1,\n.webcg-devtools .my-sm-n1 {\n    margin-top: -0.25rem !important;\n  }\n  .webcg-devtools .mr-sm-n1,\n.webcg-devtools .mx-sm-n1 {\n    margin-right: -0.25rem !important;\n  }\n  .webcg-devtools .mb-sm-n1,\n.webcg-devtools .my-sm-n1 {\n    margin-bottom: -0.25rem !important;\n  }\n  .webcg-devtools .ml-sm-n1,\n.webcg-devtools .mx-sm-n1 {\n    margin-left: -0.25rem !important;\n  }\n  .webcg-devtools .m-sm-n2 {\n    margin: -0.5rem !important;\n  }\n  .webcg-devtools .mt-sm-n2,\n.webcg-devtools .my-sm-n2 {\n    margin-top: -0.5rem !important;\n  }\n  .webcg-devtools .mr-sm-n2,\n.webcg-devtools .mx-sm-n2 {\n    margin-right: -0.5rem !important;\n  }\n  .webcg-devtools .mb-sm-n2,\n.webcg-devtools .my-sm-n2 {\n    margin-bottom: -0.5rem !important;\n  }\n  .webcg-devtools .ml-sm-n2,\n.webcg-devtools .mx-sm-n2 {\n    margin-left: -0.5rem !important;\n  }\n  .webcg-devtools .m-sm-n3 {\n    margin: -1rem !important;\n  }\n  .webcg-devtools .mt-sm-n3,\n.webcg-devtools .my-sm-n3 {\n    margin-top: -1rem !important;\n  }\n  .webcg-devtools .mr-sm-n3,\n.webcg-devtools .mx-sm-n3 {\n    margin-right: -1rem !important;\n  }\n  .webcg-devtools .mb-sm-n3,\n.webcg-devtools .my-sm-n3 {\n    margin-bottom: -1rem !important;\n  }\n  .webcg-devtools .ml-sm-n3,\n.webcg-devtools .mx-sm-n3 {\n    margin-left: -1rem !important;\n  }\n  .webcg-devtools .m-sm-n4 {\n    margin: -1.5rem !important;\n  }\n  .webcg-devtools .mt-sm-n4,\n.webcg-devtools .my-sm-n4 {\n    margin-top: -1.5rem !important;\n  }\n  .webcg-devtools .mr-sm-n4,\n.webcg-devtools .mx-sm-n4 {\n    margin-right: -1.5rem !important;\n  }\n  .webcg-devtools .mb-sm-n4,\n.webcg-devtools .my-sm-n4 {\n    margin-bottom: -1.5rem !important;\n  }\n  .webcg-devtools .ml-sm-n4,\n.webcg-devtools .mx-sm-n4 {\n    margin-left: -1.5rem !important;\n  }\n  .webcg-devtools .m-sm-n5 {\n    margin: -3rem !important;\n  }\n  .webcg-devtools .mt-sm-n5,\n.webcg-devtools .my-sm-n5 {\n    margin-top: -3rem !important;\n  }\n  .webcg-devtools .mr-sm-n5,\n.webcg-devtools .mx-sm-n5 {\n    margin-right: -3rem !important;\n  }\n  .webcg-devtools .mb-sm-n5,\n.webcg-devtools .my-sm-n5 {\n    margin-bottom: -3rem !important;\n  }\n  .webcg-devtools .ml-sm-n5,\n.webcg-devtools .mx-sm-n5 {\n    margin-left: -3rem !important;\n  }\n  .webcg-devtools .m-sm-auto {\n    margin: auto !important;\n  }\n  .webcg-devtools .mt-sm-auto,\n.webcg-devtools .my-sm-auto {\n    margin-top: auto !important;\n  }\n  .webcg-devtools .mr-sm-auto,\n.webcg-devtools .mx-sm-auto {\n    margin-right: auto !important;\n  }\n  .webcg-devtools .mb-sm-auto,\n.webcg-devtools .my-sm-auto {\n    margin-bottom: auto !important;\n  }\n  .webcg-devtools .ml-sm-auto,\n.webcg-devtools .mx-sm-auto {\n    margin-left: auto !important;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .m-md-0 {\n    margin: 0 !important;\n  }\n  .webcg-devtools .mt-md-0,\n.webcg-devtools .my-md-0 {\n    margin-top: 0 !important;\n  }\n  .webcg-devtools .mr-md-0,\n.webcg-devtools .mx-md-0 {\n    margin-right: 0 !important;\n  }\n  .webcg-devtools .mb-md-0,\n.webcg-devtools .my-md-0 {\n    margin-bottom: 0 !important;\n  }\n  .webcg-devtools .ml-md-0,\n.webcg-devtools .mx-md-0 {\n    margin-left: 0 !important;\n  }\n  .webcg-devtools .m-md-1 {\n    margin: 0.25rem !important;\n  }\n  .webcg-devtools .mt-md-1,\n.webcg-devtools .my-md-1 {\n    margin-top: 0.25rem !important;\n  }\n  .webcg-devtools .mr-md-1,\n.webcg-devtools .mx-md-1 {\n    margin-right: 0.25rem !important;\n  }\n  .webcg-devtools .mb-md-1,\n.webcg-devtools .my-md-1 {\n    margin-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .ml-md-1,\n.webcg-devtools .mx-md-1 {\n    margin-left: 0.25rem !important;\n  }\n  .webcg-devtools .m-md-2 {\n    margin: 0.5rem !important;\n  }\n  .webcg-devtools .mt-md-2,\n.webcg-devtools .my-md-2 {\n    margin-top: 0.5rem !important;\n  }\n  .webcg-devtools .mr-md-2,\n.webcg-devtools .mx-md-2 {\n    margin-right: 0.5rem !important;\n  }\n  .webcg-devtools .mb-md-2,\n.webcg-devtools .my-md-2 {\n    margin-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .ml-md-2,\n.webcg-devtools .mx-md-2 {\n    margin-left: 0.5rem !important;\n  }\n  .webcg-devtools .m-md-3 {\n    margin: 1rem !important;\n  }\n  .webcg-devtools .mt-md-3,\n.webcg-devtools .my-md-3 {\n    margin-top: 1rem !important;\n  }\n  .webcg-devtools .mr-md-3,\n.webcg-devtools .mx-md-3 {\n    margin-right: 1rem !important;\n  }\n  .webcg-devtools .mb-md-3,\n.webcg-devtools .my-md-3 {\n    margin-bottom: 1rem !important;\n  }\n  .webcg-devtools .ml-md-3,\n.webcg-devtools .mx-md-3 {\n    margin-left: 1rem !important;\n  }\n  .webcg-devtools .m-md-4 {\n    margin: 1.5rem !important;\n  }\n  .webcg-devtools .mt-md-4,\n.webcg-devtools .my-md-4 {\n    margin-top: 1.5rem !important;\n  }\n  .webcg-devtools .mr-md-4,\n.webcg-devtools .mx-md-4 {\n    margin-right: 1.5rem !important;\n  }\n  .webcg-devtools .mb-md-4,\n.webcg-devtools .my-md-4 {\n    margin-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .ml-md-4,\n.webcg-devtools .mx-md-4 {\n    margin-left: 1.5rem !important;\n  }\n  .webcg-devtools .m-md-5 {\n    margin: 3rem !important;\n  }\n  .webcg-devtools .mt-md-5,\n.webcg-devtools .my-md-5 {\n    margin-top: 3rem !important;\n  }\n  .webcg-devtools .mr-md-5,\n.webcg-devtools .mx-md-5 {\n    margin-right: 3rem !important;\n  }\n  .webcg-devtools .mb-md-5,\n.webcg-devtools .my-md-5 {\n    margin-bottom: 3rem !important;\n  }\n  .webcg-devtools .ml-md-5,\n.webcg-devtools .mx-md-5 {\n    margin-left: 3rem !important;\n  }\n  .webcg-devtools .p-md-0 {\n    padding: 0 !important;\n  }\n  .webcg-devtools .pt-md-0,\n.webcg-devtools .py-md-0 {\n    padding-top: 0 !important;\n  }\n  .webcg-devtools .pr-md-0,\n.webcg-devtools .px-md-0 {\n    padding-right: 0 !important;\n  }\n  .webcg-devtools .pb-md-0,\n.webcg-devtools .py-md-0 {\n    padding-bottom: 0 !important;\n  }\n  .webcg-devtools .pl-md-0,\n.webcg-devtools .px-md-0 {\n    padding-left: 0 !important;\n  }\n  .webcg-devtools .p-md-1 {\n    padding: 0.25rem !important;\n  }\n  .webcg-devtools .pt-md-1,\n.webcg-devtools .py-md-1 {\n    padding-top: 0.25rem !important;\n  }\n  .webcg-devtools .pr-md-1,\n.webcg-devtools .px-md-1 {\n    padding-right: 0.25rem !important;\n  }\n  .webcg-devtools .pb-md-1,\n.webcg-devtools .py-md-1 {\n    padding-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .pl-md-1,\n.webcg-devtools .px-md-1 {\n    padding-left: 0.25rem !important;\n  }\n  .webcg-devtools .p-md-2 {\n    padding: 0.5rem !important;\n  }\n  .webcg-devtools .pt-md-2,\n.webcg-devtools .py-md-2 {\n    padding-top: 0.5rem !important;\n  }\n  .webcg-devtools .pr-md-2,\n.webcg-devtools .px-md-2 {\n    padding-right: 0.5rem !important;\n  }\n  .webcg-devtools .pb-md-2,\n.webcg-devtools .py-md-2 {\n    padding-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .pl-md-2,\n.webcg-devtools .px-md-2 {\n    padding-left: 0.5rem !important;\n  }\n  .webcg-devtools .p-md-3 {\n    padding: 1rem !important;\n  }\n  .webcg-devtools .pt-md-3,\n.webcg-devtools .py-md-3 {\n    padding-top: 1rem !important;\n  }\n  .webcg-devtools .pr-md-3,\n.webcg-devtools .px-md-3 {\n    padding-right: 1rem !important;\n  }\n  .webcg-devtools .pb-md-3,\n.webcg-devtools .py-md-3 {\n    padding-bottom: 1rem !important;\n  }\n  .webcg-devtools .pl-md-3,\n.webcg-devtools .px-md-3 {\n    padding-left: 1rem !important;\n  }\n  .webcg-devtools .p-md-4 {\n    padding: 1.5rem !important;\n  }\n  .webcg-devtools .pt-md-4,\n.webcg-devtools .py-md-4 {\n    padding-top: 1.5rem !important;\n  }\n  .webcg-devtools .pr-md-4,\n.webcg-devtools .px-md-4 {\n    padding-right: 1.5rem !important;\n  }\n  .webcg-devtools .pb-md-4,\n.webcg-devtools .py-md-4 {\n    padding-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .pl-md-4,\n.webcg-devtools .px-md-4 {\n    padding-left: 1.5rem !important;\n  }\n  .webcg-devtools .p-md-5 {\n    padding: 3rem !important;\n  }\n  .webcg-devtools .pt-md-5,\n.webcg-devtools .py-md-5 {\n    padding-top: 3rem !important;\n  }\n  .webcg-devtools .pr-md-5,\n.webcg-devtools .px-md-5 {\n    padding-right: 3rem !important;\n  }\n  .webcg-devtools .pb-md-5,\n.webcg-devtools .py-md-5 {\n    padding-bottom: 3rem !important;\n  }\n  .webcg-devtools .pl-md-5,\n.webcg-devtools .px-md-5 {\n    padding-left: 3rem !important;\n  }\n  .webcg-devtools .m-md-n1 {\n    margin: -0.25rem !important;\n  }\n  .webcg-devtools .mt-md-n1,\n.webcg-devtools .my-md-n1 {\n    margin-top: -0.25rem !important;\n  }\n  .webcg-devtools .mr-md-n1,\n.webcg-devtools .mx-md-n1 {\n    margin-right: -0.25rem !important;\n  }\n  .webcg-devtools .mb-md-n1,\n.webcg-devtools .my-md-n1 {\n    margin-bottom: -0.25rem !important;\n  }\n  .webcg-devtools .ml-md-n1,\n.webcg-devtools .mx-md-n1 {\n    margin-left: -0.25rem !important;\n  }\n  .webcg-devtools .m-md-n2 {\n    margin: -0.5rem !important;\n  }\n  .webcg-devtools .mt-md-n2,\n.webcg-devtools .my-md-n2 {\n    margin-top: -0.5rem !important;\n  }\n  .webcg-devtools .mr-md-n2,\n.webcg-devtools .mx-md-n2 {\n    margin-right: -0.5rem !important;\n  }\n  .webcg-devtools .mb-md-n2,\n.webcg-devtools .my-md-n2 {\n    margin-bottom: -0.5rem !important;\n  }\n  .webcg-devtools .ml-md-n2,\n.webcg-devtools .mx-md-n2 {\n    margin-left: -0.5rem !important;\n  }\n  .webcg-devtools .m-md-n3 {\n    margin: -1rem !important;\n  }\n  .webcg-devtools .mt-md-n3,\n.webcg-devtools .my-md-n3 {\n    margin-top: -1rem !important;\n  }\n  .webcg-devtools .mr-md-n3,\n.webcg-devtools .mx-md-n3 {\n    margin-right: -1rem !important;\n  }\n  .webcg-devtools .mb-md-n3,\n.webcg-devtools .my-md-n3 {\n    margin-bottom: -1rem !important;\n  }\n  .webcg-devtools .ml-md-n3,\n.webcg-devtools .mx-md-n3 {\n    margin-left: -1rem !important;\n  }\n  .webcg-devtools .m-md-n4 {\n    margin: -1.5rem !important;\n  }\n  .webcg-devtools .mt-md-n4,\n.webcg-devtools .my-md-n4 {\n    margin-top: -1.5rem !important;\n  }\n  .webcg-devtools .mr-md-n4,\n.webcg-devtools .mx-md-n4 {\n    margin-right: -1.5rem !important;\n  }\n  .webcg-devtools .mb-md-n4,\n.webcg-devtools .my-md-n4 {\n    margin-bottom: -1.5rem !important;\n  }\n  .webcg-devtools .ml-md-n4,\n.webcg-devtools .mx-md-n4 {\n    margin-left: -1.5rem !important;\n  }\n  .webcg-devtools .m-md-n5 {\n    margin: -3rem !important;\n  }\n  .webcg-devtools .mt-md-n5,\n.webcg-devtools .my-md-n5 {\n    margin-top: -3rem !important;\n  }\n  .webcg-devtools .mr-md-n5,\n.webcg-devtools .mx-md-n5 {\n    margin-right: -3rem !important;\n  }\n  .webcg-devtools .mb-md-n5,\n.webcg-devtools .my-md-n5 {\n    margin-bottom: -3rem !important;\n  }\n  .webcg-devtools .ml-md-n5,\n.webcg-devtools .mx-md-n5 {\n    margin-left: -3rem !important;\n  }\n  .webcg-devtools .m-md-auto {\n    margin: auto !important;\n  }\n  .webcg-devtools .mt-md-auto,\n.webcg-devtools .my-md-auto {\n    margin-top: auto !important;\n  }\n  .webcg-devtools .mr-md-auto,\n.webcg-devtools .mx-md-auto {\n    margin-right: auto !important;\n  }\n  .webcg-devtools .mb-md-auto,\n.webcg-devtools .my-md-auto {\n    margin-bottom: auto !important;\n  }\n  .webcg-devtools .ml-md-auto,\n.webcg-devtools .mx-md-auto {\n    margin-left: auto !important;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .m-lg-0 {\n    margin: 0 !important;\n  }\n  .webcg-devtools .mt-lg-0,\n.webcg-devtools .my-lg-0 {\n    margin-top: 0 !important;\n  }\n  .webcg-devtools .mr-lg-0,\n.webcg-devtools .mx-lg-0 {\n    margin-right: 0 !important;\n  }\n  .webcg-devtools .mb-lg-0,\n.webcg-devtools .my-lg-0 {\n    margin-bottom: 0 !important;\n  }\n  .webcg-devtools .ml-lg-0,\n.webcg-devtools .mx-lg-0 {\n    margin-left: 0 !important;\n  }\n  .webcg-devtools .m-lg-1 {\n    margin: 0.25rem !important;\n  }\n  .webcg-devtools .mt-lg-1,\n.webcg-devtools .my-lg-1 {\n    margin-top: 0.25rem !important;\n  }\n  .webcg-devtools .mr-lg-1,\n.webcg-devtools .mx-lg-1 {\n    margin-right: 0.25rem !important;\n  }\n  .webcg-devtools .mb-lg-1,\n.webcg-devtools .my-lg-1 {\n    margin-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .ml-lg-1,\n.webcg-devtools .mx-lg-1 {\n    margin-left: 0.25rem !important;\n  }\n  .webcg-devtools .m-lg-2 {\n    margin: 0.5rem !important;\n  }\n  .webcg-devtools .mt-lg-2,\n.webcg-devtools .my-lg-2 {\n    margin-top: 0.5rem !important;\n  }\n  .webcg-devtools .mr-lg-2,\n.webcg-devtools .mx-lg-2 {\n    margin-right: 0.5rem !important;\n  }\n  .webcg-devtools .mb-lg-2,\n.webcg-devtools .my-lg-2 {\n    margin-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .ml-lg-2,\n.webcg-devtools .mx-lg-2 {\n    margin-left: 0.5rem !important;\n  }\n  .webcg-devtools .m-lg-3 {\n    margin: 1rem !important;\n  }\n  .webcg-devtools .mt-lg-3,\n.webcg-devtools .my-lg-3 {\n    margin-top: 1rem !important;\n  }\n  .webcg-devtools .mr-lg-3,\n.webcg-devtools .mx-lg-3 {\n    margin-right: 1rem !important;\n  }\n  .webcg-devtools .mb-lg-3,\n.webcg-devtools .my-lg-3 {\n    margin-bottom: 1rem !important;\n  }\n  .webcg-devtools .ml-lg-3,\n.webcg-devtools .mx-lg-3 {\n    margin-left: 1rem !important;\n  }\n  .webcg-devtools .m-lg-4 {\n    margin: 1.5rem !important;\n  }\n  .webcg-devtools .mt-lg-4,\n.webcg-devtools .my-lg-4 {\n    margin-top: 1.5rem !important;\n  }\n  .webcg-devtools .mr-lg-4,\n.webcg-devtools .mx-lg-4 {\n    margin-right: 1.5rem !important;\n  }\n  .webcg-devtools .mb-lg-4,\n.webcg-devtools .my-lg-4 {\n    margin-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .ml-lg-4,\n.webcg-devtools .mx-lg-4 {\n    margin-left: 1.5rem !important;\n  }\n  .webcg-devtools .m-lg-5 {\n    margin: 3rem !important;\n  }\n  .webcg-devtools .mt-lg-5,\n.webcg-devtools .my-lg-5 {\n    margin-top: 3rem !important;\n  }\n  .webcg-devtools .mr-lg-5,\n.webcg-devtools .mx-lg-5 {\n    margin-right: 3rem !important;\n  }\n  .webcg-devtools .mb-lg-5,\n.webcg-devtools .my-lg-5 {\n    margin-bottom: 3rem !important;\n  }\n  .webcg-devtools .ml-lg-5,\n.webcg-devtools .mx-lg-5 {\n    margin-left: 3rem !important;\n  }\n  .webcg-devtools .p-lg-0 {\n    padding: 0 !important;\n  }\n  .webcg-devtools .pt-lg-0,\n.webcg-devtools .py-lg-0 {\n    padding-top: 0 !important;\n  }\n  .webcg-devtools .pr-lg-0,\n.webcg-devtools .px-lg-0 {\n    padding-right: 0 !important;\n  }\n  .webcg-devtools .pb-lg-0,\n.webcg-devtools .py-lg-0 {\n    padding-bottom: 0 !important;\n  }\n  .webcg-devtools .pl-lg-0,\n.webcg-devtools .px-lg-0 {\n    padding-left: 0 !important;\n  }\n  .webcg-devtools .p-lg-1 {\n    padding: 0.25rem !important;\n  }\n  .webcg-devtools .pt-lg-1,\n.webcg-devtools .py-lg-1 {\n    padding-top: 0.25rem !important;\n  }\n  .webcg-devtools .pr-lg-1,\n.webcg-devtools .px-lg-1 {\n    padding-right: 0.25rem !important;\n  }\n  .webcg-devtools .pb-lg-1,\n.webcg-devtools .py-lg-1 {\n    padding-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .pl-lg-1,\n.webcg-devtools .px-lg-1 {\n    padding-left: 0.25rem !important;\n  }\n  .webcg-devtools .p-lg-2 {\n    padding: 0.5rem !important;\n  }\n  .webcg-devtools .pt-lg-2,\n.webcg-devtools .py-lg-2 {\n    padding-top: 0.5rem !important;\n  }\n  .webcg-devtools .pr-lg-2,\n.webcg-devtools .px-lg-2 {\n    padding-right: 0.5rem !important;\n  }\n  .webcg-devtools .pb-lg-2,\n.webcg-devtools .py-lg-2 {\n    padding-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .pl-lg-2,\n.webcg-devtools .px-lg-2 {\n    padding-left: 0.5rem !important;\n  }\n  .webcg-devtools .p-lg-3 {\n    padding: 1rem !important;\n  }\n  .webcg-devtools .pt-lg-3,\n.webcg-devtools .py-lg-3 {\n    padding-top: 1rem !important;\n  }\n  .webcg-devtools .pr-lg-3,\n.webcg-devtools .px-lg-3 {\n    padding-right: 1rem !important;\n  }\n  .webcg-devtools .pb-lg-3,\n.webcg-devtools .py-lg-3 {\n    padding-bottom: 1rem !important;\n  }\n  .webcg-devtools .pl-lg-3,\n.webcg-devtools .px-lg-3 {\n    padding-left: 1rem !important;\n  }\n  .webcg-devtools .p-lg-4 {\n    padding: 1.5rem !important;\n  }\n  .webcg-devtools .pt-lg-4,\n.webcg-devtools .py-lg-4 {\n    padding-top: 1.5rem !important;\n  }\n  .webcg-devtools .pr-lg-4,\n.webcg-devtools .px-lg-4 {\n    padding-right: 1.5rem !important;\n  }\n  .webcg-devtools .pb-lg-4,\n.webcg-devtools .py-lg-4 {\n    padding-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .pl-lg-4,\n.webcg-devtools .px-lg-4 {\n    padding-left: 1.5rem !important;\n  }\n  .webcg-devtools .p-lg-5 {\n    padding: 3rem !important;\n  }\n  .webcg-devtools .pt-lg-5,\n.webcg-devtools .py-lg-5 {\n    padding-top: 3rem !important;\n  }\n  .webcg-devtools .pr-lg-5,\n.webcg-devtools .px-lg-5 {\n    padding-right: 3rem !important;\n  }\n  .webcg-devtools .pb-lg-5,\n.webcg-devtools .py-lg-5 {\n    padding-bottom: 3rem !important;\n  }\n  .webcg-devtools .pl-lg-5,\n.webcg-devtools .px-lg-5 {\n    padding-left: 3rem !important;\n  }\n  .webcg-devtools .m-lg-n1 {\n    margin: -0.25rem !important;\n  }\n  .webcg-devtools .mt-lg-n1,\n.webcg-devtools .my-lg-n1 {\n    margin-top: -0.25rem !important;\n  }\n  .webcg-devtools .mr-lg-n1,\n.webcg-devtools .mx-lg-n1 {\n    margin-right: -0.25rem !important;\n  }\n  .webcg-devtools .mb-lg-n1,\n.webcg-devtools .my-lg-n1 {\n    margin-bottom: -0.25rem !important;\n  }\n  .webcg-devtools .ml-lg-n1,\n.webcg-devtools .mx-lg-n1 {\n    margin-left: -0.25rem !important;\n  }\n  .webcg-devtools .m-lg-n2 {\n    margin: -0.5rem !important;\n  }\n  .webcg-devtools .mt-lg-n2,\n.webcg-devtools .my-lg-n2 {\n    margin-top: -0.5rem !important;\n  }\n  .webcg-devtools .mr-lg-n2,\n.webcg-devtools .mx-lg-n2 {\n    margin-right: -0.5rem !important;\n  }\n  .webcg-devtools .mb-lg-n2,\n.webcg-devtools .my-lg-n2 {\n    margin-bottom: -0.5rem !important;\n  }\n  .webcg-devtools .ml-lg-n2,\n.webcg-devtools .mx-lg-n2 {\n    margin-left: -0.5rem !important;\n  }\n  .webcg-devtools .m-lg-n3 {\n    margin: -1rem !important;\n  }\n  .webcg-devtools .mt-lg-n3,\n.webcg-devtools .my-lg-n3 {\n    margin-top: -1rem !important;\n  }\n  .webcg-devtools .mr-lg-n3,\n.webcg-devtools .mx-lg-n3 {\n    margin-right: -1rem !important;\n  }\n  .webcg-devtools .mb-lg-n3,\n.webcg-devtools .my-lg-n3 {\n    margin-bottom: -1rem !important;\n  }\n  .webcg-devtools .ml-lg-n3,\n.webcg-devtools .mx-lg-n3 {\n    margin-left: -1rem !important;\n  }\n  .webcg-devtools .m-lg-n4 {\n    margin: -1.5rem !important;\n  }\n  .webcg-devtools .mt-lg-n4,\n.webcg-devtools .my-lg-n4 {\n    margin-top: -1.5rem !important;\n  }\n  .webcg-devtools .mr-lg-n4,\n.webcg-devtools .mx-lg-n4 {\n    margin-right: -1.5rem !important;\n  }\n  .webcg-devtools .mb-lg-n4,\n.webcg-devtools .my-lg-n4 {\n    margin-bottom: -1.5rem !important;\n  }\n  .webcg-devtools .ml-lg-n4,\n.webcg-devtools .mx-lg-n4 {\n    margin-left: -1.5rem !important;\n  }\n  .webcg-devtools .m-lg-n5 {\n    margin: -3rem !important;\n  }\n  .webcg-devtools .mt-lg-n5,\n.webcg-devtools .my-lg-n5 {\n    margin-top: -3rem !important;\n  }\n  .webcg-devtools .mr-lg-n5,\n.webcg-devtools .mx-lg-n5 {\n    margin-right: -3rem !important;\n  }\n  .webcg-devtools .mb-lg-n5,\n.webcg-devtools .my-lg-n5 {\n    margin-bottom: -3rem !important;\n  }\n  .webcg-devtools .ml-lg-n5,\n.webcg-devtools .mx-lg-n5 {\n    margin-left: -3rem !important;\n  }\n  .webcg-devtools .m-lg-auto {\n    margin: auto !important;\n  }\n  .webcg-devtools .mt-lg-auto,\n.webcg-devtools .my-lg-auto {\n    margin-top: auto !important;\n  }\n  .webcg-devtools .mr-lg-auto,\n.webcg-devtools .mx-lg-auto {\n    margin-right: auto !important;\n  }\n  .webcg-devtools .mb-lg-auto,\n.webcg-devtools .my-lg-auto {\n    margin-bottom: auto !important;\n  }\n  .webcg-devtools .ml-lg-auto,\n.webcg-devtools .mx-lg-auto {\n    margin-left: auto !important;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .m-xl-0 {\n    margin: 0 !important;\n  }\n  .webcg-devtools .mt-xl-0,\n.webcg-devtools .my-xl-0 {\n    margin-top: 0 !important;\n  }\n  .webcg-devtools .mr-xl-0,\n.webcg-devtools .mx-xl-0 {\n    margin-right: 0 !important;\n  }\n  .webcg-devtools .mb-xl-0,\n.webcg-devtools .my-xl-0 {\n    margin-bottom: 0 !important;\n  }\n  .webcg-devtools .ml-xl-0,\n.webcg-devtools .mx-xl-0 {\n    margin-left: 0 !important;\n  }\n  .webcg-devtools .m-xl-1 {\n    margin: 0.25rem !important;\n  }\n  .webcg-devtools .mt-xl-1,\n.webcg-devtools .my-xl-1 {\n    margin-top: 0.25rem !important;\n  }\n  .webcg-devtools .mr-xl-1,\n.webcg-devtools .mx-xl-1 {\n    margin-right: 0.25rem !important;\n  }\n  .webcg-devtools .mb-xl-1,\n.webcg-devtools .my-xl-1 {\n    margin-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .ml-xl-1,\n.webcg-devtools .mx-xl-1 {\n    margin-left: 0.25rem !important;\n  }\n  .webcg-devtools .m-xl-2 {\n    margin: 0.5rem !important;\n  }\n  .webcg-devtools .mt-xl-2,\n.webcg-devtools .my-xl-2 {\n    margin-top: 0.5rem !important;\n  }\n  .webcg-devtools .mr-xl-2,\n.webcg-devtools .mx-xl-2 {\n    margin-right: 0.5rem !important;\n  }\n  .webcg-devtools .mb-xl-2,\n.webcg-devtools .my-xl-2 {\n    margin-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .ml-xl-2,\n.webcg-devtools .mx-xl-2 {\n    margin-left: 0.5rem !important;\n  }\n  .webcg-devtools .m-xl-3 {\n    margin: 1rem !important;\n  }\n  .webcg-devtools .mt-xl-3,\n.webcg-devtools .my-xl-3 {\n    margin-top: 1rem !important;\n  }\n  .webcg-devtools .mr-xl-3,\n.webcg-devtools .mx-xl-3 {\n    margin-right: 1rem !important;\n  }\n  .webcg-devtools .mb-xl-3,\n.webcg-devtools .my-xl-3 {\n    margin-bottom: 1rem !important;\n  }\n  .webcg-devtools .ml-xl-3,\n.webcg-devtools .mx-xl-3 {\n    margin-left: 1rem !important;\n  }\n  .webcg-devtools .m-xl-4 {\n    margin: 1.5rem !important;\n  }\n  .webcg-devtools .mt-xl-4,\n.webcg-devtools .my-xl-4 {\n    margin-top: 1.5rem !important;\n  }\n  .webcg-devtools .mr-xl-4,\n.webcg-devtools .mx-xl-4 {\n    margin-right: 1.5rem !important;\n  }\n  .webcg-devtools .mb-xl-4,\n.webcg-devtools .my-xl-4 {\n    margin-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .ml-xl-4,\n.webcg-devtools .mx-xl-4 {\n    margin-left: 1.5rem !important;\n  }\n  .webcg-devtools .m-xl-5 {\n    margin: 3rem !important;\n  }\n  .webcg-devtools .mt-xl-5,\n.webcg-devtools .my-xl-5 {\n    margin-top: 3rem !important;\n  }\n  .webcg-devtools .mr-xl-5,\n.webcg-devtools .mx-xl-5 {\n    margin-right: 3rem !important;\n  }\n  .webcg-devtools .mb-xl-5,\n.webcg-devtools .my-xl-5 {\n    margin-bottom: 3rem !important;\n  }\n  .webcg-devtools .ml-xl-5,\n.webcg-devtools .mx-xl-5 {\n    margin-left: 3rem !important;\n  }\n  .webcg-devtools .p-xl-0 {\n    padding: 0 !important;\n  }\n  .webcg-devtools .pt-xl-0,\n.webcg-devtools .py-xl-0 {\n    padding-top: 0 !important;\n  }\n  .webcg-devtools .pr-xl-0,\n.webcg-devtools .px-xl-0 {\n    padding-right: 0 !important;\n  }\n  .webcg-devtools .pb-xl-0,\n.webcg-devtools .py-xl-0 {\n    padding-bottom: 0 !important;\n  }\n  .webcg-devtools .pl-xl-0,\n.webcg-devtools .px-xl-0 {\n    padding-left: 0 !important;\n  }\n  .webcg-devtools .p-xl-1 {\n    padding: 0.25rem !important;\n  }\n  .webcg-devtools .pt-xl-1,\n.webcg-devtools .py-xl-1 {\n    padding-top: 0.25rem !important;\n  }\n  .webcg-devtools .pr-xl-1,\n.webcg-devtools .px-xl-1 {\n    padding-right: 0.25rem !important;\n  }\n  .webcg-devtools .pb-xl-1,\n.webcg-devtools .py-xl-1 {\n    padding-bottom: 0.25rem !important;\n  }\n  .webcg-devtools .pl-xl-1,\n.webcg-devtools .px-xl-1 {\n    padding-left: 0.25rem !important;\n  }\n  .webcg-devtools .p-xl-2 {\n    padding: 0.5rem !important;\n  }\n  .webcg-devtools .pt-xl-2,\n.webcg-devtools .py-xl-2 {\n    padding-top: 0.5rem !important;\n  }\n  .webcg-devtools .pr-xl-2,\n.webcg-devtools .px-xl-2 {\n    padding-right: 0.5rem !important;\n  }\n  .webcg-devtools .pb-xl-2,\n.webcg-devtools .py-xl-2 {\n    padding-bottom: 0.5rem !important;\n  }\n  .webcg-devtools .pl-xl-2,\n.webcg-devtools .px-xl-2 {\n    padding-left: 0.5rem !important;\n  }\n  .webcg-devtools .p-xl-3 {\n    padding: 1rem !important;\n  }\n  .webcg-devtools .pt-xl-3,\n.webcg-devtools .py-xl-3 {\n    padding-top: 1rem !important;\n  }\n  .webcg-devtools .pr-xl-3,\n.webcg-devtools .px-xl-3 {\n    padding-right: 1rem !important;\n  }\n  .webcg-devtools .pb-xl-3,\n.webcg-devtools .py-xl-3 {\n    padding-bottom: 1rem !important;\n  }\n  .webcg-devtools .pl-xl-3,\n.webcg-devtools .px-xl-3 {\n    padding-left: 1rem !important;\n  }\n  .webcg-devtools .p-xl-4 {\n    padding: 1.5rem !important;\n  }\n  .webcg-devtools .pt-xl-4,\n.webcg-devtools .py-xl-4 {\n    padding-top: 1.5rem !important;\n  }\n  .webcg-devtools .pr-xl-4,\n.webcg-devtools .px-xl-4 {\n    padding-right: 1.5rem !important;\n  }\n  .webcg-devtools .pb-xl-4,\n.webcg-devtools .py-xl-4 {\n    padding-bottom: 1.5rem !important;\n  }\n  .webcg-devtools .pl-xl-4,\n.webcg-devtools .px-xl-4 {\n    padding-left: 1.5rem !important;\n  }\n  .webcg-devtools .p-xl-5 {\n    padding: 3rem !important;\n  }\n  .webcg-devtools .pt-xl-5,\n.webcg-devtools .py-xl-5 {\n    padding-top: 3rem !important;\n  }\n  .webcg-devtools .pr-xl-5,\n.webcg-devtools .px-xl-5 {\n    padding-right: 3rem !important;\n  }\n  .webcg-devtools .pb-xl-5,\n.webcg-devtools .py-xl-5 {\n    padding-bottom: 3rem !important;\n  }\n  .webcg-devtools .pl-xl-5,\n.webcg-devtools .px-xl-5 {\n    padding-left: 3rem !important;\n  }\n  .webcg-devtools .m-xl-n1 {\n    margin: -0.25rem !important;\n  }\n  .webcg-devtools .mt-xl-n1,\n.webcg-devtools .my-xl-n1 {\n    margin-top: -0.25rem !important;\n  }\n  .webcg-devtools .mr-xl-n1,\n.webcg-devtools .mx-xl-n1 {\n    margin-right: -0.25rem !important;\n  }\n  .webcg-devtools .mb-xl-n1,\n.webcg-devtools .my-xl-n1 {\n    margin-bottom: -0.25rem !important;\n  }\n  .webcg-devtools .ml-xl-n1,\n.webcg-devtools .mx-xl-n1 {\n    margin-left: -0.25rem !important;\n  }\n  .webcg-devtools .m-xl-n2 {\n    margin: -0.5rem !important;\n  }\n  .webcg-devtools .mt-xl-n2,\n.webcg-devtools .my-xl-n2 {\n    margin-top: -0.5rem !important;\n  }\n  .webcg-devtools .mr-xl-n2,\n.webcg-devtools .mx-xl-n2 {\n    margin-right: -0.5rem !important;\n  }\n  .webcg-devtools .mb-xl-n2,\n.webcg-devtools .my-xl-n2 {\n    margin-bottom: -0.5rem !important;\n  }\n  .webcg-devtools .ml-xl-n2,\n.webcg-devtools .mx-xl-n2 {\n    margin-left: -0.5rem !important;\n  }\n  .webcg-devtools .m-xl-n3 {\n    margin: -1rem !important;\n  }\n  .webcg-devtools .mt-xl-n3,\n.webcg-devtools .my-xl-n3 {\n    margin-top: -1rem !important;\n  }\n  .webcg-devtools .mr-xl-n3,\n.webcg-devtools .mx-xl-n3 {\n    margin-right: -1rem !important;\n  }\n  .webcg-devtools .mb-xl-n3,\n.webcg-devtools .my-xl-n3 {\n    margin-bottom: -1rem !important;\n  }\n  .webcg-devtools .ml-xl-n3,\n.webcg-devtools .mx-xl-n3 {\n    margin-left: -1rem !important;\n  }\n  .webcg-devtools .m-xl-n4 {\n    margin: -1.5rem !important;\n  }\n  .webcg-devtools .mt-xl-n4,\n.webcg-devtools .my-xl-n4 {\n    margin-top: -1.5rem !important;\n  }\n  .webcg-devtools .mr-xl-n4,\n.webcg-devtools .mx-xl-n4 {\n    margin-right: -1.5rem !important;\n  }\n  .webcg-devtools .mb-xl-n4,\n.webcg-devtools .my-xl-n4 {\n    margin-bottom: -1.5rem !important;\n  }\n  .webcg-devtools .ml-xl-n4,\n.webcg-devtools .mx-xl-n4 {\n    margin-left: -1.5rem !important;\n  }\n  .webcg-devtools .m-xl-n5 {\n    margin: -3rem !important;\n  }\n  .webcg-devtools .mt-xl-n5,\n.webcg-devtools .my-xl-n5 {\n    margin-top: -3rem !important;\n  }\n  .webcg-devtools .mr-xl-n5,\n.webcg-devtools .mx-xl-n5 {\n    margin-right: -3rem !important;\n  }\n  .webcg-devtools .mb-xl-n5,\n.webcg-devtools .my-xl-n5 {\n    margin-bottom: -3rem !important;\n  }\n  .webcg-devtools .ml-xl-n5,\n.webcg-devtools .mx-xl-n5 {\n    margin-left: -3rem !important;\n  }\n  .webcg-devtools .m-xl-auto {\n    margin: auto !important;\n  }\n  .webcg-devtools .mt-xl-auto,\n.webcg-devtools .my-xl-auto {\n    margin-top: auto !important;\n  }\n  .webcg-devtools .mr-xl-auto,\n.webcg-devtools .mx-xl-auto {\n    margin-right: auto !important;\n  }\n  .webcg-devtools .mb-xl-auto,\n.webcg-devtools .my-xl-auto {\n    margin-bottom: auto !important;\n  }\n  .webcg-devtools .ml-xl-auto,\n.webcg-devtools .mx-xl-auto {\n    margin-left: auto !important;\n  }\n}\n.webcg-devtools .text-monospace {\n  font-family: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace !important;\n}\n.webcg-devtools .text-justify {\n  text-align: justify !important;\n}\n.webcg-devtools .text-wrap {\n  white-space: normal !important;\n}\n.webcg-devtools .text-nowrap {\n  white-space: nowrap !important;\n}\n.webcg-devtools .text-truncate {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.webcg-devtools .text-left {\n  text-align: left !important;\n}\n.webcg-devtools .text-right {\n  text-align: right !important;\n}\n.webcg-devtools .text-center {\n  text-align: center !important;\n}\n@media (min-width: 576px) {\n  .webcg-devtools .text-sm-left {\n    text-align: left !important;\n  }\n  .webcg-devtools .text-sm-right {\n    text-align: right !important;\n  }\n  .webcg-devtools .text-sm-center {\n    text-align: center !important;\n  }\n}\n@media (min-width: 768px) {\n  .webcg-devtools .text-md-left {\n    text-align: left !important;\n  }\n  .webcg-devtools .text-md-right {\n    text-align: right !important;\n  }\n  .webcg-devtools .text-md-center {\n    text-align: center !important;\n  }\n}\n@media (min-width: 992px) {\n  .webcg-devtools .text-lg-left {\n    text-align: left !important;\n  }\n  .webcg-devtools .text-lg-right {\n    text-align: right !important;\n  }\n  .webcg-devtools .text-lg-center {\n    text-align: center !important;\n  }\n}\n@media (min-width: 1200px) {\n  .webcg-devtools .text-xl-left {\n    text-align: left !important;\n  }\n  .webcg-devtools .text-xl-right {\n    text-align: right !important;\n  }\n  .webcg-devtools .text-xl-center {\n    text-align: center !important;\n  }\n}\n.webcg-devtools .text-lowercase {\n  text-transform: lowercase !important;\n}\n.webcg-devtools .text-uppercase {\n  text-transform: uppercase !important;\n}\n.webcg-devtools .text-capitalize {\n  text-transform: capitalize !important;\n}\n.webcg-devtools .font-weight-light {\n  font-weight: 300 !important;\n}\n.webcg-devtools .font-weight-lighter {\n  font-weight: lighter !important;\n}\n.webcg-devtools .font-weight-normal {\n  font-weight: 400 !important;\n}\n.webcg-devtools .font-weight-bold {\n  font-weight: 700 !important;\n}\n.webcg-devtools .font-weight-bolder {\n  font-weight: bolder !important;\n}\n.webcg-devtools .font-italic {\n  font-style: italic !important;\n}\n.webcg-devtools .text-white {\n  color: #fff !important;\n}\n.webcg-devtools .text-primary {\n  color: #007bff !important;\n}\n.webcg-devtools a.text-primary:hover, .webcg-devtools a.text-primary:focus {\n  color: #0056b3 !important;\n}\n.webcg-devtools .text-secondary {\n  color: #6c757d !important;\n}\n.webcg-devtools a.text-secondary:hover, .webcg-devtools a.text-secondary:focus {\n  color: #494f54 !important;\n}\n.webcg-devtools .text-success {\n  color: #28a745 !important;\n}\n.webcg-devtools a.text-success:hover, .webcg-devtools a.text-success:focus {\n  color: #19692c !important;\n}\n.webcg-devtools .text-info {\n  color: #17a2b8 !important;\n}\n.webcg-devtools a.text-info:hover, .webcg-devtools a.text-info:focus {\n  color: #0f6674 !important;\n}\n.webcg-devtools .text-warning {\n  color: #ffc107 !important;\n}\n.webcg-devtools a.text-warning:hover, .webcg-devtools a.text-warning:focus {\n  color: #ba8b00 !important;\n}\n.webcg-devtools .text-danger {\n  color: #dc3545 !important;\n}\n.webcg-devtools a.text-danger:hover, .webcg-devtools a.text-danger:focus {\n  color: #a71d2a !important;\n}\n.webcg-devtools .text-light {\n  color: #f8f9fa !important;\n}\n.webcg-devtools a.text-light:hover, .webcg-devtools a.text-light:focus {\n  color: #cbd3da !important;\n}\n.webcg-devtools .text-dark {\n  color: #343a40 !important;\n}\n.webcg-devtools a.text-dark:hover, .webcg-devtools a.text-dark:focus {\n  color: #121416 !important;\n}\n.webcg-devtools .text-body {\n  color: #212529 !important;\n}\n.webcg-devtools .text-muted {\n  color: #6c757d !important;\n}\n.webcg-devtools .text-black-50 {\n  color: rgba(0, 0, 0, 0.5) !important;\n}\n.webcg-devtools .text-white-50 {\n  color: rgba(255, 255, 255, 0.5) !important;\n}\n.webcg-devtools .text-hide {\n  font: 0/0 a;\n  color: transparent;\n  text-shadow: none;\n  background-color: transparent;\n  border: 0;\n}\n.webcg-devtools .text-decoration-none {\n  text-decoration: none !important;\n}\n.webcg-devtools .text-break {\n  word-break: break-word !important;\n  overflow-wrap: break-word !important;\n}\n.webcg-devtools .text-reset {\n  color: inherit !important;\n}\n.webcg-devtools .visible {\n  visibility: visible !important;\n}\n.webcg-devtools .invisible {\n  visibility: hidden !important;\n}\n@media print {\n  .webcg-devtools *,\n.webcg-devtools *::before,\n.webcg-devtools *::after {\n    text-shadow: none !important;\n    box-shadow: none !important;\n  }\n  .webcg-devtools a:not(.btn) {\n    text-decoration: underline;\n  }\n  .webcg-devtools abbr[title]::after {\n    content: \" (\" attr(title) \")\";\n  }\n  .webcg-devtools pre {\n    white-space: pre-wrap !important;\n  }\n  .webcg-devtools pre,\n.webcg-devtools blockquote {\n    border: 1px solid #adb5bd;\n    page-break-inside: avoid;\n  }\n  .webcg-devtools thead {\n    display: table-header-group;\n  }\n  .webcg-devtools tr,\n.webcg-devtools img {\n    page-break-inside: avoid;\n  }\n  .webcg-devtools p,\n.webcg-devtools h2,\n.webcg-devtools h3 {\n    orphans: 3;\n    widows: 3;\n  }\n  .webcg-devtools h2,\n.webcg-devtools h3 {\n    page-break-after: avoid;\n  }\n  @page {\n    .webcg-devtools {\n      size: a3;\n    }\n  }\n  .webcg-devtools body {\n    min-width: 992px !important;\n  }\n  .webcg-devtools .container {\n    min-width: 992px !important;\n  }\n  .webcg-devtools .navbar {\n    display: none;\n  }\n  .webcg-devtools .badge {\n    border: 1px solid #000;\n  }\n  .webcg-devtools .table {\n    border-collapse: collapse !important;\n  }\n  .webcg-devtools .table td,\n.webcg-devtools .table th {\n    background-color: #fff !important;\n  }\n  .webcg-devtools .table-bordered th,\n.webcg-devtools .table-bordered td {\n    border: 1px solid #dee2e6 !important;\n  }\n  .webcg-devtools .table-dark {\n    color: inherit;\n  }\n  .webcg-devtools .table-dark th,\n.webcg-devtools .table-dark td,\n.webcg-devtools .table-dark thead th,\n.webcg-devtools .table-dark tbody + tbody {\n    border-color: #dee2e6;\n  }\n  .webcg-devtools .table .thead-dark th {\n    color: inherit;\n    border-color: #dee2e6;\n  }\n}\n.webcg-devtools h1, .webcg-devtools h2, .webcg-devtools h3, .webcg-devtools h4, .webcg-devtools h5, .webcg-devtools h6,\n.webcg-devtools .h1, .webcg-devtools .h2, .webcg-devtools .h3, .webcg-devtools .h4, .webcg-devtools .h5, .webcg-devtools .h6 {\n  margin-bottom: 8px;\n  /* 0.5rem */\n}\n.webcg-devtools h1, .webcg-devtools .h1 {\n  font-size: 40px;\n  /* 2.5rem */\n}\n.webcg-devtools h2, .webcg-devtools .h2 {\n  font-size: 32px;\n  /* 2rem */\n}\n.webcg-devtools h3, .webcg-devtools .h3 {\n  font-size: 28px;\n  /* 1.75rem */\n}\n.webcg-devtools h4, .webcg-devtools .h4 {\n  font-size: 24px;\n  /* 1.5rem */\n}\n.webcg-devtools h5, .webcg-devtools .h5 {\n  font-size: 20px;\n  /* 1.25rem */\n}\n.webcg-devtools h6, .webcg-devtools .h6 {\n  font-size: 16px;\n  /* 1rem */\n}\n.webcg-devtools .btn {\n  padding: 6px 12px;\n  /* 0.375rem 0.75rem */\n  font-size: 16px;\n  /* 1rem */\n  border-radius: 4px;\n  /* 0.25rem */\n}\n.webcg-devtools .btn-sm, .webcg-devtools .btn-group-sm > .btn {\n  padding: 4px 8px;\n  /* 0.25rem 0.5rem */\n  font-size: 14px;\n  /* 0.875rem */\n  border-radius: 3.2px;\n}\n.webcg-devtools .btn:focus {\n  box-shadow: 0 0 0 3.2px rgba(0, 123, 255, 0.25);\n  /* 0.2rem */\n}\n.webcg-devtools .form-group {\n  margin-bottom: 16px;\n  /* 1rem */\n}\n.webcg-devtools .form-control {\n  height: 38px;\n  /* calc(2.25rem + 2px); */\n  padding: 6px 12px;\n  /* 0.375rem 0.75rem */\n  font-size: 16px;\n  /* 1rem */\n  border-radius: 4px;\n  /* 0.25rem */\n}\n.webcg-devtools .form-control:focus {\n  box-shadow: 0 0 0 3.2px rgba(0, 123, 255, 0.25);\n  /* 0.2rem */\n}\n.webcg-devtools .nav-tabs .nav-link {\n  border-top-left-radius: 4px;\n  /* 0.25rem */\n  border-top-right-radius: 4px;\n  /* 0.25rem */\n}\n.webcg-devtools .nav-link {\n  padding: 8px 16px;\n  /* 0.5rem 1rem */\n}\n.webcg-devtools .modal {\n  display: block;\n  top: auto;\n  right: auto;\n  bottom: auto;\n  left: auto;\n}\n.webcg-devtools .modal-header {\n  padding: 16px;\n  /* 1rem */\n  border-top-left-radius: 4.8px;\n  /* 0.3rem */\n  border-top-right-radius: 4.8px;\n  /* 0.3rem */\n}\n.webcg-devtools .modal-body {\n  padding: 16px;\n  /* 1rem */\n}\n.webcg-devtools .modal-content {\n  border-radius: 4.8px;\n  /* 0.3rem */\n}\n.webcg-devtools .modal-footer {\n  padding: 16px;\n  /* 1rem */\n}\n.webcg-devtools .table {\n  margin-bottom: 16px;\n  /* 1rem */\n}\n.webcg-devtools .table th, .webcg-devtools .table td {\n  padding: 12px;\n  /* 0.75rem */\n}\n.webcg-devtools .table-sm th, .webcg-devtools .table-sm td {\n  padding: 4.8px;\n  /* 0.3rem */\n}\n\n.webcg-devtools {\n  background: white;\n  color: black;\n  font-size: 16px;\n  line-height: normal;\n}\n.webcg-devtools .btn-sm, .webcg-devtools .btn-group-sm > .btn {\n  min-width: 32px;\n  /* 2rem */\n}\n.webcg-devtools .flex-columns {\n  display: flex;\n  flex-direction: column;\n  flex: 1 0 auto;\n}\n.webcg-devtools .form-row {\n  flex: 0 0 auto;\n}\n.webcg-devtools .modal {\n  height: auto;\n  width: auto;\n  box-shadow: 0 20px 32px -8px rgba(9, 45, 66, 0.25);\n}\n.webcg-devtools .modal .modal-content {\n  resize: both;\n  overflow: hidden;\n  height: 100%;\n  min-width: 410px;\n  min-height: 63px;\n}\n.webcg-devtools .modal .modal-content .modal-header {\n  flex: 0 0 auto;\n  border-bottom: 0;\n}\n.webcg-devtools .modal .modal-content .modal-navbar .nav {\n  padding: 0 16px;\n  /* 0 1rem */\n}\n.webcg-devtools .modal .modal-content .modal-body {\n  position: static;\n  display: flex;\n  flex-direction: column;\n  overflow: auto;\n  padding-bottom: 0;\n}\n.webcg-devtools .modal .modal-content .modal-footer {\n  flex: 0 0 auto;\n  justify-content: center;\n  padding: 12px;\n  font-size: 12px;\n}\n.webcg-devtools .draggable {\n  position: absolute;\n  z-index: auto;\n}\n.webcg-devtools .drag-handle {\n  cursor: grab;\n  cursor: -webkit-grab;\n}\n.webcg-devtools .dragging .drag-handle {\n  cursor: grabbing;\n  cursor: -webkit-grabbing;\n}\n\n/*# sourceMappingURL=dev-tools.vue.map */","<template>\n    <div class=\"webcg-devtools\">\n        <div class=\"modal draggable\" tabindex=\"-1\" role=\"dialog\">\n            <div class=\"modal-content resizable\">\n                <div class=\"modal-header drag-handle\">\n                    <h5 class=\"modal-title\">WebCG DevTools {{ version }}</h5>\n                </div>\n                <div class=\"modal-navbar\">\n                    <ul class=\"nav nav-tabs\" id=\"myTab\" role=\"tablist\">\n                        <li class=\"nav-item\">\n                            <a class=\"nav-link\" :class=\"{'active': tab === 'tools'}\" data-toggle=\"tab\"\n                               href=\"#tools\"\n                               role=\"tab\"\n                               aria-controls=\"tools\" aria-selected=\"true\" @click=\"tab = 'tools'\">Tools</a>\n                        </li>\n                        <li class=\"nav-item\">\n                            <a class=\"nav-link\" :class=\"{'active': tab === 'settings'}\" data-toggle=\"tab\"\n                               href=\"#settings\"\n                               role=\"tab\"\n                               aria-controls=\"settings\" aria-selected=\"false\" @click=\"tab = 'settings'\">Settings</a>\n                        </li>\n                    </ul>\n                </div>\n                <tab-tools :settings=\"settings\" v-if=\"tab === 'tools'\"></tab-tools>\n                <tab-settings v-model=\"settings\" v-if=\"tab === 'settings'\"></tab-settings>\n                <div class=\"modal-footer\">\n                    <a href=\"https://github.com/indr/webcg-devtools\">https://github.com/indr/webcg-devtools</a>\n                </div>\n            </div>\n        </div>\n    </div>\n</template>\n\n<script>\n  import { version } from '../package.json'\n  import storage from './lib/storage'\n  import TabSettings from './components/tab-settings.vue'\n  import TabTools from './components/tab-tools.vue'\n\n  export default {\n    name: 'webcg-dev-tools',\n    components: { TabSettings, TabTools },\n    data () {\n      return {\n        tab: 'tools',\n        version: version,\n        settings: {}\n      }\n    },\n    created () {\n      this.loadSettings(this.settings)\n      this.applySettings(this.settings)\n    },\n    mounted () {\n      const $draggable = this.$el.querySelector('.draggable')\n      const $resizable = this.$el.querySelector('.resizable')\n      this.restoreDimensions($draggable, $resizable)\n      this.$draggable({\n        ondragged: this.dragged.bind(this)\n      })\n      this.$resizable({\n        targetNode: $resizable,\n        onresized: this.resized.bind(this)\n      })\n    },\n    watch: {\n      settings: function (settings) {\n        this.applySettings(settings)\n        this.saveSettings(settings)\n      }\n    },\n    methods: {\n      loadSettings (settings) {\n        settings.callUpdateBeforePlay = storage.get('callUpdateBeforePlay', true)\n        settings.showRemoveButton = storage.get('showRemoveButton', false)\n        settings.backgroundColor = storage.get('backgroundColor', window.getComputedStyle(document.body, null).getPropertyValue('background-color'))\n      },\n      saveSettings (settings) {\n        storage.set('callUpdateBeforePlay', settings.callUpdateBeforePlay)\n        storage.set('showRemoveButton', settings.showRemoveButton)\n        storage.set('backgroundColor', settings.backgroundColor)\n      },\n      applySettings (settings) {\n        document.body.style.backgroundColor = settings.backgroundColor\n      },\n      dragged ($el) {\n        storage.set('offsetTop', $el.offsetTop)\n        storage.set('offsetLeft', $el.offsetLeft)\n      },\n      resized ($el) {\n        storage.set('offsetWidth', $el.offsetWidth)\n        storage.set('offsetHeight', $el.offsetHeight)\n      },\n      restoreDimensions ($draggable, $resizable) {\n        const minWidth = 410\n        const defaultWidth = 410\n        const minHeight = 63\n        const defaultHeight = 380\n        $draggable.style.top = Math.max(0, storage.get('offsetTop') || 200) + 'px'\n        $draggable.style.left = Math.max(0, storage.get('offsetLeft') || 200) + 'px'\n        $resizable.style.width = Math.max(minWidth, storage.get('offsetWidth') || defaultWidth) + 'px'\n        $resizable.style.height = Math.max(minHeight, storage.get('offsetHeight') || defaultHeight) + 'px'\n      },\n\n    }\n  }\n</script>\n\n<style lang=\"scss\">\n    @import 'bootstrap.scss';\n    @import 'style.scss';\n</style>\n"]}, media: undefined });

    };
    /* scoped */
    var __vue_scope_id__$5 = undefined;
    /* module identifier */
    var __vue_module_identifier__$5 = undefined;
    /* functional template */
    var __vue_is_functional_template__$5 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    var __vue_component__$5 = normalizeComponent(
      { render: __vue_render__$5, staticRenderFns: __vue_staticRenderFns__$5 },
      __vue_inject_styles__$5,
      __vue_script__$5,
      __vue_scope_id__$5,
      __vue_is_functional_template__$5,
      __vue_module_identifier__$5,
      false,
      createInjector,
      undefined,
      undefined
    );

  var Draggable = {
    install: function install (Vue) {
      Vue.prototype.$draggable = function (options) {
        options = Object.assign({}, {
          draggable: 'draggable',
          dragging: 'dragging',
          handle: 'drag-handle',
          dataOffsetX: 'data-drag-offset-x',
          dataOffsetY: 'data-drag-offset-y',
          ondragged: null
        }, options);

        var $handle = this.$el.querySelector('.' + options.handle);
        if (!$handle) { return }

        $handle.addEventListener('mousedown', function (e) {
          var $draggable = e.target.closest('.' + options.draggable);
          $draggable.classList.add(options.dragging);
          $draggable.setAttribute(options.dataOffsetX, e.clientX - $draggable.offsetLeft);
          $draggable.setAttribute(options.dataOffsetY, e.clientY - $draggable.offsetTop);
          e.preventDefault(); // prevent text selection
        });

        window.document.addEventListener('mousemove', function (e) {
          var $dragging = window.document.querySelector('.' + options.dragging);
          if ($dragging) {
            var top = e.clientY - Number.parseInt($dragging.getAttribute(options.dataOffsetY));
            var left = e.clientX - Number.parseInt($dragging.getAttribute(options.dataOffsetX));
            $dragging.style.top = top + 'px';
            $dragging.style.left = left + 'px';
          }
        });

        $handle.addEventListener('mouseup', function (e) {
          var $dragging = window.document.querySelector('.' + options.dragging);
          $dragging.removeAttribute(options.dataOffsetX);
          $dragging.removeAttribute(options.dataOffsetY);
          $dragging.classList.remove(options.dragging);
          // window.localStorage.setItem(KEY + '.top', self.$toolbox.css('top'));
          // window.localStorage.setItem(KEY + '.left', self.$toolbox.css('left'));
          if (typeof options.ondragged === 'function') {
            options.ondragged($dragging);
          }
        });
      };
    }
  };

  var Resizable = {
    install: function install (Vue) {
      Vue.prototype.$resizable = function (options) {
        options = Object.assign({}, {
          targetNode: null,
          onresized: null
        }, options);

        var oldWidth = options.targetNode.style.width;
        var oldHeight = options.targetNode.style.height;

        // Options for the observer (which mutations to observe)
        var config = { attributes: true, childList: false, subtree: false };

        // Callback function to execute when mutations are observed
        var callback = function () {
          var newWidth = options.targetNode.style.width;
          var newHeight = options.targetNode.style.height;
          if (newWidth !== oldWidth || newHeight !== oldHeight) {
            oldWidth = newWidth;
            oldHeight = newHeight;
            if (typeof options.onresized === 'function') {
              options.onresized(options.targetNode);
            }
          }
        };

        // Create an observer instance linked to the callback function
        var observer = new window.MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(options.targetNode, config);

        // Later, you can stop observing
        // observer.disconnect();
      };
    }
  };

  function readyFn () {
    Vue.use(Draggable);
    Vue.use(Resizable);
    var app = new Vue(__vue_component__$5).$mount();
    document.body.appendChild(app.$el);
  }

  /**
   * When required globally
   */
  if (typeof (window) !== 'undefined') {
    console.log('[webcg-devtools] version ' + version);
    ready(readyFn);
  }

  // @see http://youmightnotneedjquery.com/#ready
  function ready (fn) {
    if (document.attachEvent ? document.readyState === 'complete' : document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

})));
