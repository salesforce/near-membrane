import { MembraneBroker } from "./environment";
import { RedProxyTarget } from "./types";
import { assign, isUndefined } from "./shared";
import { runInNewContext } from 'vm';
import { blueProxyFactory, controlledEvaluator } from "./blue";
import { getFilteredEndowmentDescriptors, linkIntrinsics } from "./intrinsics";
import { SandboxRegistry } from "./registry";
import { serializedRedEnvSourceText } from "./red";

// note: in a node module, the top-level 'this' is not the global object
// (it's *something* but we aren't sure what), however an indirect eval of
// 'this' will be the correct global object.
const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

interface NodeEvaluationOptions {
    // the blue global object to be used to create the sandbox
    globalThis: typeof globalThis;
    // additional globals to be installed inside the sandbox
    endowments: object;
    // distortions map
    distortions?: Map<RedProxyTarget, RedProxyTarget>;
}

export default function createSandboxEvaluator(registry: SandboxRegistry, options: NodeEvaluationOptions): (sourceText: string) => void {
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const redGlobalThis: typeof globalThis = runInNewContext(unsafeGlobalEvalSrc);
    const { globalThis: blueGlobalThis, endowments } = options;
    const endowmentsDescriptors = getFilteredEndowmentDescriptors(endowments);
    const { eval: redIndirectEval } = redGlobalThis;
    linkIntrinsics(registry, blueGlobalThis, redGlobalThis);

    const redProxyFactory = redIndirectEval(`(${serializedRedEnvSourceText})`);

    const broker = new MembraneBroker(
        registry,
        (broker: MembraneBroker) => blueProxyFactory(broker, redGlobalThis.Reflect),
        (broker: MembraneBroker) => redProxyFactory(broker, blueGlobalThis.Reflect)
    );

    // remapping globals
    broker.remap(redGlobalThis, blueGlobalThis, endowmentsDescriptors);

    // finally, we return the evaluator function wrapped by an error control flow
    return controlledEvaluator(registry, redIndirectEval);
}

export function evaluateScriptSource(sourceText: string, options?: object) {
    const sb = new SandboxRegistry();
    const o: NodeEvaluationOptions = assign({
        globalThis,
        endowments: {}
    }, options);
    if (!isUndefined(o.distortions)) {
        sb.addDistortions(o.distortions);
    }
    const evalScript = createSandboxEvaluator(sb, o);
    evalScript(sourceText);
}
