import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = execFileSync("rg", ["--files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => /\.(tsx?|mjs|cjs|json|css|md|html|txt|env|example)$/.test(file))
  .filter((file) => !file.startsWith(".next/") && !file.startsWith("node_modules/") && !file.startsWith(".local-demo/"));

const seq = (...codes) => codes.map((code) => String.fromCodePoint(code)).join("");
const suspiciousTokens = [
  /[\u00c2\u00c3][\u0080-\u00bf\u00a0-\u00bf]/u,
  /[\u00c4\u00c6\u00d0\u00ca][\u0080-\u00bf\u00a0-\u00bf\u2018-\u201d]/u,
  /\ufffd[\u0080-\u00bf]/u,
  seq(0x00e1, 0x00ba),
  seq(0x00e1, 0x00bb),
  seq(0x00e1, 0x00bc),
  seq(0x00e1, 0x00bd),
  seq(0x00e1, 0x00be),
  seq(0x00e2, 0x20ac),
  seq(0x00e2, 0x0080),
  seq(0x00ef, 0x00bf, 0x00bd),
  seq(0xfffd),
];

let matchCount = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (suspiciousTokens.some((token) => (typeof token === "string" ? line.includes(token) : token.test(line)))) {
      matchCount += 1;
      console.error(`${file}:${index + 1}:${line}`);
    }
  });
}

if (matchCount) {
  console.error(`Found ${matchCount} suspicious mojibake text occurrence(s).`);
  process.exit(1);
}

console.log("Text encoding check passed.");
