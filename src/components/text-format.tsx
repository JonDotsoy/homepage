import type { PropsWithChildren } from "react";

type Replacements = Record<string, () => any>;

export function TF(props: PropsWithChildren<{ text: string }>) {
  const { children, text, ...nextProps } = props;

  return <>{text}</>;
}

export function textFormat(text: string, replacements: Replacements = {}) {
  const parts: any[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "{") {
      // Save accumulated text
      if (currentText) {
        parts.push(currentText);
        currentText = "";
      }

      // Find closing brace
      const closeIndex = text.indexOf("}", i);
      if (closeIndex === -1) {
        currentText += text[i];
        i++;
        continue;
      }

      // Extract key
      const key = text.slice(i + 1, closeIndex);

      // Check for special cases
      if (key === "br") {
        parts.push({ type: "br" });
      } else if (replacements[key]) {
        parts.push(replacements[key]());
      } else {
        currentText += `{${key}}`;
      }

      i = closeIndex + 1;
    } else {
      currentText += text[i];
      i++;
    }
  }

  // Add remaining text
  if (currentText) {
    parts.push(currentText);
  }

  return parts;
}
