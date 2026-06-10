import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 12);

export function makeId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}
