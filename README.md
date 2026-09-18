# dynamic-component

A standalone ServiceNow UI Builder component that renders another custom
element by tag name and binds a JSON object onto it as properties. Use it
when the component you want to render isn't known until runtime — e.g. it's
driven by a data source, a page variable, or a config record.

Stack: ServiceNow UI Core + Snabbdom JSX renderer.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `componentName` | string | `''` | Custom element tag name to render, e.g. `'now-button'`. Empty renders nothing. |
| `properties` | JSON object | `{}` | Each key is set directly as a DOM property on the rendered element (`el[key] = value`). |
| `events` | JSON array of strings | `[]` | Event names to listen for on the rendered element and forward as a single `DYNAMIC_COMPONENT_EVENT` action. |

Changing `componentName` swaps the rendered tag (the old element is torn
down, a new one inserted). Changing `properties` or `events` patches the
existing element in place.

Example, rendering an out-of-box `@servicenow/now-button`:

```json
{
  "componentName": "now-button",
  "properties": {"label": "Click me", "variant": "primary"}
}
```

## Events

Native DOM has no "listen for any event," so bridging an unknown child
requires naming which events to forward. List them in `events`, e.g. for
`now-button`:

```json
["NOW_BUTTON#CLICKED"]
```

Each one that fires on the rendered component (or bubbles up from inside its
own shadow tree) is re-emitted as a single **`DYNAMIC_COMPONENT_EVENT`**
action:

| Payload field | Description |
|---|---|
| `eventName` | The original event's `type`. |
| `eventPayload` | The original event's `detail`, or `null` if it had none. Passed through as-is, unwrapped — see below. |

**`eventPayload` shape depends on the source component.** A ServiceNow UI
Core component's `dispatch(type, payload)` (e.g. `now-button`'s
`NOW_BUTTON#CLICKED`) dispatches a native event whose `detail` is ui-core's
own action envelope — `{type, payload, error, meta}` — not the bare payload.
So for `now-button`, `eventPayload.payload` is where the real data is, not
`eventPayload` itself. A hand-written custom element that calls
`el.dispatchEvent(new CustomEvent(type, {detail: someFlatObject}))` directly
will instead give you `someFlatObject` right in `eventPayload`. This
component doesn't try to detect or normalize the difference — guessing at
envelope-vs-flat shape risks silently mangling a genuinely flat payload that
happens to share key names, so `eventPayload` is always exactly whatever the
source event's `detail` was.

The action is also mirrored as a real bubbling, shadow-crossing
`CustomEvent` on the element (not just a UI Builder action dispatch), so
plain DOM code outside UI Builder can listen for it too:

```javascript
const el = document.querySelector('dynamic-component');
el.addEventListener('DYNAMIC_COMPONENT_EVENT', (ev) => {
  console.log(ev.detail.eventName, ev.detail.eventPayload);
});
```

## Development

```bash
npm install
npx @servicenow/cli ui-component develop --entry <path-to-your-entry-file.js> --open
```

`@servicenow/cli` isn't a listed dependency (nothing in `src/` imports it) —
`npx` fetches it on demand. Its installed binary is named `now-cli`, not
`snc`. There's no bundled demo entry file — point `--entry` at a script of
your own that creates a `<dynamic-component>` element and sets its
`componentName` / `properties` / `events`.

## Project structure

```
now-ui.json                    # UI Builder registration: properties + actions
now-cli.json                   # dev server config
src/
├── index.js                   # main export
└── dynamic-component/
    └── index.js                # component logic and JSX
```

## Publishing

`scopeName` in `now-ui.json` is set to `"global"` as a placeholder. Update
it to whatever ServiceNow application scope you publish this component
into before shipping it.
