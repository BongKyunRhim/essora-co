/*
 * Pulls plain text out of an uploaded essay file (.txt, .docx, .pdf) so the
 * reviewer always gets selectable text. Parsers are imported lazily — they're
 * heavy and only needed the moment an applicant actually picks a file.
 * Throws a user-readable Error when a file has no extractable text.
 */

const NO_TEXT_MSG =
  "We couldn't read any text from that file — it may be scanned or image-based. " +
  "Please paste your essay into the text box instead.";

export default async function extractEssayText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt")) {
    const text = (await file.text()).trim();
    if (!text) throw new Error(NO_TEXT_MSG);
    return text;
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = (value || "").trim();
    if (!text) throw new Error(NO_TEXT_MSG);
    return text;
  }

  if (name.endsWith(".pdf")) {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      for (const item of content.items) {
        text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n\n";
    }
    doc.destroy();
    // collapse the artifacts of PDF text runs into readable paragraphs
    text = text.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 40) throw new Error(NO_TEXT_MSG);
    return text;
  }

  throw new Error("Please upload a .docx, .pdf, or .txt file — or paste your essay into the text box.");
}
