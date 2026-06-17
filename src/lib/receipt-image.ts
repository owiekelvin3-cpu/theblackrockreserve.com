import { toPng } from "html-to-image";

type DownloadReceiptImageOptions = {
  pixelRatio?: number;
  backgroundColor?: string;
};

function shouldCaptureNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  return node.dataset.receiptExclude === undefined;
}

/** Renders a receipt DOM subtree to a PNG and triggers a browser download. */
export async function downloadReceiptAsImage(
  element: HTMLElement,
  filename: string,
  options: DownloadReceiptImageOptions = {}
): Promise<void> {
  const isLight =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "light";
  const { pixelRatio = 2, backgroundColor = isLight ? "#f6f7f9" : "#141416" } = options;

  const dataUrl = await toPng(element, {
    pixelRatio,
    cacheBust: true,
    backgroundColor,
    filter: shouldCaptureNode,
    style: {
      borderRadius: "0",
    },
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.click();
}
