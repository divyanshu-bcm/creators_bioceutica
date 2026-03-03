const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "span",
  "div",
  "ul",
  "ol",
  "li",
]);

const ALLOWED_STYLE_PROPS = new Set([
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
]);

function sanitizeInlineStyle(styleValue: string): string {
  return styleValue
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const [rawProp, ...rawValParts] = decl.split(":");
      if (!rawProp || rawValParts.length === 0) return "";
      const prop = rawProp.trim().toLowerCase();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return "";

      const value = rawValParts.join(":").trim();
      if (!value) return "";
      if (!/^[#(),.%+\-\w\s]+$/.test(value)) return "";

      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

export function sanitizeRichTextHtml(input: string | null | undefined): string {
  if (!input) return "";
  if (typeof window === "undefined") return input;

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");

  for (const element of Array.from(doc.body.querySelectorAll("*"))) {
    const tag = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attr of Array.from(element.attributes)) {
      if (attr.name !== "style") {
        element.removeAttribute(attr.name);
      }
    }

    if (element.hasAttribute("style")) {
      const cleanStyle = sanitizeInlineStyle(
        element.getAttribute("style") ?? "",
      );
      if (cleanStyle) {
        element.setAttribute("style", cleanStyle);
      } else {
        element.removeAttribute("style");
      }
    }
  }

  const textWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let textNode = textWalker.nextNode();

  while (textNode) {
    textNodes.push(textNode as Text);
    textNode = textWalker.nextNode();
  }

  for (const node of textNodes) {
    const cleaned = node.nodeValue
      ?.replace(/<\s*\/?\s*[a-zA-Z][^>]*>/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned) {
      node.remove();
    } else if (cleaned !== node.nodeValue) {
      node.nodeValue = cleaned;
    }
  }

  return doc.body.innerHTML.trim();
}

export function richTextToPlainText(input: string | null | undefined): string {
  if (!input) return "";

  if (typeof window === "undefined") {
    return input.replace(/<\s*\/?\s*[a-zA-Z][^>]*>/g, " ").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizeRichTextHtml(input), "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
