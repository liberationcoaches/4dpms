/**
 * Type declarations for pdfmake/interfaces module
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
