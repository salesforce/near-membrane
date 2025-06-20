# JavaScript DOM Membrane Library

JavaScript DOM Membrane Library to create a sandboxed environment in the browser.

## Warning

This library does not provide inherent security mechanisms because its primary design goal is to facilitate communication between two JavaScript realms (Incubator and Child) within the same process, rather than to enforce security policies.

1. **Design Intent:** The library implements a "near membrane" to connect two realms, allowing code in the Child Realm to emulate the capabilities of the Incubator Realm. This setup aims to preserve the integrity of the Incubator Realm by limiting side effects from the Child Realm, but it does not inherently enforce security constraints.
2. **Explicit Non-Goal:** In the project's documentation, it is explicitly stated that the library does not provide security guarantees. Developers are advised to implement their own security mechanisms on top of the provided distortion mechanism.
3. **Security Considerations:** While the library limits its runtime dependencies to reduce the total cost of ownership, it does not include built-in security features. Users are encouraged to remain vigilant and have their security stakeholders review all third-party products and their dependencies.

In summary, the Near Membrane library is designed to enable realm communication with controlled side effects, but it does not include built-in security mechanisms. Developers must implement their own security measures when using this library.