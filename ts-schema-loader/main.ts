import * as TJS from "typescript-json-schema";
import Ajv from "ajv";
import ajvPack from "ajv-pack";

const ajv = new Ajv({sourceCode: true});

const settings: TJS.PartialArgs = {
  excludePrivate: true,
  ignoreErrors: true,
  ref: false,
  required: true
};

export default function (this: import("webpack").loader.LoaderContext) {
  const schemaRegex = /(?<tsFile>.*)\?(?<type>.*)/gu;
  // eslint-disable-next-line no-invalid-this
  const result = schemaRegex.exec(this.resource);
  if (!result) {
    throw Error("The format is require('ts-schema-loader!./your-file.ts?YourType')'");
  }

  const program = TJS.getProgramFromFiles([result.groups.tsFile]);
  const schema = TJS.generateSchema(program, result.groups.type, settings);

  const validationFunction = ajv.compile(schema);
  const moduleCode: string = ajvPack(ajv, validationFunction);
  return moduleCode;
}
