import {env} from '@huggingface/transformers';

/** Model inference must use assets packaged with the app, including ONNX WASM. */
export function configureLocalModels(): void {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = new URL('/assets/models/', self.location.origin).href;
  env.backends.onnx.wasm.wasmPaths = new URL('/assets/wasm/', self.location.origin).href;
}
