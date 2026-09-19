import { Injectable } from '@angular/core';

export interface ParsedImport {
  html: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  async parseFile(file: File): Promise<ParsedImport> {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.txt') || file.type === 'text/plain') return this.parseTxt(file);
    if (lower.endsWith('.docx')) return this.parseDocx(file);
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  private async parseTxt(file: File): Promise<ParsedImport> {
    const text = await file.text();
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = escaped
      .split(/\n{2,}/)
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n');
    return { html, text };
  }

  private async parseDocx(file: File): Promise<ParsedImport> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    return { html: result.value, text: textResult.value };
  }
}