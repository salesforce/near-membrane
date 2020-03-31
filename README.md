# Sandboxed JavaScript Environment

This is an experimental library to demonstrate that it is possible to use membranes to create an object graph of a JavaScript environment without introducing identity discontinuity.

## Goals

* The sandboxed environment must have its own set of intrinsics.
* Code executed inside the sandboxed environment cannot observe the sandbox.
* Mutations on the object graph should only affect the sandboxed environment.

## Non-goals

* Argument poisoning is still possible via the membrane by providing object-likes through the membrane that could be used by the outer realm to perform an operation that leaks primitive values that are relevant.
* This library does not provide security guarantees, those must be implemented on top of the distortion mechanism.

## Terminology

In order to make it easier to explain how this library works, we use a color code to identify objects and values in general from both sides of the sandbox:

* Blue Realm is the JavaScript Realm that is not sandboxed.
* Red Realm is the JavaScript Realm that is sandboxed by this library.
* Blue Object, Blue Array, Blue Function, and Blue Values denote values that belong to the Blue Realm.
* Red Object, Red Array, Red Function, and Red Values denote values that belong to the Red Realm.
* Blue Proxy denote a Proxy created in the Blue Realm with a target that belongs to the Red Value.
* Red Proxy denote a proxy value accessible to the Red environment with the proxy target being a Blue Value.

## Implementation Details

This library implements a membrane to sandbox a JavaScript environment object graph. This membrane is responsible for connecting the Blue Realm with a Red Realm, and it does that by remapping global references in the Red Realm to be Red Proxies (proxies of Blue Values).

This membrane modulates the communication between the two sides, specifically by creating proxies around objects and functions, while letting other primitives values to travel safely throughout the membrane.

An Array, on the other hand, will never travel through the membrane, instead, a new Blue Array will be created when a Red Array is passing throughout the membrane, and vise-versa. Array items will be processed individually, which means no live Arrays can be used as a communication channel between the two sides of the membrane.

Since you can have multiple sandboxes associated to the Blue Realm, there is a possibility that they communicate with each other. This communication relies on the marshaling principle to avoid wrapping proxies over proxies when values are bounced between sandboxes via the Blue Realm. It does that by preserving the identity of the Blue Proxies observed by the Blue Realm. The Blue Realm is in control all the time, and the only way to communicate between sandboxes is to go throughout the Blue Realm.

## Performance

Even though this library is still experimental, we want to showcase that it is possible to have a membrane that is fairly fast. The main feature of this library is the laziness aspect of the proxies when accessing blue values from the sandbox. Those proxies are only going to be initialized when one of the proxy's traps is invoked the first time. This allow us to have a sandbox creation process that is extremely fast.

Additionally, since existing host JavaScript environments are immense due the the amount of APIs that they offer, most programs will only need a very small subset of those APIs, and this library only activate the portions of the object graph that are observed by the executed code, making it really light weight compared to other implementations.

Finally, Blue Proxies are not lazy, they are initialized the first time they go through the membrane even if they are not used by the Blue Realm. This could be changed in the future if it becomes a bottleneck. For now, since this is a less common case, it seems to be fine.

## Where can I use this library?

We do not know the applications of this library just yet, but we suspect that there are many scenarios where it can be useful. Here are some that we have identified:

* Sandbox for polyfills: if you need to evaluate code that requires different set of polyfills and environment configuration, you could sandbox it without distortions.
* Limiting capabilities: if you need to evaluate code that should not have access to certain capabilities (global objects, getter, setters, etc.) you could sandbox it with a set of distortions to accommodate such limitations.
* Time-sensitive: If you need to evaluate code that should not observe time or should simulate a different time-frame, you should sandbox it with a set of distortions that can adjust the timers.

## Challenges

* Debugging is still very challenging considering that dev-tools are still caching up with the Proxies. Chrome for example has differences displaying proxies in the console vs the watch panel.

Additionally, there is an existing bug in ChromeDev-tools that prevent a detached iframe to be debugged (https://bugs.chromium.org/p/chromium/issues/detail?id=1015462).

## The Code

* This library is implemented using TypeScript, and produces the proper TypeScript types, in case you care about it.
* As today, it does not produce a commonjs or script distribution, it only produces the ES Modules distribution that can be used via www.pika.dev or similar services, or by using the experimental module flag in nodejs 12.x, or above.
* Few tests are provided as of now, but the plan is to rely on existing tests (e.g.: WPT or ecma262) to validate that the membrane created by this library is a high-fidelity membrane.
* The `examples/` folder contains a set of examples showcasing how to use this library.
* The `src/` folder contains the library code, while the `lib/` folder will contain the compiled ES Modules after executing the `build` script from `package.json`.
* This library does not have any runtime dependency, in fact it is very tiny &lt;2kb.

## Open Questions

* Should we proxify Arrays objects to support live Arrays?
* Should we map all intrinsics or only undeniable intrinsics?

## Browsers Support and Stats

* Modern browsers with support for ES6 Proxy
* This library: ~3kb minified/gzip for browsers, ~2kb for node (no external dependencies).
