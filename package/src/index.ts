import { z as zz } from "zod";
import * as callz from "./callz";

export const z = {
  ...zz,
  ...callz,
};
