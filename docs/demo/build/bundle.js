
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* node_modules/svelte-awesome/components/svg/Path.svelte generated by Svelte v3.24.0 */

    const file = "node_modules/svelte-awesome/components/svg/Path.svelte";

    function create_fragment(ctx) {
    	let path;
    	let path_key_value;

    	let path_levels = [
    		{
    			key: path_key_value = "path-" + /*id*/ ctx[0]
    		},
    		/*data*/ ctx[1]
    	];

    	let path_data = {};

    	for (let i = 0; i < path_levels.length; i += 1) {
    		path_data = assign(path_data, path_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			set_svg_attributes(path, path_data);
    			add_location(path, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(path, path_data = get_spread_update(path_levels, [
    				dirty & /*id*/ 1 && path_key_value !== (path_key_value = "path-" + /*id*/ ctx[0]) && { key: path_key_value },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ["id", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Path> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Path", $$slots, []);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Path extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get id() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Polygon.svelte generated by Svelte v3.24.0 */

    const file$1 = "node_modules/svelte-awesome/components/svg/Polygon.svelte";

    function create_fragment$1(ctx) {
    	let polygon;
    	let polygon_key_value;

    	let polygon_levels = [
    		{
    			key: polygon_key_value = "polygon-" + /*id*/ ctx[0]
    		},
    		/*data*/ ctx[1]
    	];

    	let polygon_data = {};

    	for (let i = 0; i < polygon_levels.length; i += 1) {
    		polygon_data = assign(polygon_data, polygon_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			polygon = svg_element("polygon");
    			set_svg_attributes(polygon, polygon_data);
    			add_location(polygon, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polygon, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(polygon, polygon_data = get_spread_update(polygon_levels, [
    				dirty & /*id*/ 1 && polygon_key_value !== (polygon_key_value = "polygon-" + /*id*/ ctx[0]) && { key: polygon_key_value },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polygon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ["id", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Polygon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Polygon", $$slots, []);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Polygon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get id() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Raw.svelte generated by Svelte v3.24.0 */

    const file$2 = "node_modules/svelte-awesome/components/svg/Raw.svelte";

    function create_fragment$2(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			g.innerHTML = /*raw*/ ctx[0];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*raw*/ 1) g.innerHTML = /*raw*/ ctx[0];		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let cursor = 870711;

    	function getId() {
    		cursor += 1;
    		return `fa-${cursor.toString(16)}`;
    	}

    	let raw;
    	let { data } = $$props;

    	function getRaw(data) {
    		if (!data || !data.raw) {
    			return null;
    		}

    		let rawData = data.raw;
    		const ids = {};

    		rawData = rawData.replace(/\s(?:xml:)?id=["']?([^"')\s]+)/g, (match, id) => {
    			const uniqueId = getId();
    			ids[id] = uniqueId;
    			return ` id="${uniqueId}"`;
    		});

    		rawData = rawData.replace(/#(?:([^'")\s]+)|xpointer\(id\((['"]?)([^')]+)\2\)\))/g, (match, rawId, _, pointerId) => {
    			const id = rawId || pointerId;

    			if (!id || !ids[id]) {
    				return match;
    			}

    			return `#${ids[id]}`;
    		});

    		return rawData;
    	}

    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Raw> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Raw", $$slots, []);

    	$$self.$set = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ cursor, getId, raw, data, getRaw });

    	$$self.$inject_state = $$props => {
    		if ("cursor" in $$props) cursor = $$props.cursor;
    		if ("raw" in $$props) $$invalidate(0, raw = $$props.raw);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 2) {
    			 $$invalidate(0, raw = getRaw(data));
    		}
    	};

    	return [raw, data];
    }

    class Raw extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[1] === undefined && !("data" in props)) {
    			console.warn("<Raw> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Raw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Raw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Svg.svelte generated by Svelte v3.24.0 */

    const file$3 = "node_modules/svelte-awesome/components/svg/Svg.svelte";

    function create_fragment$3(ctx) {
    	let svg;
    	let svg_class_value;
    	let svg_role_value;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (default_slot) default_slot.c();
    			attr_dev(svg, "x", /*x*/ ctx[8]);
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "class", svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an");
    			attr_dev(svg, "y", /*y*/ ctx[9]);
    			attr_dev(svg, "width", /*width*/ ctx[1]);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			attr_dev(svg, "role", svg_role_value = /*label*/ ctx[11] ? "img" : "presentation");
    			attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			attr_dev(svg, "style", /*style*/ ctx[10]);
    			toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === "horizontal");
    			toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === "vertical");
    			add_location(svg, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			if (default_slot) {
    				default_slot.m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4096) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*x*/ 256) {
    				attr_dev(svg, "x", /*x*/ ctx[8]);
    			}

    			if (!current || dirty & /*className*/ 1 && svg_class_value !== (svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (!current || dirty & /*y*/ 512) {
    				attr_dev(svg, "y", /*y*/ ctx[9]);
    			}

    			if (!current || dirty & /*width*/ 2) {
    				attr_dev(svg, "width", /*width*/ ctx[1]);
    			}

    			if (!current || dirty & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}

    			if (!current || dirty & /*label*/ 2048) {
    				attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			}

    			if (!current || dirty & /*label*/ 2048 && svg_role_value !== (svg_role_value = /*label*/ ctx[11] ? "img" : "presentation")) {
    				attr_dev(svg, "role", svg_role_value);
    			}

    			if (!current || dirty & /*box*/ 8) {
    				attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 1024) {
    				attr_dev(svg, "style", /*style*/ ctx[10]);
    			}

    			if (dirty & /*className, spin*/ 17) {
    				toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			}

    			if (dirty & /*className, pulse*/ 65) {
    				toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			}

    			if (dirty & /*className, inverse*/ 33) {
    				toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === "horizontal");
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === "vertical");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { class: className } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { box } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { x = undefined } = $$props;
    	let { y = undefined } = $$props;
    	let { style = undefined } = $$props;
    	let { label = undefined } = $$props;

    	const writable_props = [
    		"class",
    		"width",
    		"height",
    		"box",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"x",
    		"y",
    		"style",
    		"label"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Svg> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Svg", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, className = $$props.class);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("box" in $$props) $$invalidate(3, box = $$props.box);
    		if ("spin" in $$props) $$invalidate(4, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(7, flip = $$props.flip);
    		if ("x" in $$props) $$invalidate(8, x = $$props.x);
    		if ("y" in $$props) $$invalidate(9, y = $$props.y);
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
    		if ("label" in $$props) $$invalidate(11, label = $$props.label);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label
    	});

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("box" in $$props) $$invalidate(3, box = $$props.box);
    		if ("spin" in $$props) $$invalidate(4, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(7, flip = $$props.flip);
    		if ("x" in $$props) $$invalidate(8, x = $$props.x);
    		if ("y" in $$props) $$invalidate(9, y = $$props.y);
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
    		if ("label" in $$props) $$invalidate(11, label = $$props.label);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label,
    		$$scope,
    		$$slots
    	];
    }

    class Svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			class: 0,
    			width: 1,
    			height: 2,
    			box: 3,
    			spin: 4,
    			inverse: 5,
    			pulse: 6,
    			flip: 7,
    			x: 8,
    			y: 9,
    			style: 10,
    			label: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Svg",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*className*/ ctx[0] === undefined && !("class" in props)) {
    			console.warn("<Svg> was created without expected prop 'class'");
    		}

    		if (/*width*/ ctx[1] === undefined && !("width" in props)) {
    			console.warn("<Svg> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[2] === undefined && !("height" in props)) {
    			console.warn("<Svg> was created without expected prop 'height'");
    		}

    		if (/*box*/ ctx[3] === undefined && !("box" in props)) {
    			console.warn("<Svg> was created without expected prop 'box'");
    		}
    	}

    	get class() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get box() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set box(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/Icon.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1, console: console_1 } = globals;

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    // (4:4) {#if self}
    function create_if_block(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*self*/ ctx[0].paths && create_if_block_3(ctx);
    	let if_block1 = /*self*/ ctx[0].polygons && create_if_block_2(ctx);
    	let if_block2 = /*self*/ ctx[0].raw && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[0].paths) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[0].polygons) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[0].raw) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(4:4) {#if self}",
    		ctx
    	});

    	return block;
    }

    // (5:6) {#if self.paths}
    function create_if_block_3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*self*/ ctx[0].paths;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 1) {
    				each_value_1 = /*self*/ ctx[0].paths;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(5:6) {#if self.paths}",
    		ctx
    	});

    	return block;
    }

    // (6:8) {#each self.paths as path, i}
    function create_each_block_1(ctx) {
    	let path;
    	let current;

    	path = new Path({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*path*/ ctx[32]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(path.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(path, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const path_changes = {};
    			if (dirty[0] & /*self*/ 1) path_changes.data = /*path*/ ctx[32];
    			path.$set(path_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(path.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(path.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(path, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(6:8) {#each self.paths as path, i}",
    		ctx
    	});

    	return block;
    }

    // (10:6) {#if self.polygons}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*self*/ ctx[0].polygons;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 1) {
    				each_value = /*self*/ ctx[0].polygons;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(10:6) {#if self.polygons}",
    		ctx
    	});

    	return block;
    }

    // (11:8) {#each self.polygons as polygon, i}
    function create_each_block(ctx) {
    	let polygon;
    	let current;

    	polygon = new Polygon({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*polygon*/ ctx[29]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(polygon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(polygon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const polygon_changes = {};
    			if (dirty[0] & /*self*/ 1) polygon_changes.data = /*polygon*/ ctx[29];
    			polygon.$set(polygon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(polygon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(polygon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(polygon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:8) {#each self.polygons as polygon, i}",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#if self.raw}
    function create_if_block_1(ctx) {
    	let raw;
    	let updating_data;
    	let current;

    	function raw_data_binding(value) {
    		/*raw_data_binding*/ ctx[15].call(null, value);
    	}

    	let raw_props = {};

    	if (/*self*/ ctx[0] !== void 0) {
    		raw_props.data = /*self*/ ctx[0];
    	}

    	raw = new Raw({ props: raw_props, $$inline: true });
    	binding_callbacks.push(() => bind(raw, "data", raw_data_binding));

    	const block = {
    		c: function create() {
    			create_component(raw.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(raw, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const raw_changes = {};

    			if (!updating_data && dirty[0] & /*self*/ 1) {
    				updating_data = true;
    				raw_changes.data = /*self*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			raw.$set(raw_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(raw.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(raw.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(raw, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:6) {#if self.raw}",
    		ctx
    	});

    	return block;
    }

    // (3:8)      
    function fallback_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*self*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(3:8)      ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>
    function create_default_slot(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty[0] & /*$$scope*/ 65536) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[16], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty[0] & /*self*/ 1) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let svg;
    	let current;

    	svg = new Svg({
    			props: {
    				label: /*label*/ ctx[6],
    				width: /*width*/ ctx[7],
    				height: /*height*/ ctx[8],
    				box: /*box*/ ctx[10],
    				style: /*combinedStyle*/ ctx[9],
    				spin: /*spin*/ ctx[2],
    				flip: /*flip*/ ctx[5],
    				inverse: /*inverse*/ ctx[3],
    				pulse: /*pulse*/ ctx[4],
    				class: /*className*/ ctx[1],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(svg.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(svg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const svg_changes = {};
    			if (dirty[0] & /*label*/ 64) svg_changes.label = /*label*/ ctx[6];
    			if (dirty[0] & /*width*/ 128) svg_changes.width = /*width*/ ctx[7];
    			if (dirty[0] & /*height*/ 256) svg_changes.height = /*height*/ ctx[8];
    			if (dirty[0] & /*box*/ 1024) svg_changes.box = /*box*/ ctx[10];
    			if (dirty[0] & /*combinedStyle*/ 512) svg_changes.style = /*combinedStyle*/ ctx[9];
    			if (dirty[0] & /*spin*/ 4) svg_changes.spin = /*spin*/ ctx[2];
    			if (dirty[0] & /*flip*/ 32) svg_changes.flip = /*flip*/ ctx[5];
    			if (dirty[0] & /*inverse*/ 8) svg_changes.inverse = /*inverse*/ ctx[3];
    			if (dirty[0] & /*pulse*/ 16) svg_changes.pulse = /*pulse*/ ctx[4];
    			if (dirty[0] & /*className*/ 2) svg_changes.class = /*className*/ ctx[1];

    			if (dirty[0] & /*$$scope, self*/ 65537) {
    				svg_changes.$$scope = { dirty, ctx };
    			}

    			svg.$set(svg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function normaliseData(data) {
    	if ("iconName" in data && "icon" in data) {
    		let normalisedData = {};
    		let faIcon = data.icon;
    		let name = data.iconName;
    		let width = faIcon[0];
    		let height = faIcon[1];
    		let paths = faIcon[4];
    		let iconData = { width, height, paths: [{ d: paths }] };
    		normalisedData[name] = iconData;
    		return normalisedData;
    	}

    	return data;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { class: className = "" } = $$props;
    	let { data } = $$props;
    	let { scale = 1 } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { label = null } = $$props;
    	let { self = null } = $$props;
    	let { style = null } = $$props;

    	// internal
    	let x = 0;

    	let y = 0;
    	let childrenHeight = 0;
    	let childrenWidth = 0;
    	let outerScale = 1;
    	let width;
    	let height;
    	let combinedStyle;
    	let box;

    	function init() {
    		if (typeof data === "undefined") {
    			return;
    		}

    		const normalisedData = normaliseData(data);
    		const [name] = Object.keys(normalisedData);
    		const icon = normalisedData[name];

    		if (!icon.paths) {
    			icon.paths = [];
    		}

    		if (icon.d) {
    			icon.paths.push({ d: icon.d });
    		}

    		if (!icon.polygons) {
    			icon.polygons = [];
    		}

    		if (icon.points) {
    			icon.polygons.push({ points: icon.points });
    		}

    		$$invalidate(0, self = icon);
    	}

    	function normalisedScale() {
    		let numScale = 1;

    		if (typeof scale !== "undefined") {
    			numScale = Number(scale);
    		}

    		if (isNaN(numScale) || numScale <= 0) {
    			// eslint-disable-line no-restricted-globals
    			console.warn("Invalid prop: prop \"scale\" should be a number over 0."); // eslint-disable-line no-console

    			return outerScale;
    		}

    		return numScale * outerScale;
    	}

    	function calculateBox() {
    		if (self) {
    			return `0 0 ${self.width} ${self.height}`;
    		}

    		return `0 0 ${width} ${height}`;
    	}

    	function calculateRatio() {
    		if (!self) {
    			return 1;
    		}

    		return Math.max(self.width, self.height) / 16;
    	}

    	function calculateWidth() {
    		if (childrenWidth) {
    			return childrenWidth;
    		}

    		if (self) {
    			return self.width / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateHeight() {
    		if (childrenHeight) {
    			return childrenHeight;
    		}

    		if (self) {
    			return self.height / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateStyle() {
    		let combined = "";

    		if (style !== null) {
    			combined += style;
    		}

    		let size = normalisedScale();

    		if (size === 1) {
    			return combined;
    		}

    		if (combined !== "" && !combined.endsWith(";")) {
    			combined += "; ";
    		}

    		return `${combined}font-size: ${size}em`;
    	}

    	const writable_props = [
    		"class",
    		"data",
    		"scale",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"label",
    		"self",
    		"style"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Icon", $$slots, ['default']);

    	function raw_data_binding(value) {
    		self = value;
    		$$invalidate(0, self);
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, className = $$props.class);
    		if ("data" in $$props) $$invalidate(11, data = $$props.data);
    		if ("scale" in $$props) $$invalidate(12, scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(3, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(5, flip = $$props.flip);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("self" in $$props) $$invalidate(0, self = $$props.self);
    		if ("style" in $$props) $$invalidate(13, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		Path,
    		Polygon,
    		Raw,
    		Svg,
    		className,
    		data,
    		scale,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		self,
    		style,
    		x,
    		y,
    		childrenHeight,
    		childrenWidth,
    		outerScale,
    		width,
    		height,
    		combinedStyle,
    		box,
    		init,
    		normaliseData,
    		normalisedScale,
    		calculateBox,
    		calculateRatio,
    		calculateWidth,
    		calculateHeight,
    		calculateStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    		if ("data" in $$props) $$invalidate(11, data = $$props.data);
    		if ("scale" in $$props) $$invalidate(12, scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(3, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(5, flip = $$props.flip);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("self" in $$props) $$invalidate(0, self = $$props.self);
    		if ("style" in $$props) $$invalidate(13, style = $$props.style);
    		if ("x" in $$props) x = $$props.x;
    		if ("y" in $$props) y = $$props.y;
    		if ("childrenHeight" in $$props) childrenHeight = $$props.childrenHeight;
    		if ("childrenWidth" in $$props) childrenWidth = $$props.childrenWidth;
    		if ("outerScale" in $$props) outerScale = $$props.outerScale;
    		if ("width" in $$props) $$invalidate(7, width = $$props.width);
    		if ("height" in $$props) $$invalidate(8, height = $$props.height);
    		if ("combinedStyle" in $$props) $$invalidate(9, combinedStyle = $$props.combinedStyle);
    		if ("box" in $$props) $$invalidate(10, box = $$props.box);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*data, style, scale*/ 14336) {
    			 {
    				init();
    				$$invalidate(7, width = calculateWidth());
    				$$invalidate(8, height = calculateHeight());
    				$$invalidate(9, combinedStyle = calculateStyle());
    				$$invalidate(10, box = calculateBox());
    			}
    		}
    	};

    	return [
    		self,
    		className,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		width,
    		height,
    		combinedStyle,
    		box,
    		data,
    		scale,
    		style,
    		$$slots,
    		raw_data_binding,
    		$$scope
    	];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{
    				class: 1,
    				data: 11,
    				scale: 12,
    				spin: 2,
    				inverse: 3,
    				pulse: 4,
    				flip: 5,
    				label: 6,
    				self: 0,
    				style: 13
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[11] === undefined && !("data" in props)) {
    			console_1.warn("<Icon> was created without expected prop 'data'");
    		}
    	}

    	get class() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get self() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set self(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var faCircle = {
      prefix: 'fas',
      iconName: 'circle',
      icon: [512, 512, [], "f111", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"]
    };
    var faEdit = {
      prefix: 'fas',
      iconName: 'edit',
      icon: [576, 512, [], "f044", "M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z"]
    };
    var faHammer = {
      prefix: 'fas',
      iconName: 'hammer',
      icon: [576, 512, [], "f6e3", "M571.31 193.94l-22.63-22.63c-6.25-6.25-16.38-6.25-22.63 0l-11.31 11.31-28.9-28.9c5.63-21.31.36-44.9-16.35-61.61l-45.25-45.25c-62.48-62.48-163.79-62.48-226.28 0l90.51 45.25v18.75c0 16.97 6.74 33.25 18.75 45.25l49.14 49.14c16.71 16.71 40.3 21.98 61.61 16.35l28.9 28.9-11.31 11.31c-6.25 6.25-6.25 16.38 0 22.63l22.63 22.63c6.25 6.25 16.38 6.25 22.63 0l90.51-90.51c6.23-6.24 6.23-16.37-.02-22.62zm-286.72-15.2c-3.7-3.7-6.84-7.79-9.85-11.95L19.64 404.96c-25.57 23.88-26.26 64.19-1.53 88.93s65.05 24.05 88.93-1.53l238.13-255.07c-3.96-2.91-7.9-5.87-11.44-9.41l-49.14-49.14z"]
    };
    var faPlus = {
      prefix: 'fas',
      iconName: 'plus',
      icon: [448, 512, [], "f067", "M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"]
    };
    var faTrashAlt = {
      prefix: 'fas',
      iconName: 'trash-alt',
      icon: [448, 512, [], "f2ed", "M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"]
    };

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.24.0 */

    const { Error: Error_1, Object: Object_1$1, console: console_1$1 } = globals;

    // (219:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[5]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[5]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(219:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (217:0) {#if componentParams}
    function create_if_block$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*componentParams*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[4]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(217:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(route, userData, ...conditions) {
    	// Check if we don't have userData
    	if (userData && typeof userData == "function") {
    		conditions = conditions && conditions.length ? conditions : [];
    		conditions.unshift(userData);
    		userData = undefined;
    	}

    	// Parameter route and each item of conditions must be functions
    	if (!route || typeof route != "function") {
    		throw Error("Invalid parameter route");
    	}

    	if (conditions && conditions.length) {
    		for (let i = 0; i < conditions.length; i++) {
    			if (!conditions[i] || typeof conditions[i] != "function") {
    				throw Error("Invalid parameter conditions[" + i + "]");
    			}
    		}
    	}

    	// Returns an object that contains all the functions to execute too
    	const obj = { route, userData };

    	if (conditions && conditions.length) {
    		obj.conditions = conditions;
    	}

    	// The _sveltesparouter flag is to confirm the object was created by this router
    	Object.defineProperty(obj, "_sveltesparouter", { value: true });

    	return obj;
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location$1 = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	return tick().then(() => {
    		window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    	});
    }

    function pop() {
    	// Execute this code when the current call stack is complete
    	return tick().then(() => {
    		window.history.back();
    	});
    }

    function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	return tick().then(() => {
    		const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    		try {
    			window.history.replaceState(undefined, undefined, dest);
    		} catch(e) {
    			// eslint-disable-next-line no-console
    			console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    		}

    		// The method above doesn't trigger the hashchange event, so let's do that manually
    		window.dispatchEvent(new Event("hashchange"));
    	});
    }

    function link(node, hrefVar) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, hrefVar || node.getAttribute("href"));

    	return {
    		update(updated) {
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, href) {
    	// Destination must start with '/'
    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute");
    	}

    	// Add # to the href attribute
    	node.setAttribute("href", "#" + href);
    }

    function nextTickPromise(cb) {
    	// eslint-disable-next-line no-console
    	console.warn("nextTickPromise from 'svelte-spa-router' is deprecated and will be removed in version 3; use the 'tick' method from the Svelte runtime instead");

    	return tick().then(cb);
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $loc,
    		$$unsubscribe_loc = noop;

    	validate_store(loc, "loc");
    	component_subscribe($$self, loc, $$value => $$invalidate(6, $loc = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent} component - Svelte component for the route
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.route;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    			} else {
    				this.component = component;
    				this.conditions = [];
    				this.userData = undefined;
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix && path.startsWith(prefix)) {
    				path = path.substr(prefix.length) || "/";
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				out[this._keys[i]] = matches[++i] || null;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {SvelteComponent} component - Svelte component
     * @property {string} name - Name of the Svelte component
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	const dispatchNextTick = (name, detail) => {
    		// Execute this code when the current call stack is complete
    		tick().then(() => {
    			dispatch(name, detail);
    		});
    	};

    	const writable_props = ["routes", "prefix"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, []);

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		tick,
    		wrap,
    		getLocation,
    		loc,
    		location: location$1,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		nextTickPromise,
    		createEventDispatcher,
    		regexparam,
    		routes,
    		prefix,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		dispatch,
    		dispatchNextTick,
    		$loc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*component, $loc*/ 65) {
    			// Handle hash change events
    			// Listen to changes in the $loc store and update the page
    			 {
    				// Find a route matching the location
    				$$invalidate(0, component = null);

    				let i = 0;

    				while (!component && i < routesList.length) {
    					const match = routesList[i].match($loc.location);

    					if (match) {
    						const detail = {
    							component: routesList[i].component,
    							name: routesList[i].component.name,
    							location: $loc.location,
    							querystring: $loc.querystring,
    							userData: routesList[i].userData
    						};

    						// Check if the route can be loaded - if all conditions succeed
    						if (!routesList[i].checkConditions(detail)) {
    							// Trigger an event to notify the user
    							dispatchNextTick("conditionsFailed", detail);

    							break;
    						}

    						$$invalidate(0, component = routesList[i].component);

    						// Set componentParams onloy if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    						// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    						if (match && typeof match == "object" && Object.keys(match).length) {
    							$$invalidate(1, componentParams = match);
    						} else {
    							$$invalidate(1, componentParams = null);
    						}

    						dispatchNextTick("routeLoaded", detail);
    					}

    					i++;
    				}
    			}
    		}
    	};

    	return [
    		component,
    		componentParams,
    		routes,
    		prefix,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { routes: 2, prefix: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function deserializeEntries(entriesObj) {
      let entries = { ...entriesObj };
      Object.entries(entries).map(([id, entry]) => {
        entry = { ...entry };
        entry.displayState = entry.displayState === 'COLLAPSED'
          ? EntryDisplayState.COLLAPSED
          : EntryDisplayState.EXPANDED;
        entries[id] = entry;
      });
      return entries;
    }

    function serializeEntries(entries) {
      let entriesObj = { ...entries };
      Object.entries(entriesObj).map(([id, entry]) => {
        entry = { ...entry };
        entry.displayState = entry.displayState === EntryDisplayState.COLLAPSED
          ? 'COLLAPSED'
          : 'EXPANDED';
        entriesObj[id] = entry;
      });
      return entriesObj;
    }

    // Expose.
    var linkedList = List;

    List.Item = ListItem;

    var ListPrototype = List.prototype;
    var ListItemPrototype = ListItem.prototype;
    var IterPrototype = Iter.prototype;

    /* istanbul ignore next */
    var $iterator = typeof Symbol === 'undefined' ? undefined : Symbol.iterator;

    ListPrototype.tail = ListPrototype.head = null;

    List.of = of;
    List.from = from;

    ListPrototype.toArray = toArray;
    ListPrototype.prepend = prepend;
    ListPrototype.append = append$1;

    /* istanbul ignore else */
    if ($iterator !== undefined) {
      ListPrototype[$iterator] = iterator;
    }

    ListItemPrototype.next = ListItemPrototype.prev = ListItemPrototype.list = null;

    ListItemPrototype.prepend = prependItem;
    ListItemPrototype.append = appendItem;
    ListItemPrototype.detach = detach$1;

    IterPrototype.next = next;

    // Constants.
    var errorMessage =
      'An argument without append, prepend, or detach methods was given to `List';

    // Creates a new List: A linked list is a bit like an Array, but knows nothing
    // about how many items are in it, and knows only about its first (`head`) and
    // last (`tail`) items.
    // Each item (e.g. `head`, `tail`, &c.) knows which item comes before or after
    // it (its more like the implementation of the DOM in JavaScript).
    function List(/* items... */) {
      this.size = 0;

      if (arguments.length !== 0) {
        appendAll(this, arguments);
      }
    }

    // Creates a new list from the arguments (each a list item) passed in.
    function appendAll(list, items) {
      var length;
      var index;
      var item;
      var iter;

      if (!items) {
        return list
      }

      if ($iterator !== undefined && items[$iterator]) {
        iter = items[$iterator]();
        item = {};

        while (!item.done) {
          item = iter.next();
          list.append(item && item.value);
        }
      } else {
        length = items.length;
        index = -1;

        while (++index < length) {
          list.append(items[index]);
        }
      }

      return list
    }

    // Creates a new list from the arguments (each a list item) passed in.
    function of(/* items... */) {
      return appendAll(new this(), arguments)
    }

    // Creates a new list from the given array-like object (each a list item) passed
    // in.
    function from(items) {
      return appendAll(new this(), items)
    }

    // Returns the list’s items as an array.
    // This does *not* detach the items.
    function toArray() {
      var item = this.head;
      var result = [];

      while (item) {
        result.push(item);
        item = item.next;
      }

      return result
    }

    // Prepends the given item to the list.
    // `item` will be the new first item (`head`).
    function prepend(item) {
      var self = this;
      var head = self.head;

      if (!item) {
        return false
      }

      if (!item.append || !item.prepend || !item.detach) {
        throw new Error(errorMessage + '#prepend`.')
      }

      if (head) {
        return head.prepend(item)
      }

      item.detach();

      item.list = self;
      self.head = item;
      self.size++;

      return item
    }

    // Appends the given item to the list.
    // `item` will be the new last item (`tail`) if the list had a first item, and
    // its first item (`head`) otherwise.
    function append$1(item) {
      if (!item) {
        return false
      }

      if (!item.append || !item.prepend || !item.detach) {
        throw new Error(errorMessage + '#append`.')
      }

      var self = this;
      var head = self.head;
      var tail = self.tail;

      // If self has a last item, defer appending to the last items append method,
      // and return the result.
      if (tail) {
        return tail.append(item)
      }

      // If self has a first item, defer appending to the first items append method,
      // and return the result.
      if (head) {
        return head.append(item)
      }

      // …otherwise, there is no `tail` or `head` item yet.

      item.detach();

      item.list = self;
      self.head = item;
      self.size++;

      return item
    }

    // Creates an iterator from the list.
    function iterator() {
      return new Iter(this.head)
    }

    // Creates a new ListItem:
    // An item is a bit like DOM node: It knows only about its "parent" (`list`),
    // the item before it (`prev`), and the item after it (`next`).
    function ListItem() {}

    // Detaches the item operated on from its parent list.
    function detach$1() {
      var self = this;
      var list = self.list;
      var prev = self.prev;
      var next = self.next;

      if (!list) {
        return self
      }

      // If self is the last item in the parent list, link the lists last item to
      // the previous item.
      if (list.tail === self) {
        list.tail = prev;
      }

      // If self is the first item in the parent list, link the lists first item to
      // the next item.
      if (list.head === self) {
        list.head = next;
      }

      // If both the last and first items in the parent list are the same, remove
      // the link to the last item.
      if (list.tail === list.head) {
        list.tail = null;
      }

      // If a previous item exists, link its next item to selfs next item.
      if (prev) {
        prev.next = next;
      }

      // If a next item exists, link its previous item to selfs previous item.
      if (next) {
        next.prev = prev;
      }

      // Remove links from self to both the next and previous items, and to the
      // parent list.
      self.prev = self.next = self.list = null;

      list.size--;

      return self
    }

    // Prepends the given item *before* the item operated on.
    function prependItem(item) {
      if (!item || !item.append || !item.prepend || !item.detach) {
        throw new Error(errorMessage + 'Item#prepend`.')
      }

      var self = this;
      var list = self.list;
      var prev = self.prev;

      // If self is detached, return false.
      if (!list) {
        return false
      }

      // Detach the prependee.
      item.detach();

      // If self has a previous item...
      if (prev) {
        item.prev = prev;
        prev.next = item;
      }

      // Connect the prependee.
      item.next = self;
      item.list = list;

      // Set the previous item of self to the prependee.
      self.prev = item;

      // If self is the first item in the parent list, link the lists first item to
      // the prependee.
      if (self === list.head) {
        list.head = item;
      }

      // If the the parent list has no last item, link the lists last item to self.
      if (!list.tail) {
        list.tail = self;
      }

      list.size++;

      return item
    }

    // Appends the given item *after* the item operated on.
    function appendItem(item) {
      if (!item || !item.append || !item.prepend || !item.detach) {
        throw new Error(errorMessage + 'Item#append`.')
      }

      var self = this;
      var list = self.list;
      var next = self.next;

      if (!list) {
        return false
      }

      // Detach the appendee.
      item.detach();

      // If self has a next item…
      if (next) {
        item.next = next;
        next.prev = item;
      }

      // Connect the appendee.
      item.prev = self;
      item.list = list;

      // Set the next item of self to the appendee.
      self.next = item;

      // If the the parent list has no last item or if self is the parent lists last
      // item, link the lists last item to the appendee.
      if (self === list.tail || !list.tail) {
        list.tail = item;
      }

      list.size++;

      return item
    }

    // Creates a new `Iter` for looping over the `LinkedList`.
    function Iter(item) {
      this.item = item;
    }

    // Move the `Iter` to the next item.
    function next() {
      var current = this.item;
      this.value = current;
      this.done = !current;
      this.item = current ? current.next : undefined;
      return this
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var inherits_browser = createCommonjsModule(function (module) {
    if (typeof Object.create === 'function') {
      // implementation from standard node.js 'util' module
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      // old school shim for old browsers
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function () {};
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
    });

    inherits_browser(LinkedList, linkedList);
    inherits_browser(LinkedListItem, linkedList.Item);

    LinkedList.Item = LinkedListItem;

    function LinkedList() {
        linkedList.apply(this, arguments);
    }

    LinkedList.prototype.get = function(n) {
        // TODO: error checking
        let curr = this.head;
        for (var i = 0; i < n; ++i) {
            curr = curr.next;
        }
        return curr;
    };

    function LinkedListItem(value) {
        this.value = value;
        linkedList.Item.apply(this, arguments);
    }

    function isObject(obj) {
      return obj === Object(obj);
    }

    class FlowyTreeNode {
      constructor(id, parentId, children) {
        this.id = id;
        this.parentId = parentId;

        // LinkedList<FlowyTreeNode>
        this.children = children || new LinkedList();
      }

      // returns: a FlowyTreeNode which corresponds to the specification in treeObj
      static fromTreeObj(treeObj, parentId) {
        let rootKey = Object.keys(treeObj)[0];
        let currNode = treeObj[rootKey];
        let currId = rootKey === "root" ? null : parseInt(rootKey);
        let nodesArray = Array.from(
          currNode,
          child => new LinkedListItem(
            isObject(child)
              ? FlowyTreeNode.fromTreeObj(child, currId)
              : new FlowyTreeNode(child, currId)));
        // a linked list of (LinkedListItems of) FlowyTreeNodes, one for each child in treeObj
        let nodesList = new LinkedList(...nodesArray);

        parentId = parentId === 0 ? parentId : (parentId || null);
        return new FlowyTreeNode(currId, parentId, nodesList);
      }

      getId() {
        return this.id;
      }

      hasParent() {
        return this.parentId === 0 || this.parentId;
      }

      getParentId() {
        return this.parentId;
      }

      setParentId(parentId) {
        this.parentId = parentId;
      }

      hasChildren() {
        return this.children.size > 0;
      }

      getChildren() {
        return this.children;
      }

      appendChildItem(item) {
        return this.children.append(item);
      }

      // TODO: rename to getChildItemArray?
      getChildNodeArray() {
        return this.children.toArray();
      }

      getLastChildNode() {
        // a quirk of the linked list library we use is that when the list has 1
        // element, tail = null
        return this.children.size > 1
          ? this.children.tail.value
          : this.children.head.value;
      }

      toTreeObj() {
        if (this.hasChildren()) {
          let rootKey = this.getId() == null ? 'root' : ''+this.getId();
          let result = {};
          result[rootKey] = this.getChildNodeArray().map(item => item.value.toTreeObj());
          return result;
        }
        return this.getId();
      }

    }

    class Queue {
      constructor() {
        this.list = new LinkedList();
      }

      add(x) {
        this.list.append(new LinkedListItem(x));
      }

      remove() {
        if (this.list.head) {
          let head = this.list.head.value;
          this.list.head.detach();
          return head;
        }
      }

      isEmpty() {
        return this.list.size === 0;
      }
    }

    class FlowyTree {
      // entries: Map<EntryId, { text: String, (displayState: EntryDisplayState)?, (headingLevel: number)? }>
      // root: FlowyTreeNode
      // entryItems: Map<EntryId, LinkedListItem<FlowyTreeNode>>
      constructor(entries, root) {
        this.entries = entries;
        // this.root = new FlowyTreeNode(null, null, entriesList);
        this.root = root;

        let q = new Queue();
        let entryItems = {};
        let item;
        this.root.getChildNodeArray().forEach(it => q.add(it));
        while (!q.isEmpty()) {
          item = q.remove();
          entryItems[item.value.getId()] = item;
          item.value.getChildNodeArray().forEach(it => q.add(it));
        }

        this.entryItems = entryItems;
      }

      getTopEntryId() {
        return this.root.getChildren().head.value.getId();
      }

      getEntries() {
        return this.entries;
      }

      getRoot() {
        return this.root;
      }

      getEntryTexts() {
        return this.root.getChildren().toArray().map(item => this.entries[item.value.getId()].text)
      }

      hasEntryAbove(entryId) {
        return this.entryItems[entryId].prev !== null
          || this.entryItems[entryId].value.getParentId() !== null;
      }


      getLastAncestorNode(node) {
        let curr = node;
        while (curr.hasChildren()) {
          curr = curr.getLastChildNode();
        }
        return curr;
      }

      getNextSiblingOfFirstAncestor(node) {
        // while there's a parent
        //   check if parent node has a next sibling
        //   if yes, return it
        // return null
        let currId = node.getId();
        while (this.entryItems[currId].value.hasParent()) {
          currId = this.entryItems[currId].value.getParentId();
          if (this.entryItems[currId].next) {
            return this.entryItems[currId].next.value;
          }
        }
        return null;
      }

      getEntryIdAbove(entryId) {
        if (this.entryItems[entryId].prev !== null) {
          let prevNode = this.entryItems[entryId].prev.value;
          return this.getLastAncestorNode(prevNode).getId();
        }

        // return the parentId, or null if none
        return this.entryItems[entryId].value.parentId;
      }

      getEntryIdAboveWithCollapse(entryId) {
        // TODO: find if the entry id above is the child of a collapsed node, and if so go to the last one
        let provId = this.getEntryIdAbove(entryId);

        // traverse ancestor chain, looking for earliest collapsed ancestor
        let oldestId = null;
        let currId = this.getEntryItem(provId).value.getParentId();

        while (currId != null) {
          // check if current is collapsed
          if (this.getEntryDisplayState(currId) === EntryDisplayState.COLLAPSED) {
            oldestId = currId;
          }
          currId = this.getEntryItem(currId).value.getParentId();
        }

        return oldestId == null ? provId : oldestId;
      }

      // true iff it has a child or next sibling or if an ancestor has a next sibling
      hasEntryBelow(entryId) {
        let entryItem = this.entryItems[entryId];
        return entryItem.value.getChildren().size > 0
          || entryItem.next !== null
          || this.entryAncestorHasNextSibling(entryId);
      }

      getEntryIdBelowWithCollapse(entryId) {
        // if entry is collapsed ignore children
        if (this.getEntryDisplayState(entryId) !== EntryDisplayState.COLLAPSED) {
          // return first child id, if it exists
          let ch = this.entryItems[entryId].value.getChildren();
          if (ch.size > 0) {
            return ch.head.value.getId();
          }
        }

        // get next sibling if it exists
        if (this.entryItems[entryId].next !== null) {
          return this.entryItems[entryId].next.value.getId();
        }
        // there's no child and no next sibling, find first ancestor with a next sibling
        let nextSib = this.getNextSiblingOfFirstAncestor(this.entryItems[entryId].value);
        return nextSib ? nextSib.getId() : null;
      }


      entryAncestorHasNextSibling(entryId) {
        let node = this.entryItems[entryId].value;
        if (node.parentId === null) {
          return false;
        }

        // while there's a parent
        //   check if parent node has a next sibling
        //   if yes, return true
        // return false
        let currId = node.getId();
        while (this.entryItems[currId].value.parentId !== null) {
          currId = this.entryItems[currId].value.parentId;
          if (this.entryItems[currId].next) {
            return true;
          }
        }
        return false;
      }

      getEntryText(entryId) {
        return this.entries[entryId].text;
      }

      getEntryDisplayState(entryId) {
        let val = (this.entries[entryId] != null) && this.entries[entryId].displayState || EntryDisplayState.EXPANDED;
        return val;
      }

      getEntryHeadingSize(entryId) {
        return this.entries[entryId].headingSize || 0;
      }

      getEntryItem(entryId) {
        return this.entryItems[entryId];
      }

      setEntryText(entryId, value) {
        if (this.entries[entryId] == null) {
          this.entries[entryId] = {};
        }
        this.entries[entryId].text = value;
      }

      setEntryDisplayState(entryId, newState) {
        if (this.entries[entryId] == null) {
          this.entries[entryId] = {};
        }
        this.entries[entryId].displayState = newState;
      }

      getParentId(entryId) {
        return this.entryItems[entryId].value.parentId;
      }

      // returns: the id of the new entry
      insertEntryBelow(entryId, parentId, newEntryText) {
        // TODO: dedupe with insertEntryAbove
        let existingIds = Object.keys(this.entries).map(id => parseInt(id));
        let newId = Math.max(...existingIds) + 1;
        this.setEntryText(newId, newEntryText);

        let newNode = new LinkedListItem(new FlowyTreeNode(newId, parentId));
        let prevItem = this.entryItems[entryId];
        prevItem.append(newNode);

        this.entryItems[newId] = newNode;
        return newId;
      }

      insertEntryAbove(entryId, parentId, newEntryText) {
        let existingIds = Object.keys(this.entries).map(id => parseInt(id));
        let newId = Math.max(...existingIds) + 1;
        this.setEntryText(newId, newEntryText);

        let newNode = new LinkedListItem(new FlowyTreeNode(newId, parentId));
        let prevItem = this.entryItems[entryId];
        prevItem.prepend(newNode);

        this.entryItems[newId] = newNode;
      }

      removeEntry(entryId) {
        let item = this.entryItems[entryId];
        delete this.entries[entryId];
        item.detach();
      }

      size() {
        return this.entries.length;
      }

      hasPrevSibling(entryId) {
        return this.entryItems[entryId].prev !== null;
      }
      hasNextSibling(entryId) {
        return this.entryItems[entryId].next !== null;
      }

      getPrevSiblingNode(entryId) {
        return this.entryItems[entryId].prev.value;
      }
      getNextSiblingNode(entryId) {
        return this.entryItems[entryId].next.value;
      }

      // (entryIdA, entryIdB) must be (previous, next)
      swapAdjacentSiblings(entryIdA, entryIdB) {
        let itemA = this.getEntryItem(entryIdA);
        let itemB = this.getEntryItem(entryIdB);
        if (itemA.next !== itemB) {
          return
        }
        itemA.detach();
        itemB.append(itemA);
      }

      cycleEntryHeadingSize(entryId) {
        if (!(entryId in this.entries)) {
          return;
        }
        let currHeadingSize = this.entries[entryId].headingSize || 0;
        this.entries[entryId].headingSize = (currHeadingSize + 1) % 4;
      }
    }

    var parsimmon_umd_min = createCommonjsModule(function (module, exports) {
    !function(n,t){module.exports=t();}("undefined"!=typeof self?self:commonjsGlobal,function(){return function(n){var t={};function r(e){if(t[e])return t[e].exports;var u=t[e]={i:e,l:!1,exports:{}};return n[e].call(u.exports,u,u.exports,r),u.l=!0,u.exports}return r.m=n,r.c=t,r.d=function(n,t,e){r.o(n,t)||Object.defineProperty(n,t,{configurable:!1,enumerable:!0,get:e});},r.r=function(n){Object.defineProperty(n,"__esModule",{value:!0});},r.n=function(n){var t=n&&n.__esModule?function(){return n.default}:function(){return n};return r.d(t,"a",t),t},r.o=function(n,t){return Object.prototype.hasOwnProperty.call(n,t)},r.p="",r(r.s=0)}([function(n,t,r){function e(n){if(!(this instanceof e))return new e(n);this._=n;}var u=e.prototype;function o(n,t){for(var r=0;r<n;r++)t(r);}function i(n,t,r){return function(n,t){o(t.length,function(r){n(t[r],r,t);});}(function(r,e,u){t=n(t,r,e,u);},r),t}function f(n,t){return i(function(t,r,e,u){return t.concat([n(r,e,u)])},[],t)}function a(n,t){var r={v:0,buf:t};return o(n,function(){var n;r={v:r.v<<1|(n=r.buf,n[0]>>7),buf:function(n){var t=i(function(n,t,r,e){return n.concat(r===e.length-1?Buffer.from([t,0]).readUInt16BE(0):e.readUInt16BE(r))},[],n);return Buffer.from(f(function(n){return (n<<1&65535)>>8},t))}(r.buf)};}),r}function c(){return "undefined"!=typeof Buffer}function s(){if(!c())throw new Error("Buffer global does not exist; please use webpack if you need to parse Buffers in the browser.")}function l(n){s();var t=i(function(n,t){return n+t},0,n);if(t%8!=0)throw new Error("The bits ["+n.join(", ")+"] add up to "+t+" which is not an even number of bytes; the total should be divisible by 8");var r,u=t/8,o=(r=function(n){return n>48},i(function(n,t){return n||(r(t)?t:n)},null,n));if(o)throw new Error(o+" bit range requested exceeds 48 bit (6 byte) Number max.");return new e(function(t,r){var e=u+r;return e>t.length?x(r,u.toString()+" bytes"):b(e,i(function(n,t){var r=a(t,n.buf);return {coll:n.coll.concat(r.v),buf:r.buf}},{coll:[],buf:t.slice(r,e)},n).coll)})}function p(n,t){return new e(function(r,e){return s(),e+t>r.length?x(e,t+" bytes for "+n):b(e+t,r.slice(e,e+t))})}function h(n,t){if("number"!=typeof(r=t)||Math.floor(r)!==r||t<0||t>6)throw new Error(n+" requires integer length in range [0, 6].");var r;}function d(n){return h("uintBE",n),p("uintBE("+n+")",n).map(function(t){return t.readUIntBE(0,n)})}function v(n){return h("uintLE",n),p("uintLE("+n+")",n).map(function(t){return t.readUIntLE(0,n)})}function g(n){return h("intBE",n),p("intBE("+n+")",n).map(function(t){return t.readIntBE(0,n)})}function m(n){return h("intLE",n),p("intLE("+n+")",n).map(function(t){return t.readIntLE(0,n)})}function y(n){return n instanceof e}function E(n){return "[object Array]"==={}.toString.call(n)}function w(n){return c()&&Buffer.isBuffer(n)}function b(n,t){return {status:!0,index:n,value:t,furthest:-1,expected:[]}}function x(n,t){return E(t)||(t=[t]),{status:!1,index:-1,value:null,furthest:n,expected:t}}function B(n,t){if(!t)return n;if(n.furthest>t.furthest)return n;var r=n.furthest===t.furthest?function(n,t){if(function(){if(void 0!==e._supportsSet)return e._supportsSet;var n="undefined"!=typeof Set;return e._supportsSet=n,n}()&&Array.from){for(var r=new Set(n),u=0;u<t.length;u++)r.add(t[u]);var o=Array.from(r);return o.sort(),o}for(var i={},f=0;f<n.length;f++)i[n[f]]=!0;for(var a=0;a<t.length;a++)i[t[a]]=!0;var c=[];for(var s in i)({}).hasOwnProperty.call(i,s)&&c.push(s);return c.sort(),c}(n.expected,t.expected):t.expected;return {status:n.status,index:n.index,value:n.value,furthest:t.furthest,expected:r}}var j={};function O(n,t){if(w(n))return {offset:t,line:-1,column:-1};if(j.input===n&&j.i===t)return j.value;var r=n.slice(0,t).split("\n"),e={offset:t,line:r.length,column:r[r.length-1].length+1};return j.input=n,j.i=t,j.value=e,e}function S(n){if(!y(n))throw new Error("not a parser: "+n)}function _(n,t){return "string"==typeof n?n.charAt(t):n[t]}function L(n){if("number"!=typeof n)throw new Error("not a number: "+n)}function k(n){if("function"!=typeof n)throw new Error("not a function: "+n)}function P(n){if("string"!=typeof n)throw new Error("not a string: "+n)}var q=2,A=3,I=8,F=5*I,M=4*I,z="  ";function R(n,t){return new Array(t+1).join(n)}function U(n,t,r){var e=t-n.length;return e<=0?n:R(r,e)+n}function W(n,t,r,e){return {from:n-t>0?n-t:0,to:n+r>e?e:n+r}}function D(n,t){var r,e,u,o,a,c=t.index,s=c.offset,l=1;if(s===n.length)return "Got the end of the input";if(w(n)){var p=s-s%I,h=s-p,d=W(p,F,M+I,n.length),v=f(function(n){return f(function(n){return U(n.toString(16),2,"0")},n)},function(n,t){var r=n.length,e=[],u=0;if(r<=t)return [n.slice()];for(var o=0;o<r;o++)e[u]||e.push([]),e[u].push(n[o]),(o+1)%t==0&&u++;return e}(n.slice(d.from,d.to).toJSON().data,I));o=function(n){return 0===n.from&&1===n.to?{from:n.from,to:n.to}:{from:n.from/I,to:Math.floor(n.to/I)}}(d),e=p/I,r=3*h,h>=4&&(r+=1),l=2,u=f(function(n){return n.length<=4?n.join(" "):n.slice(0,4).join(" ")+"  "+n.slice(4).join(" ")},v),(a=(8*(o.to>0?o.to-1:o.to)).toString(16).length)<2&&(a=2);}else {var g=n.split(/\r\n|[\n\r\u2028\u2029]/);r=c.column-1,e=c.line-1,o=W(e,q,A,g.length),u=g.slice(o.from,o.to),a=o.to.toString().length;}var m=e-o.from;return w(n)&&(a=(8*(o.to>0?o.to-1:o.to)).toString(16).length)<2&&(a=2),i(function(t,e,u){var i,f=u===m,c=f?"> ":z;return i=w(n)?U((8*(o.from+u)).toString(16),a,"0"):U((o.from+u+1).toString(),a," "),[].concat(t,[c+i+" | "+e],f?[z+R(" ",a)+" | "+U("",r," ")+R("^",l)]:[])},[],u).join("\n")}function N(n,t){return ["\n","-- PARSING FAILED "+R("-",50),"\n\n",D(n,t),"\n\n",(r=t.expected,1===r.length?"Expected:\n\n"+r[0]:"Expected one of the following: \n\n"+r.join(", ")),"\n"].join("");var r;}function G(n){var t=""+n;return t.slice(t.lastIndexOf("/")+1)}function J(){for(var n=[].slice.call(arguments),t=n.length,r=0;r<t;r+=1)S(n[r]);return e(function(r,e){for(var u,o=new Array(t),i=0;i<t;i+=1){if(!(u=B(n[i]._(r,e),u)).status)return u;o[i]=u.value,e=u.index;}return B(b(e,o),u)})}function T(){var n=[].slice.call(arguments);if(0===n.length)throw new Error("seqMap needs at least one argument");var t=n.pop();return k(t),J.apply(null,n).map(function(n){return t.apply(null,n)})}function V(){var n=[].slice.call(arguments),t=n.length;if(0===t)return Y("zero alternates");for(var r=0;r<t;r+=1)S(n[r]);return e(function(t,r){for(var e,u=0;u<n.length;u+=1)if((e=B(n[u]._(t,r),e)).status)return e;return e})}function C(n,t){return H(n,t).or(X([]))}function H(n,t){return S(n),S(t),T(n,t.then(n).many(),function(n,t){return [n].concat(t)})}function K(n){P(n);var t="'"+n+"'";return e(function(r,e){var u=e+n.length,o=r.slice(e,u);return o===n?b(u,o):x(e,t)})}function Q(n,t){!function(n){if(!(n instanceof RegExp))throw new Error("not a regexp: "+n);for(var t=G(n),r=0;r<t.length;r++){var e=t.charAt(r);if("i"!==e&&"m"!==e&&"u"!==e&&"s"!==e)throw new Error('unsupported regexp flag "'+e+'": '+n)}}(n),arguments.length>=2?L(t):t=0;var r=function(n){return RegExp("^(?:"+n.source+")",G(n))}(n),u=""+n;return e(function(n,e){var o=r.exec(n.slice(e));if(o){if(0<=t&&t<=o.length){var i=o[0],f=o[t];return b(e+i.length,f)}return x(e,"valid match group (0 to "+o.length+") in "+u)}return x(e,u)})}function X(n){return e(function(t,r){return b(r,n)})}function Y(n){return e(function(t,r){return x(r,n)})}function Z(n){if(y(n))return e(function(t,r){var e=n._(t,r);return e.index=r,e.value="",e});if("string"==typeof n)return Z(K(n));if(n instanceof RegExp)return Z(Q(n));throw new Error("not a string, regexp, or parser: "+n)}function $(n){return S(n),e(function(t,r){var e=n._(t,r),u=t.slice(r,e.index);return e.status?x(r,'not "'+u+'"'):b(r,null)})}function nn(n){return k(n),e(function(t,r){var e=_(t,r);return r<t.length&&n(e)?b(r+1,e):x(r,"a character/byte matching "+n)})}function tn(n,t){arguments.length<2&&(t=n,n=void 0);var r=e(function(n,e){return r._=t()._,r._(n,e)});return n?r.desc(n):r}function rn(){return Y("fantasy-land/empty")}u.parse=function(n){if("string"!=typeof n&&!w(n))throw new Error(".parse must be called with a string or Buffer as its argument");var t=this.skip(fn)._(n,0);return t.status?{status:!0,value:t.value}:{status:!1,index:O(n,t.furthest),expected:t.expected}},u.tryParse=function(n){var t=this.parse(n);if(t.status)return t.value;var r=N(n,t),e=new Error(r);throw e.type="ParsimmonError",e.result=t,e},u.assert=function(n,t){return this.chain(function(r){return n(r)?X(r):Y(t)})},u.or=function(n){return V(this,n)},u.trim=function(n){return this.wrap(n,n)},u.wrap=function(n,t){return T(n,this,t,function(n,t){return t})},u.thru=function(n){return n(this)},u.then=function(n){return S(n),J(this,n).map(function(n){return n[1]})},u.many=function(){var n=this;return e(function(t,r){for(var e=[],u=void 0;;){if(!(u=B(n._(t,r),u)).status)return B(b(r,e),u);if(r===u.index)throw new Error("infinite loop detected in .many() parser --- calling .many() on a parser which can accept zero characters is usually the cause");r=u.index,e.push(u.value);}})},u.tieWith=function(n){return P(n),this.map(function(t){if(function(n){if(!E(n))throw new Error("not an array: "+n)}(t),t.length){P(t[0]);for(var r=t[0],e=1;e<t.length;e++)P(t[e]),r+=n+t[e];return r}return ""})},u.tie=function(){return this.tieWith("")},u.times=function(n,t){var r=this;return arguments.length<2&&(t=n),L(n),L(t),e(function(e,u){for(var o=[],i=void 0,f=void 0,a=0;a<n;a+=1){if(f=B(i=r._(e,u),f),!i.status)return f;u=i.index,o.push(i.value);}for(;a<t&&(f=B(i=r._(e,u),f),i.status);a+=1)u=i.index,o.push(i.value);return B(b(u,o),f)})},u.result=function(n){return this.map(function(){return n})},u.atMost=function(n){return this.times(0,n)},u.atLeast=function(n){return T(this.times(n),this.many(),function(n,t){return n.concat(t)})},u.map=function(n){k(n);var t=this;return e(function(r,e){var u=t._(r,e);return u.status?B(b(u.index,n(u.value)),u):u})},u.contramap=function(n){k(n);var t=this;return e(function(r,e){var u=t.parse(n(r.slice(e)));return u.status?b(e+r.length,u.value):u})},u.promap=function(n,t){return k(n),k(t),this.contramap(n).map(t)},u.skip=function(n){return J(this,n).map(function(n){return n[0]})},u.mark=function(){return T(en,this,en,function(n,t,r){return {start:n,value:t,end:r}})},u.node=function(n){return T(en,this,en,function(t,r,e){return {name:n,value:r,start:t,end:e}})},u.sepBy=function(n){return C(this,n)},u.sepBy1=function(n){return H(this,n)},u.lookahead=function(n){return this.skip(Z(n))},u.notFollowedBy=function(n){return this.skip($(n))},u.desc=function(n){E(n)||(n=[n]);var t=this;return e(function(r,e){var u=t._(r,e);return u.status||(u.expected=n),u})},u.fallback=function(n){return this.or(X(n))},u.ap=function(n){return T(n,this,function(n,t){return n(t)})},u.chain=function(n){var t=this;return e(function(r,e){var u=t._(r,e);return u.status?B(n(u.value)._(r,u.index),u):u})},u.concat=u.or,u.empty=rn,u.of=X,u["fantasy-land/ap"]=u.ap,u["fantasy-land/chain"]=u.chain,u["fantasy-land/concat"]=u.concat,u["fantasy-land/empty"]=u.empty,u["fantasy-land/of"]=u.of,u["fantasy-land/map"]=u.map;var en=e(function(n,t){return b(t,O(n,t))}),un=e(function(n,t){return t>=n.length?x(t,"any character/byte"):b(t+1,_(n,t))}),on=e(function(n,t){return b(n.length,n.slice(t))}),fn=e(function(n,t){return t<n.length?x(t,"EOF"):b(t,null)}),an=Q(/[0-9]/).desc("a digit"),cn=Q(/[0-9]*/).desc("optional digits"),sn=Q(/[a-z]/i).desc("a letter"),ln=Q(/[a-z]*/i).desc("optional letters"),pn=Q(/\s*/).desc("optional whitespace"),hn=Q(/\s+/).desc("whitespace"),dn=K("\r"),vn=K("\n"),gn=K("\r\n"),mn=V(gn,vn,dn).desc("newline"),yn=V(mn,fn);e.all=on,e.alt=V,e.any=un,e.cr=dn,e.createLanguage=function(n){var t={};for(var r in n)({}).hasOwnProperty.call(n,r)&&function(r){t[r]=tn(function(){return n[r](t)});}(r);return t},e.crlf=gn,e.custom=function(n){return e(n(b,x))},e.digit=an,e.digits=cn,e.empty=rn,e.end=yn,e.eof=fn,e.fail=Y,e.formatError=N,e.index=en,e.isParser=y,e.lazy=tn,e.letter=sn,e.letters=ln,e.lf=vn,e.lookahead=Z,e.makeFailure=x,e.makeSuccess=b,e.newline=mn,e.noneOf=function(n){return nn(function(t){return n.indexOf(t)<0}).desc("none of '"+n+"'")},e.notFollowedBy=$,e.of=X,e.oneOf=function(n){for(var t=n.split(""),r=0;r<t.length;r++)t[r]="'"+t[r]+"'";return nn(function(t){return n.indexOf(t)>=0}).desc(t)},e.optWhitespace=pn,e.Parser=e,e.range=function(n,t){return nn(function(r){return n<=r&&r<=t}).desc(n+"-"+t)},e.regex=Q,e.regexp=Q,e.sepBy=C,e.sepBy1=H,e.seq=J,e.seqMap=T,e.seqObj=function(){for(var n,t={},r=0,u=(n=arguments,Array.prototype.slice.call(n)),o=u.length,i=0;i<o;i+=1){var f=u[i];if(!y(f)){if(E(f)&&2===f.length&&"string"==typeof f[0]&&y(f[1])){var a=f[0];if(Object.prototype.hasOwnProperty.call(t,a))throw new Error("seqObj: duplicate key "+a);t[a]=!0,r++;continue}throw new Error("seqObj arguments must be parsers or [string, parser] array pairs.")}}if(0===r)throw new Error("seqObj expects at least one named parser, found zero");return e(function(n,t){for(var r,e={},i=0;i<o;i+=1){var f,a;if(E(u[i])?(f=u[i][0],a=u[i][1]):(f=null,a=u[i]),!(r=B(a._(n,t),r)).status)return r;f&&(e[f]=r.value),t=r.index;}return B(b(t,e),r)})},e.string=K,e.succeed=X,e.takeWhile=function(n){return k(n),e(function(t,r){for(var e=r;e<t.length&&n(_(t,e));)e++;return b(e,t.slice(r,e))})},e.test=nn,e.whitespace=hn,e["fantasy-land/empty"]=rn,e["fantasy-land/of"]=X,e.Binary={bitSeq:l,bitSeqObj:function(n){s();var t={},r=0,e=f(function(n){if(E(n)){var e=n;if(2!==e.length)throw new Error("["+e.join(", ")+"] should be length 2, got length "+e.length);if(P(e[0]),L(e[1]),Object.prototype.hasOwnProperty.call(t,e[0]))throw new Error("duplicate key in bitSeqObj: "+e[0]);return t[e[0]]=!0,r++,e}return L(n),[null,n]},n);if(r<1)throw new Error("bitSeqObj expects at least one named pair, got ["+n.join(", ")+"]");var u=f(function(n){return n[0]},e);return l(f(function(n){return n[1]},e)).map(function(n){return i(function(n,t){return null!==t[0]&&(n[t[0]]=t[1]),n},{},f(function(t,r){return [t,n[r]]},u))})},byte:function(n){if(s(),L(n),n>255)throw new Error("Value specified to byte constructor ("+n+"=0x"+n.toString(16)+") is larger in value than a single byte.");var t=(n>15?"0x":"0x0")+n.toString(16);return e(function(r,e){var u=_(r,e);return u===n?b(e+1,u):x(e,t)})},buffer:function(n){return p("buffer",n).map(function(n){return Buffer.from(n)})},encodedString:function(n,t){return p("string",t).map(function(t){return t.toString(n)})},uintBE:d,uint8BE:d(1),uint16BE:d(2),uint32BE:d(4),uintLE:v,uint8LE:v(1),uint16LE:v(2),uint32LE:v(4),intBE:g,int8BE:g(1),int16BE:g(2),int32BE:g(4),intLE:m,int8LE:m(1),int16LE:m(2),int32LE:m(4),floatBE:p("floatBE",4).map(function(n){return n.readFloatBE(0)}),floatLE:p("floatLE",4).map(function(n){return n.readFloatLE(0)}),doubleBE:p("doubleBE",8).map(function(n){return n.readDoubleBE(0)}),doubleLE:p("doubleLE",8).map(function(n){return n.readDoubleLE(0)})},n.exports=e;}])});
    });

    var Parsimmon = unwrapExports(parsimmon_umd_min);
    var parsimmon_umd_min_1 = parsimmon_umd_min.Parsimmon;

    function isString(x) {
      return Object.prototype.toString.call(x) === "[object String]";
    }

    function escapeSpecialCharacter(c) {
      switch (c) {
        case '"':
          return "&quot;";
        case '&':
          return "&amp;";
        case '<':
          return "&lt;";
        case '>':
          return "&gt;";
        default:
          return c;
      }
    }

    function combineParseResults(values) {
      // values: an array of (string || { html: string, linkedPage: string })
      let normalizedValues = [];
      let linkedPages = [];
      values.forEach(val => {
        if (isString(val)) {
          normalizedValues.push(val);
        } else {
          normalizedValues.push(val.html);
          linkedPages = linkedPages.concat(val.linkedPages);
        }
      });
      return {
        html: normalizedValues.join(''),
        linkedPages: linkedPages
      };
    }

    const MarkupParser = Parsimmon.createLanguage({
      EscapedPunctuation: function () {
        return Parsimmon.string("\\")
          .then(Parsimmon.regexp(/[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/).map(s => escapeSpecialCharacter(s)))
      },
      Char: function () {
        return Parsimmon.any.map(s => escapeSpecialCharacter(s));
      },
      CharInsideStrong: function (r) {
        return Parsimmon.notFollowedBy(r.StrongDelimiter).then(r.Char);
      },
      CharInsideEmphasis: function (r) {
        return Parsimmon.notFollowedBy(r.EmphasisDelimiter).then(r.Char);
      },
      InlineMathjaxDelimiter: function () {
        return Parsimmon.string('$');
      },
      StrongDelimiter: function () {
        return Parsimmon.string('**');
      },
      EmphasisDelimiter: function () {
        return Parsimmon.string('__');
      },
      PageName: function(r) {
        return Parsimmon.notFollowedBy(Parsimmon.string("]"))
          .then(r.Char)
          .many()
          .map(result => result.join(''));
      },
      Strong: function (r) {
        return r.StrongDelimiter.notFollowedBy(Parsimmon.whitespace)
          .then(r.ValueInsideStrong.many())
          .skip(r.StrongDelimiter)
          .map(values => {
            let combined = combineParseResults(values);
            return {
              html: "<strong>" + combined.html + "</strong>",
              linkedPages: combined.linkedPages
            };
          });
      },
      Emphasis: function (r) {
        return r.EmphasisDelimiter.notFollowedBy(Parsimmon.whitespace)
          .then(r.ValueInsideEmphasis.many())
          .skip(r.EmphasisDelimiter)
          .map(values => {
            let combined = combineParseResults(values);
            return {
              html: "<em>" + combined.html + "</em>",
              linkedPages: combined.linkedPages
            };
          });
      },
      InlineMathjax: function (r) {
        return r.InlineMathjaxDelimiter.notFollowedBy(Parsimmon.whitespace)
          .then(Parsimmon.notFollowedBy(r.InlineMathjaxDelimiter).then(r.Char).many())
          .skip(Parsimmon.notFollowedBy(Parsimmon.whitespace).then(r.InlineMathjaxDelimiter))
          .map(result => "\\(" + result.join('') + "\\)");
      },
      InternalLink: function(r) {
        return Parsimmon.string("[[")
          .then(r.PageName)
          .skip(Parsimmon.string("]]"))
          .map(name => ({
            html: `<span class="internal-link">[[<a data-markup-link-type="internal" href="#/page/${encodeURI(name)}">${name}</a>]]</span>`,
            linkedPages: [name],
          }));
      },
      AutoLink: function() {
        return Parsimmon.regexp(/https?:\/\/(\w+\.)*\w+(\/(\w|[-.~:?=&%#])+)*\/?/)
          .map(s => `<a data-markup-link-type="auto" href="${s}">${s}</a>`);
      },
      StandardLink: function(r) {
        return Parsimmon.seqMap(
          Parsimmon.string("[").notFollowedBy(Parsimmon.string("[")),
          r.ValueInsideStandardLinkName.many(),
          Parsimmon.string("]"),
          Parsimmon.string("("),
          Parsimmon.notFollowedBy(Parsimmon.string(")")).then(r.Char).many(),
          Parsimmon.string(")"),
          function(_a, b, _c, _d, e, _f) {
            // the reason we throw away combineParseResults().linkedPages
            // is that it's not possible to have an internal link in the link body
            return `<a href="${e.join('')}">${combineParseResults(b).html}</a>`;
          }
        );
      },

      Link: function(r) {
        return Parsimmon.alt(
          r.InternalLink,
          r.StandardLink,
          r.AutoLink,
        );
      },
      // TODO: mathjax inside name?
      ValueInsideStandardLinkName: function (r) {
        return Parsimmon.alt(
          r.EscapedPunctuation,
          r.Strong,
          r.Emphasis,
          Parsimmon.notFollowedBy(Parsimmon.string("]")).then(r.Char)
        )
      },
      ValueInsideEmphasis: function (r) {
        return Parsimmon.alt(
          r.EscapedPunctuation,
          r.Strong,
          r.Link,
          r.InlineMathjax,
          r.CharInsideEmphasis);
      },
      ValueInsideStrong: function (r) {
        return Parsimmon.alt(
          r.EscapedPunctuation,
          r.Emphasis,
          r.Link,
          r.InlineMathjax,
          r.CharInsideStrong);
      },
      Value: function (r) {
        return Parsimmon.alt(
          r.EscapedPunctuation,
          r.Strong,
          r.Emphasis,
          r.Link,
          r.InlineMathjax,
          r.Char);
      },
      Text: function (r) {
        return r.Value.many().map(combineParseResults);
      }
    });

    class LinkGraph {
      // outAdjacency: { [doc id]: { [entry id]: Set<doc id> } }
      constructor(outAdjacency) {
        this.outAdjacency = outAdjacency;
        // inAdjacency: { [doc id]: Set<[doc id, entry id]> }
        // actually Set doesnt play well with arrays for our use case
        // so instead we store strings made by concat(docId, '-', entryId)
        let inAdjacency = {};
        Object.entries(outAdjacency).forEach(([docId, entries]) => {
          Object.entries(entries).forEach(([entryId, entryLinks]) => {
            for (let [id, _] of entryLinks.entries()) {
              if (!(id in inAdjacency)) {
                  inAdjacency[id] = new Set();
              }
              inAdjacency[id].add(this.convertToInAdjElement(docId, entryId));
            }
          });
        });
        console.log(" %^#^ LinkGraph, inAdjacency = ", inAdjacency);
        this.inAdjacency = inAdjacency;
      }

        convertToInAdjElement(docId, entryId) {
          return `${docId}-${entryId}`;
        }

        convertFromInAdjElement(s) {
          let parsed = s.split('-');
          return [parseInt(parsed[0]), parseInt(parsed[1])];
        }

        getBacklinks(docId) {
          if (!(docId in this.inAdjacency)) {
            return new Set();
          }
          let linksTo = this.inAdjacency[docId];
          return new Set([...linksTo].map(elem => this.convertFromInAdjElement(elem)));
        }

        // return: Set<doc id>
        getLinks(docId, entryId) {
          if (!(docId in this.outAdjacency) || !(entryId in this.outAdjacency[docId])) {
              return new Set();
          }
          return this.outAdjacency[docId][entryId];
        }

        removeLink(docIdFrom, entryId, docIdTo) {
          this.outAdjacency[docIdFrom][entryId].delete(docIdTo);
          this.inAdjacency[docIdTo].delete(this.convertToInAdjElement(docIdFrom, entryId));
        }

        addLink(docIdFrom, entryId, docIdTo) {
          if (!(docIdFrom in this.outAdjacency)) {
            this.outAdjacency[docIdFrom] = {};
          }
          if (!(entryId in this.outAdjacency[docIdFrom])) {
            this.outAdjacency[docIdFrom][entryId] = new Set();
          }
          if (!(docIdTo in this.inAdjacency)) {
            this.inAdjacency[docIdTo] = new Set();
          }
          this.outAdjacency[docIdFrom][entryId].add(docIdTo);
          this.inAdjacency[docIdTo].add(this.convertToInAdjElement(docIdFrom, entryId));
        }

        removeDoc(docId) {
          if (docId in this.outAdjacency) {
            delete this.outAdjacency[docId];
          }
          if (docId in this.inAdjacency) {
            delete this.inAdjacency[docId];
          }
        }
    }

    const EntryDisplayState = Object.freeze({
        COLLAPSED: Symbol("Colors.COLLAPSED"),
        EXPANDED: Symbol("Colors.EXPANDED"),
    });
    function getNowISO8601() {
        return new Date(Date.now()).toISOString();
    }
    function createNewDocument(newDocName, initEntryText, docs) {
        let existingIds = Object.keys(docs).map(id => parseInt(id));
        let newId = (Math.max(...existingIds) + 1).toString();
        let newTree = new FlowyTree({ 0: { text: initEntryText } }, FlowyTreeNode.fromTreeObj({ root: [0] }, null));
        return {
            id: newId,
            name: newDocName,
            lastUpdated: getNowISO8601(),
            tree: newTree,
        };
    }
    function makeTree(entries, treeObj) {
        let theRoot = FlowyTreeNode.fromTreeObj(treeObj, null);
        return new FlowyTree(entries, theRoot);
    }
    const LS_KEY = "itero-docs";
    class DataManager {
        constructor(dataStore) {
            this.dataStore = dataStore;
        }
        treeToSerializationObject(tree) {
            return {
                entries: serializeEntries(tree.getEntries()),
                node: tree.getRoot().toTreeObj()
            };
        }
        documentToSerializationObject(doc) {
            let newDoc = Object.assign({}, doc);
            newDoc.tree = this.treeToSerializationObject(newDoc.tree);
            return newDoc;
        }
        getDocumentsString() {
            const val = this.dataStore.get(LS_KEY);
            if (val == null) {
                let docs = makeInitDocuments();
                return this.saveDocuments(docs);
            }
            return val;
        }
        getDocuments() {
            const val = this.dataStore.get(LS_KEY);
            let docs;
            if (val == null) {
                docs = makeInitDocuments();
                this.saveDocuments(docs);
            }
            else {
                let treeObjDocs = JSON.parse(val);
                let deserDocs = {};
                Object.entries(treeObjDocs).forEach(([entryId, doc]) => {
                    let newDoc = Object.assign({}, doc);
                    if (!('lastUpdated' in doc)) {
                        newDoc.lastUpdated = getNowISO8601();
                    }
                    newDoc.tree = new FlowyTree(deserializeEntries(doc.tree.entries), FlowyTreeNode.fromTreeObj(doc.tree.node));
                    deserDocs[entryId] = newDoc;
                });
                docs = deserDocs;
            }
            return docs;
        }
        // documents: Map<EntryId, Document>
        // where type Document = {id: EntryId, name: String, tree: FlowyTree }
        saveDocuments(documents) {
            let serDocs = {};
            Object.entries(documents).forEach(([entryId, doc]) => {
                serDocs[entryId] = this.documentToSerializationObject(doc);
            });
            let ser = JSON.stringify(serDocs);
            this.dataStore.set(LS_KEY, ser);
            return ser;
        }
    }
    function makeDocIdLookup(docs) {
        // build up index: (doc name) -> (doc id)
        let docIdLookup = {};
        Object.entries(docs).forEach(([docId, doc]) => {
            docIdLookup[doc.name] = docId;
        });
        return docIdLookup;
    }
    function makeLinkGraph(docs, docIdLookup) {
        let outAdjacency = {};
        let newDocs = Object.assign({}, docs);
        Object.entries(docs).forEach(([docId, doc]) => {
            outAdjacency[docId] = {};
            let currDocEntries = outAdjacency[docId];
            Object.entries(doc.tree.getEntries()).forEach(([entryId, entry]) => {
                let parseResult = MarkupParser.Text.tryParse(entry.text);
                parseResult.linkedPages.forEach(page => {
                    if (!(entryId in currDocEntries)) {
                        currDocEntries[entryId] = new Set();
                    }
                    if (!(page in docIdLookup)) {
                        let newDoc = createNewDocument(page, 'TODO', newDocs);
                        newDocs[newDoc.id] = newDoc;
                    }
                    else {
                        outAdjacency[docId][entryId].add(docIdLookup[page]);
                    }
                });
            });
        });
        return { linkGraph: new LinkGraph(outAdjacency), documents: newDocs };
    }
    // Document: = {id: EntryId, name: String, tree: FlowyTree }
    function makeInitContextFromDocuments(docs) {
        let docIdLookup = makeDocIdLookup(docs);
        let { linkGraph, documents } = makeLinkGraph(docs, docIdLookup);
        // for each page:
        //   split name by whitespace
        //   for each word in split result:
        //     add page.id to invInd[word]
        let docNameInvIndex = {};
        Object.entries(documents).forEach(([docId, doc]) => {
            let splitByWs = doc.name.split(/\s+/);
            splitByWs.forEach(word => {
                if (!(word in docNameInvIndex)) {
                    docNameInvIndex[word] = [];
                }
                docNameInvIndex[word].push(docId);
            });
        });
        return {
            documents,
            docIdLookupByDocName: docIdLookup,
            linkGraph,
            docNameInvIndex
        };
    }
    function makeDoc(id, name, lastUpdated, entries, root) {
        return {
            id: id,
            name: name,
            tree: makeTree(entries, root),
            lastUpdated: lastUpdated || getNowISO8601(),
        };
    }
    function makeInitDocuments() {
        // 0: { text: 'this is a note taking app', displayState: EntryDisplayState.COLLAPSED },
        let intro = [
            {
                0: { text: 'this is a note taking app' },
                1: { text: 'you can use it to write a list. ¯\\\\_(ツ)_/¯' },
                2: { text: 'Arrow Up/Down to navigate up/down (😲)' },
                3: { text: 'or clicking on the text with your mouse works too' },
                4: { text: 'actually it\'s a nested list' },
                5: { text: 'you can keep nesting' },
                6: { text: 'items' },
                7: { text: 'and items', displayState: EntryDisplayState.COLLAPSED },
                8: { text: 'a n d i t e m s' },
                9: { text: 'you can collapse parts of the tree. the plus icon (+) indicates a collapsed item' },
                10: { text: '__collapse__: Ctrl + Up' },
                11: { text: '__expand__: Ctrl + Down' },
                12: { text: 'make **bold portions** of the text with double asterisks (\\*\\*), like so:' },
                13: { text: 'my \\**bolded** text' },
                14: { text: 'make __emphasis__ with double underscore:' },
                15: { text: 'my \\__emphasized__ text' },
                16: { text: 'make link to another page: [[implementation details]]' },
                17: { text: 'surround a page name with double square brackets: \\[[page name]]' },
                18: { text: 'make external links in two ways' },
                19: { text: 'just write a URL: https://en.wikipedia.org/wiki/Special:Random' },
                20: { text: 'link name + URL: [random wiki page](https://en.wikipedia.org/wiki/Special:Random)' },
                21: { text: 'type: \\[link name](www.example.com)' },
                22: { text: 'write math symbols (courtesy of MathJax): $1 = \\frac{1}{\\sqrt \\pi} \\int_0^{\\infty} e^{-x^2} dx$' },
                23: { text: 'surround your $\\LaTeX$ with dollar signs' },
                24: { text: '\\$1 = \\frac{1}{\\sqrt \\pi} \\int_0^{\\infty} e^{-x^2} dx\\$' },
                25: { text: 'look, a matrix: $\\begin{bmatrix}\\cos \\theta & -\\sin \\theta\\\\\\sin \\theta & \\cos \\theta\\end{bmatrix}$' }
            },
            { root: [
                    0,
                    1,
                    2,
                    3,
                    { 4: [
                            { 5: [
                                    { 6: [
                                            { 7: [8] }
                                        ] }
                                ] },
                            { 9: [10, 11] }
                        ] },
                    { 12: [13] },
                    { 14: [15] },
                    { 16: [17] },
                    { 18: [19, { 20: [21] }] },
                    { 22: [{ 23: [24] }, 25] }
                ] }
        ];
        let introLastUpdated = "2020-07-05T19:47:11.000Z";
        let similar = [
            {
                0: { text: 'svelte for components/state' },
                1: { text: 'svelte-spa-router for routing' },
                2: { text: 'parsimmon for the markup language parser/renderer' },
                3: { text: 'mathjax v3 for math display' },
                4: { text: 'font awesome (w/ svelte-awesome) icons' },
                5: { text: 'parser tests using jest' },
            },
            { root: [0, 1, 2, 3, 4, 5] }
        ];
        let similarLastUpdated = "2020-07-05T19:43:44.000Z";
        return {
            '1': makeDoc(1, 'hello and what is this', introLastUpdated, intro[0], intro[1]),
            '2': makeDoc(2, 'implementation details', similarLastUpdated, similar[0], similar[1])
        };
    }

    // given: sets a, b
    // returns: [elements removed from a, elements added to a]
    function diffSets(a, b) {
      let removed = [];
      let added = [];
      for (let [entry, _] of a.entries()) {
        if (!b.has(entry)) {
          removed.push(entry);
        }
      }
      for (let [entry, _] of b.entries()) {
        if (!a.has(entry)) {
          added.push(entry);
        }
      }
      return [removed, added];
    }


    function createDocsStore() {
      let initState = {
        currentDocId: null,
        cursorSelectionStart: 0,
        cursorSelectionEnd: 0,
        cursorEntryId: null,
        docName: '',
        docNameInvIndex: {},
        docIsEditingName: false,
        docsDisplay: {},
        docIdLookupByDocName: {},
        documents: {},
        linkGraph: null,
        sortMode: 'name-asc',
      };

      let { subscribe, update } = writable(initState);

      function createDocsDisplayEntry(newId) {
        return { docId: newId, isSelected: false };
      }

      return {
        subscribe,
        init: (documents, docIdLookupByDocName, linkGraph, docNameInvIndex) => update(store => {
          let initDocsDisplay = {};
          Object.keys(documents).forEach(docId => {
            initDocsDisplay[docId] = createDocsDisplayEntry(docId);
          });
          store.docsDisplay = initDocsDisplay;
          store.docIdLookupByDocName = docIdLookupByDocName;
          store.documents = documents;
          store.docNameInvIndex = docNameInvIndex;
          store.linkGraph = linkGraph;
          return store;
        }),

        createNewDocument: () => update(store => {
          let newDocName = 'New document';
          let newDoc = createNewDocument(newDocName, 'TODO', store.documents);
          let newId = newDoc.id;
          // append the new doc id for uniqueness(-ish)
          newDoc.name += ` ${newId}`;
          store.documents[newId] = newDoc;

          // add entry into docIdLookup
          store.docIdLookupByDocName[newDocName] = newId;

          store.currentDocId = newId;
          store.docName = newDocName;
          // TODO: how can this be null?
          store.cursorSelectionStart = null;
          store.cursorSelectionEnd = null;
          store.cursorEntryId = 0;
          store.docsDisplay[newId] = createDocsDisplayEntry(newId);
          return store;
        }),

        docsDisplaySetSelection: (docId, newSelectionValue) => update(store => {
          store.docsDisplay[docId].isSelected = newSelectionValue;
          return store;
        }),

        deleteDocs: (docIdList) => update(store => {
          docIdList.forEach(docId => {
            delete store.documents[docId];
            delete store.docsDisplay[docId];
            store.linkGraph.removeDoc(docId);
          });
          return store;
        }),

        changeSort: (newSortMode) => update(store => {
          store.sortMode = newSortMode;
          return store;
        }),

        navigateToDoc: (docId) => update(store => {
          let doc = store.documents[docId];
          // let initEntryId = doc.tree.getTopEntryId();
          store.currentDocId = docId;
          store.docName = doc.name;
          // store.cursorEntryId = initEntryId;
          store.cursorEntryId = null;
          return store;
        }),

        cancelEditingDocName: () => update(store => {
          // sync page's doc name display
          store.docIsEditingName = false;
          return store;
        }),
        startEditingDocName: () => update(store => {
          // sync page's doc name display
          store.docIsEditingName = true;
          return store;
        }),
        saveEditingDocName: (newDocName) => update(store => {
          // sync page's doc name display
          store.docName = newDocName;
          store.docIsEditingName = false;

          let docId = store.currentDocId;
          let currDoc = store.documents[docId];
          let oldDocName = currDoc.name;
          currDoc.name = newDocName;
          currDoc.lastUpdated = getNowISO8601();

          // remove old entry, add new in docIdLookup
          delete store.docIdLookupByDocName[oldDocName];
          store.docIdLookupByDocName[newDocName] = docId;

          // scan in-adjacency list. for each node, update all the internal links
          // NOTE: dont update lastUpdated for the in-neighbors.
          let inAdj = store.linkGraph.inAdjacency[docId];
          if (inAdj) {
            inAdj.forEach(backLinkEntry => {
              const [backLinkDocId, backLinkEntryId] = backLinkEntry.split('-');
              const currText = store.documents[backLinkDocId].tree.getEntryText(backLinkEntryId);
              store.documents[backLinkDocId].tree.setEntryText(
                backLinkEntryId, currText.replace(`[[${oldDocName}]]`, `[[${newDocName}]]`));
            });
          }
          return store;
        }),
        saveCurrentPageDocEntry: (newDocEntryText, newCursorSelStart, newCursorSelEnd) => update(store => {
          let currDoc = store.documents[store.currentDocId];
          currDoc.tree.setEntryText(store.cursorEntryId, newDocEntryText);
          currDoc.lastUpdated = getNowISO8601();
          store.cursorSelectionStart = newCursorSelStart;
          store.cursorSelectionEnd = newCursorSelEnd;
          return store;
        }),
        saveCursor: (newEntryId, newCursorSelStart, newCursorSelEnd) => update(store => {
          store.cursorSelectionStart = newCursorSelStart;
          store.cursorSelectionEnd = newCursorSelEnd;
          store.cursorEntryId = newEntryId;
          return store;
        }),
        moveCursorLeft: (entryValueSize) => update(store => {
          let selStart = store.cursorSelectionStart > entryValueSize
            ? entryValueSize
            : store.cursorSelectionStart;

          if (selStart !== store.cursorSelectionStart || selStart === store.cursorSelectionEnd) {
            store.cursorSelectionStart = Math.max(0, selStart - 1);
            store.cursorSelectionEnd = store.cursorSelectionStart;
          } else {
            store.cursorSelectionEnd = store.cursorSelectionStart;
          }
          return store;
        }),
        moveCursorRight: (entryValueSize) => update(store => {
          if (store.cursorSelectionStart === store.cursorSelectionEnd) {
            store.cursorSelectionStart = Math.min(entryValueSize, store.cursorSelectionStart + 1);
            store.cursorSelectionEnd = store.cursorSelectionStart;
          } else {
            store.cursorSelectionStart = store.cursorSelectionEnd;
          }
          return store;
        }),
        saveCursorPosition: (pos) => update(store => {
          store.cursorSelectionStart = pos;
          store.cursorSelectionEnd = pos;
          return store;
        }),
        saveCursorEntryId: (newEntryId) => update(store => {
          store.cursorEntryId = newEntryId;
          return store;
        }),

        entryGoUp: () => update(store => {
          let currDocId = store.currentDocId;
          let cursorEntryId = store.cursorEntryId;
          let currTree = store.documents[currDocId].tree;
          let hasEntryAbove = currTree.hasEntryAbove(cursorEntryId);
          let newEntryId = hasEntryAbove ? currTree.getEntryIdAboveWithCollapse(cursorEntryId) : cursorEntryId;
          store.cursorEntryId = newEntryId;
          return store;
        }),
        entryGoDown: () => update(store => {
          let currDocId = store.currentDocId;
          let cursorEntryId = store.cursorEntryId;
          let currTree = store.documents[currDocId].tree;
          let hasEntryBelow = currTree.hasEntryBelow(cursorEntryId);
          let newEntryId = hasEntryBelow ? currTree.getEntryIdBelowWithCollapse(cursorEntryId) : cursorEntryId;
          store.cursorEntryId = newEntryId;
          return store;
        }),

        collapseEntry: (entryId) => update(store => {
          // check if display state is collapsed, and, if so, expand
          if (entryId != null) {
            let docId = store.currentDocId;

            let currDoc = store.documents[docId];
            let currTree = currDoc.tree;
            let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

            if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.EXPANDED) {
              let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
              newTree.setEntryDisplayState(entryId, EntryDisplayState.COLLAPSED);
              currDoc.tree = newTree;
            }
            store.cursorEntryId = null;
          }
          return store;
        }),

        expandEntry: (entryId) => update(store => {
          if (entryId != null) {
            let docId = store.currentDocId;

            let currDoc = store.documents[docId];
            let currTree = currDoc.tree;
            let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

            if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.COLLAPSED) {
              let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
              newTree.setEntryDisplayState(entryId, EntryDisplayState.EXPANDED);
              currDoc.tree = newTree;
            }
            store.cursorEntryId = null;
          }
          return store;
        }),

        indentEntry: () => update(store => {
          let docId = store.currentDocId;
          let entryId = store.cursorEntryId;
          let currTree = store.documents[docId].tree;
          let currItem = currTree.getEntryItem(entryId);

          if (currTree.hasPrevSibling(entryId)) {
            let prevNode = currTree.getPrevSiblingNode(entryId);
            currItem.detach();
            prevNode.appendChildItem(currItem);
            let parentId = prevNode.getId();
            currItem.value.setParentId(parentId);
            store.documents[docId].lastUpdated = getNowISO8601();
          }

          return store;
        }),
        dedentEntry: () => update(store => {
          let docId = store.currentDocId;
          let entryId = store.cursorEntryId;
          let currTree = store.documents[docId].tree;
          let currItem = currTree.getEntryItem(entryId);

          if (currItem.value.hasParent()) {
            let parentItem = currTree.getEntryItem(currItem.value.getParentId());
            currItem.detach();
            parentItem.append(currItem);
            let parentParentId = parentItem.value.getParentId();
            currItem.value.setParentId(parentParentId);
            store.documents[docId].lastUpdated = getNowISO8601();
          }

          return store;
        }),
        splitEntry: () => update(store => {
          let docId = store.currentDocId;
          let entryId = store.cursorEntryId;
          let cursorPos = store.cursorSelectionStart;

          // TODO: only update documents if there's a docId (is this possible?)
          let currDoc = store.documents[docId];
          let currTree = currDoc.tree;
          let currEntryText = currTree.getEntryText(entryId);
          let parentId = currTree.getParentId(entryId);


          // presto-removo the selected text
          if (store.cursorSelectionStart !== store.cursorSelectionEnd) {
            currEntryText = currEntryText.substring(0, store.cursorSelectionStart) + currEntryText.substring(store.cursorSelectionEnd);
            console.log(" >> split, (entryId, text) = ", entryId, currEntryText);
            currTree.setEntryText(entryId, currEntryText);
            store.cursorSelectionEnd = store.cursorSelectionStart;
          }

          // if at the end of a collapsed item, make a next sibling with empty text
          if (currTree.getEntryDisplayState(entryId) === EntryDisplayState.COLLAPSED
              && cursorPos === currEntryText.length) {

            let newId = currDoc.tree.insertEntryBelow(entryId, parentId, '');
            store.cursorEntryId = newId;
            store.cursorSelectionStart = 0;
            return store;
          }

          let newEntryText = currEntryText.substring(0, cursorPos);
          let updatedCurrEntry = currEntryText.substring(cursorPos, currEntryText.length);
          currDoc.tree.setEntryText(entryId, updatedCurrEntry);
          currDoc.tree.insertEntryAbove(entryId, parentId, newEntryText);

          store.cursorSelectionStart = 0;
          store.cursorSelectionEnd = store.cursorSelectionStart;

          return store;
        }),

        backspaceEntry: () => update(store => {
          let currentDoc = store.documents[store.currentDocId];
          let cursorPos = store.cursorSelectionStart;
          let entryId = store.cursorEntryId;

          // delete single-entry selection
          if (store.cursorSelectionStart !== store.cursorSelectionEnd) {
            let currEntryText = currentDoc.tree.getEntryText(entryId);
            let newEntry = currEntryText.substring(0, store.cursorSelectionStart) + currEntryText.substring(store.cursorSelectionEnd);
            currentDoc.tree.setEntryText(entryId, newEntry);
            store.cursorSelectionEnd = store.cursorSelectionStart;
            return store;
          }



          if (cursorPos > 0) {
            let currEntryText = currentDoc.tree.getEntryText(entryId);
            let currTextLength = currEntryText.length;
            // FIXME
            // colId might be larger than the text length, so handle it
            let effectiveCursorPos = Math.min(cursorPos, currTextLength);
            let newEntry =
              currEntryText.substring(0, effectiveCursorPos - 1) + currEntryText.substring(effectiveCursorPos);
            currentDoc.tree.setEntryText(entryId, newEntry);

            store.cursorSelectionStart = effectiveCursorPos - 1;
            store.cursorSelectionEnd = store.cursorSelectionStart;
            return store;
          }


          // col is zero, so we merge adjacent entries
          let currTree = currentDoc.tree;

          // cases where backspacing @ col 0 is a no-op
          //  - if curr entry has no entry above (no parent, no previous sibling)
          //  - if current has children + previous sibling, and previous sibling has children
          //  - if current has children + no previous sibling
          if (currTree.hasEntryAbove(entryId)) {

            let currItem = currTree.getEntryItem(entryId);
            let prevItem = currItem.prev;
            if (currItem.value.hasChildren() && (prevItem == null || prevItem.value.hasChildren())) {
              // exit without change
              return store;
            }

            let currEntryText = currentDoc.tree.getEntryText(entryId);

            let newEntryId, newCursorPos;
            if (!currItem.value.hasChildren()) {
              // if current has no children, we delete current and append current's text
              // to previous entry.
              let prevEntryId = currTree.getEntryIdAboveWithCollapse(entryId);
              let prevRowOrigEntryText = currentDoc.tree.getEntryText(prevEntryId);
              currentDoc.tree.setEntryText(
                prevEntryId,
                prevRowOrigEntryText + currEntryText
              );
              currentDoc.tree.removeEntry(entryId);
              newEntryId = prevEntryId;
              newCursorPos = prevRowOrigEntryText.length;

            } else {
              // otherwise, current has children, and so if we had (prevItem == null || prevItem.value.hasChildren()), then
              // we would have aborted the backspace.
              // thus we must either have (prevItem exists && has no children)
              // so: delete previous, prepend its text to current element
              let prevEntryId = currTree.getEntryIdAbove(entryId);
              let prevRowOrigEntryText = currentDoc.tree.getEntryText(prevEntryId);

              currentDoc.tree.setEntryText(
                entryId,
                prevRowOrigEntryText + currEntryText
              );
              currentDoc.tree.removeEntry(prevEntryId);
              newEntryId = entryId;
              newCursorPos = prevRowOrigEntryText.length;
            }

            store.cursorEntryId = newEntryId;
            store.cursorSelectionStart = newCursorPos;
            store.cursorSelectionEnd = store.cursorSelectionStart;
          }

          return store;

        }),

        savePastedEntries: (newDocEntryText) => update(store => {
          console.log(" saved pasted entries act");
          let i = store.currentDocId;
          let entryId = store.cursorEntryId;
          let currentDoc = store.documents[i];
          let parentId = currentDoc.tree.getParentId(entryId);
          console.log(" SPEA, (doc id, entry id, parent id) = ", i, entryId, parentId);

          let currEntryId = entryId;
          newDocEntryText.split('\n').forEach(line => {
            console.log("inserting below ", currEntryId, " line = ", line);
            currEntryId = currentDoc.tree.insertEntryBelow(currEntryId, parentId, line);
          });

          return store;
        }),

        // compute the diff between the current set of links and the new set
        //  - NOTE: we start with the new set of linked *page names*, so we need to look up doc ids
        //     - whenever we find a page name with no doc id, need to automatically create
        // for each removed and added link in the entry, update the link graph
        // return { updated LinkGraph, updated documents object }
        updateEntryLinks: (entryId, pageNames) => update(store => {
          let currLinks = store.linkGraph.getLinks(store.currentDocId, entryId);

          let newLinksArray = pageNames.map(page => {
            let lookupResult = store.docIdLookupByDocName[page];
            if (lookupResult) {
              return lookupResult;
            }

            // FIXME: duplicates some from createDocAction
            let newDoc = createNewDocument(page, 'TODO', store.documents);
            let newId = newDoc.id;
            store.documents[newId] = newDoc;
            store.docsDisplay[newId] = createDocsDisplayEntry(newId);
            store.docIdLookupByDocName[page] = newId;
            return newId;
          });
          let newLinks = new Set(newLinksArray);

          // diff currLinks, newLinks
          let [removed, added] = diffSets(currLinks, newLinks);

          removed.forEach(docId => {
            store.linkGraph.removeLink(store.currentDocId, entryId, docId);
          });
          added.forEach(docId => {
            store.linkGraph.addLink(store.currentDocId, entryId, docId);
          });

          return store;
        }),

        swapWithAboveEntry: () => update(store => {
          let cursorEntryId = store.cursorEntryId;
          let currDoc = store.documents[store.currentDocId];
          let currTree = currDoc.tree;

          if (currTree.hasPrevSibling(cursorEntryId)) {
            let prevSiblingNode =  currTree.getPrevSiblingNode(cursorEntryId);
            let prevSiblingId = prevSiblingNode.getId();
            currTree.swapAdjacentSiblings(prevSiblingId, cursorEntryId);
            currDoc.lastUpdated = getNowISO8601();
          }
          return store;
        }),
        swapWithBelowEntry: () => update(store => {
          let cursorEntryId = store.cursorEntryId;
          let currDoc = store.documents[store.currentDocId];
          let currTree = currDoc.tree;

          if (currTree.hasNextSibling(cursorEntryId)) {
            let nextSiblingNode =  currTree.getNextSiblingNode(cursorEntryId);
            let nextSiblingId = nextSiblingNode.getId();
            currTree.swapAdjacentSiblings(cursorEntryId, nextSiblingId);
            currDoc.lastUpdated = getNowISO8601();
          }
          return store;
        }),

        // "1, 2, 3, 0"
        cycleEntryHeadingSize: (entryId) => update(store => {
          let currDoc = store.documents[store.currentDocId];
          let currTree = currDoc.tree;
          currTree.cycleEntryHeadingSize(entryId);
          return store;
        }),

        replaceEntryTextAroundCursor: (newText) => update(store => {
          console.log(" >> handleReplaceEntryTextARoundCursor, (new, selStart) = ", newText, store.cursorSelectionStart);

          let currentTree = store.documents[store.currentDocId].tree ;

          let docCursorSelStart = store.cursorSelectionStart;
          let docCursorSelEnd = store.cursorSelectionEnd;
          if (docCursorSelStart === docCursorSelEnd) {
            // TODO: duplication w/ Node autocomplete code
            let entryValue = currentTree.getEntryText(store.cursorEntryId);
            let [entryBefore, entryAfter] = [entryValue.substring(0, docCursorSelStart), entryValue.substring(docCursorSelStart)];
            let entryBeforeRev = [...entryBefore].reverse().join("");
            let prevOpeningRev = /^([^\[\]]*)\[\[(?!\\)/g;
            let prevOpeningRevResult = entryBeforeRev.match(prevOpeningRev);
            let nextClosing = /^(.{0}|([^\[\]]*[^\]\\]))]]/g;
            let nextClosingResult = entryAfter.match(nextClosing);

            if (prevOpeningRevResult != null && nextClosingResult != null) {
              let prevLinkRev = prevOpeningRevResult[0];
              let prevPageRev = prevLinkRev.substring(0, prevLinkRev.length - 2);
              let prevPage = [...prevPageRev].reverse().join("");
              let nextPage = nextClosingResult[0].substring(0, nextClosingResult[0].length - 2);

              let replaceStart = docCursorSelStart - prevPage.length;
              let replaceEnd = docCursorSelEnd + nextPage.length;

              let newEntryText = entryValue.substring(0, replaceStart) + newText + entryValue.substring(replaceEnd);
              store.documents[store.currentDocId].tree.setEntryText(store.cursorEntryId, newEntryText);
            }
          }
          return store;
        }),

      }
    }

    const docsStore = createDocsStore();

    /* src/components/RenderedEntry.svelte generated by Svelte v3.24.0 */

    const { console: console_1$2 } = globals;
    const file$4 = "src/components/RenderedEntry.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`rendered-entry heading-${/*entryHeadingSize*/ ctx[1]}`) + " svelte-udstvs"));
    			attr_dev(div, "data-entry-id", /*entryId*/ ctx[0]);
    			add_location(div, file$4, 44, 0, 850);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[5](div);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*entryHeadingSize*/ 2 && div_class_value !== (div_class_value = "" + (null_to_empty(`rendered-entry heading-${/*entryHeadingSize*/ ctx[1]}`) + " svelte-udstvs"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*entryId*/ 1) {
    				attr_dev(div, "data-entry-id", /*entryId*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { entryId } = $$props,
    		{ entryText } = $$props,
    		{ entryHeadingSize } = $$props,
    		{ handleUpdateEntryLinks } = $$props;

    	let theDiv;
    	const writable_props = ["entryId", "entryText", "entryHeadingSize", "handleUpdateEntryLinks"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<RenderedEntry> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("RenderedEntry", $$slots, []);

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			theDiv = $$value;
    			((($$invalidate(2, theDiv), $$invalidate(3, entryText)), $$invalidate(4, handleUpdateEntryLinks)), $$invalidate(0, entryId));
    		});
    	}

    	$$self.$set = $$props => {
    		if ("entryId" in $$props) $$invalidate(0, entryId = $$props.entryId);
    		if ("entryText" in $$props) $$invalidate(3, entryText = $$props.entryText);
    		if ("entryHeadingSize" in $$props) $$invalidate(1, entryHeadingSize = $$props.entryHeadingSize);
    		if ("handleUpdateEntryLinks" in $$props) $$invalidate(4, handleUpdateEntryLinks = $$props.handleUpdateEntryLinks);
    	};

    	$$self.$capture_state = () => ({
    		entryId,
    		entryText,
    		entryHeadingSize,
    		handleUpdateEntryLinks,
    		MarkupParser,
    		theDiv
    	});

    	$$self.$inject_state = $$props => {
    		if ("entryId" in $$props) $$invalidate(0, entryId = $$props.entryId);
    		if ("entryText" in $$props) $$invalidate(3, entryText = $$props.entryText);
    		if ("entryHeadingSize" in $$props) $$invalidate(1, entryHeadingSize = $$props.entryHeadingSize);
    		if ("handleUpdateEntryLinks" in $$props) $$invalidate(4, handleUpdateEntryLinks = $$props.handleUpdateEntryLinks);
    		if ("theDiv" in $$props) $$invalidate(2, theDiv = $$props.theDiv);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*theDiv, entryText, handleUpdateEntryLinks, entryId*/ 29) {
    			 {
    				if (theDiv) {
    					try {
    						let parseResult = MarkupParser.Text.tryParse(entryText);
    						$$invalidate(2, theDiv.innerHTML = parseResult.html, theDiv);
    						handleUpdateEntryLinks(entryId, parseResult.linkedPages);
    					} catch(err) {
    						// TODO: display error somehow?
    						console.log("err parsing: ", err);

    						$$invalidate(2, theDiv.innerHTML = entryText, theDiv);
    					}
    				}
    			}
    		}
    	};

    	return [
    		entryId,
    		entryHeadingSize,
    		theDiv,
    		entryText,
    		handleUpdateEntryLinks,
    		div_binding
    	];
    }

    class RenderedEntry extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			entryId: 0,
    			entryText: 3,
    			entryHeadingSize: 1,
    			handleUpdateEntryLinks: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RenderedEntry",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*entryId*/ ctx[0] === undefined && !("entryId" in props)) {
    			console_1$2.warn("<RenderedEntry> was created without expected prop 'entryId'");
    		}

    		if (/*entryText*/ ctx[3] === undefined && !("entryText" in props)) {
    			console_1$2.warn("<RenderedEntry> was created without expected prop 'entryText'");
    		}

    		if (/*entryHeadingSize*/ ctx[1] === undefined && !("entryHeadingSize" in props)) {
    			console_1$2.warn("<RenderedEntry> was created without expected prop 'entryHeadingSize'");
    		}

    		if (/*handleUpdateEntryLinks*/ ctx[4] === undefined && !("handleUpdateEntryLinks" in props)) {
    			console_1$2.warn("<RenderedEntry> was created without expected prop 'handleUpdateEntryLinks'");
    		}
    	}

    	get entryId() {
    		throw new Error("<RenderedEntry>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entryId(value) {
    		throw new Error("<RenderedEntry>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get entryText() {
    		throw new Error("<RenderedEntry>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entryText(value) {
    		throw new Error("<RenderedEntry>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get entryHeadingSize() {
    		throw new Error("<RenderedEntry>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entryHeadingSize(value) {
    		throw new Error("<RenderedEntry>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleUpdateEntryLinks() {
    		throw new Error("<RenderedEntry>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleUpdateEntryLinks(value) {
    		throw new Error("<RenderedEntry>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/BacklinksDisplay.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1$2, console: console_1$3 } = globals;
    const file$5 = "src/components/BacklinksDisplay.svelte";

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (29:0) {#if existsBacklinks}
    function create_if_block$2(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value = Object.values(/*backlinks*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "References";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "svelte-74b8hf");
    			add_location(h2, file$5, 29, 2, 427);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Object, backlinks*/ 1) {
    				each_value = Object.values(/*backlinks*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(29:0) {#if existsBacklinks}",
    		ctx
    	});

    	return block;
    }

    // (35:6) {#each Object.values(doc.entries) as entry}
    function create_each_block_1$1(ctx) {
    	let li;
    	let renderedentry;
    	let t;
    	let current;

    	renderedentry = new RenderedEntry({
    			props: {
    				entryId: /*entry*/ ctx[5].id,
    				entryText: /*entry*/ ctx[5].text,
    				handleUpdateEntryLinks: func
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(renderedentry.$$.fragment);
    			t = space();
    			add_location(li, file$5, 35, 8, 654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(renderedentry, li, null);
    			append_dev(li, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const renderedentry_changes = {};
    			if (dirty & /*backlinks*/ 1) renderedentry_changes.entryId = /*entry*/ ctx[5].id;
    			if (dirty & /*backlinks*/ 1) renderedentry_changes.entryText = /*entry*/ ctx[5].text;
    			renderedentry.$set(renderedentry_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(renderedentry.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(renderedentry.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(renderedentry);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(35:6) {#each Object.values(doc.entries) as entry}",
    		ctx
    	});

    	return block;
    }

    // (31:2) {#each Object.values(backlinks) as doc}
    function create_each_block$1(ctx) {
    	let div;
    	let h3;
    	let a;
    	let t0_value = /*doc*/ ctx[2].name + "";
    	let t0;
    	let a_href_value;
    	let t1;
    	let ul;
    	let t2;
    	let current;
    	let each_value_1 = Object.values(/*doc*/ ctx[2].entries);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr_dev(a, "href", a_href_value = `#/doc/${/*doc*/ ctx[2].id}`);
    			add_location(a, file$5, 32, 10, 537);
    			attr_dev(h3, "class", "svelte-74b8hf");
    			add_location(h3, file$5, 32, 6, 533);
    			add_location(ul, file$5, 33, 6, 591);
    			attr_dev(div, "id", "backlinks-page-display");
    			attr_dev(div, "class", "svelte-74b8hf");
    			add_location(div, file$5, 31, 4, 493);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, a);
    			append_dev(a, t0);
    			append_dev(div, t1);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*backlinks*/ 1) && t0_value !== (t0_value = /*doc*/ ctx[2].name + "")) set_data_dev(t0, t0_value);

    			if (!current || dirty & /*backlinks*/ 1 && a_href_value !== (a_href_value = `#/doc/${/*doc*/ ctx[2].id}`)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*Object, backlinks*/ 1) {
    				each_value_1 = Object.values(/*doc*/ ctx[2].entries);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(31:2) {#each Object.values(backlinks) as doc}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div;
    	let current;
    	let if_block = /*existsBacklinks*/ ctx[1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "id", "doc-references");
    			attr_dev(div, "class", "svelte-74b8hf");
    			add_location(div, file$5, 27, 0, 377);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*existsBacklinks*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*existsBacklinks*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = () => {
    	return;
    };

    function instance$7($$self, $$props, $$invalidate) {
    	let { backlinks } = $$props;
    	console.log("backlinks = ", backlinks);
    	const writable_props = ["backlinks"];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<BacklinksDisplay> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("BacklinksDisplay", $$slots, []);

    	$$self.$set = $$props => {
    		if ("backlinks" in $$props) $$invalidate(0, backlinks = $$props.backlinks);
    	};

    	$$self.$capture_state = () => ({
    		backlinks,
    		RenderedEntry,
    		existsBacklinks
    	});

    	$$self.$inject_state = $$props => {
    		if ("backlinks" in $$props) $$invalidate(0, backlinks = $$props.backlinks);
    		if ("existsBacklinks" in $$props) $$invalidate(1, existsBacklinks = $$props.existsBacklinks);
    	};

    	let existsBacklinks;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*backlinks*/ 1) {
    			 $$invalidate(1, existsBacklinks = Object.keys(backlinks).length);
    		}
    	};

    	return [backlinks, existsBacklinks];
    }

    class BacklinksDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { backlinks: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BacklinksDisplay",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*backlinks*/ ctx[0] === undefined && !("backlinks" in props)) {
    			console_1$3.warn("<BacklinksDisplay> was created without expected prop 'backlinks'");
    		}
    	}

    	get backlinks() {
    		throw new Error("<BacklinksDisplay>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backlinks(value) {
    		throw new Error("<BacklinksDisplay>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.24.0 */

    const file$6 = "src/components/Header.svelte";

    function create_fragment$8(ctx) {
    	let header;
    	let span;
    	let a;
    	let t1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			span = element("span");
    			a = element("a");
    			a.textContent = "🏠";
    			t1 = text("\n  >");
    			attr_dev(a, "href", "#/");
    			add_location(a, file$6, 20, 4, 471);
    			attr_dev(span, "class", "home svelte-1ilci2u");
    			add_location(span, file$6, 19, 2, 447);
    			attr_dev(header, "id", "doc-header");
    			attr_dev(header, "class", "svelte-1ilci2u");
    			add_location(header, file$6, 18, 0, 420);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, span);
    			append_dev(span, a);
    			append_dev(header, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Header", $$slots, []);
    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/EntryInput.svelte generated by Svelte v3.24.0 */
    const file$7 = "src/components/EntryInput.svelte";

    function create_fragment$9(ctx) {
    	let input;
    	let input_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", input_class_value = "" + (null_to_empty(`entry-input heading-${/*entryHeadingSize*/ ctx[2]}`) + " svelte-3clrq6"));
    			input.value = /*entryValue*/ ctx[1];
    			toggle_class(input, "highlighted", /*entryId*/ ctx[0] === /*docCursorEntryId*/ ctx[3]);
    			add_location(input, file$7, 169, 0, 5494);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[30](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*handleInput*/ ctx[7], false, false, false),
    					listen_dev(input, "click", /*click_handler*/ ctx[31], false, false, false),
    					listen_dev(input, "keydown", /*handleKeydown*/ ctx[5], false, false, false),
    					listen_dev(input, "paste", /*handlePaste*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*entryHeadingSize*/ 4 && input_class_value !== (input_class_value = "" + (null_to_empty(`entry-input heading-${/*entryHeadingSize*/ ctx[2]}`) + " svelte-3clrq6"))) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (dirty[0] & /*entryValue*/ 2 && input.value !== /*entryValue*/ ctx[1]) {
    				prop_dev(input, "value", /*entryValue*/ ctx[1]);
    			}

    			if (dirty[0] & /*entryHeadingSize, entryId, docCursorEntryId*/ 13) {
    				toggle_class(input, "highlighted", /*entryId*/ ctx[0] === /*docCursorEntryId*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[30](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let { entryId } = $$props,
    		{ entryValue } = $$props,
    		{ entryHeadingSize } = $$props,
    		{ docCursorEntryId } = $$props,
    		{ docCursorSelStart } = $$props,
    		{ docCursorSelEnd } = $$props,
    		{ isEntryAbove } = $$props,
    		{ isEntryBelow } = $$props,
    		{ handleGoUp } = $$props,
    		{ handleGoDown } = $$props,
    		{ handleEntryBackspace } = $$props,
    		{ handleCollapseEntry } = $$props,
    		{ handleExpandEntry } = $$props,
    		{ handleSplitEntry } = $$props,
    		{ handleIndent } = $$props,
    		{ handleDedent } = $$props,
    		{ handleMultilinePaste } = $$props,
    		{ handleMoveCursorLeft } = $$props,
    		{ handleMoveCursorRight } = $$props,
    		{ handleSaveCursorPos } = $$props,
    		{ handleSaveDocEntry } = $$props,
    		{ handleSaveFullCursor } = $$props,
    		{ handleSwapWithAboveEntry } = $$props,
    		{ handleSwapWithBelowEntry } = $$props,
    		{ handleCycleEntryHeadingSize } = $$props;

    	let theInput;

    	afterUpdate(() => __awaiter(void 0, void 0, void 0, function* () {
    		let nni = document.getElementById("node-name-input");

    		if (document.activeElement === nni) {
    			return;
    		}

    		if (theInput) {
    			// take focus if id equals current row id
    			if (entryId === docCursorEntryId && document.activeElement !== theInput) {
    				theInput.focus();
    			}

    			// select all classes entry-input
    			if (entryId === docCursorEntryId) {
    				theInput.setSelectionRange(docCursorSelStart, docCursorSelEnd);
    			}
    		}
    	}));

    	function handleCursorMove(event, entryValueSize) {
    		switch (event.key) {
    			case "ArrowLeft":
    				handleMoveCursorLeft(entryValueSize);
    				return;
    			case "ArrowRight":
    				handleMoveCursorRight(entryValueSize);
    				return;
    			case "Home":
    				handleSaveCursorPos(0);
    				return;
    			case "End":
    				handleSaveCursorPos(entryValueSize);
    				return;
    		}
    	}

    	function handleKeydown(ev) {
    		return __awaiter(this, void 0, void 0, function* () {
    			if (ev.key === "Tab") {
    				ev.preventDefault();

    				if (ev.shiftKey) {
    					handleDedent();
    				} else {
    					handleIndent();
    				}

    				return;
    			}

    			if (ev.key === "ArrowUp") {
    				ev.preventDefault();

    				if (ev.ctrlKey) {
    					// TODO: Guard?
    					handleCollapseEntry(entryId);
    				} else if (ev.shiftKey && ev.altKey) {
    					handleSwapWithAboveEntry(entryId);
    				} else {
    					if (isEntryAbove) {
    						handleGoUp();
    					}
    				}
    			} else if (ev.key === "ArrowDown") {
    				ev.preventDefault();

    				if (ev.ctrlKey) {
    					// TODO: Guard?
    					handleExpandEntry(entryId);
    				} else if (ev.shiftKey && ev.altKey) {
    					handleSwapWithBelowEntry(entryId);
    				} else {
    					if (isEntryBelow) {
    						handleGoDown();
    					}
    				}
    			} else if (ev.key === "Backspace") {
    				ev.preventDefault();
    				handleEntryBackspace();
    			} else if (ev.key === "Enter") {
    				ev.preventDefault();
    				handleSplitEntry();
    			} else if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(ev.key) > -1) {
    				ev.preventDefault();
    				handleCursorMove(ev, this.value.length);
    			} else if (ev.key == "H" && ev.ctrlKey && ev.shiftKey) {
    				ev.preventDefault();
    				handleCycleEntryHeadingSize(entryId);
    			} else {
    				return;
    			}

    			yield tick();
    			this.selectionStart = docCursorSelStart;
    			this.selectionEnd = docCursorSelEnd;
    		});
    	}

    	function handleEntryInputClick(ev, entryId) {
    		let target = ev.target;
    		let newSelStart = target.selectionStart;
    		let newSelEnd = target.selectionEnd;

    		if (docCursorEntryId !== entryId || docCursorSelStart != newSelStart || docCursorSelEnd != newSelEnd) {
    			handleSaveFullCursor(entryId, newSelStart, newSelEnd);
    		}
    	}

    	function handleInput(ev) {
    		let target = ev.target;
    		let entryText = target.value;
    		handleSaveDocEntry(entryText, target.selectionStart, target.selectionEnd);
    	}

    	function handlePaste(ev) {
    		let pastedText = (ev.clipboardData || window.clipboardData).getData("text");
    		let pastedLines = pastedText.split("\n");

    		if (pastedLines.length > 1) {
    			ev.preventDefault();
    			handleMultilinePaste(pastedText);
    		}
    	}

    	const writable_props = [
    		"entryId",
    		"entryValue",
    		"entryHeadingSize",
    		"docCursorEntryId",
    		"docCursorSelStart",
    		"docCursorSelEnd",
    		"isEntryAbove",
    		"isEntryBelow",
    		"handleGoUp",
    		"handleGoDown",
    		"handleEntryBackspace",
    		"handleCollapseEntry",
    		"handleExpandEntry",
    		"handleSplitEntry",
    		"handleIndent",
    		"handleDedent",
    		"handleMultilinePaste",
    		"handleMoveCursorLeft",
    		"handleMoveCursorRight",
    		"handleSaveCursorPos",
    		"handleSaveDocEntry",
    		"handleSaveFullCursor",
    		"handleSwapWithAboveEntry",
    		"handleSwapWithBelowEntry",
    		"handleCycleEntryHeadingSize"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EntryInput> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("EntryInput", $$slots, []);

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			theInput = $$value;
    			$$invalidate(4, theInput);
    		});
    	}

    	const click_handler = e => handleEntryInputClick(e, entryId);

    	$$self.$set = $$props => {
    		if ("entryId" in $$props) $$invalidate(0, entryId = $$props.entryId);
    		if ("entryValue" in $$props) $$invalidate(1, entryValue = $$props.entryValue);
    		if ("entryHeadingSize" in $$props) $$invalidate(2, entryHeadingSize = $$props.entryHeadingSize);
    		if ("docCursorEntryId" in $$props) $$invalidate(3, docCursorEntryId = $$props.docCursorEntryId);
    		if ("docCursorSelStart" in $$props) $$invalidate(9, docCursorSelStart = $$props.docCursorSelStart);
    		if ("docCursorSelEnd" in $$props) $$invalidate(10, docCursorSelEnd = $$props.docCursorSelEnd);
    		if ("isEntryAbove" in $$props) $$invalidate(11, isEntryAbove = $$props.isEntryAbove);
    		if ("isEntryBelow" in $$props) $$invalidate(12, isEntryBelow = $$props.isEntryBelow);
    		if ("handleGoUp" in $$props) $$invalidate(13, handleGoUp = $$props.handleGoUp);
    		if ("handleGoDown" in $$props) $$invalidate(14, handleGoDown = $$props.handleGoDown);
    		if ("handleEntryBackspace" in $$props) $$invalidate(15, handleEntryBackspace = $$props.handleEntryBackspace);
    		if ("handleCollapseEntry" in $$props) $$invalidate(16, handleCollapseEntry = $$props.handleCollapseEntry);
    		if ("handleExpandEntry" in $$props) $$invalidate(17, handleExpandEntry = $$props.handleExpandEntry);
    		if ("handleSplitEntry" in $$props) $$invalidate(18, handleSplitEntry = $$props.handleSplitEntry);
    		if ("handleIndent" in $$props) $$invalidate(19, handleIndent = $$props.handleIndent);
    		if ("handleDedent" in $$props) $$invalidate(20, handleDedent = $$props.handleDedent);
    		if ("handleMultilinePaste" in $$props) $$invalidate(21, handleMultilinePaste = $$props.handleMultilinePaste);
    		if ("handleMoveCursorLeft" in $$props) $$invalidate(22, handleMoveCursorLeft = $$props.handleMoveCursorLeft);
    		if ("handleMoveCursorRight" in $$props) $$invalidate(23, handleMoveCursorRight = $$props.handleMoveCursorRight);
    		if ("handleSaveCursorPos" in $$props) $$invalidate(24, handleSaveCursorPos = $$props.handleSaveCursorPos);
    		if ("handleSaveDocEntry" in $$props) $$invalidate(25, handleSaveDocEntry = $$props.handleSaveDocEntry);
    		if ("handleSaveFullCursor" in $$props) $$invalidate(26, handleSaveFullCursor = $$props.handleSaveFullCursor);
    		if ("handleSwapWithAboveEntry" in $$props) $$invalidate(27, handleSwapWithAboveEntry = $$props.handleSwapWithAboveEntry);
    		if ("handleSwapWithBelowEntry" in $$props) $$invalidate(28, handleSwapWithBelowEntry = $$props.handleSwapWithBelowEntry);
    		if ("handleCycleEntryHeadingSize" in $$props) $$invalidate(29, handleCycleEntryHeadingSize = $$props.handleCycleEntryHeadingSize);
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		entryId,
    		entryValue,
    		entryHeadingSize,
    		docCursorEntryId,
    		docCursorSelStart,
    		docCursorSelEnd,
    		isEntryAbove,
    		isEntryBelow,
    		handleGoUp,
    		handleGoDown,
    		handleEntryBackspace,
    		handleCollapseEntry,
    		handleExpandEntry,
    		handleSplitEntry,
    		handleIndent,
    		handleDedent,
    		handleMultilinePaste,
    		handleMoveCursorLeft,
    		handleMoveCursorRight,
    		handleSaveCursorPos,
    		handleSaveDocEntry,
    		handleSaveFullCursor,
    		handleSwapWithAboveEntry,
    		handleSwapWithBelowEntry,
    		handleCycleEntryHeadingSize,
    		afterUpdate,
    		tick,
    		theInput,
    		handleCursorMove,
    		handleKeydown,
    		handleEntryInputClick,
    		handleInput,
    		handlePaste
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("entryId" in $$props) $$invalidate(0, entryId = $$props.entryId);
    		if ("entryValue" in $$props) $$invalidate(1, entryValue = $$props.entryValue);
    		if ("entryHeadingSize" in $$props) $$invalidate(2, entryHeadingSize = $$props.entryHeadingSize);
    		if ("docCursorEntryId" in $$props) $$invalidate(3, docCursorEntryId = $$props.docCursorEntryId);
    		if ("docCursorSelStart" in $$props) $$invalidate(9, docCursorSelStart = $$props.docCursorSelStart);
    		if ("docCursorSelEnd" in $$props) $$invalidate(10, docCursorSelEnd = $$props.docCursorSelEnd);
    		if ("isEntryAbove" in $$props) $$invalidate(11, isEntryAbove = $$props.isEntryAbove);
    		if ("isEntryBelow" in $$props) $$invalidate(12, isEntryBelow = $$props.isEntryBelow);
    		if ("handleGoUp" in $$props) $$invalidate(13, handleGoUp = $$props.handleGoUp);
    		if ("handleGoDown" in $$props) $$invalidate(14, handleGoDown = $$props.handleGoDown);
    		if ("handleEntryBackspace" in $$props) $$invalidate(15, handleEntryBackspace = $$props.handleEntryBackspace);
    		if ("handleCollapseEntry" in $$props) $$invalidate(16, handleCollapseEntry = $$props.handleCollapseEntry);
    		if ("handleExpandEntry" in $$props) $$invalidate(17, handleExpandEntry = $$props.handleExpandEntry);
    		if ("handleSplitEntry" in $$props) $$invalidate(18, handleSplitEntry = $$props.handleSplitEntry);
    		if ("handleIndent" in $$props) $$invalidate(19, handleIndent = $$props.handleIndent);
    		if ("handleDedent" in $$props) $$invalidate(20, handleDedent = $$props.handleDedent);
    		if ("handleMultilinePaste" in $$props) $$invalidate(21, handleMultilinePaste = $$props.handleMultilinePaste);
    		if ("handleMoveCursorLeft" in $$props) $$invalidate(22, handleMoveCursorLeft = $$props.handleMoveCursorLeft);
    		if ("handleMoveCursorRight" in $$props) $$invalidate(23, handleMoveCursorRight = $$props.handleMoveCursorRight);
    		if ("handleSaveCursorPos" in $$props) $$invalidate(24, handleSaveCursorPos = $$props.handleSaveCursorPos);
    		if ("handleSaveDocEntry" in $$props) $$invalidate(25, handleSaveDocEntry = $$props.handleSaveDocEntry);
    		if ("handleSaveFullCursor" in $$props) $$invalidate(26, handleSaveFullCursor = $$props.handleSaveFullCursor);
    		if ("handleSwapWithAboveEntry" in $$props) $$invalidate(27, handleSwapWithAboveEntry = $$props.handleSwapWithAboveEntry);
    		if ("handleSwapWithBelowEntry" in $$props) $$invalidate(28, handleSwapWithBelowEntry = $$props.handleSwapWithBelowEntry);
    		if ("handleCycleEntryHeadingSize" in $$props) $$invalidate(29, handleCycleEntryHeadingSize = $$props.handleCycleEntryHeadingSize);
    		if ("theInput" in $$props) $$invalidate(4, theInput = $$props.theInput);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		entryId,
    		entryValue,
    		entryHeadingSize,
    		docCursorEntryId,
    		theInput,
    		handleKeydown,
    		handleEntryInputClick,
    		handleInput,
    		handlePaste,
    		docCursorSelStart,
    		docCursorSelEnd,
    		isEntryAbove,
    		isEntryBelow,
    		handleGoUp,
    		handleGoDown,
    		handleEntryBackspace,
    		handleCollapseEntry,
    		handleExpandEntry,
    		handleSplitEntry,
    		handleIndent,
    		handleDedent,
    		handleMultilinePaste,
    		handleMoveCursorLeft,
    		handleMoveCursorRight,
    		handleSaveCursorPos,
    		handleSaveDocEntry,
    		handleSaveFullCursor,
    		handleSwapWithAboveEntry,
    		handleSwapWithBelowEntry,
    		handleCycleEntryHeadingSize,
    		input_binding,
    		click_handler
    	];
    }

    class EntryInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$9,
    			create_fragment$9,
    			safe_not_equal,
    			{
    				entryId: 0,
    				entryValue: 1,
    				entryHeadingSize: 2,
    				docCursorEntryId: 3,
    				docCursorSelStart: 9,
    				docCursorSelEnd: 10,
    				isEntryAbove: 11,
    				isEntryBelow: 12,
    				handleGoUp: 13,
    				handleGoDown: 14,
    				handleEntryBackspace: 15,
    				handleCollapseEntry: 16,
    				handleExpandEntry: 17,
    				handleSplitEntry: 18,
    				handleIndent: 19,
    				handleDedent: 20,
    				handleMultilinePaste: 21,
    				handleMoveCursorLeft: 22,
    				handleMoveCursorRight: 23,
    				handleSaveCursorPos: 24,
    				handleSaveDocEntry: 25,
    				handleSaveFullCursor: 26,
    				handleSwapWithAboveEntry: 27,
    				handleSwapWithBelowEntry: 28,
    				handleCycleEntryHeadingSize: 29
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EntryInput",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*entryId*/ ctx[0] === undefined && !("entryId" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'entryId'");
    		}

    		if (/*entryValue*/ ctx[1] === undefined && !("entryValue" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'entryValue'");
    		}

    		if (/*entryHeadingSize*/ ctx[2] === undefined && !("entryHeadingSize" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'entryHeadingSize'");
    		}

    		if (/*docCursorEntryId*/ ctx[3] === undefined && !("docCursorEntryId" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'docCursorEntryId'");
    		}

    		if (/*docCursorSelStart*/ ctx[9] === undefined && !("docCursorSelStart" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'docCursorSelStart'");
    		}

    		if (/*docCursorSelEnd*/ ctx[10] === undefined && !("docCursorSelEnd" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'docCursorSelEnd'");
    		}

    		if (/*isEntryAbove*/ ctx[11] === undefined && !("isEntryAbove" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'isEntryAbove'");
    		}

    		if (/*isEntryBelow*/ ctx[12] === undefined && !("isEntryBelow" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'isEntryBelow'");
    		}

    		if (/*handleGoUp*/ ctx[13] === undefined && !("handleGoUp" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleGoUp'");
    		}

    		if (/*handleGoDown*/ ctx[14] === undefined && !("handleGoDown" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleGoDown'");
    		}

    		if (/*handleEntryBackspace*/ ctx[15] === undefined && !("handleEntryBackspace" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleEntryBackspace'");
    		}

    		if (/*handleCollapseEntry*/ ctx[16] === undefined && !("handleCollapseEntry" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleCollapseEntry'");
    		}

    		if (/*handleExpandEntry*/ ctx[17] === undefined && !("handleExpandEntry" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleExpandEntry'");
    		}

    		if (/*handleSplitEntry*/ ctx[18] === undefined && !("handleSplitEntry" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleSplitEntry'");
    		}

    		if (/*handleIndent*/ ctx[19] === undefined && !("handleIndent" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleIndent'");
    		}

    		if (/*handleDedent*/ ctx[20] === undefined && !("handleDedent" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleDedent'");
    		}

    		if (/*handleMultilinePaste*/ ctx[21] === undefined && !("handleMultilinePaste" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleMultilinePaste'");
    		}

    		if (/*handleMoveCursorLeft*/ ctx[22] === undefined && !("handleMoveCursorLeft" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleMoveCursorLeft'");
    		}

    		if (/*handleMoveCursorRight*/ ctx[23] === undefined && !("handleMoveCursorRight" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleMoveCursorRight'");
    		}

    		if (/*handleSaveCursorPos*/ ctx[24] === undefined && !("handleSaveCursorPos" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleSaveCursorPos'");
    		}

    		if (/*handleSaveDocEntry*/ ctx[25] === undefined && !("handleSaveDocEntry" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleSaveDocEntry'");
    		}

    		if (/*handleSaveFullCursor*/ ctx[26] === undefined && !("handleSaveFullCursor" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleSaveFullCursor'");
    		}

    		if (/*handleSwapWithAboveEntry*/ ctx[27] === undefined && !("handleSwapWithAboveEntry" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleSwapWithAboveEntry'");
    		}

    		if (/*handleSwapWithBelowEntry*/ ctx[28] === undefined && !("handleSwapWithBelowEntry" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleSwapWithBelowEntry'");
    		}

    		if (/*handleCycleEntryHeadingSize*/ ctx[29] === undefined && !("handleCycleEntryHeadingSize" in props)) {
    			console.warn("<EntryInput> was created without expected prop 'handleCycleEntryHeadingSize'");
    		}
    	}

    	get entryId() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entryId(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get entryValue() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entryValue(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get entryHeadingSize() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entryHeadingSize(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docCursorEntryId() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docCursorEntryId(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docCursorSelStart() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docCursorSelStart(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docCursorSelEnd() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docCursorSelEnd(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isEntryAbove() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isEntryAbove(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isEntryBelow() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isEntryBelow(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleGoUp() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleGoUp(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleGoDown() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleGoDown(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleEntryBackspace() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleEntryBackspace(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleCollapseEntry() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleCollapseEntry(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleExpandEntry() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleExpandEntry(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSplitEntry() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSplitEntry(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleIndent() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleIndent(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleDedent() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleDedent(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMultilinePaste() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMultilinePaste(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMoveCursorLeft() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMoveCursorLeft(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMoveCursorRight() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMoveCursorRight(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSaveCursorPos() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSaveCursorPos(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSaveDocEntry() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSaveDocEntry(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSaveFullCursor() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSaveFullCursor(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSwapWithAboveEntry() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSwapWithAboveEntry(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSwapWithBelowEntry() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSwapWithBelowEntry(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleCycleEntryHeadingSize() {
    		throw new Error("<EntryInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleCycleEntryHeadingSize(value) {
    		throw new Error("<EntryInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Node.svelte generated by Svelte v3.24.0 */
    const file$8 = "src/components/Node.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	return child_ctx;
    }

    // (118:0) {#if currEntryId !== null}
    function create_if_block_1$1(ctx) {
    	let div;
    	let span0;
    	let show_if;
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let span1;
    	let t2;
    	let current_block_type_index_1;
    	let if_block1;
    	let t3;
    	let if_block2_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_5, create_else_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (dirty[0] & /*flowyTreeNode*/ 2) show_if = !!/*nodeIsCollapsed*/ ctx[32](/*flowyTreeNode*/ ctx[1]);
    		if (show_if) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx, [-1]);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	const if_block_creators_1 = [create_if_block_4, create_else_block_1];
    	const if_blocks_1 = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*isCurrentEntry*/ ctx[29]) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(ctx);
    	if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    	let if_block2 = /*shouldShowDocNameAutocomplete*/ ctx[31] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			if_block0.c();
    			t0 = space();
    			span1 = element("span");
    			span1.textContent = "​";
    			t2 = space();
    			if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr_dev(span0, "class", "icon-container svelte-1gauxqy");
    			add_location(span0, file$8, 119, 4, 4105);
    			add_location(span1, file$8, 126, 4, 4385);
    			attr_dev(div, "class", "entry-display svelte-1gauxqy");
    			attr_dev(div, "data-entry-id", /*currEntryId*/ ctx[25]);
    			add_location(div, file$8, 118, 2, 4045);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			if_blocks[current_block_type_index].m(span0, null);
    			append_dev(div, t0);
    			append_dev(div, span1);
    			append_dev(div, t2);
    			if_blocks_1[current_block_type_index_1].m(div, null);
    			insert_dev(target, t3, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span0, "click", /*click_handler*/ ctx[35], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(span0, null);
    			}

    			let previous_block_index_1 = current_block_type_index_1;
    			current_block_type_index_1 = select_block_type_1(ctx);

    			if (current_block_type_index_1 === previous_block_index_1) {
    				if_blocks_1[current_block_type_index_1].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks_1[previous_block_index_1], 1, 1, () => {
    					if_blocks_1[previous_block_index_1] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks_1[current_block_type_index_1];

    				if (!if_block1) {
    					if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div, null);
    			}

    			if (!current || dirty[0] & /*currEntryId*/ 33554432) {
    				attr_dev(div, "data-entry-id", /*currEntryId*/ ctx[25]);
    			}

    			if (/*shouldShowDocNameAutocomplete*/ ctx[31]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2$1(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			if (detaching) detach_dev(t3);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(118:0) {#if currEntryId !== null}",
    		ctx
    	});

    	return block;
    }

    // (123:6) {:else}
    function create_else_block_2(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { data: faCircle, scale: "0.51" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(123:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (121:6) {#if nodeIsCollapsed(flowyTreeNode)}
    function create_if_block_5(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { data: faPlus, scale: "0.51" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(121:6) {#if nodeIsCollapsed(flowyTreeNode)}",
    		ctx
    	});

    	return block;
    }

    // (156:6) {:else}
    function create_else_block_1(ctx) {
    	let renderedentry;
    	let current;

    	renderedentry = new RenderedEntry({
    			props: {
    				entryId: /*currEntryId*/ ctx[25],
    				entryText: /*tree*/ ctx[0].getEntryText(/*currEntryId*/ ctx[25]),
    				entryHeadingSize: /*tree*/ ctx[0].getEntryHeadingSize(/*currEntryId*/ ctx[25]),
    				handleUpdateEntryLinks: /*handleUpdateEntryLinks*/ ctx[22]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(renderedentry.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(renderedentry, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const renderedentry_changes = {};
    			if (dirty[0] & /*currEntryId*/ 33554432) renderedentry_changes.entryId = /*currEntryId*/ ctx[25];
    			if (dirty[0] & /*tree, currEntryId*/ 33554433) renderedentry_changes.entryText = /*tree*/ ctx[0].getEntryText(/*currEntryId*/ ctx[25]);
    			if (dirty[0] & /*tree, currEntryId*/ 33554433) renderedentry_changes.entryHeadingSize = /*tree*/ ctx[0].getEntryHeadingSize(/*currEntryId*/ ctx[25]);
    			if (dirty[0] & /*handleUpdateEntryLinks*/ 4194304) renderedentry_changes.handleUpdateEntryLinks = /*handleUpdateEntryLinks*/ ctx[22];
    			renderedentry.$set(renderedentry_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(renderedentry.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(renderedentry.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(renderedentry, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(156:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (128:4) {#if isCurrentEntry}
    function create_if_block_4(ctx) {
    	let entryinput;
    	let current;

    	entryinput = new EntryInput({
    			props: {
    				entryId: /*currEntryId*/ ctx[25],
    				entryValue: /*tree*/ ctx[0].getEntryText(/*currEntryId*/ ctx[25]),
    				entryHeadingSize: /*tree*/ ctx[0].getEntryHeadingSize(/*currEntryId*/ ctx[25]),
    				docCursorEntryId: /*docCursorEntryId*/ ctx[2],
    				docCursorSelStart: /*docCursorSelStart*/ ctx[3],
    				docCursorSelEnd: /*docCursorSelEnd*/ ctx[4],
    				isEntryAbove: /*tree*/ ctx[0].hasEntryAbove(/*currEntryId*/ ctx[25]),
    				isEntryBelow: /*tree*/ ctx[0].hasEntryBelow(/*currEntryId*/ ctx[25]),
    				handleSaveDocEntry: /*handleSaveDocEntry*/ ctx[18],
    				handleSaveFullCursor: /*handleSaveFullCursor*/ ctx[19],
    				handleGoUp: /*handleGoUp*/ ctx[6],
    				handleGoDown: /*handleGoDown*/ ctx[7],
    				handleCollapseEntry: /*handleCollapseEntry*/ ctx[9],
    				handleExpandEntry: /*handleExpandEntry*/ ctx[10],
    				handleSplitEntry: /*handleSplitEntry*/ ctx[11],
    				handleEntryBackspace: /*handleEntryBackspace*/ ctx[8],
    				handleIndent: /*handleIndent*/ ctx[12],
    				handleDedent: /*handleDedent*/ ctx[13],
    				handleMultilinePaste: /*handleMultilinePaste*/ ctx[14],
    				handleMoveCursorLeft: /*handleMoveCursorLeft*/ ctx[15],
    				handleMoveCursorRight: /*handleMoveCursorRight*/ ctx[16],
    				handleSaveCursorPos: /*handleSaveCursorPos*/ ctx[17],
    				handleSwapWithAboveEntry: /*handleSwapWithAboveEntry*/ ctx[20],
    				handleSwapWithBelowEntry: /*handleSwapWithBelowEntry*/ ctx[21],
    				handleCycleEntryHeadingSize: /*handleCycleEntryHeadingSize*/ ctx[23]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(entryinput.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(entryinput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const entryinput_changes = {};
    			if (dirty[0] & /*currEntryId*/ 33554432) entryinput_changes.entryId = /*currEntryId*/ ctx[25];
    			if (dirty[0] & /*tree, currEntryId*/ 33554433) entryinput_changes.entryValue = /*tree*/ ctx[0].getEntryText(/*currEntryId*/ ctx[25]);
    			if (dirty[0] & /*tree, currEntryId*/ 33554433) entryinput_changes.entryHeadingSize = /*tree*/ ctx[0].getEntryHeadingSize(/*currEntryId*/ ctx[25]);
    			if (dirty[0] & /*docCursorEntryId*/ 4) entryinput_changes.docCursorEntryId = /*docCursorEntryId*/ ctx[2];
    			if (dirty[0] & /*docCursorSelStart*/ 8) entryinput_changes.docCursorSelStart = /*docCursorSelStart*/ ctx[3];
    			if (dirty[0] & /*docCursorSelEnd*/ 16) entryinput_changes.docCursorSelEnd = /*docCursorSelEnd*/ ctx[4];
    			if (dirty[0] & /*tree, currEntryId*/ 33554433) entryinput_changes.isEntryAbove = /*tree*/ ctx[0].hasEntryAbove(/*currEntryId*/ ctx[25]);
    			if (dirty[0] & /*tree, currEntryId*/ 33554433) entryinput_changes.isEntryBelow = /*tree*/ ctx[0].hasEntryBelow(/*currEntryId*/ ctx[25]);
    			if (dirty[0] & /*handleSaveDocEntry*/ 262144) entryinput_changes.handleSaveDocEntry = /*handleSaveDocEntry*/ ctx[18];
    			if (dirty[0] & /*handleSaveFullCursor*/ 524288) entryinput_changes.handleSaveFullCursor = /*handleSaveFullCursor*/ ctx[19];
    			if (dirty[0] & /*handleGoUp*/ 64) entryinput_changes.handleGoUp = /*handleGoUp*/ ctx[6];
    			if (dirty[0] & /*handleGoDown*/ 128) entryinput_changes.handleGoDown = /*handleGoDown*/ ctx[7];
    			if (dirty[0] & /*handleCollapseEntry*/ 512) entryinput_changes.handleCollapseEntry = /*handleCollapseEntry*/ ctx[9];
    			if (dirty[0] & /*handleExpandEntry*/ 1024) entryinput_changes.handleExpandEntry = /*handleExpandEntry*/ ctx[10];
    			if (dirty[0] & /*handleSplitEntry*/ 2048) entryinput_changes.handleSplitEntry = /*handleSplitEntry*/ ctx[11];
    			if (dirty[0] & /*handleEntryBackspace*/ 256) entryinput_changes.handleEntryBackspace = /*handleEntryBackspace*/ ctx[8];
    			if (dirty[0] & /*handleIndent*/ 4096) entryinput_changes.handleIndent = /*handleIndent*/ ctx[12];
    			if (dirty[0] & /*handleDedent*/ 8192) entryinput_changes.handleDedent = /*handleDedent*/ ctx[13];
    			if (dirty[0] & /*handleMultilinePaste*/ 16384) entryinput_changes.handleMultilinePaste = /*handleMultilinePaste*/ ctx[14];
    			if (dirty[0] & /*handleMoveCursorLeft*/ 32768) entryinput_changes.handleMoveCursorLeft = /*handleMoveCursorLeft*/ ctx[15];
    			if (dirty[0] & /*handleMoveCursorRight*/ 65536) entryinput_changes.handleMoveCursorRight = /*handleMoveCursorRight*/ ctx[16];
    			if (dirty[0] & /*handleSaveCursorPos*/ 131072) entryinput_changes.handleSaveCursorPos = /*handleSaveCursorPos*/ ctx[17];
    			if (dirty[0] & /*handleSwapWithAboveEntry*/ 1048576) entryinput_changes.handleSwapWithAboveEntry = /*handleSwapWithAboveEntry*/ ctx[20];
    			if (dirty[0] & /*handleSwapWithBelowEntry*/ 2097152) entryinput_changes.handleSwapWithBelowEntry = /*handleSwapWithBelowEntry*/ ctx[21];
    			if (dirty[0] & /*handleCycleEntryHeadingSize*/ 8388608) entryinput_changes.handleCycleEntryHeadingSize = /*handleCycleEntryHeadingSize*/ ctx[23];
    			entryinput.$set(entryinput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(entryinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(entryinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(entryinput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(128:4) {#if isCurrentEntry}",
    		ctx
    	});

    	return block;
    }

    // (165:2) {#if shouldShowDocNameAutocomplete}
    function create_if_block_2$1(ctx) {
    	let div;

    	function select_block_type_2(ctx, dirty) {
    		if (/*autoCompleteDocNames*/ ctx[30].length > 0) return create_if_block_3$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "id", "doc-name-autocomplete");
    			attr_dev(div, "class", "svelte-1gauxqy");
    			add_location(div, file$8, 165, 4, 5597);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(165:2) {#if shouldShowDocNameAutocomplete}",
    		ctx
    	});

    	return block;
    }

    // (171:6) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let em;

    	const block = {
    		c: function create() {
    			div = element("div");
    			em = element("em");
    			em.textContent = "Search page titles";
    			add_location(em, file$8, 171, 48, 5910);
    			attr_dev(div, "id", "doc-name-autocomplete-default");
    			attr_dev(div, "class", "svelte-1gauxqy");
    			add_location(div, file$8, 171, 8, 5870);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, em);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(171:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (167:6) {#if autoCompleteDocNames.length > 0}
    function create_if_block_3$1(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*autoCompleteDocNames*/ ctx[30];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*autoCompleteDocNames*/ 1073741824 | dirty[1] & /*handleDocNameAutocompleteClick*/ 8) {
    				each_value_1 = /*autoCompleteDocNames*/ ctx[30];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(167:6) {#if autoCompleteDocNames.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (168:8) {#each autoCompleteDocNames as docName}
    function create_each_block_1$2(ctx) {
    	let div;
    	let t_value = /*docName*/ ctx[39] + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "doc-name-autocomplete-option svelte-1gauxqy");
    			add_location(div, file$8, 168, 10, 5732);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleDocNameAutocompleteClick*/ ctx[34], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*autoCompleteDocNames*/ 1073741824 && t_value !== (t_value = /*docName*/ ctx[39] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(168:8) {#each autoCompleteDocNames as docName}",
    		ctx
    	});

    	return block;
    }

    // (178:0) {#if currNodeHasChildren && !isCollapsed}
    function create_if_block$3(ctx) {
    	let ul;
    	let current;
    	let each_value = /*childItemArray*/ ctx[26];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "tree-node-list svelte-1gauxqy");
    			add_location(ul, file$8, 178, 2, 6026);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*tree, childItemArray, docCursorEntryId, docCursorSelStart, docCursorSelEnd, findRelevantDocNames, handleSaveDocEntry, handleSaveFullCursor, handleGoUp, handleGoDown, handleCollapseEntry, handleExpandEntry, handleSplitEntry, handleEntryBackspace, handleIndent, handleDedent, handleMultilinePaste, handleMoveCursorLeft, handleMoveCursorRight, handleSaveCursorPos, handleUpdateEntryLinks, handleSwapWithAboveEntry, handleSwapWithBelowEntry, handleCycleEntryHeadingSize, handleReplaceEntryTextAroundCursor*/ 100663293) {
    				each_value = /*childItemArray*/ ctx[26];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(178:0) {#if currNodeHasChildren && !isCollapsed}",
    		ctx
    	});

    	return block;
    }

    // (180:4) {#each childItemArray as child}
    function create_each_block$2(ctx) {
    	let li;
    	let node;
    	let t;
    	let current;

    	node = new Node_1({
    			props: {
    				tree: /*tree*/ ctx[0],
    				flowyTreeNode: /*child*/ ctx[36].value,
    				docCursorEntryId: /*docCursorEntryId*/ ctx[2],
    				docCursorSelStart: /*docCursorSelStart*/ ctx[3],
    				docCursorSelEnd: /*docCursorSelEnd*/ ctx[4],
    				findRelevantDocNames: /*findRelevantDocNames*/ ctx[5],
    				handleSaveDocEntry: /*handleSaveDocEntry*/ ctx[18],
    				handleSaveFullCursor: /*handleSaveFullCursor*/ ctx[19],
    				handleGoUp: /*handleGoUp*/ ctx[6],
    				handleGoDown: /*handleGoDown*/ ctx[7],
    				handleCollapseEntry: /*handleCollapseEntry*/ ctx[9],
    				handleExpandEntry: /*handleExpandEntry*/ ctx[10],
    				handleSplitEntry: /*handleSplitEntry*/ ctx[11],
    				handleEntryBackspace: /*handleEntryBackspace*/ ctx[8],
    				handleIndent: /*handleIndent*/ ctx[12],
    				handleDedent: /*handleDedent*/ ctx[13],
    				handleMultilinePaste: /*handleMultilinePaste*/ ctx[14],
    				handleMoveCursorLeft: /*handleMoveCursorLeft*/ ctx[15],
    				handleMoveCursorRight: /*handleMoveCursorRight*/ ctx[16],
    				handleSaveCursorPos: /*handleSaveCursorPos*/ ctx[17],
    				handleUpdateEntryLinks: /*handleUpdateEntryLinks*/ ctx[22],
    				handleSwapWithAboveEntry: /*handleSwapWithAboveEntry*/ ctx[20],
    				handleSwapWithBelowEntry: /*handleSwapWithBelowEntry*/ ctx[21],
    				handleCycleEntryHeadingSize: /*handleCycleEntryHeadingSize*/ ctx[23],
    				handleReplaceEntryTextAroundCursor: /*handleReplaceEntryTextAroundCursor*/ ctx[24]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(node.$$.fragment);
    			t = space();
    			attr_dev(li, "class", "svelte-1gauxqy");
    			add_location(li, file$8, 180, 6, 6096);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(node, li, null);
    			append_dev(li, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const node_changes = {};
    			if (dirty[0] & /*tree*/ 1) node_changes.tree = /*tree*/ ctx[0];
    			if (dirty[0] & /*childItemArray*/ 67108864) node_changes.flowyTreeNode = /*child*/ ctx[36].value;
    			if (dirty[0] & /*docCursorEntryId*/ 4) node_changes.docCursorEntryId = /*docCursorEntryId*/ ctx[2];
    			if (dirty[0] & /*docCursorSelStart*/ 8) node_changes.docCursorSelStart = /*docCursorSelStart*/ ctx[3];
    			if (dirty[0] & /*docCursorSelEnd*/ 16) node_changes.docCursorSelEnd = /*docCursorSelEnd*/ ctx[4];
    			if (dirty[0] & /*findRelevantDocNames*/ 32) node_changes.findRelevantDocNames = /*findRelevantDocNames*/ ctx[5];
    			if (dirty[0] & /*handleSaveDocEntry*/ 262144) node_changes.handleSaveDocEntry = /*handleSaveDocEntry*/ ctx[18];
    			if (dirty[0] & /*handleSaveFullCursor*/ 524288) node_changes.handleSaveFullCursor = /*handleSaveFullCursor*/ ctx[19];
    			if (dirty[0] & /*handleGoUp*/ 64) node_changes.handleGoUp = /*handleGoUp*/ ctx[6];
    			if (dirty[0] & /*handleGoDown*/ 128) node_changes.handleGoDown = /*handleGoDown*/ ctx[7];
    			if (dirty[0] & /*handleCollapseEntry*/ 512) node_changes.handleCollapseEntry = /*handleCollapseEntry*/ ctx[9];
    			if (dirty[0] & /*handleExpandEntry*/ 1024) node_changes.handleExpandEntry = /*handleExpandEntry*/ ctx[10];
    			if (dirty[0] & /*handleSplitEntry*/ 2048) node_changes.handleSplitEntry = /*handleSplitEntry*/ ctx[11];
    			if (dirty[0] & /*handleEntryBackspace*/ 256) node_changes.handleEntryBackspace = /*handleEntryBackspace*/ ctx[8];
    			if (dirty[0] & /*handleIndent*/ 4096) node_changes.handleIndent = /*handleIndent*/ ctx[12];
    			if (dirty[0] & /*handleDedent*/ 8192) node_changes.handleDedent = /*handleDedent*/ ctx[13];
    			if (dirty[0] & /*handleMultilinePaste*/ 16384) node_changes.handleMultilinePaste = /*handleMultilinePaste*/ ctx[14];
    			if (dirty[0] & /*handleMoveCursorLeft*/ 32768) node_changes.handleMoveCursorLeft = /*handleMoveCursorLeft*/ ctx[15];
    			if (dirty[0] & /*handleMoveCursorRight*/ 65536) node_changes.handleMoveCursorRight = /*handleMoveCursorRight*/ ctx[16];
    			if (dirty[0] & /*handleSaveCursorPos*/ 131072) node_changes.handleSaveCursorPos = /*handleSaveCursorPos*/ ctx[17];
    			if (dirty[0] & /*handleUpdateEntryLinks*/ 4194304) node_changes.handleUpdateEntryLinks = /*handleUpdateEntryLinks*/ ctx[22];
    			if (dirty[0] & /*handleSwapWithAboveEntry*/ 1048576) node_changes.handleSwapWithAboveEntry = /*handleSwapWithAboveEntry*/ ctx[20];
    			if (dirty[0] & /*handleSwapWithBelowEntry*/ 2097152) node_changes.handleSwapWithBelowEntry = /*handleSwapWithBelowEntry*/ ctx[21];
    			if (dirty[0] & /*handleCycleEntryHeadingSize*/ 8388608) node_changes.handleCycleEntryHeadingSize = /*handleCycleEntryHeadingSize*/ ctx[23];
    			if (dirty[0] & /*handleReplaceEntryTextAroundCursor*/ 16777216) node_changes.handleReplaceEntryTextAroundCursor = /*handleReplaceEntryTextAroundCursor*/ ctx[24];
    			node.$set(node_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(node.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(node.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(node);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(180:4) {#each childItemArray as child}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let t;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*currEntryId*/ ctx[25] !== null && create_if_block_1$1(ctx);
    	let if_block1 = /*currNodeHasChildren*/ ctx[27] && !/*isCollapsed*/ ctx[28] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*currEntryId*/ ctx[25] !== null) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*currEntryId*/ 33554432) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*currNodeHasChildren*/ ctx[27] && !/*isCollapsed*/ ctx[28]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*currNodeHasChildren, isCollapsed*/ 402653184) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { tree } = $$props,
    		{ flowyTreeNode } = $$props,
    		{ docCursorEntryId } = $$props,
    		{ docCursorSelStart } = $$props,
    		{ docCursorSelEnd } = $$props,
    		{ findRelevantDocNames } = $$props,
    		{ handleGoUp } = $$props,
    		{ handleGoDown } = $$props,
    		{ handleEntryBackspace } = $$props,
    		{ handleCollapseEntry } = $$props,
    		{ handleExpandEntry } = $$props,
    		{ handleSplitEntry } = $$props,
    		{ handleIndent } = $$props,
    		{ handleDedent } = $$props,
    		{ handleMultilinePaste } = $$props,
    		{ handleMoveCursorLeft } = $$props,
    		{ handleMoveCursorRight } = $$props,
    		{ handleSaveCursorPos } = $$props,
    		{ handleSaveDocEntry } = $$props,
    		{ handleSaveFullCursor } = $$props,
    		{ handleSwapWithAboveEntry } = $$props,
    		{ handleSwapWithBelowEntry } = $$props,
    		{ handleUpdateEntryLinks } = $$props,
    		{ handleCycleEntryHeadingSize } = $$props,
    		{ handleReplaceEntryTextAroundCursor } = $$props;

    	function nodeIsCollapsed(node) {
    		return node.hasChildren() && tree.getEntryDisplayState(node.getId()) === EntryDisplayState.COLLAPSED;
    	}

    	function handleToggle(entryId, isCollapsed) {
    		if (isCollapsed) {
    			handleExpandEntry(entryId);
    		} else {
    			handleCollapseEntry(entryId);
    		}
    	}

    	function handleDocNameAutocompleteClick(event) {
    		event.preventDefault();
    		let el = event.target;
    		handleReplaceEntryTextAroundCursor(el.textContent);
    	}

    	let currEntryId;
    	let childItemArray;
    	let currNodeHasChildren;
    	let isCollapsed;
    	let isCurrentEntry;

    	// TODO: move to a derived store?
    	let autoCompleteDocNames;

    	let shouldShowDocNameAutocomplete;

    	const writable_props = [
    		"tree",
    		"flowyTreeNode",
    		"docCursorEntryId",
    		"docCursorSelStart",
    		"docCursorSelEnd",
    		"findRelevantDocNames",
    		"handleGoUp",
    		"handleGoDown",
    		"handleEntryBackspace",
    		"handleCollapseEntry",
    		"handleExpandEntry",
    		"handleSplitEntry",
    		"handleIndent",
    		"handleDedent",
    		"handleMultilinePaste",
    		"handleMoveCursorLeft",
    		"handleMoveCursorRight",
    		"handleSaveCursorPos",
    		"handleSaveDocEntry",
    		"handleSaveFullCursor",
    		"handleSwapWithAboveEntry",
    		"handleSwapWithBelowEntry",
    		"handleUpdateEntryLinks",
    		"handleCycleEntryHeadingSize",
    		"handleReplaceEntryTextAroundCursor"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Node> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Node", $$slots, []);
    	const click_handler = () => handleToggle(currEntryId, nodeIsCollapsed(flowyTreeNode));

    	$$self.$set = $$props => {
    		if ("tree" in $$props) $$invalidate(0, tree = $$props.tree);
    		if ("flowyTreeNode" in $$props) $$invalidate(1, flowyTreeNode = $$props.flowyTreeNode);
    		if ("docCursorEntryId" in $$props) $$invalidate(2, docCursorEntryId = $$props.docCursorEntryId);
    		if ("docCursorSelStart" in $$props) $$invalidate(3, docCursorSelStart = $$props.docCursorSelStart);
    		if ("docCursorSelEnd" in $$props) $$invalidate(4, docCursorSelEnd = $$props.docCursorSelEnd);
    		if ("findRelevantDocNames" in $$props) $$invalidate(5, findRelevantDocNames = $$props.findRelevantDocNames);
    		if ("handleGoUp" in $$props) $$invalidate(6, handleGoUp = $$props.handleGoUp);
    		if ("handleGoDown" in $$props) $$invalidate(7, handleGoDown = $$props.handleGoDown);
    		if ("handleEntryBackspace" in $$props) $$invalidate(8, handleEntryBackspace = $$props.handleEntryBackspace);
    		if ("handleCollapseEntry" in $$props) $$invalidate(9, handleCollapseEntry = $$props.handleCollapseEntry);
    		if ("handleExpandEntry" in $$props) $$invalidate(10, handleExpandEntry = $$props.handleExpandEntry);
    		if ("handleSplitEntry" in $$props) $$invalidate(11, handleSplitEntry = $$props.handleSplitEntry);
    		if ("handleIndent" in $$props) $$invalidate(12, handleIndent = $$props.handleIndent);
    		if ("handleDedent" in $$props) $$invalidate(13, handleDedent = $$props.handleDedent);
    		if ("handleMultilinePaste" in $$props) $$invalidate(14, handleMultilinePaste = $$props.handleMultilinePaste);
    		if ("handleMoveCursorLeft" in $$props) $$invalidate(15, handleMoveCursorLeft = $$props.handleMoveCursorLeft);
    		if ("handleMoveCursorRight" in $$props) $$invalidate(16, handleMoveCursorRight = $$props.handleMoveCursorRight);
    		if ("handleSaveCursorPos" in $$props) $$invalidate(17, handleSaveCursorPos = $$props.handleSaveCursorPos);
    		if ("handleSaveDocEntry" in $$props) $$invalidate(18, handleSaveDocEntry = $$props.handleSaveDocEntry);
    		if ("handleSaveFullCursor" in $$props) $$invalidate(19, handleSaveFullCursor = $$props.handleSaveFullCursor);
    		if ("handleSwapWithAboveEntry" in $$props) $$invalidate(20, handleSwapWithAboveEntry = $$props.handleSwapWithAboveEntry);
    		if ("handleSwapWithBelowEntry" in $$props) $$invalidate(21, handleSwapWithBelowEntry = $$props.handleSwapWithBelowEntry);
    		if ("handleUpdateEntryLinks" in $$props) $$invalidate(22, handleUpdateEntryLinks = $$props.handleUpdateEntryLinks);
    		if ("handleCycleEntryHeadingSize" in $$props) $$invalidate(23, handleCycleEntryHeadingSize = $$props.handleCycleEntryHeadingSize);
    		if ("handleReplaceEntryTextAroundCursor" in $$props) $$invalidate(24, handleReplaceEntryTextAroundCursor = $$props.handleReplaceEntryTextAroundCursor);
    	};

    	$$self.$capture_state = () => ({
    		tree,
    		flowyTreeNode,
    		docCursorEntryId,
    		docCursorSelStart,
    		docCursorSelEnd,
    		findRelevantDocNames,
    		handleGoUp,
    		handleGoDown,
    		handleEntryBackspace,
    		handleCollapseEntry,
    		handleExpandEntry,
    		handleSplitEntry,
    		handleIndent,
    		handleDedent,
    		handleMultilinePaste,
    		handleMoveCursorLeft,
    		handleMoveCursorRight,
    		handleSaveCursorPos,
    		handleSaveDocEntry,
    		handleSaveFullCursor,
    		handleSwapWithAboveEntry,
    		handleSwapWithBelowEntry,
    		handleUpdateEntryLinks,
    		handleCycleEntryHeadingSize,
    		handleReplaceEntryTextAroundCursor,
    		Icon,
    		faCircle,
    		faPlus,
    		FlowyTree,
    		FlowyTreeNode,
    		EntryInput,
    		LinkedListItem,
    		RenderedEntry,
    		Node: Node_1,
    		EntryDisplayState,
    		nodeIsCollapsed,
    		handleToggle,
    		handleDocNameAutocompleteClick,
    		currEntryId,
    		childItemArray,
    		currNodeHasChildren,
    		isCollapsed,
    		isCurrentEntry,
    		autoCompleteDocNames,
    		shouldShowDocNameAutocomplete
    	});

    	$$self.$inject_state = $$props => {
    		if ("tree" in $$props) $$invalidate(0, tree = $$props.tree);
    		if ("flowyTreeNode" in $$props) $$invalidate(1, flowyTreeNode = $$props.flowyTreeNode);
    		if ("docCursorEntryId" in $$props) $$invalidate(2, docCursorEntryId = $$props.docCursorEntryId);
    		if ("docCursorSelStart" in $$props) $$invalidate(3, docCursorSelStart = $$props.docCursorSelStart);
    		if ("docCursorSelEnd" in $$props) $$invalidate(4, docCursorSelEnd = $$props.docCursorSelEnd);
    		if ("findRelevantDocNames" in $$props) $$invalidate(5, findRelevantDocNames = $$props.findRelevantDocNames);
    		if ("handleGoUp" in $$props) $$invalidate(6, handleGoUp = $$props.handleGoUp);
    		if ("handleGoDown" in $$props) $$invalidate(7, handleGoDown = $$props.handleGoDown);
    		if ("handleEntryBackspace" in $$props) $$invalidate(8, handleEntryBackspace = $$props.handleEntryBackspace);
    		if ("handleCollapseEntry" in $$props) $$invalidate(9, handleCollapseEntry = $$props.handleCollapseEntry);
    		if ("handleExpandEntry" in $$props) $$invalidate(10, handleExpandEntry = $$props.handleExpandEntry);
    		if ("handleSplitEntry" in $$props) $$invalidate(11, handleSplitEntry = $$props.handleSplitEntry);
    		if ("handleIndent" in $$props) $$invalidate(12, handleIndent = $$props.handleIndent);
    		if ("handleDedent" in $$props) $$invalidate(13, handleDedent = $$props.handleDedent);
    		if ("handleMultilinePaste" in $$props) $$invalidate(14, handleMultilinePaste = $$props.handleMultilinePaste);
    		if ("handleMoveCursorLeft" in $$props) $$invalidate(15, handleMoveCursorLeft = $$props.handleMoveCursorLeft);
    		if ("handleMoveCursorRight" in $$props) $$invalidate(16, handleMoveCursorRight = $$props.handleMoveCursorRight);
    		if ("handleSaveCursorPos" in $$props) $$invalidate(17, handleSaveCursorPos = $$props.handleSaveCursorPos);
    		if ("handleSaveDocEntry" in $$props) $$invalidate(18, handleSaveDocEntry = $$props.handleSaveDocEntry);
    		if ("handleSaveFullCursor" in $$props) $$invalidate(19, handleSaveFullCursor = $$props.handleSaveFullCursor);
    		if ("handleSwapWithAboveEntry" in $$props) $$invalidate(20, handleSwapWithAboveEntry = $$props.handleSwapWithAboveEntry);
    		if ("handleSwapWithBelowEntry" in $$props) $$invalidate(21, handleSwapWithBelowEntry = $$props.handleSwapWithBelowEntry);
    		if ("handleUpdateEntryLinks" in $$props) $$invalidate(22, handleUpdateEntryLinks = $$props.handleUpdateEntryLinks);
    		if ("handleCycleEntryHeadingSize" in $$props) $$invalidate(23, handleCycleEntryHeadingSize = $$props.handleCycleEntryHeadingSize);
    		if ("handleReplaceEntryTextAroundCursor" in $$props) $$invalidate(24, handleReplaceEntryTextAroundCursor = $$props.handleReplaceEntryTextAroundCursor);
    		if ("currEntryId" in $$props) $$invalidate(25, currEntryId = $$props.currEntryId);
    		if ("childItemArray" in $$props) $$invalidate(26, childItemArray = $$props.childItemArray);
    		if ("currNodeHasChildren" in $$props) $$invalidate(27, currNodeHasChildren = $$props.currNodeHasChildren);
    		if ("isCollapsed" in $$props) $$invalidate(28, isCollapsed = $$props.isCollapsed);
    		if ("isCurrentEntry" in $$props) $$invalidate(29, isCurrentEntry = $$props.isCurrentEntry);
    		if ("autoCompleteDocNames" in $$props) $$invalidate(30, autoCompleteDocNames = $$props.autoCompleteDocNames);
    		if ("shouldShowDocNameAutocomplete" in $$props) $$invalidate(31, shouldShowDocNameAutocomplete = $$props.shouldShowDocNameAutocomplete);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*flowyTreeNode*/ 2) {
    			 $$invalidate(25, currEntryId = flowyTreeNode.getId());
    		}

    		if ($$self.$$.dirty[0] & /*flowyTreeNode*/ 2) {
    			 $$invalidate(26, childItemArray = flowyTreeNode.getChildNodeArray());
    		}

    		if ($$self.$$.dirty[0] & /*childItemArray*/ 67108864) {
    			 $$invalidate(27, currNodeHasChildren = childItemArray.length > 0);
    		}

    		if ($$self.$$.dirty[0] & /*currNodeHasChildren, tree, currEntryId*/ 167772161) {
    			 $$invalidate(28, isCollapsed = currNodeHasChildren && tree.getEntryDisplayState(currEntryId) == EntryDisplayState.COLLAPSED);
    		}

    		if ($$self.$$.dirty[0] & /*currEntryId, docCursorEntryId*/ 33554436) {
    			 $$invalidate(29, isCurrentEntry = currEntryId != null && currEntryId === docCursorEntryId);
    		}

    		if ($$self.$$.dirty[0] & /*isCurrentEntry, docCursorSelStart, docCursorSelEnd, tree, currEntryId, findRelevantDocNames*/ 570425401) {
    			 $$invalidate(30, autoCompleteDocNames = (function () {
    				if (isCurrentEntry && docCursorSelStart === docCursorSelEnd) {
    					let entryValue = tree.getEntryText(currEntryId);

    					let [entryBefore, entryAfter] = [
    						entryValue.substring(0, docCursorSelStart),
    						entryValue.substring(docCursorSelStart)
    					];

    					let entryBeforeRev = [...entryBefore].reverse().join("");
    					let prevOpeningRev = /^([^\[\]]*)\[\[(?!\\)/g;
    					let prevOpeningRevResult = entryBeforeRev.match(prevOpeningRev);
    					let nextClosing = /^(.{0}|([^\[\]]*[^\]\\]))]]/g;
    					let nextClosingResult = entryAfter.match(nextClosing);

    					if (prevOpeningRevResult != null && nextClosingResult != null) {
    						let prevLinkRev = prevOpeningRevResult[0];
    						let prevPageRev = prevLinkRev.substring(0, prevLinkRev.length - 2);
    						let prevPage = [...prevPageRev].reverse().join("");
    						let pageTitleText = prevPage + nextClosingResult[0].substring(0, nextClosingResult[0].length - 2);

    						let relevantDocNames = pageTitleText.length > 0
    						? findRelevantDocNames(pageTitleText)
    						: [];

    						return relevantDocNames;
    					}
    				}

    				return null;
    			})());
    		}

    		if ($$self.$$.dirty[0] & /*autoCompleteDocNames*/ 1073741824) {
    			 $$invalidate(31, shouldShowDocNameAutocomplete = autoCompleteDocNames !== null);
    		}
    	};

    	return [
    		tree,
    		flowyTreeNode,
    		docCursorEntryId,
    		docCursorSelStart,
    		docCursorSelEnd,
    		findRelevantDocNames,
    		handleGoUp,
    		handleGoDown,
    		handleEntryBackspace,
    		handleCollapseEntry,
    		handleExpandEntry,
    		handleSplitEntry,
    		handleIndent,
    		handleDedent,
    		handleMultilinePaste,
    		handleMoveCursorLeft,
    		handleMoveCursorRight,
    		handleSaveCursorPos,
    		handleSaveDocEntry,
    		handleSaveFullCursor,
    		handleSwapWithAboveEntry,
    		handleSwapWithBelowEntry,
    		handleUpdateEntryLinks,
    		handleCycleEntryHeadingSize,
    		handleReplaceEntryTextAroundCursor,
    		currEntryId,
    		childItemArray,
    		currNodeHasChildren,
    		isCollapsed,
    		isCurrentEntry,
    		autoCompleteDocNames,
    		shouldShowDocNameAutocomplete,
    		nodeIsCollapsed,
    		handleToggle,
    		handleDocNameAutocompleteClick,
    		click_handler
    	];
    }

    class Node_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				tree: 0,
    				flowyTreeNode: 1,
    				docCursorEntryId: 2,
    				docCursorSelStart: 3,
    				docCursorSelEnd: 4,
    				findRelevantDocNames: 5,
    				handleGoUp: 6,
    				handleGoDown: 7,
    				handleEntryBackspace: 8,
    				handleCollapseEntry: 9,
    				handleExpandEntry: 10,
    				handleSplitEntry: 11,
    				handleIndent: 12,
    				handleDedent: 13,
    				handleMultilinePaste: 14,
    				handleMoveCursorLeft: 15,
    				handleMoveCursorRight: 16,
    				handleSaveCursorPos: 17,
    				handleSaveDocEntry: 18,
    				handleSaveFullCursor: 19,
    				handleSwapWithAboveEntry: 20,
    				handleSwapWithBelowEntry: 21,
    				handleUpdateEntryLinks: 22,
    				handleCycleEntryHeadingSize: 23,
    				handleReplaceEntryTextAroundCursor: 24
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Node_1",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tree*/ ctx[0] === undefined && !("tree" in props)) {
    			console.warn("<Node> was created without expected prop 'tree'");
    		}

    		if (/*flowyTreeNode*/ ctx[1] === undefined && !("flowyTreeNode" in props)) {
    			console.warn("<Node> was created without expected prop 'flowyTreeNode'");
    		}

    		if (/*docCursorEntryId*/ ctx[2] === undefined && !("docCursorEntryId" in props)) {
    			console.warn("<Node> was created without expected prop 'docCursorEntryId'");
    		}

    		if (/*docCursorSelStart*/ ctx[3] === undefined && !("docCursorSelStart" in props)) {
    			console.warn("<Node> was created without expected prop 'docCursorSelStart'");
    		}

    		if (/*docCursorSelEnd*/ ctx[4] === undefined && !("docCursorSelEnd" in props)) {
    			console.warn("<Node> was created without expected prop 'docCursorSelEnd'");
    		}

    		if (/*findRelevantDocNames*/ ctx[5] === undefined && !("findRelevantDocNames" in props)) {
    			console.warn("<Node> was created without expected prop 'findRelevantDocNames'");
    		}

    		if (/*handleGoUp*/ ctx[6] === undefined && !("handleGoUp" in props)) {
    			console.warn("<Node> was created without expected prop 'handleGoUp'");
    		}

    		if (/*handleGoDown*/ ctx[7] === undefined && !("handleGoDown" in props)) {
    			console.warn("<Node> was created without expected prop 'handleGoDown'");
    		}

    		if (/*handleEntryBackspace*/ ctx[8] === undefined && !("handleEntryBackspace" in props)) {
    			console.warn("<Node> was created without expected prop 'handleEntryBackspace'");
    		}

    		if (/*handleCollapseEntry*/ ctx[9] === undefined && !("handleCollapseEntry" in props)) {
    			console.warn("<Node> was created without expected prop 'handleCollapseEntry'");
    		}

    		if (/*handleExpandEntry*/ ctx[10] === undefined && !("handleExpandEntry" in props)) {
    			console.warn("<Node> was created without expected prop 'handleExpandEntry'");
    		}

    		if (/*handleSplitEntry*/ ctx[11] === undefined && !("handleSplitEntry" in props)) {
    			console.warn("<Node> was created without expected prop 'handleSplitEntry'");
    		}

    		if (/*handleIndent*/ ctx[12] === undefined && !("handleIndent" in props)) {
    			console.warn("<Node> was created without expected prop 'handleIndent'");
    		}

    		if (/*handleDedent*/ ctx[13] === undefined && !("handleDedent" in props)) {
    			console.warn("<Node> was created without expected prop 'handleDedent'");
    		}

    		if (/*handleMultilinePaste*/ ctx[14] === undefined && !("handleMultilinePaste" in props)) {
    			console.warn("<Node> was created without expected prop 'handleMultilinePaste'");
    		}

    		if (/*handleMoveCursorLeft*/ ctx[15] === undefined && !("handleMoveCursorLeft" in props)) {
    			console.warn("<Node> was created without expected prop 'handleMoveCursorLeft'");
    		}

    		if (/*handleMoveCursorRight*/ ctx[16] === undefined && !("handleMoveCursorRight" in props)) {
    			console.warn("<Node> was created without expected prop 'handleMoveCursorRight'");
    		}

    		if (/*handleSaveCursorPos*/ ctx[17] === undefined && !("handleSaveCursorPos" in props)) {
    			console.warn("<Node> was created without expected prop 'handleSaveCursorPos'");
    		}

    		if (/*handleSaveDocEntry*/ ctx[18] === undefined && !("handleSaveDocEntry" in props)) {
    			console.warn("<Node> was created without expected prop 'handleSaveDocEntry'");
    		}

    		if (/*handleSaveFullCursor*/ ctx[19] === undefined && !("handleSaveFullCursor" in props)) {
    			console.warn("<Node> was created without expected prop 'handleSaveFullCursor'");
    		}

    		if (/*handleSwapWithAboveEntry*/ ctx[20] === undefined && !("handleSwapWithAboveEntry" in props)) {
    			console.warn("<Node> was created without expected prop 'handleSwapWithAboveEntry'");
    		}

    		if (/*handleSwapWithBelowEntry*/ ctx[21] === undefined && !("handleSwapWithBelowEntry" in props)) {
    			console.warn("<Node> was created without expected prop 'handleSwapWithBelowEntry'");
    		}

    		if (/*handleUpdateEntryLinks*/ ctx[22] === undefined && !("handleUpdateEntryLinks" in props)) {
    			console.warn("<Node> was created without expected prop 'handleUpdateEntryLinks'");
    		}

    		if (/*handleCycleEntryHeadingSize*/ ctx[23] === undefined && !("handleCycleEntryHeadingSize" in props)) {
    			console.warn("<Node> was created without expected prop 'handleCycleEntryHeadingSize'");
    		}

    		if (/*handleReplaceEntryTextAroundCursor*/ ctx[24] === undefined && !("handleReplaceEntryTextAroundCursor" in props)) {
    			console.warn("<Node> was created without expected prop 'handleReplaceEntryTextAroundCursor'");
    		}
    	}

    	get tree() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tree(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flowyTreeNode() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flowyTreeNode(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docCursorEntryId() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docCursorEntryId(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docCursorSelStart() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docCursorSelStart(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docCursorSelEnd() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docCursorSelEnd(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get findRelevantDocNames() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set findRelevantDocNames(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleGoUp() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleGoUp(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleGoDown() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleGoDown(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleEntryBackspace() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleEntryBackspace(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleCollapseEntry() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleCollapseEntry(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleExpandEntry() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleExpandEntry(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSplitEntry() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSplitEntry(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleIndent() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleIndent(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleDedent() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleDedent(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMultilinePaste() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMultilinePaste(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMoveCursorLeft() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMoveCursorLeft(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMoveCursorRight() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMoveCursorRight(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSaveCursorPos() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSaveCursorPos(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSaveDocEntry() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSaveDocEntry(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSaveFullCursor() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSaveFullCursor(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSwapWithAboveEntry() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSwapWithAboveEntry(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSwapWithBelowEntry() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleSwapWithBelowEntry(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleUpdateEntryLinks() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleUpdateEntryLinks(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleCycleEntryHeadingSize() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleCycleEntryHeadingSize(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleReplaceEntryTextAroundCursor() {
    		throw new Error("<Node>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleReplaceEntryTextAroundCursor(value) {
    		throw new Error("<Node>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Document.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1$3, console: console_1$4 } = globals;
    const file$9 = "src/components/Document.svelte";

    // (170:2) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let span0;
    	let t0;
    	let t1;
    	let span1;
    	let icon;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new Icon({
    			props: { data: faEdit, scale: "0.91" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(/*docTitle*/ ctx[4]);
    			t1 = space();
    			span1 = element("span");
    			create_component(icon.$$.fragment);
    			attr_dev(span0, "id", "doc-name-display");
    			attr_dev(span0, "class", "svelte-15gll2c");
    			add_location(span0, file$9, 171, 6, 3904);
    			attr_dev(span1, "id", "doc-name-edit");
    			attr_dev(span1, "class", "svelte-15gll2c");
    			add_location(span1, file$9, 172, 6, 3956);
    			attr_dev(div, "id", "doc-name");
    			attr_dev(div, "class", "svelte-15gll2c");
    			add_location(div, file$9, 170, 4, 3878);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			mount_component(icon, span1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span1, "click", /*handleStartEditing*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*docTitle*/ 16) set_data_dev(t0, /*docTitle*/ ctx[4]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(170:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (158:2) {#if docIsEditingName}
    function create_if_block$4(ctx) {
    	let div;
    	let input;
    	let t0;
    	let span0;
    	let t2;
    	let span1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "save";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "cancel";
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "doc-name-input");
    			attr_dev(input, "placeholder", "Document name");
    			attr_dev(input, "class", "svelte-15gll2c");
    			add_location(input, file$9, 159, 6, 3544);
    			attr_dev(span0, "class", "doc-name-edit-action svelte-15gll2c");
    			add_location(span0, file$9, 164, 6, 3678);
    			attr_dev(span1, "class", "doc-name-edit-action svelte-15gll2c");
    			add_location(span1, file$9, 165, 6, 3757);
    			add_location(div, file$9, 158, 4, 3532);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*docTitleText*/ ctx[0]);
    			append_dev(div, t0);
    			append_dev(div, span0);
    			append_dev(div, t2);
    			append_dev(div, span1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[12]),
    					listen_dev(span0, "click", /*handleSaveName*/ ctx[7], false, false, false),
    					listen_dev(span1, "click", /*handleEditingCancel*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*docTitleText*/ 1 && input.value !== /*docTitleText*/ ctx[0]) {
    				set_input_value(input, /*docTitleText*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(158:2) {#if docIsEditingName}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let header;
    	let t0;
    	let div2;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let div1;
    	let node;
    	let t2;
    	let backlinksdisplay;
    	let current;
    	header = new Header({ $$inline: true });
    	const if_block_creators = [create_if_block$4, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*docIsEditingName*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	node = new Node_1({
    			props: {
    				tree: /*currentTree*/ ctx[1],
    				flowyTreeNode: /*currentTreeRoot*/ ctx[3],
    				docCursorEntryId: /*$docsStore*/ ctx[2].cursorEntryId,
    				docCursorSelStart: /*$docsStore*/ ctx[2].cursorSelectionStart,
    				docCursorSelEnd: /*$docsStore*/ ctx[2].cursorSelectionEnd,
    				findRelevantDocNames: /*findRelevantDocNames*/ ctx[10],
    				handleCollapseEntry: docsStore.collapseEntry,
    				handleDedent: docsStore.dedentEntry,
    				handleEntryBackspace: docsStore.backspaceEntry,
    				handleExpandEntry: docsStore.expandEntry,
    				handleGoDown: docsStore.entryGoDown,
    				handleGoUp: docsStore.entryGoUp,
    				handleIndent: docsStore.indentEntry,
    				handleMultilinePaste: docsStore.savePastedEntries,
    				handleMoveCursorLeft: docsStore.moveCursorLeft,
    				handleMoveCursorRight: docsStore.moveCursorRight,
    				handleSaveCursorPos: docsStore.saveCursorPosition,
    				handleSaveDocEntry: docsStore.saveCurrentPageDocEntry,
    				handleSaveFullCursor: docsStore.saveCursor,
    				handleSplitEntry: docsStore.splitEntry,
    				handleUpdateEntryLinks: docsStore.updateEntryLinks,
    				handleSwapWithAboveEntry: docsStore.swapWithAboveEntry,
    				handleSwapWithBelowEntry: docsStore.swapWithBelowEntry,
    				handleCycleEntryHeadingSize: docsStore.cycleEntryHeadingSize,
    				handleReplaceEntryTextAroundCursor: docsStore.replaceEntryTextAroundCursor
    			},
    			$$inline: true
    		});

    	backlinksdisplay = new BacklinksDisplay({
    			props: { backlinks: /*backlinks*/ ctx[6] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t1 = space();
    			div1 = element("div");
    			create_component(node.$$.fragment);
    			t2 = space();
    			create_component(backlinksdisplay.$$.fragment);
    			attr_dev(div0, "id", "doc-name-container");
    			add_location(div0, file$9, 156, 2, 3473);
    			attr_dev(div1, "id", "doc-content");
    			add_location(div1, file$9, 179, 2, 4101);
    			attr_dev(div2, "id", "document");
    			attr_dev(div2, "class", "svelte-15gll2c");
    			add_location(div2, file$9, 155, 0, 3451);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(node, div1, null);
    			append_dev(div2, t2);
    			mount_component(backlinksdisplay, div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}

    			const node_changes = {};
    			if (dirty & /*currentTree*/ 2) node_changes.tree = /*currentTree*/ ctx[1];
    			if (dirty & /*currentTreeRoot*/ 8) node_changes.flowyTreeNode = /*currentTreeRoot*/ ctx[3];
    			if (dirty & /*$docsStore*/ 4) node_changes.docCursorEntryId = /*$docsStore*/ ctx[2].cursorEntryId;
    			if (dirty & /*$docsStore*/ 4) node_changes.docCursorSelStart = /*$docsStore*/ ctx[2].cursorSelectionStart;
    			if (dirty & /*$docsStore*/ 4) node_changes.docCursorSelEnd = /*$docsStore*/ ctx[2].cursorSelectionEnd;
    			node.$set(node_changes);
    			const backlinksdisplay_changes = {};
    			if (dirty & /*backlinks*/ 64) backlinksdisplay_changes.backlinks = /*backlinks*/ ctx[6];
    			backlinksdisplay.$set(backlinksdisplay_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(node.$$.fragment, local);
    			transition_in(backlinksdisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(node.$$.fragment, local);
    			transition_out(backlinksdisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if_blocks[current_block_type_index].d();
    			destroy_component(node);
    			destroy_component(backlinksdisplay);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $docsStore;
    	validate_store(docsStore, "docsStore");
    	component_subscribe($$self, docsStore, $$value => $$invalidate(2, $docsStore = $$value));
    	let { params = {} } = $$props;
    	let promise = Promise.resolve(); // Used to hold chain of typesetting calls

    	function typeset(code) {
    		promise = promise.then(() => {
    			code();
    			return MathJax.typesetPromise(); // eslint-disable-line no-undef
    		}).catch(err => console.log("Typeset failed: " + err.message));

    		return promise;
    	}

    	afterUpdate(() => {
    		// (re)-render mathjax
    		typeset(() => {
    			MathJax.texReset(); // eslint-disable-line no-undef
    			MathJax.typesetClear(); // eslint-disable-line no-undef
    		});
    	});

    	let docTitleText = $docsStore.docName;

    	function handleSaveName() {
    		docsStore.saveEditingDocName(docTitleText);
    	}

    	function handleEditingCancel() {
    		$$invalidate(0, docTitleText = docTitle);
    		docsStore.cancelEditingDocName();
    	}

    	function handleStartEditing() {
    		$$invalidate(0, docTitleText = docTitle);
    		docsStore.startEditingDocName();
    	}

    	function findRelevantDocNames(text) {
    		let docNames = [];

    		text.split(/\s+/).forEach(word => {
    			Object.keys($docsStore.docNameInvIndex).forEach(word2 => {
    				if (word2.includes(word)) {
    					$docsStore.docNameInvIndex[word2].forEach(docId => {
    						if (!docNames.includes($docsStore.documents[docId].name)) {
    							docNames.push($docsStore.documents[docId].name);
    						}
    					});
    				}
    			});
    		});

    		return docNames;
    	}

    	const writable_props = ["params"];

    	Object_1$3.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$4.warn(`<Document> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Document", $$slots, []);

    	function input_input_handler() {
    		docTitleText = this.value;
    		$$invalidate(0, docTitleText);
    	}

    	$$self.$set = $$props => {
    		if ("params" in $$props) $$invalidate(11, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		params,
    		BacklinksDisplay,
    		Header,
    		Node: Node_1,
    		docsStore,
    		afterUpdate,
    		Icon,
    		faEdit,
    		promise,
    		typeset,
    		docTitleText,
    		handleSaveName,
    		handleEditingCancel,
    		handleStartEditing,
    		findRelevantDocNames,
    		currentTree,
    		$docsStore,
    		currentTreeRoot,
    		docTitle,
    		docIsEditingName,
    		backlinks
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(11, params = $$props.params);
    		if ("promise" in $$props) promise = $$props.promise;
    		if ("docTitleText" in $$props) $$invalidate(0, docTitleText = $$props.docTitleText);
    		if ("currentTree" in $$props) $$invalidate(1, currentTree = $$props.currentTree);
    		if ("currentTreeRoot" in $$props) $$invalidate(3, currentTreeRoot = $$props.currentTreeRoot);
    		if ("docTitle" in $$props) $$invalidate(4, docTitle = $$props.docTitle);
    		if ("docIsEditingName" in $$props) $$invalidate(5, docIsEditingName = $$props.docIsEditingName);
    		if ("backlinks" in $$props) $$invalidate(6, backlinks = $$props.backlinks);
    	};

    	let currentTree;
    	let currentTreeRoot;
    	let docTitle;
    	let docIsEditingName;
    	let backlinks;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 2048) {
    			 {
    				let parseResult = parseInt(params.id);

    				if (!isNaN(parseResult)) {
    					let docId = parseResult;
    					docsStore.navigateToDoc(docId);
    				} // TODO: do something?
    			}
    		}

    		if ($$self.$$.dirty & /*$docsStore*/ 4) {
    			 $$invalidate(1, currentTree = (function () {
    				return $docsStore.currentDocId !== null
    				? $docsStore.documents[$docsStore.currentDocId].tree
    				: null;
    			})());
    		}

    		if ($$self.$$.dirty & /*currentTree*/ 2) {
    			 $$invalidate(3, currentTreeRoot = currentTree && currentTree.getRoot() || null);
    		}

    		if ($$self.$$.dirty & /*$docsStore*/ 4) {
    			 $$invalidate(4, docTitle = $docsStore.docName);
    		}

    		if ($$self.$$.dirty & /*$docsStore*/ 4) {
    			 $$invalidate(5, docIsEditingName = $docsStore.docIsEditingName);
    		}

    		if ($$self.$$.dirty & /*$docsStore*/ 4) {
    			// TODO: move into getBacklinks?
    			 $$invalidate(6, backlinks = (function () {
    				let backlinks = $docsStore.linkGraph.getBacklinks($docsStore.currentDocId);
    				let backlinksObj = {};

    				for (let [[docId, entryId], _] of backlinks.entries()) {
    					if (!(docId in backlinksObj)) {
    						backlinksObj[docId] = {
    							id: docId,
    							name: $docsStore.documents[docId].name,
    							entries: {}
    						};
    					}

    					backlinksObj[docId].entries[entryId] = {
    						id: entryId,
    						text: $docsStore.documents[docId].tree.getEntryText(entryId)
    					};
    				}

    				return backlinksObj;
    			})());
    		}
    	};

    	return [
    		docTitleText,
    		currentTree,
    		$docsStore,
    		currentTreeRoot,
    		docTitle,
    		docIsEditingName,
    		backlinks,
    		handleSaveName,
    		handleEditingCancel,
    		handleStartEditing,
    		findRelevantDocNames,
    		params,
    		input_input_handler
    	];
    }

    class Document extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { params: 11 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Document",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get params() {
    		throw new Error("<Document>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Document>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Home.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1$4 } = globals;
    const file$a = "src/components/Home.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (180:2) {#each displayDocs as doc}
    function create_each_block$3(ctx) {
    	let tr;
    	let td0;
    	let input;
    	let input_checked_value;
    	let t0;
    	let td1;
    	let a;
    	let t1_value = /*doc*/ ctx[9].doc.name + "";
    	let t1;
    	let a_href_value;
    	let t2;
    	let td2;
    	let t3_value = new Date(/*doc*/ ctx[9].doc.lastUpdated).toLocaleString() + "";
    	let t3;
    	let t4;
    	let tr_class_value;
    	let mounted;
    	let dispose;

    	function change_handler(...args) {
    		return /*change_handler*/ ctx[7](/*doc*/ ctx[9], ...args);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			input = element("input");
    			t0 = space();
    			td1 = element("td");
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			td2 = element("td");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(input, "type", "checkbox");
    			input.checked = input_checked_value = /*doc*/ ctx[9].isSelected;
    			add_location(input, file$a, 182, 8, 4624);
    			attr_dev(td0, "class", "doc-select svelte-1m1jkal");
    			add_location(td0, file$a, 181, 6, 4592);
    			attr_dev(a, "href", a_href_value = "#/doc/" + /*doc*/ ctx[9].doc.id);
    			add_location(a, file$a, 185, 8, 4767);
    			attr_dev(td1, "class", "svelte-1m1jkal");
    			add_location(td1, file$a, 184, 6, 4754);
    			attr_dev(td2, "class", "last-updated svelte-1m1jkal");
    			add_location(td2, file$a, 187, 6, 4836);
    			attr_dev(tr, "class", tr_class_value = "" + (null_to_empty(/*doc*/ ctx[9].isSelected ? "selected-doc" : "") + " svelte-1m1jkal"));
    			add_location(tr, file$a, 180, 4, 4536);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, input);
    			append_dev(tr, t0);
    			append_dev(tr, td1);
    			append_dev(td1, a);
    			append_dev(a, t1);
    			append_dev(tr, t2);
    			append_dev(tr, td2);
    			append_dev(td2, t3);
    			append_dev(tr, t4);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", change_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*displayDocs*/ 2 && input_checked_value !== (input_checked_value = /*doc*/ ctx[9].isSelected)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty & /*displayDocs*/ 2 && t1_value !== (t1_value = /*doc*/ ctx[9].doc.name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*displayDocs*/ 2 && a_href_value !== (a_href_value = "#/doc/" + /*doc*/ ctx[9].doc.id)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*displayDocs*/ 2 && t3_value !== (t3_value = new Date(/*doc*/ ctx[9].doc.lastUpdated).toLocaleString() + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*displayDocs*/ 2 && tr_class_value !== (tr_class_value = "" + (null_to_empty(/*doc*/ ctx[9].isSelected ? "selected-doc" : "") + " svelte-1m1jkal"))) {
    				attr_dev(tr, "class", tr_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(180:2) {#each displayDocs as doc}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let icon0;
    	let button0_disabled_value;
    	let t0;
    	let button1;
    	let icon1;
    	let t1;
    	let div1;
    	let select;
    	let option0;
    	let t2;
    	let option0_selected_value;
    	let option1;
    	let t3;
    	let option1_selected_value;
    	let option2;
    	let t4;
    	let option2_selected_value;
    	let option3;
    	let t5;
    	let option3_selected_value;
    	let t6;
    	let table;
    	let tr;
    	let th0;
    	let t7;
    	let th1;
    	let t9;
    	let th2;
    	let t11;
    	let current;
    	let mounted;
    	let dispose;

    	icon0 = new Icon({
    			props: { data: faTrashAlt, scale: "1" },
    			$$inline: true
    		});

    	icon1 = new Icon({
    			props: { data: faPlus, scale: "1" },
    			$$inline: true
    		});

    	let each_value = /*displayDocs*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			create_component(icon0.$$.fragment);
    			t0 = space();
    			button1 = element("button");
    			create_component(icon1.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			select = element("select");
    			option0 = element("option");
    			t2 = text("Sort by name ↓");
    			option1 = element("option");
    			t3 = text("Sort by name ↑");
    			option2 = element("option");
    			t4 = text("Sort by last updated ↓");
    			option3 = element("option");
    			t5 = text("Sort by last updated ↑");
    			t6 = space();
    			table = element("table");
    			tr = element("tr");
    			th0 = element("th");
    			t7 = space();
    			th1 = element("th");
    			th1.textContent = "name";
    			t9 = space();
    			th2 = element("th");
    			th2.textContent = "last updated";
    			t11 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			button0.disabled = button0_disabled_value = !/*atLeastOneSelected*/ ctx[0];
    			add_location(button0, file$a, 159, 4, 3621);
    			add_location(button1, file$a, 160, 4, 3732);
    			attr_dev(div0, "id", "top-control-button-bar");
    			add_location(div0, file$a, 158, 2, 3583);
    			option0.__value = "name-asc";
    			option0.value = option0.__value;
    			option0.selected = option0_selected_value = /*$docsStore*/ ctx[2].sortMode === "name-asc";
    			add_location(option0, file$a, 164, 6, 3901);
    			option1.__value = "name-desc";
    			option1.value = option1.__value;
    			option1.selected = option1_selected_value = /*$docsStore*/ ctx[2].sortMode === "name-desc";
    			add_location(option1, file$a, 165, 6, 4002);
    			option2.__value = "updated-asc";
    			option2.value = option2.__value;
    			option2.selected = option2_selected_value = /*$docsStore*/ ctx[2].sortMode === "updated-asc";
    			add_location(option2, file$a, 166, 6, 4105);
    			option3.__value = "updated-desc";
    			option3.value = option3.__value;
    			option3.selected = option3_selected_value = /*$docsStore*/ ctx[2].sortMode === "updated-desc";
    			add_location(option3, file$a, 167, 6, 4220);
    			attr_dev(select, "id", "sort-select");
    			add_location(select, file$a, 163, 4, 3846);
    			attr_dev(div1, "id", "top-control-sort");
    			attr_dev(div1, "class", "svelte-1m1jkal");
    			add_location(div1, file$a, 162, 2, 3814);
    			attr_dev(div2, "id", "top-control");
    			attr_dev(div2, "class", "svelte-1m1jkal");
    			add_location(div2, file$a, 157, 0, 3558);
    			attr_dev(th0, "class", "svelte-1m1jkal");
    			add_location(th0, file$a, 174, 4, 4415);
    			attr_dev(th1, "id", "doc-name-header");
    			attr_dev(th1, "class", "svelte-1m1jkal");
    			add_location(th1, file$a, 176, 4, 4434);
    			attr_dev(th2, "class", "svelte-1m1jkal");
    			add_location(th2, file$a, 177, 4, 4473);
    			attr_dev(tr, "id", "docsListHeader");
    			attr_dev(tr, "class", "svelte-1m1jkal");
    			add_location(tr, file$a, 173, 2, 4386);
    			attr_dev(table, "id", "docsList");
    			attr_dev(table, "class", "svelte-1m1jkal");
    			add_location(table, file$a, 172, 0, 4362);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			mount_component(icon0, button0, null);
    			append_dev(div0, t0);
    			append_dev(div0, button1);
    			mount_component(icon1, button1, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, select);
    			append_dev(select, option0);
    			append_dev(option0, t2);
    			append_dev(select, option1);
    			append_dev(option1, t3);
    			append_dev(select, option2);
    			append_dev(option2, t4);
    			append_dev(select, option3);
    			append_dev(option3, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t7);
    			append_dev(tr, th1);
    			append_dev(tr, t9);
    			append_dev(tr, th2);
    			append_dev(table, t11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*deleteDocs*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*createDoc*/ ctx[3], false, false, false),
    					listen_dev(select, "change", /*changeSort*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*atLeastOneSelected*/ 1 && button0_disabled_value !== (button0_disabled_value = !/*atLeastOneSelected*/ ctx[0])) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (!current || dirty & /*$docsStore*/ 4 && option0_selected_value !== (option0_selected_value = /*$docsStore*/ ctx[2].sortMode === "name-asc")) {
    				prop_dev(option0, "selected", option0_selected_value);
    			}

    			if (!current || dirty & /*$docsStore*/ 4 && option1_selected_value !== (option1_selected_value = /*$docsStore*/ ctx[2].sortMode === "name-desc")) {
    				prop_dev(option1, "selected", option1_selected_value);
    			}

    			if (!current || dirty & /*$docsStore*/ 4 && option2_selected_value !== (option2_selected_value = /*$docsStore*/ ctx[2].sortMode === "updated-asc")) {
    				prop_dev(option2, "selected", option2_selected_value);
    			}

    			if (!current || dirty & /*$docsStore*/ 4 && option3_selected_value !== (option3_selected_value = /*$docsStore*/ ctx[2].sortMode === "updated-desc")) {
    				prop_dev(option3, "selected", option3_selected_value);
    			}

    			if (dirty & /*displayDocs, Date, handleDocSelectionToggle*/ 66) {
    				each_value = /*displayDocs*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(icon0);
    			destroy_component(icon1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function sortNameAsc(aEntry, bEntry) {
    	let a = aEntry.doc;
    	let b = bEntry.doc;

    	if (a.name < b.name) {
    		return -1;
    	} else if (a.name > b.name) {
    		return 1;
    	}

    	return 0;
    }

    function sortNameDesc(aEntry, bEntry) {
    	let a = aEntry.doc;
    	let b = bEntry.doc;

    	if (a.name > b.name) {
    		return -1;
    	} else if (a.name < b.name) {
    		return 1;
    	}

    	return 0;
    }

    function sortLastUpdatedAsc(aEntry, bEntry) {
    	let a = aEntry.doc;
    	let b = bEntry.doc;

    	if (a.lastUpdated < b.lastUpdated) {
    		return -1;
    	} else if (a.lastUpdated > b.lastUpdated) {
    		return 1;
    	}

    	return 0;
    }

    function sortLastUpdatedDesc(aEntry, bEntry) {
    	let a = aEntry.doc;
    	let b = bEntry.doc;

    	if (a.lastUpdated > b.lastUpdated) {
    		return -1;
    	} else if (a.lastUpdated < b.lastUpdated) {
    		return 1;
    	}

    	return 0;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let $docsStore;
    	validate_store(docsStore, "docsStore");
    	component_subscribe($$self, docsStore, $$value => $$invalidate(2, $docsStore = $$value));
    	

    	function createDoc() {
    		// navigate to #/create
    		replace("/create-doc");
    	}

    	function deleteDocs() {
    		// FIXME: linear scan non-ideal
    		let toDelete = Object.entries($docsStore.docsDisplay).filter(([_docId, docDisplay]) => docDisplay.isSelected).map(([docId, _docDisplay]) => docId);

    		const numDocs = n => n == 1 ? "document" : `${n} documents`;
    		let confirmMessage = `Are you sure you want to delete the selected ${numDocs(toDelete.length)}?`;
    		let confirmResult = window.confirm(confirmMessage);

    		if (confirmResult) {
    			docsStore.deleteDocs(toDelete);
    		}
    	}

    	function changeSort(ev) {
    		docsStore.changeSort(ev.target.value);
    	}

    	function handleDocSelectionToggle(event, docId) {
    		docsStore.docsDisplaySetSelection(docId, event.target.checked);
    	}

    	let sortFunction;
    	let atLeastOneSelected = false;

    	// docsDisplay is Map<string, {docId: string, isSelected: boolean }>
    	// returns a {doc: Document, isSelected: boolean }
    	let displayDocs;

    	const writable_props = [];

    	Object_1$4.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);
    	const change_handler = (doc, ev) => handleDocSelectionToggle(ev, doc.doc.id);

    	$$self.$capture_state = () => ({
    		docsStore,
    		replace,
    		Icon,
    		faPlus,
    		faTrashAlt,
    		createDoc,
    		deleteDocs,
    		changeSort,
    		handleDocSelectionToggle,
    		sortNameAsc,
    		sortNameDesc,
    		sortLastUpdatedAsc,
    		sortLastUpdatedDesc,
    		sortFunction,
    		atLeastOneSelected,
    		displayDocs,
    		$docsStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("sortFunction" in $$props) $$invalidate(8, sortFunction = $$props.sortFunction);
    		if ("atLeastOneSelected" in $$props) $$invalidate(0, atLeastOneSelected = $$props.atLeastOneSelected);
    		if ("displayDocs" in $$props) $$invalidate(1, displayDocs = $$props.displayDocs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$docsStore*/ 4) {
    			 $$invalidate(8, sortFunction = (function () {
    				switch ($docsStore.sortMode) {
    					case "name-asc":
    						return sortNameAsc;
    					case "name-desc":
    						return sortNameDesc;
    					case "updated-asc":
    						return sortLastUpdatedAsc;
    					case "updated-desc":
    						return sortLastUpdatedDesc;
    					default:
    						return sortNameAsc;
    				}
    			})());
    		}

    		if ($$self.$$.dirty & /*$docsStore, sortFunction*/ 260) {
    			 $$invalidate(1, displayDocs = (function () {
    				let newOneSelected = false;

    				let displayList = Object.entries($docsStore.docsDisplay).map(([docId, docDisplay]) => {
    					newOneSelected = newOneSelected || docDisplay.isSelected;

    					return {
    						doc: $docsStore.documents[docId],
    						isSelected: docDisplay.isSelected
    					};
    				}).sort(sortFunction);

    				$$invalidate(0, atLeastOneSelected = newOneSelected);
    				return displayList;
    			})());
    		}
    	};

    	return [
    		atLeastOneSelected,
    		displayDocs,
    		$docsStore,
    		createDoc,
    		deleteDocs,
    		changeSort,
    		handleDocSelectionToggle,
    		change_handler
    	];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/components/Page.svelte generated by Svelte v3.24.0 */

    const { console: console_1$5 } = globals;

    function create_fragment$d(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let $docsStore;
    	validate_store(docsStore, "docsStore");
    	component_subscribe($$self, docsStore, $$value => $$invalidate(1, $docsStore = $$value));
    	let { params = {} } = $$props;
    	let pageName = decodeURI(params.name);

    	if (pageName in $docsStore.docIdLookupByDocName) {
    		let docId = $docsStore.docIdLookupByDocName[pageName];
    		replace(`/doc/${docId}`);
    	} else {
    		console.log("TODO: couldnt find page name in lookup. name = ", params.name);
    		console.log("lookup = ", $docsStore.docIdLookupByDocName);
    	} //pop();

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$5.warn(`<Page> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Page", $$slots, []);

    	$$self.$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		params,
    		replace,
    		docsStore,
    		pageName,
    		$docsStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    		if ("pageName" in $$props) pageName = $$props.pageName;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [params];
    }

    class Page extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get params() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CreateDoc.svelte generated by Svelte v3.24.0 */

    function create_fragment$e(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $docsStore;
    	validate_store(docsStore, "docsStore");
    	component_subscribe($$self, docsStore, $$value => $$invalidate(0, $docsStore = $$value));
    	docsStore.createNewDocument();
    	replace("/doc/" + $docsStore.currentDocId);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CreateDoc> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CreateDoc", $$slots, []);
    	$$self.$capture_state = () => ({ docsStore, replace, $docsStore });
    	return [];
    }

    class CreateDoc extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateDoc",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/components/NotFound.svelte generated by Svelte v3.24.0 */

    const file$b = "src/components/NotFound.svelte";

    function create_fragment$f(ctx) {
    	let h1;
    	let t1;
    	let p;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Not found";
    			t1 = space();
    			p = element("p");
    			p.textContent = "The path requested was not found.";
    			add_location(h1, file$b, 0, 0, 0);
    			add_location(p, file$b, 1, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", $$slots, []);
    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    class DataStore {
      get(key) {
        const val = localStorage.getItem(key);
        if (val == null) {
          return null;
        }
        return val;
      }

      set(key, value) {
        return localStorage.setItem(key, value);
      }
    }

    // Background: This markup:
    //
    // ```
    // xyz **abc [def](foo) ghi** jkl
    // ```
    //
    // renders to:
    //
    // ```
    //  xyz <strong>abc <a href="foo">def</a> ghi</strong> jkl
    // ```
    //
    // Problem: given renderedEntryNode child nodes below, and a pointer `anchorNode`
    // to some text element that was clicked on, find the appropriate cursor position
    // within the associated markup text
    //
    //  - "xyz "
    //  - <strong>
    //     - "abc "
    //     - <a href="foo">
    //        - "def"
    //     - " ghi"
    //  - " jkl"
    //
    // e.g.: given a pointer to "def", return 11 (preceded by "xyz **abc [")
    // e.g.: given a pointer to " ghi", return 20 (preceded by "xyz **abc [def](foo)")
    //
    // example 2
    // abc [[de]] fgh
    //
    // <span>
    //  - "abc [["
    //  - <a href=blah>
    //     - "de"
    //  - "]] fgh"
    // returns { found: boolean, pos: number }
    function findChildNodeSerializedCursorPosFromSelection(n, sel, pos) {
      if (n.nodeType !== Node.TEXT_NODE && n.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }
      if (n.nodeType === Node.TEXT_NODE) {
        if (n === sel.anchorNode) {
          return { found: true, pos: pos + sel.anchorOffset };
        } else {
          return { found: false, pos: pos + n.textContent.length }
        }
      }

      if (n.localName === "mjx-container") {
        // pos + 3 is a lower bound. to get the
        // true length we'd need to know the size of the LaTeX substring
        return { found: false, pos: pos + 2 + n.dataset.original.length}
      }

      if (n.localName === "strong" || n.localName === "em") {
        pos += 2;
      } else if (n.localName === "a") {
        if (n.dataset.markupLinkType !== "auto" && n.dataset.markupLinkType !== "internal") {
          pos += 1;
        }
      }

      let currNode = n;
      let childNodes = currNode.childNodes;
      for(var i = 0; i < childNodes.length; ++i) {
        let result = findChildNodeSerializedCursorPosFromSelection(childNodes[i], sel, pos);
        if (result.found) {
          return result;
        }
        pos = result.pos;
      }

      if (n.localName === "strong" || n.localName === "em") {
        pos += 2;
      } else if (n.localName === "a") {
        if (n.dataset.markupLinkType !== "auto" && n.dataset.markupLinkType !== "internal") {
          pos += n.getAttribute("href").length + 3;
        }
      }

      return { found: false, pos: pos };
    }

    /* src/components/App.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1$5, console: console_1$6 } = globals;
    const file$c = "src/components/App.svelte";

    function create_fragment$g(ctx) {
    	let main;
    	let router;
    	let t0;
    	let div;
    	let icon;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let input;
    	let current;
    	let mounted;
    	let dispose;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[2] },
    			$$inline: true
    		});

    	icon = new Icon({
    			props: { data: faHammer, scale: "1" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(router.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(icon.$$.fragment);
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "export";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "import";
    			t5 = space();
    			input = element("input");
    			attr_dev(main, "class", "svelte-cxa7h9");
    			add_location(main, file$c, 213, 0, 6368);
    			attr_dev(button0, "class", "svelte-cxa7h9");
    			add_location(button0, file$c, 219, 2, 6468);
    			attr_dev(button1, "class", "svelte-cxa7h9");
    			add_location(button1, file$c, 221, 2, 6519);
    			attr_dev(div, "id", "actions-bar");
    			attr_dev(div, "class", "svelte-cxa7h9");
    			add_location(div, file$c, 217, 0, 6406);
    			attr_dev(input, "id", "import-docs");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "class", "svelte-cxa7h9");
    			add_location(input, file$c, 223, 0, 6572);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(router, main, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(icon, div, null);
    			append_dev(div, t1);
    			append_dev(div, button0);
    			append_dev(div, t3);
    			append_dev(div, button1);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, input, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*downloadData*/ ctx[0], false, false, false),
    					listen_dev(button1, "click", uploadData, false, false, false),
    					listen_dev(input, "change", /*handleDocsImport*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function stringIncludesOne(str, values) {
    	for (var i = 0; i < values.length; i++) {
    		if (str.includes(values[i])) {
    			return values[i];
    		}
    	}

    	return false;
    }

    // TODO: findDocContentElement
    function findDocContentElement(initNode) {
    	let currNode = initNode;
    	let currLocatedClassName;
    	let classNames = ["rendered-entry", "icon-container", "entry-display"];

    	function calcCurrLocatedClassName() {
    		currLocatedClassName = stringIncludesOne(currNode.className, classNames);
    		return currLocatedClassName;
    	}

    	// while:
    	//  - node isnt null
    	//  - and either:
    	//     - no className (how?)
    	//     - or, className doesn't include "rendered-entry"
    	// do:
    	//  - currNode <- currNode's parent
    	while (currNode && (!currNode.className || !currNode.className.includes || !calcCurrLocatedClassName())) {
    		currNode = currNode.parentNode;

    		if (currNode && currNode.className && currNode.className.includes) {
    			calcCurrLocatedClassName();
    		}
    	}

    	return {
    		node: currNode,
    		className: currLocatedClassName
    	};
    }

    /*** event handlers & some reactive variables ***/
    // from https://wiki.developer.mozilla.org/en-US/docs/Glossary/Base64$revision/1597964#The_Unicode_Problem
    function b64EncodeUnicode(str) {
    	// first we use encodeURIComponent to get percent-encoded UTF-8,
    	// then we convert the percent encodings into raw bytes which
    	// can be fed into btoa.
    	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(_match, p1) {
    		return String.fromCharCode("0x" + p1);
    	}));
    }

    function uploadData() {
    	let el = document.getElementById("import-docs");
    	el.click();
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let $docsStore;
    	validate_store(docsStore, "docsStore");
    	component_subscribe($$self, docsStore, $$value => $$invalidate(3, $docsStore = $$value));

    	onMount(() => {
    		document.addEventListener("selectionchange", () => {
    			let sel = document.getSelection();

    			if (sel.anchorNode.className && sel.anchorNode.className.includes && sel.anchorNode.className.includes("entry-display")) {
    				// FIXME: tee hee, I don't know why these selectionchange events on entry-display are occurring
    				return;
    			}

    			let docHeader = document.getElementById("doc-header");

    			if (!docHeader) {
    				// TODO: find a better way to detect whether we're on doc page
    				return;
    			}

    			let docContent = document.getElementById("doc-content");
    			let autocomplete = document.getElementById("doc-name-autocomplete");

    			if (autocomplete && autocomplete.contains(sel.anchorNode)) {
    				// clicked on autocomplete, ignore
    				return;
    			}

    			if (!docContent.contains(sel.anchorNode)) {
    				docsStore.saveCursorEntryId(null);
    				return;
    			}

    			let docContentResult = findDocContentElement(sel.anchorNode);

    			if (docContentResult.className === "icon-container") {
    				docsStore.saveCursorEntryId(null);
    				return;
    			}

    			if (docContentResult.className === "rendered-entry") {
    				const renderedEntryNode = docContentResult.node;
    				let colResult = findChildNodeSerializedCursorPosFromSelection(renderedEntryNode, sel, 0);
    				let newCursorPos = colResult.pos;
    				let newEntryId = parseInt(renderedEntryNode.dataset.entryId);
    				docsStore.saveCursor(newEntryId, newCursorPos, newCursorPos);
    				return;
    			}

    			// if we've made it here, then it's (a) inside #doc-content, but (b) outside an .entry-display
    			if (!docContentResult.node) {
    				docsStore.saveCursorEntryId(null);
    				return;
    			}

    			docsStore.saveCursor(parseInt(docContentResult.node.dataset.entryId), 0, 0);
    		});
    	});

    	/*** service and state ***/
    	function initDocStoreFromInitContext(initContext) {
    		docsStore.init(initContext.documents, initContext.docIdLookupByDocName, initContext.linkGraph, initContext.docNameInvIndex);
    	}

    	let dataMgr = new DataManager(new DataStore());
    	let initContext = makeInitContextFromDocuments(dataMgr.getDocuments());
    	initDocStoreFromInitContext(initContext);

    	function downloadData() {
    		let s = dataMgr.getDocumentsString();
    		location.assign("data:application/octet-stream;base64," + b64EncodeUnicode(s));
    	}

    	function handleDocsImport(ev) {
    		console.log(" ## handleDocsImport, ev = ", ev);
    		console.log(" ## handleDocsImport, this.files = ", this, this.files);
    		const filesList = this.files;

    		if (filesList.length > 1) {
    			// TODO: show error to UI?
    			console.log("TODO: multiple files uploaded. show an error message of some kind? is this even possible?");

    			return;
    		}

    		const file = filesList[0];

    		file.arrayBuffer().then(buffer => {
    			console.log(" ## handleDocsImport, the array buffer = ", buffer);

    			// TODO: detect the encoding and use Uint8Array / Uint16Array as appropriate
    			let docsStr = String.fromCharCode.apply(null, new Uint8Array(buffer));

    			console.log(" ## handleFIleUpload, docsStr = ", docsStr);

    			try {
    				let newFileUploadObj = JSON.parse(docsStr);

    				Object.entries(newFileUploadObj).forEach(([id, doc]) => {
    					newFileUploadObj[id] = makeDoc(doc.id, doc.name, doc.lastUpdated, doc.tree.entries, doc.tree.node);
    				});

    				// TODO: verify that it has the required fields in the object
    				let initContext = makeInitContextFromDocuments(newFileUploadObj);

    				initDocStoreFromInitContext(initContext);
    				push("/");
    			} catch(err) {
    				// TODO: show error to UI
    				console.log("TODO: file is not a valid JSON object, err = ", err);
    			}
    		});
    	}

    	const routes = {
    		"/": Home,
    		"/doc/:id": Document,
    		"/create-doc": CreateDoc,
    		"/page/:name": Page,
    		"*": NotFound
    	};

    	const writable_props = [];

    	Object_1$5.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$6.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		onMount,
    		Icon,
    		faHammer,
    		Router,
    		push,
    		docsStore,
    		Document,
    		Home,
    		Page,
    		CreateDoc,
    		NotFound,
    		DataStore,
    		DataManager,
    		makeInitContextFromDocuments,
    		makeDoc,
    		findChildNodeSerializedCursorPosFromSelection,
    		stringIncludesOne,
    		findDocContentElement,
    		initDocStoreFromInitContext,
    		dataMgr,
    		initContext,
    		b64EncodeUnicode,
    		downloadData,
    		uploadData,
    		handleDocsImport,
    		routes,
    		$docsStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("dataMgr" in $$props) $$invalidate(5, dataMgr = $$props.dataMgr);
    		if ("initContext" in $$props) initContext = $$props.initContext;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$docsStore*/ 8) {
    			// save the latest document
    			 dataMgr.saveDocuments($docsStore.documents);
    		}
    	};

    	return [downloadData, handleDocsImport, routes];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
