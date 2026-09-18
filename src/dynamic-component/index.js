import {createCustomElement} from '@servicenow/ui-core';
import {snabbdom} from '@servicenow/ui-renderer-snabbdom';

function applyProperties(el, properties) {
	if (!properties || typeof properties !== 'object') return;
	Object.keys(properties).forEach((key) => {
		el[key] = properties[key];
	});
}

// Native DOM has no "listen for any event" — bridging an unknown child
// requires the caller to name which events to forward. Add/remove listeners
// as the `events` list changes across re-renders, tracked per-element so
// hook-update doesn't pile up duplicate listeners on the same instance.
function bindEvents(el, eventNames, dispatch) {
	const bound = el.__dynamicComponentEvents || (el.__dynamicComponentEvents = new Map());

	bound.forEach((handler, name) => {
		if (!eventNames.includes(name)) {
			el.removeEventListener(name, handler);
			bound.delete(name);
		}
	});

	eventNames.forEach((name) => {
		if (bound.has(name)) return;
		const handler = (ev) => {
			const detail = {eventName: name, eventPayload: ev.detail ?? null};
			dispatch('DYNAMIC_COMPONENT_EVENT', detail);
			// dispatch() alone only reaches UI Builder's own action-handler
			// wiring — mirror it as a real bubbling, shadow-crossing
			// CustomEvent so plain DOM consumers outside UIB can observe it too.
			el.dispatchEvent(new CustomEvent('DYNAMIC_COMPONENT_EVENT', {
				bubbles: true, composed: true, detail
			}));
		};
		el.addEventListener(name, handler);
		bound.set(name, handler);
	});
}

const view = (state, {dispatch}) => {
	const {componentName = '', properties = {}, events = []} = state.properties;

	// document.createElement('') throws — an empty componentName has nothing
	// valid to render, so render nothing rather than a placeholder tag.
	if (!componentName) {
		return <span style={{display: 'none'}} />;
	}

	// Tag must be a variable, not a JSX literal — snabbdom-pragma only accepts a
	// dynamic selector this way, letting componentName be resolved at runtime.
	const Tag = componentName;
	const eventNames = Array.isArray(events) ? events : [];

	const wire = (el) => {
		applyProperties(el, properties);
		bindEvents(el, eventNames, dispatch);
	};

	return (
		<Tag
			hook-insert={(vnode) => wire(vnode.elm)}
			hook-update={(oldVnode, vnode) => wire(vnode.elm)}
		/>
	);
};

createCustomElement('dynamic-component', {
	renderer: {type: snabbdom},
	properties: {
		componentName: {
			default: '',
			schema: {type: 'string'}
		},
		properties: {
			default: {},
			schema: {type: 'object'}
		},
		events: {
			default: [],
			schema: {type: 'array'}
		}
	},
	actions: {
		'DYNAMIC_COMPONENT_EVENT': {
			schema: {
				type: 'object',
				properties: {
					eventName: {type: 'string'},
					eventPayload: {type: 'object'}
				}
			}
		}
	},
	view
});
