import base64js from "base64-js";
import pako from "pako";

export class Compress {
  public static async compress (text: string): Promise<string> {
    const compressed = pako.deflate(text, {
      level: 9
    });
    return base64js.fromByteArray(compressed);
  }

  public static async decompress (base64: string): Promise<string> {
    const compressed = base64js.toByteArray(base64);
    const decompressed = pako.inflate(compressed);
    return new TextDecoder("utf-8").decode(decompressed);
  }
}
