// Force ArrayBuffer and Uint8Array to be treated differently (TypeScript bug)
interface ArrayBuffer {
  " buffer_kind"?: "array";
}
interface Uint8Array {
  " buffer_kind"?: "uint8";
}
