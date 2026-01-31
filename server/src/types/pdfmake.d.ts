/**
 * Type declarations for pdfmake module
 */

declare module 'pdfmake/interfaces' {
  export interface TDocumentDefinitions {
    pageSize?: string | [number, number];
    pageOrientation?: 'portrait' | 'landscape';
    pageMargins?: number | [number, number] | [number, number, number, number];
    content?: any[];
    styles?: { [key: string]: any };
    defaultStyle?: any;
    [key: string]: any;
  }
}

declare module 'pdfmake/src/printer.js' {
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';

  interface PdfPrinterFonts {
    [fontName: string]: {
      normal?: string;
      bold?: string;
      italics?: string;
      bolditalics?: string;
    };
  }

  interface PdfKitDocument {
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    end(): void;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
  }

  class PdfPrinter {
    constructor(fonts: PdfPrinterFonts);
    createPdfKitDocument(docDefinition: TDocumentDefinitions): PdfKitDocument;
  }

  export default PdfPrinter;
}
