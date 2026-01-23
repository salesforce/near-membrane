# Isolated Realm Code Execution Design Document

## Abstract

This document specifies the design of a JavaScript membrane library that enables sandboxed code execution with controlled object graph sharing between isolated realms. The membrane acts as an intermediary layer that intercepts all cross-realm communication, enabling value transformation, access control, and mutation isolation.

---

## 1. Problem Statement

### 1.1 Core Challenge

JavaScript applications frequently need to execute code with different trust levels within the same process. Examples include:

- Third-party plugins or extensions
- User-provided scripts
- Embedded widgets from external sources

These scenarios require **controlled isolation**: the untrusted code should be able to interact with host APIs, but modifications should not corrupt the host's object graph, and access to sensitive capabilities should be controllable.

### 1.2 Specific Problems

#### 1.2.1 Object Graph Pollution

Without isolation, code can:
- Modify prototypes (`Array.prototype.map = malicious`)
- Add properties to shared objects
- Replace global functions

#### 1.2.2 Identity Discontinuity

JavaScript realms have separate intrinsics. An `Array` from Realm A has a different `Array.prototype` than Realm B, causing:
- `instanceof` checks to fail across realms (e.g., `iframeArray instanceof Array` returns `false`)
- Prototype chain mismatches when extending built-ins
- Constructor identity checks to fail (`arr.constructor === Array` returns `false`)

#### 1.2.3 Unforgeable Properties

Browser environments contain non-configurable properties that cannot be virtualized:
- `window.location`
- The `window` prototype chain (`Window.prototype → WindowProperties.prototype → EventTarget.prototype`)
- Certain DOM properties

#### 1.2.4 Capability Leakage

Sandboxed code might access capabilities that should be restricted:
- Network APIs (`fetch`, `XMLHttpRequest`)
- Storage APIs (`localStorage`, `IndexedDB`)
- DOM manipulation outside designated areas

---

## 2. Design Goals

### 2.1 Primary Goals

1. **Transparency**: Sandboxed code should not be able to detect that it is running in a sandbox (absent explicit capability restrictions). Specifically:

   - **Top-Level Illusion**: Code in the sandbox MUST appear to be running at the top level of the browser/environment. References to `window`, `self`, `globalThis`, `top`, `parent`, and `frames` should all resolve to the sandbox's virtualized global object, not reveal the actual underlying realm implementation (iframe, ShadowRealm<sup>[1]</sup>, or other).
   
   - **No Observable Nesting**: The sandbox must not expose evidence of its underlying realm implementation (iframe-based, ShadowRealm-based<sup>[1]</sup>, or otherwise). Checks like `window === window.top`, `window === window.parent`, and `window.frameElement === null` should behave as if the code is running in a top-level browsing context.
   
   - **Consistent Global Identity**: `window === globalThis === self` must hold true within the sandbox, and these must all reference the virtualized global object that the membrane controls.
   
   - **DOM Tree Root Appearance**: When the sandbox interacts with the DOM, it should observe the host document as if it were the top-level document, not a document embedded within a frame.

2. **Integrity Preservation**: The host realm's object graph must remain unmodified by sandbox operations

3. **Identity Continuity**: Objects crossing the membrane should maintain consistent identity semantics

4. **Controlled Capability Access**: Host can define transformations ("distortions") applied to values crossing the membrane

### 2.2 Non-Goals

1. **Security Guarantees**: The membrane provides integrity, not security. **Security policies must be implemented via the distortion mechanism.**

2. **Performance Parity**: Some overhead is acceptable for the isolation guarantees provided. However, optional escape hatches (such as marking typed arrays and frequently-accessed objects as "fast targets" or enabling `maxPerfMode`) allow implementations to trade some isolation guarantees for performance-critical paths.

3. **Complete DOM Virtualization**: Unforgeable browser constructs are handled but not fully virtualized.

---

## 3. Conceptual Model

### 3.1 Terminology

The following terms are used throughout this document:

| Term | Definition |
|------|------------|
| **Membrane** | An intermediary layer that intercepts all cross-realm communication |
| **Realm** | A JavaScript execution environment with its own global object and intrinsics |
| **Intrinsic** | A built-in object provided by the JavaScript runtime (`Array`, `Object`, etc.) |
| **Blue Realm** | The host/incubator realm that creates the sandbox |
| **Red Realm** | The sandboxed/child realm where untrusted code executes |
| **Blue Value** | Any value (primitive, object, function) originating in Blue Realm |
| **Red Value** | Any value originating in Red Realm |
| **Blue Proxy** | A Proxy object in Blue Realm that wraps a Red Value |
| **Red Proxy** | A Proxy object in Red Realm that wraps a Blue Value |
| **Pointer** | A callable function that provides indirect access to a value across the membrane |
| **Shadow Target** | A local placeholder object used to satisfy proxy invariants |
| **Distortion** | A transformation applied to values crossing the membrane |
| **Live Proxy** | A proxy that forwards mutations to the foreign target |
| **Static Proxy** | A proxy that operates on a local snapshot of the foreign target |
| **Unforgeable** | A property that cannot be reconfigured or deleted |

### 3.2 The Membrane Boundary

The membrane is a conceptual boundary between realms. All non-primitive values crossing this boundary are wrapped in Proxy objects. The membrane ensures:

1. **Wrapping**: Objects/functions crossing the boundary become proxies
2. **Unwrapping**: When a wrapped value returns to its origin realm, it is unwrapped
3. **Identity Preservation**: The same underlying value always produces the same proxy

```
┌─────────────────┐                    ┌─────────────────┐
│   BLUE REALM    │                    │   RED REALM     │
│                 │                    │                 │
│  blueObject ◄───┼── unwrap ──────────┼─── redProxy     │
│                 │                    │                 │
│  blueProxy  ────┼── wrap ───────────►┼─── redObject    │
│                 │                    │                 │
└─────────────────┘                    └─────────────────┘
                        MEMBRANE
```

### 3.3 Value Transfer Rules

| Value Type | Transfer Behavior |
|------------|-------------------|
| Primitives (`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`) | Pass through unchanged |
| Objects | Wrap in Proxy on receiving side |
| Functions | Wrap in Proxy on receiving side |
| Arrays | Wrap in Proxy on receiving side |
| Proxies from opposite realm | Unwrap to original value |
| Proxies from same realm | Wrap again (avoid double-wrapping through identity map) |

---

## 4. Architecture

### 4.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Virtual Environment                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - evaluate(sourceText): Execute code in sandbox          │  │
│  │  - link(...keys): Link intrinsic identity paths           │  │
│  │  - remapProperties(target, descriptors): Override props   │  │
│  │  - lazyRemapProperties(target, keys): Lazy prop setup     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                  │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   Blue Connector    │◄───────►│   Red Connector     │       │
│  │  (Host Realm Side)  │         │  (Sandbox Side)     │       │
│  └─────────────────────┘         └─────────────────────┘       │
│              │                               │                  │
│              ▼                               ▼                  │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │  Membrane Marshall  │         │  Membrane Marshall  │       │
│  │  (Blue Instance)    │◄───────►│  (Red Instance)     │       │
│  └─────────────────────┘         └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Connector

A **Connector** is a factory function that initializes one side of the membrane. It:

1. Takes a "color" identifier ("blue" or "red")
2. Receives a callback to register its hooks
3. Returns a function to receive the foreign realm's hooks

```typescript
type Connector = (
    color: string,
    registerHooks: HooksCallback,
    options?: ConnectorOptions
) => HooksCallback;
```

**Blue Connector Creation**: Requires direct access to the host's `globalThis`

**Red Connector Creation**: Requires an evaluator function (`eval`) from the sandbox realm

### 4.3 Membrane Marshall

The **Membrane Marshall** is a self-contained, portable function that can be serialized and evaluated in any realm. When executed, it produces a Connector for that realm.

Key design constraint: The marshall function must not close over any external variables. All dependencies must be derived from the realm's intrinsics at evaluation time.

### 4.4 Pointer System

**Pointers** are the mechanism for passing object/function references between realms without directly sharing the values.

A Pointer is a **callable function** that, when invoked, makes its associated value available for retrieval. This design:

1. Avoids passing actual object references across the boundary
2. Enables lazy proxy creation
3. Provides a uniform interface for all non-primitive values

```typescript
type Pointer = () => void;

// Creating a pointer for a value
function createPointer(value: object | Function): Pointer {
    return () => { selectedTarget = value; };
}

// Retrieving the value from a pointer
function getValueFromPointer(pointer: Pointer): object | Function {
    pointer();
    const value = selectedTarget;
    selectedTarget = undefined;
    return value;
}
```

### 4.5 Hooks Interface

The membrane operates through a set of **callable hooks** that each side provides to the other. These hooks enable cross-realm operations:

| Hook Category | Purpose |
|---------------|---------|
| **Target Management** | Push/register targets, link pointers |
| **Proxy Traps** | apply, construct, get, set, defineProperty, deleteProperty, etc. |
| **Introspection** | getPrototypeOf, getOwnPropertyDescriptor, ownKeys, isExtensible |
| **Integrity** | preventExtensions, getTargetIntegrityTraits |
| **Utilities** | evaluate, serializeTarget, debugInfo |

---

## 5. Proxy Handler Design

### 5.1 Shadow Target Strategy

JavaScript Proxies have **invariants** that must be satisfied. For example, if the target is non-extensible, `preventExtensions` must return `true`. Since the actual target exists in another realm, we use a **shadow target**:

- An empty object/array/function in the local realm
- Satisfies proxy invariants
- Never actually used for operations (all operations forwarded to foreign target)

```typescript
function createShadowTarget(traits: TargetTraits): ShadowTarget {
    if (traits.isFunction) {
        return traits.isArrowFunction ? () => {} : function() {};
    }
    if (traits.isArray) {
        return [];
    }
    return {};
}
```

### 5.2 Trap Implementation Pattern

Each proxy trap follows this pattern:

1. **Receive** the operation on the shadow target
2. **Translate** arguments to transferable form (pointers for objects)
3. **Forward** to the foreign realm via the appropriate callable hook
4. **Translate** the result back (invoke pointers, unwrap to local proxies)
5. **Return** the result

Example for `get` trap:

```
get(shadowTarget, key, receiver):
    1. foreignTargetPointer = this.foreignTargetPointer
    2. transferableReceiver = getTransferableValue(receiver)
    3. resultPointerOrPrimitive = foreignCallableGet(
           foreignTargetPointer, 
           key, 
           transferableReceiver
       )
    4. if resultPointerOrPrimitive is function (pointer):
           invoke it to select target
           return selectedTarget (now a local proxy)
       else:
           return resultPointerOrPrimitive (primitive)
```

### 5.3 Proxy Lifecycle States

Proxies transition through states based on usage patterns:

| State | Behavior |
|-------|----------|
| **Lazy** | Initial state; descriptor lookups forwarded to foreign realm |
| **Live** | Mutations pass through to foreign target (for arrays, typed arrays) |
| **Static** | Frozen snapshot; all operations use shadow target |
| **Revoked** | Proxy has been revoked; all operations throw |

**Static Transition**: Occurs when the foreign target's integrity changes (frozen/sealed/non-extensible). The shadow target is synchronized once, then used for all future operations.

---

## 6. Intrinsics Handling

### 6.1 Linked Intrinsics

Certain intrinsics must maintain **identity across realms** to preserve JavaScript semantics. These are "linked":

```typescript
const LinkedIntrinsics = [
    'Array', 'Object', 'Function', 'Error',
    'EvalError', 'RangeError', 'ReferenceError', 
    'SyntaxError', 'TypeError', 'URIError',
    'Proxy', 'globalThis', 'eval'
];
```

**Linking Process**:
1. For each linked intrinsic name
2. Get the pointer to Blue realm's value at that path
3. Get the pointer to Red realm's value at that path  
4. Register bidirectional pointer mappings
5. When either side encounters the other's value, it unwraps to local equivalent

### 6.2 Remapped Intrinsics

Other intrinsics are **remapped** from the Blue realm to ensure consistent behavior:

```typescript
const RemappedIntrinsics = [
    'Map', 'Set', 'WeakMap', 'WeakSet',
    'RegExp', 'JSON', 'Math', 'Reflect',
    'Symbol', 'Number', 'String', 'Boolean',
    'BigInt', 'Promise', 'Date', 'Intl'
];
```

The sandbox's global object has these properties replaced with proxies to the Blue realm's versions.

### 6.3 Filtered Globals

When setting up the sandbox's global object, certain keys are filtered:

1. **Linked intrinsics**: Handled separately via linking
2. **Dangerous intrinsics**: `eval`, `Function` (require special handling)
3. **Environment-specific**: Keys that shouldn't cross the boundary

---

## 7. Distortion Mechanism

### 7.1 Concept

A **distortion** is a transformation applied to values as they cross the membrane. The distortion callback receives the original value and returns a replacement:

```typescript
type DistortionCallback = (value: any) => any;
```

### 7.2 Application Points

Distortions are applied when:
1. A Blue value is about to be wrapped for Red realm access
2. The distortion callback is invoked with the original value
3. The returned value (possibly different) is what gets wrapped

### 7.3 Use Cases

| Use Case | Distortion Implementation |
|----------|---------------------------|
| Block API access | Return `undefined` or throw |
| Restrict capability | Return wrapper with subset of functionality |
| Transform behavior | Return alternative implementation |
| Audit/log access | Return wrapper that logs then delegates |

---

## 8. Execution Semantics

### 8.1 Realm-of-Definition Principle

A fundamental property of JavaScript is that **functions execute in the realm where they were defined**, not in the realm where they are called. The membrane preserves this behavior, which has important implications:

When Red realm code calls a Blue Proxy that wraps a Blue function, and that Blue function internally references `eval` or any other intrinsic, it accesses the **Blue realm's** `eval`—not the Red Proxy of `eval` that exists in the Red realm. Conversely, when Red realm code directly calls `eval`, it always invokes the Red realm's own `eval`, regardless of how that code was initiated or what Blue functions may be on the call stack.

```
Red Realm                          Blue Realm
─────────────────────────────────────────────────────────────
                                   
blueProxy(code) ──────────────────► blueFunction(code) {
       │                                  │
       │                                  ▼
       │                             eval(code)  ◄── Blue eval, NOT Red Proxy
       │                                  │
       ◄──────────────────────────────────┘
       │
   result
```

### 8.2 Implications

1. **Distortions Don't Affect Internal Calls**: If a Blue function internally calls `fetch`, `setTimeout`, or `eval`, distortions applied to those APIs in the Red realm have no effect on those internal calls.

2. **Capability Boundaries**: A Blue function retains its full Blue realm capabilities even when invoked from Red realm code. The membrane only interposes at the boundary—it does not recursively wrap internal operations.

3. **Security Consideration**: This means that passing a Blue function to the Red realm is effectively granting the Red realm access to whatever that function can do, including any Blue realm capabilities it uses internally.

### 8.3 The Connector Pattern

This realm-of-definition behavior is why the membrane uses **connectors** evaluated in each realm. The Red connector's membrane marshall code is evaluated inside the Red realm, so its internal references to `Proxy`, `WeakMap`, `Reflect`, etc. resolve to the Red realm's intrinsics—ensuring the membrane machinery itself operates correctly in each realm.

---

## 9. Browser-Specific Design

### 9.1 Realm Creation via Iframe

Browsers currently lack a built-in lightweight realm creation API. The ShadowRealm proposal<sup>[1]</sup> aims to address this, but until it is widely available, the solution uses **same-origin iframes**:

1. Create a hidden iframe
2. Set `sandbox="allow-same-origin allow-scripts"` 
3. Append to document body
4. Extract `contentWindow` as the Red realm's global
5. Detach iframe from DOM (optional, based on `keepAlive` option which can be used for debugging)

#### 9.1.1 Detached Iframe Implications

A detached iframe:
- Loses its origin (no network access, no storage access)
- Cannot execute dynamic imports
- Retains JavaScript intrinsics and execution capability
- Cannot access opener/top window references
- Eliminates direct object access to parent

#### 9.1.2 Unforgeable Handling

The `window` prototype chain is non-configurable:

```
window → Window.prototype → WindowProperties.prototype → EventTarget.prototype
```

**Strategy** (iframe-based only; not applicable to ShadowRealm):
1. **Link** these prototypes between realms (identity preservation)
2. **Remap** their property descriptors to neutralize dangerous capabilities
3. **Lazy remap** `EventTarget.prototype` methods to Blue realm versions

#### 9.1.3 Revoked Proxy Detection

With `keepAlive: true`, the iframe's `document` and `window` are added to a revoked set. Any attempt to access these through the membrane returns a revoked proxy. `keepAlive` should typically only be used for debugging purposes—production environments will be vulnerable if the `keepAlive` option is `true` in those deployments.

### 9.2 Realm Creation via ShadowRealm

When available, the ShadowRealm API<sup>[1]</sup> provides a purpose-built mechanism for creating isolated JavaScript execution contexts:

```typescript
const shadowRealm = new ShadowRealm();

// Evaluate code in the ShadowRealm
const result = shadowRealm.evaluate('1 + 1');  // 2

// Import a module value
const fn = await shadowRealm.importValue('./module.js', 'exportedFunction');
```

#### 9.2.1 ShadowRealm Callable Boundary

ShadowRealm enforces a **callable boundary** with specific transfer semantics:

| Value Type | Transfer Behavior |
|------------|-------------------|
| Primitives | Pass through unchanged |
| Callable objects (functions) | Wrapped in a "Wrapped Function Exotic Object" |
| Non-callable objects | **Throw TypeError** — cannot cross the boundary |

This differs from the membrane's proxy-based approach. The membrane wraps *all* objects in proxies, allowing non-callable objects to cross the boundary. ShadowRealm's stricter callable-only boundary means:

1. **Direct object sharing is prohibited**: Code like `shadowRealm.evaluate('({ foo: 1 })')` throws because the result is a non-callable object.

2. **Functions become wrapped functions**: Callable values are wrapped in Wrapped Function Exotic Objects that marshal arguments and return values across the boundary.

3. **Identity isolation is enforced by the spec**: The specification requires that "an execution in a ShadowRealm is oblivious of host or implementation-defined APIs and cannot observe the identity of an object" from another realm, and vice versa.

#### 9.2.2 Membrane Integration with ShadowRealm

To use ShadowRealm as the Red realm while maintaining full membrane semantics (proxied object sharing), the membrane must:

1. **Bootstrap via `evaluate()`**: Inject the membrane marshall code into the ShadowRealm using `shadowRealm.evaluate(marshallSourceText)`.

2. **Exchange callable hooks**: Since only functions can cross the ShadowRealm boundary, the pointer/hook exchange mechanism naturally aligns—pointers are already callable functions.

3. **Virtualize the global object**: The ShadowRealm's global object is a plain ordinary object (no `window`, no DOM), which simplifies setup—there are no unforgeables to handle.

4. **Handle the callable boundary**: When the membrane needs to pass a non-callable object, it wraps it in a pointer (a callable) first, which can then cross the ShadowRealm boundary.

#### 9.2.3 ShadowRealm Advantages

| Aspect | Iframe | ShadowRealm |
|--------|--------|-------------|
| Creation overhead | Heavy (DOM, browsing context) | Lightweight (JS realm only) |
| Global object | Full `window` with DOM | Plain object, host-configurable |
| Unforgeables | Must be neutralized | None (no `window` prototype chain) |
| Module loading | Blocked in detached iframe | Supported via `importValue()` |
| CSP implications | Requires `unsafe-eval`* | Requires `unsafe-eval`* |
| Specification status | Stable platform feature | Stage 2.7 (as of February 2025) |

\* `unsafe-eval` is being replaced by Trusted Types/CSP directive `trusted-types-eval`<sup>[2]</sup>

---

## 10. Identity Preservation

### 10.1 Pointer Caching

Each realm maintains a **WeakMap** from values to their pointers:

```typescript
const pointerCache = new WeakMap<object | Function, Pointer>();

function getTransferablePointer(value: object | Function): Pointer {
    let pointer = pointerCache.get(value);
    if (pointer === undefined) {
        pointer = createPointer(value);
        pointerCache.set(value, pointer);
    }
    return pointer;
}
```

### 10.2 Proxy Caching

Each realm maintains a **WeakMap** from foreign pointers to local proxies:

```typescript
const proxyCache = new WeakMap<Pointer, Proxy>();

function getOrCreateProxy(foreignPointer: Pointer): Proxy {
    let proxy = proxyCache.get(foreignPointer);
    if (proxy === undefined) {
        proxy = createBoundaryProxy(foreignPointer);
        proxyCache.set(foreignPointer, proxy);
    }
    return proxy;
}
```

### 10.3 Round-Trip Guarantee

When a value crosses the membrane and returns:
- Same pointer is used → same proxy is retrieved
- No "proxy of proxy" accumulation
- Identity checks (`===`) work correctly

---

## 11. Lazy Initialization

### 11.1 Motivation

Eagerly creating proxies for all global properties would be expensive. Most programs only access a subset of available APIs.

### 11.2 Implementation

Properties are registered for **lazy remapping**:

```typescript
env.lazyRemapProperties(globalObject, [
    'document', 'console', 'fetch', 'setTimeout', ...
]);
```

When a property is first accessed:
1. The lazy descriptor's getter is invoked
2. The actual descriptor is fetched from the foreign realm
3. A proxy is created for the value
4. The lazy descriptor is replaced with the real one
5. The value is returned

### 11.3 Property Descriptor State

A state object tracks which properties have been materialized:

```typescript
interface LazyPropertyDescriptorState {
    [key: PropertyKey]: boolean; // true = materialized
}
```

---

## 12. Error Handling

### 12.1 Cross-Realm Errors

When an error occurs in the foreign realm:
1. The error object is pushed as a target (like any other value)
2. A pointer to the error is returned
3. The local realm creates a proxy for the error
4. The proxy is thrown locally

### 12.2 Error Identity

Linked error constructors ensure:
- `error instanceof Error` works in both realms
- Error prototype chain is consistent
- Stack traces are preserved (with filtering for internal frames)

### 12.3 Stack Trace Filtering

In debug mode, internal membrane frames are collapsed:
- Frames containing the membrane marker are grouped
- Displayed as single "LWS" (Locker Web Security) entry
- Reduces noise in developer tools

---

## 13. Serialization

### 13.1 Boxed Primitives

Certain objects are "serialized" rather than proxied:
- Boxed primitives (`new Boolean(true)`, `new Number(42)`)
- RegExp objects (serialized as source + flags)

### 13.2 Serialization Detection

The membrane detects serializable objects via:
1. Brand checking (`Object.prototype.toString`)
2. Internal slot probing (try/catch valueOf calls)

### 13.3 Transfer Protocol

Serialized values are transferred as primitives:
- The primitive representation crosses the membrane
- The receiving side reconstructs the equivalent object
- No proxy is created

---

## 14. Performance Considerations

### 14.1 Fast Path Optimization

Frequently accessed targets can be marked for **fast path** access:

```typescript
env.trackAsFastTarget(frequentlyUsedObject);
```

Fast targets:
- Skip lazy descriptor lookup
- Use direct property access callable
- Reduce trap invocation overhead

### 14.2 Trap Arity Optimization

Function proxies have specialized trap implementations based on argument count:
- `applyTrapForZeroArgs`
- `applyTrapForOneArg`
- `applyTrapForTwoArgs`
- `applyTrapForAnyNumberOfArgs`

This avoids array allocation for common cases.

### 14.3 WeakMap Usage

All caches use `WeakMap` to:
- Avoid memory leaks from retained proxies
- Allow garbage collection of unreferenced values
- Maintain identity without preventing cleanup

---

## 15. Configuration Options

### 15.1 Virtual Environment Options

| Option | Type | Description |
|--------|------|-------------|
| `distortionCallback` | `(value) => value` | Transform values crossing membrane |
| `liveTargetCallback` | `(target, traits) => boolean` | Mark targets as live (passthrough mutations) |
| `revokedProxyCallback` | `(target) => boolean` | Identify values that should produce revoked proxies |
| `signSourceCallback` | `(source) => source` | Sign/transform source code before evaluation |
| `instrumentation` | `Instrumentation` | Debugging/monitoring hooks |

### 15.2 Browser-Specific Options

| Option | Type | Description |
|--------|------|-------------|
| `keepAlive` | `boolean` | Keep iframe attached (default: true) |
| `endowments` | `PropertyDescriptorMap` | Additional properties for sandbox global |
| `globalObjectShape` | `object` | Custom shape for global object |
| `maxPerfMode` | `boolean` | Skip certain virtualizations for performance |
| `defaultPolicy` | `TrustedTypePolicy` | Trusted Types policy for sandbox |

---

## 16. Invariants

The following invariants must be maintained:

### 16.1 Wrapping Invariants

1. Primitives MUST pass through unchanged
2. Objects/functions MUST be wrapped when crossing the membrane
3. The same value MUST always produce the same pointer
4. The same pointer MUST always produce the same proxy

### 16.2 Proxy Invariants

1. Shadow target MUST satisfy JavaScript proxy invariants
2. Non-configurable properties on shadow target MUST match foreign target
3. Non-extensible shadow target MUST remain non-extensible
4. Revoked proxies MUST throw on all operations

### 16.3 Identity Invariants

1. `blueProxy !== redValue` (proxies are distinct objects)
2. `unwrap(wrap(value)) === value` (round-trip identity)
3. Linked intrinsics MUST resolve to local equivalents

### 16.4 Mutation Invariants

1. Static proxies MUST NOT reflect mutations to foreign target
2. Live proxies MUST reflect mutations to foreign target
3. Sandbox mutations MUST NOT affect host realm (unless live)

---

## 17. Test Scenarios

An implementation should verify:

### 17.1 Basic Functionality
- Primitive value transfer
- Object proxy creation
- Function invocation across membrane
- Property access and mutation

### 17.2 Identity
- Same object produces same proxy
- Round-trip identity preservation
- Linked intrinsic resolution

### 17.3 Prototype Chains
- `instanceof` works across membrane
- `Object.getPrototypeOf` returns correct value
- Custom class inheritance works

### 17.4 Distortions
- Distortion callback is invoked
- Returned value is used instead of original
- Distortions apply to nested access

### 17.5 Edge Cases
- Revoked proxies throw appropriately
- Frozen/sealed objects handled correctly
- Symbol properties transfer correctly
- Getters/setters work across membrane

---

## Appendix: Security Considerations

While this design provides **integrity** (the host's object graph is protected), it does not provide **security** by default. Implementers must:

1. **Use distortions** to block or restrict sensitive APIs
2. **Validate all inputs** from the sandbox
3. **Consider side channels** (timing, memory usage)
4. **Audit the membrane code** for bypass vulnerabilities
5. **Keep the membrane updated** as JavaScript evolves

The membrane is a building block for security, not a complete security solution.

---

## References

<sup>[1]</sup> **ShadowRealm Proposal** — TC39 proposal (Stage 2.7 as of February 2025) for a lightweight realm creation API that provides isolated JavaScript execution contexts with their own global object and intrinsics. The proposal enforces a callable boundary where only primitives and callable objects can cross between realms.
- Specification: https://tc39.es/proposal-shadowrealm/
- Proposal Repository: https://github.com/tc39/proposal-shadowrealm

<sup>[2]</sup> **`trusted-types-eval`** — CSP directive for Trusted Types integration with eval.
- Specification: https://w3c.github.io/webappsec-csp/#ref-for-grammardef-trusted-types-eval
