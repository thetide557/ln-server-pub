import { parser } from "lezer-promql";

interface IModification {
  start: number;
  end: number;
  replacement: string;
}

type AssetIdValue = string | string[];
export function handleAssetIdTags(
  promql: string,
  assetId: AssetIdValue,
  specificMetrics?: string[]
): string {
  if (typeof promql !== "string") {
    throw new TypeError("promql 必须是字符串");
  }

  const tree = parser.parse(promql);
  const cursor = tree.cursor();
  const modifications: IModification[] = [];

  const shouldClearAll = Array.isArray(assetId)
    ? assetId.length === 0
    : assetId === "";

  do {
    if (cursor.name === "MetricIdentifier") {
      const metricName = promql.slice(cursor.from, cursor.to);

      if (specificMetrics?.length && !specificMetrics.includes(metricName)) {
        continue;
      }

      const { hasLabels, labelsStart, labelsEnd, existingContent, hasAssetId } =
        examineLabelBlock(cursor, promql);

      if (shouldClearAll) {
        if (hasLabels) {
          modifications.push(
            ...clearAssetIdTags(labelsStart, labelsEnd, existingContent)
          );
        }
      } else {
        const newLabel = Array.isArray(assetId)
          ? assetId.map((v) => `asset_id!="${v}"`).join(",")
          : `asset_id="${assetId}"`;

        if (hasLabels) {
          // 先清除所有旧的 asset_id 标签
          const cleanedContent = existingContent
            .replace(/(^|,)asset_id\s*!?=\s*("[^"]+"|\w+)(?=(,|$))/g, "")
            .replace(/,+/g, ",")
            .replace(/^,|,$/g, "");

          // 添加新标签
          const updatedContent = cleanedContent
            ? `${cleanedContent},${newLabel}`
            : newLabel;

          modifications.push({
            start: labelsStart,
            end: labelsEnd,
            replacement: `{${updatedContent}}`,
          });
        } else {
          // 没有 {}，创建新 {} 并添加标签
          modifications.push({
            start: cursor.to,
            end: cursor.to,
            replacement: `{${newLabel}}`,
          });
        }
      }
    }
  } while (cursor.next());

  return applyModifications(promql, modifications);
}

// 精确检测标签块
function examineLabelBlock(cursor: any, promql: string) {
  let pos = cursor.to;
  let hasLabels = false;
  let labelsStart = pos;
  let labelsEnd = pos;
  let existingContent = "";
  let hasAssetId = false;

  // 检查是否有 {}
  if (promql[pos] === "{") {
    hasLabels = true;
    labelsStart = pos;
    let braceDepth = 1;
    pos++;

    const contentStart = pos;
    while (pos < promql.length && braceDepth > 0) {
      if (promql[pos] === "{") braceDepth++;
      if (promql[pos] === "}") braceDepth--;
      pos++;
    }
    labelsEnd = pos;
    existingContent = promql.slice(contentStart, pos - 1);
    hasAssetId = /(^|,)asset_id\s*!?=\s*("[^"]+"|\w+)/.test(existingContent);
  }

  return { hasLabels, labelsStart, labelsEnd, existingContent, hasAssetId };
}

// 清除所有 asset_id 标签
function clearAssetIdTags(start: number, end: number, content: string) {
  const cleaned = content
    .replace(/(^|,)asset_id\s*!?=\s*("[^"]+"|\w+)(?=(,|$))/g, "")
    .replace(/,+/g, ",")
    .replace(/^,|,$/g, "");

  if (cleaned === "") {
    return [{ start, end, replacement: "" }]; // 完全移除空 {}
  }
  return [{ start, end, replacement: `{${cleaned}}` }];
}

function applyModifications(
  promql: string,
  modifications: IModification[]
): string {
  if (!modifications.length) return promql;

  // 从后往前应用修改，避免位置偏移
  modifications.sort((a, b) => b.start - a.start);

  let lastPos = promql.length;
  const output: string[] = [];
  for (const mod of modifications) {
    output.unshift(promql.slice(mod.end, lastPos));
    output.unshift(mod.replacement);
    lastPos = mod.start;
  }
  output.unshift(promql.slice(0, lastPos));

  return output.join("");
}
