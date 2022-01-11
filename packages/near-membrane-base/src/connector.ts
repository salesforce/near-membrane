import { createMembraneMarshall } from './membrane';

const TypeErrorCtor = TypeError;
// istanbul ignore next
const marshallSourceTextInStrictMode = `
(function(){
    'use strict';
    (${function initializeShadowRealm() {
        // Hook into V8 stack trace API
        // https://v8.dev/docs/stack-trace-api
        if (typeof Error.prepareStackTrace !== 'function') {
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
                // This package is bundled by third-parties that have their own build time
                // replacement logic. Instead of customizing each build system to be aware of
                // this package we perform a small runtime check to determine whether our
                // code is minified or in DEV_MODE.
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const DEV_MODE = function DEV_MODE() {}.name === 'DEV_MODE';
                const ZERO_WIDTH_JOINER = '\u200D';
                const LOCKER_IDENTIFIER_MARKER = `$LWS${ZERO_WIDTH_JOINER}`;

                const { toString: ErrorProtoToString } = Error.prototype;
                const { apply: ReflectApply, defineProperty: ReflectDefineProperty } = Reflect;
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
                // Make Error.prepareStackTrace non-configurable and non-writable.
                ReflectDefineProperty(Error, 'prepareStackTrace', {
                    // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                    __proto__: null,
                    enumerable: true,
                    // Error.prepareStackTrace cannot be a bound or proxy wrapped
                    // function, so to obscure its source we wrap the call to
                    // formatStackTrace().
                    value: function prepareStackTrace(error: Error, callSites: NodeJS.CallSite[]) {
                        return formatStackTrace(error, callSites);
                    },
                });
                // Make Error.stackTraceLimit configurable and writable in DEV_MODE.
                ReflectDefineProperty(Error, 'stackTraceLimit', {
                    // @ts-ignore: TS doesn't like __proto__ on property descriptors.
                    __proto__: null,
                    configurable: DEV_MODE,
                    enumerable: true,
                    // The default stack trace limit is 10.
                    // Increasing to 20 for wiggle room of filtered results.
                    value: 20,
                    writable: DEV_MODE,
                });
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
