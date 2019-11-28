# Secure Javascript Sandbox

This is an experimental library to demonstrate that it is possible to use membranes to secure the object graph of a javascript environment without introducing identity discontinuity.

## Goals

* The secure environment must have its own set of intrinsics.
* Code executed inside the secure environment cannot observe the sandbox.
* Mutations on the object graph should only affect the secure environment.

## Non-goals

* Poisoning is still possible via the membrane by providing object-likes through the membrane that could be used by the outer realm to perform an operation that leaks primitive values that are relevant.
* This library does not provide security guarantees, those must be implemented on top of the distortion mechanism.

## Implementation Details

This library implements a membrane to sandbox the secure environment object graph, which have intersections with the outer realm object graph. This membrane is implemented by using two type of proxies:

* A secure proxy, which produces an object that is only accessible from within the secure environment, but "most" operations (but not all) will be performed in the outer realm.
* A reverse proxy, which produces an object that is only accessible from the outer realm, but "all" operations will be performed in the secure environment.

This concept is extended beyond proxies, and is applicable to other structures, e.g.: Arrays. An Array will never travel through the membrane, instead, a new Array will be created on the other side of the membrane, and Array items will be processed individually, which means no live Arrays can be used as a communication channel between the two sides of the membrane.

Since you can have multiple secure environment instances in your outer realm, there is a possibility that they communicate with each other. This communication is not modulated, or observed by this library. It relies on the marshaling principle to avoid getting into the infinite loop of proxies for the same object if they are passed from one membrane to another, and it does that my always preserving the identity of the original object or reverse proxy observed by the outer realm.

## Performance

Even though this library is experimental, we want to showcase that it is possible to have a membrane that is fairly fast. The main feature of this library is the laziness aspect of the proxies when accessing outer realm objects and functions from within the secure environment. Those proxies are only going to be initialized when one of the proxy's traps is invoked the first time. This allow us to have a environment creation process that is extremely fast.

Additionally, since existing host javascript environments are immense due the the amount of APIs that they offer, most programs will only need a very small subject of those APIs, and this library only activate the portions of the object graph that are observed by the executed code, making it really light weight compared to other implementations.

Finally, reverse proxies are not lazy, they are initialized the first time they go through the membrane even if they are not used by the outer realm. This could be changed in the future if it becomes a bottleneck.

## Where can I use this library?

We do not know the applications of this library just yet, but we suspect that there are many scenarios where it can be useful. Here are some that we have identified:

* Sandbox for polyfills: if you need to evaluate code that requires different set of polyfills and environment configuration, you could sandbox it.
* Limiting capabilities: if you need to evaluate code that should not have access to certain capabilities (global objects, getter, setters, etc.) you could sandbox it with a set of distortions and a whitelist of global properties.
* Time-sensitive: If you need to evaluate code that should not observe time or should simulate a different time-frame, you should sandbox it with a set of distortions that can adjust the timers.

## Challenges

* Debugging is still very challenging considering that dev-tools are still caching up with the Proxies. Chrome for example has differences displaying proxies in the console vs the watch panel.

## The Code

* This library is implemented using TypeScript, and produces the proper TypeScript types, in case you care about it.
* As today, it does not produce a commonjs or script distribution, it only produces the ES Modules distribution that can be used via www.pika.dev or similar services, or by using the experimental module flag in nodejs 12.x, or above.
* No tests are provided just yet, the plan is to rely on existing tests (e.g.: WPT or ecma262) to validate that the membrane created by this library is a high-fidelity membrane.
* The `examples/` folder contains a set of examples showcasing how to use this library.
* The `src/` folder contains the library code, while the `lib/` folder will contain the compiled ES Modules after executing the `build` script from `package.json`.
* This library does not have any runtime dependency, in fact it is very tiny &lt;2kb.

## Open Questions

* Should we proxify Arrays objects to support live Arrays?
* There is not a clear boundary on what can be mutated and what not through the membrane.

## Browsers Support and Stats

* Modern browsers with support for ES6 Proxy
* This library: ~3kb minified/gzip for browsers, ~2kb for node (no external dependencies).
