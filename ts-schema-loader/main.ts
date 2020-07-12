import * as TJS from "typescript-json-schema";
import Ajv from "ajv";
import ajvPack from "ajv-pack";
import crypto from "crypto";
import fs from "fs";

const ajv = new Ajv({sourceCode: true});

const settings: TJS.PartialArgs = {
  excludePrivate: true,
  ref: false,
  required: true,
  strictNullChecks: true,
  noExtraProps: true
};

const generatorCache: Record<string, TJS.JsonSchemaGenerator> = {};

export default function (this: import("webpack").loader.LoaderContext) {
  const schemaRegex = /(?<tsFile>.*)\?(?<debug>&)?(?<type>.*)/gu;
  // eslint-disable-next-line no-invalid-this
  const result = schemaRegex.exec(this.resource);
  if (!result) {
    throw Error("The format is require('ts-schema-loader!./your-file.ts?YourType')'");
  }

  const hash = crypto.createHash("md5").
    update(fs.readFileSync(result.groups.tsFile, "utf8")).
    digest("hex");

  if (!generatorCache[hash]) {
    const files = [result.groups.tsFile];
    const program = TJS.getProgramFromFiles(files, {strictNullChecks: true});
    generatorCache[hash] = TJS.buildGenerator(program, settings, files);
  }

  const generator = generatorCache[hash];
  const schema = generator.getSchemaForSymbol(result.groups.type);

  if (result.groups.debug) {
    console.log(schema);
  }

  const validationFunction = ajv.compile(schema);
  const moduleCode: string = ajvPack(ajv, validationFunction);
  return moduleCode;
}
