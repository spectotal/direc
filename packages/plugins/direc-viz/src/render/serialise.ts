import type { VizModel } from "../model/viz-model.js";
import { buildHtmlTemplate } from "./template.js";

export function serialise(model: VizModel): string {
  const json = JSON.stringify(model);
  return buildHtmlTemplate(json);
}
