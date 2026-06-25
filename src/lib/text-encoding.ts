const cp1252ReverseMap = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const suspiciousMojibakePattern =
  /[\u00c2\u00c3][\u0080-\u00bf\u00a0-\u00bf]|[\u00c4\u00c6\u00d0\u00ca][\u0080-\u00bf\u00a0-\u00bf\u2018-\u201d]|\u00e1[\u00ba-\u00be]|\u00e2[\u0080-\u00bf\u20ac]|\ufffd[\u0080-\u00bf]/u;

const cp1252SegmentPattern = /[\u0009\u000a\u000d\u0020-\u007e\u0080-\u00ff\u0192\u02c6\u02dc\u0160\u0161\u0178\u017d\u017e\u0152\u0153\u2018-\u201e\u2020\u2021\u2026\u2030\u2039\u203a\u20ac]+/gu;

const lossyRepairs: Array<[RegExp, string]> = [
  [/\ufffd\u0085/gu, "ễ"],
  [/\ufffd\u0081/gu, "ế"],
  [/\ufffd\u0083/gu, "ề"],
  [/\ufffd\u0087/gu, "ệ"],
  [/\ufffd\u00a1/gu, "á"],
  [/\ufffd\u00a0/gu, "à"],
  [/\ufffd\u00a3/gu, "ã"],
  [/\ufffd\u00a9/gu, "é"],
  [/\ufffd\u00b4/gu, "ô"],
];

export function repairTextEncoding(value: string) {
  let repaired = value;
  for (const [pattern, replacement] of lossyRepairs) {
    repaired = repaired.replace(pattern, replacement);
  }

  return repaired.replace(cp1252SegmentPattern, (segment) => {
    if (!suspiciousMojibakePattern.test(segment)) return segment;
    const decoded = decodeCp1252Segment(segment);
    return decoded || segment;
  });
}

export function repairTextTree<T>(value: T): T {
  if (typeof value === "string") return repairTextEncoding(value) as T;
  if (Array.isArray(value)) return value.map((item) => repairTextTree(item)) as T;
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, repairTextTree(entry)]),
  ) as T;
}

function decodeCp1252Segment(segment: string) {
  const bytes: number[] = [];
  for (const char of segment) {
    const byte = cp1252Byte(char);
    if (byte === undefined) return "";
    bytes.push(byte);
  }

  const decoded = Buffer.from(bytes).toString("utf8");
  return decoded.includes("\ufffd") ? "" : decoded;
}

function cp1252Byte(char: string) {
  const code = char.codePointAt(0);
  if (code === undefined) return undefined;
  if (code <= 0xff) return code;
  return cp1252ReverseMap.get(code);
}
