import { createMembraneMarshall } from './membrane';

const TypeErrorCtor = TypeError;
// istanbul ignore next
const marshallSourceTextInStrictMode = `
(function(){
    'use strict';
    (${function initializeShadowRealm() {
        // This package is bundled by third-parties that have their own build time
        // replacement logic. Instead of customizing each build system to be aware
        // of this package we implement a two phase debug mode by performing small
        // runtime checks to determine phase one, our code is unminified, and
        // phase two, the user opted-in to custom devtools formatters. Phase one
        // is used for light weight initialization time debug while phase two is
        // reserved for post initialization runtime.
        const lockerUnminifiedGate = `${() => /**/ 1}`.includes('*');
        if (lockerUnminifiedGate && typeof Error.prepareStackTrace !== 'function') {
            // Feature detect the V8 stack trace API.
            // https://v8.dev/docs/stack-trace-api
            const CallSite = ((): Function | undefined => {
                Error.prepareStackTrace = (_error: Error, callSites: NodeJS.CallSite[]) =>
                    callSites;
                const callSites = new Error().stack as string | NodeJS.CallSite[];
                delete Error.prepareStackTrace;
                return Array.isArray(callSites) && callSites.length > 0
                    ? callSites[0]?.constructor
                    : undefined;
            })();
            if (typeof CallSite === 'function') {
                const LOCKER_IDENTIFIER_MARKER = '$LWS';

                const { toString: ErrorProtoToString } = Error.prototype;
                const { apply: ReflectApply } = Reflect;
                const { endsWith: StringProtoEndsWith, includes: StringProtoIncludes } =
                    String.prototype;
                const {
                    getEvalOrigin: CallSiteProtoGetEvalOrigin,
                    getFunctionName: CallSiteProtoGetFunctionName,
                    toString: CallSiteProtoToString,
                } = CallSite.prototype;

                const formatStackTrace = function formatStackTrace(
                    error: Error,
                    callSites: NodeJS.CallSite[]
                ): string {
                    // Based on V8's default stack trace formatting:
                    // https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/execution/messages.cc#371
                    let stackTrace = '';
                    try {
                        stackTrace = ReflectApply(ErrorProtoToString, error, []);
                    } catch {
                        stackTrace = '<error>';
                    }
                    let consecutive = false;
                    for (let i = 0, { length } = callSites; i < length; i += 1) {
                        const callSite = callSites[i];
                        const funcName = ReflectApply(CallSiteProtoGetFunctionName, callSite, []);
                        let isMarked = false;
                        if (
                            typeof funcName === 'string' &&
                            funcName !== 'eval' &&
                            ReflectApply(StringProtoEndsWith, funcName, [LOCKER_IDENTIFIER_MARKER])
                        ) {
                            isMarked = true;
                        }
                        if (!isMarked) {
                            const evalOrigin = ReflectApply(
                                CallSiteProtoGetEvalOrigin,
                                callSite,
                                []
                            );
                            if (
                                typeof evalOrigin === 'string' &&
                                ReflectApply(StringProtoIncludes, evalOrigin, [
                                    LOCKER_IDENTIFIER_MARKER,
                                ])
                            ) {
                                isMarked = true;
                            }
                        }
                        // Only write a single LWS entry per consecutive LWS stacks.
                        if (isMarked) {
                            if (!consecutive) {
                                consecutive = true;
                                stackTrace += '\n    at LWS';
                            }
                            continue;
                        } else {
                            consecutive = false;
                        }
                        try {
                            stackTrace += `\n    at ${ReflectApply(
                                CallSiteProtoToString,
                                callSite,
                                []
                            )}`;
                            // eslint-disable-next-line no-empty
                        } catch {}
                    }
                    return stackTrace;
                };
                // Error.prepareStackTrace cannot be a bound or proxy wrapped
                // function, so to obscure its source we wrap the call to
                // formatStackTrace().
                Error.prepareStackTrace = function prepareStackTrace(
                    error: Error,
                    callSites: NodeJS.CallSite[]
                ) {
                    return formatStackTrace(error, callSites);
                };
                // The default stack trace limit in Chrome is 10.
                // Increasing to 20 for wiggle room of filtered results.
                Error.stackTraceLimit = 20;
            }
        }
    }.toString()})();
    return (${createMembraneMarshall.toString()})
})()`;
// eslint-disable-next-line no-eval
export function createConnector(evaluator: typeof eval) {
    if (typeof evaluator !== 'function') {
        throw new TypeErrorCtor('Missing evaluator function.');
    }
    // The result of this eval will be a function that returns a function.
    // The hooks connector is the last returned function, so we invoke the
    // result of the eval operation and return that result.
    return evaluator(marshallSourceTextInStrictMode)();
}
