// Conditional PrismJS import to avoid build issues
let Prism: any = null;

if (typeof window !== 'undefined') {
  // Client-side: import PrismJS normally
  Prism = require('prismjs');
  require('prismjs/components/prism-javascript');
  require('prismjs/components/prism-typescript');
  require('prismjs/components/prism-python');
  require('prismjs/components/prism-java');
  require('prismjs/components/prism-csharp');
  require('prismjs/components/prism-cpp');
  require('prismjs/components/prism-c');
  require('prismjs/components/prism-go');
  require('prismjs/components/prism-rust');
  require('prismjs/components/prism-php');
  require('prismjs/components/prism-ruby');
  require('prismjs/components/prism-swift');
  require('prismjs/components/prism-kotlin');
  require('prismjs/components/prism-sql');
  require('prismjs/components/prism-json');
  require('prismjs/components/prism-yaml');
  require('prismjs/components/prism-markdown');
  require('prismjs/components/prism-bash');
  require('prismjs/components/prism-docker');
  require('prismjs/components/prism-git');
} else {
  // Server-side: create a mock PrismJS to avoid build errors
  Prism = {
    languages: {},
    hooks: {
      all: {},
      add: function() {},
      run: function() {}
    },
    highlight: function(text: string, grammar: any, language: string) {
      return text; // Return plain text on server-side
    }
  };
}

// Code Parser Service for YouTube Extension
export class CodeParserService {
  private supportedLanguages: string[] = [
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'cpp',
    'c',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'sql',
    'json',
    'yaml',
    'markdown',
    'bash',
    'docker',
    'git',
  ];

  // Parse extracted text to identify and format code
  parseCodeFromText(text: string): {
    codeBlocks: Array<{
      code: string;
      language: string;
      confidence: number;
      startIndex: number;
      endIndex: number;
    }>;
    plainText: string;
    hasCode: boolean;
  } {
    const codeBlocks: Array<{
      code: string;
      language: string;
      confidence: number;
      startIndex: number;
      endIndex: number;
    }> = [];

    let plainText = text;
    let hasCode = false;

    // Pattern 1: Code blocks with language markers
    const codeBlockPattern = /```(\w+)?\n?([\s\S]*?)```/g;
    let match;
    let offset = 0;

    while ((match = codeBlockPattern.exec(text)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      const startIndex = match.index - offset;
      const endIndex = startIndex + match[0].length;

      if (this.isValidCode(code, language)) {
        codeBlocks.push({
          code,
          language: this.normalizeLanguage(language),
          confidence: 0.9,
          startIndex,
          endIndex,
        });

        // Remove code block from plain text
        plainText = plainText.replace(match[0], '');
        offset += match[0].length;
        hasCode = true;
      }
    }

    // Pattern 2: Inline code with backticks
    const inlineCodePattern = /`([^`]+)`/g;
    offset = 0;

    while ((match = inlineCodePattern.exec(text)) !== null) {
      const code = match[1].trim();
      const startIndex = match.index - offset;
      const endIndex = startIndex + match[0].length;

      if (this.isValidCode(code, 'text')) {
        const language = this.detectLanguage(code);
        codeBlocks.push({
          code,
          language,
          confidence: 0.7,
          startIndex,
          endIndex,
        });

        // Remove inline code from plain text
        plainText = plainText.replace(match[0], '');
        offset += match[0].length;
        hasCode = true;
      }
    }

    // Pattern 3: Function definitions and variable assignments
    const functionPattern = /(function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|\w+\s*\([^)]*\)\s*\{)/g;
    offset = 0;

    while ((match = functionPattern.exec(text)) !== null) {
      const code = match[1].trim();
      const startIndex = match.index - offset;
      const endIndex = startIndex + match[0].length;

      if (this.isValidCode(code, 'javascript')) {
        codeBlocks.push({
          code,
          language: 'javascript',
          confidence: 0.6,
          startIndex,
          endIndex,
        });

        // Remove function from plain text
        plainText = plainText.replace(match[0], '');
        offset += match[0].length;
        hasCode = true;
      }
    }

    // Pattern 4: Python-style code
    const pythonPattern = /(def\s+\w+|class\s+\w+|import\s+\w+|from\s+\w+\s+import)/g;
    offset = 0;

    while ((match = pythonPattern.exec(text)) !== null) {
      const code = match[1].trim();
      const startIndex = match.index - offset;
      const endIndex = startIndex + match[0].length;

      if (this.isValidCode(code, 'python')) {
        codeBlocks.push({
          code,
          language: 'python',
          confidence: 0.6,
          startIndex,
          endIndex,
        });

        // Remove Python code from plain text
        plainText = plainText.replace(match[0], '');
        offset += match[0].length;
        hasCode = true;
      }
    }

    // Clean up plain text
    plainText = plainText.replace(/\s+/g, ' ').trim();

    return {
      codeBlocks,
      plainText,
      hasCode,
    };
  }

  // Detect programming language from code snippet
  detectLanguage(code: string): string {
    const codeLower = code.toLowerCase();

    // JavaScript/TypeScript patterns
    if (code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var')) {
      return 'javascript';
    }

    // Python patterns
    if (code.includes('def ') || code.includes('import ') || code.includes('from ') || code.includes('class ')) {
      return 'python';
    }

    // Java patterns
    if (code.includes('public class') || code.includes('private ') || code.includes('public static')) {
      return 'java';
    }

    // C# patterns
    if (code.includes('using ') || code.includes('namespace ') || code.includes('public class')) {
      return 'csharp';
    }

    // C/C++ patterns
    if (code.includes('#include') || code.includes('int main') || code.includes('std::')) {
      return 'cpp';
    }

    // Go patterns
    if (code.includes('package ') || code.includes('func ') || code.includes('import (')) {
      return 'go';
    }

    // Rust patterns
    if (code.includes('fn ') || code.includes('use ') || code.includes('mod ')) {
      return 'rust';
    }

    // PHP patterns
    if (code.includes('<?php') || code.includes('$') || code.includes('function ')) {
      return 'php';
    }

    // Ruby patterns
    if (code.includes('def ') || code.includes('class ') || code.includes('require ')) {
      return 'ruby';
    }

    // SQL patterns
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE') || code.includes('DELETE')) {
      return 'sql';
    }

    // JSON patterns
    if (code.startsWith('{') && code.endsWith('}')) {
      return 'json';
    }

    // YAML patterns
    if (code.includes(':') && code.includes('-')) {
      return 'yaml';
    }

    // Markdown patterns
    if (code.includes('#') || code.includes('*') || code.includes('[')) {
      return 'markdown';
    }

    // Bash patterns
    if (code.includes('#!/bin/bash') || code.includes('$') || code.includes('echo ')) {
      return 'bash';
    }

    // Docker patterns
    if (code.includes('FROM ') || code.includes('RUN ') || code.includes('COPY ')) {
      return 'docker';
    }

    // Git patterns
    if (code.includes('git ') || code.includes('commit') || code.includes('push')) {
      return 'git';
    }

    return 'text';
  }

  // Validate if text is valid code
  isValidCode(code: string, language: string): boolean {
    if (!code || code.length < 3) return false;

    // Basic validation based on language
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return this.isValidJavaScript(code);
      case 'python':
        return this.isValidPython(code);
      case 'java':
        return this.isValidJava(code);
      case 'csharp':
        return this.isValidCSharp(code);
      case 'cpp':
      case 'c':
        return this.isValidCpp(code);
      case 'go':
        return this.isValidGo(code);
      case 'rust':
        return this.isValidRust(code);
      case 'php':
        return this.isValidPHP(code);
      case 'ruby':
        return this.isValidRuby(code);
      case 'sql':
        return this.isValidSQL(code);
      case 'json':
        return this.isValidJSON(code);
      case 'yaml':
        return this.isValidYAML(code);
      case 'markdown':
        return this.isValidMarkdown(code);
      case 'bash':
        return this.isValidBash(code);
      case 'docker':
        return this.isValidDocker(code);
      case 'git':
        return this.isValidGit(code);
      default:
        return this.isValidGenericCode(code);
    }
  }

  // Language-specific validation methods
  private isValidJavaScript(code: string): boolean {
    return code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var') || code.includes('=>');
  }

  private isValidPython(code: string): boolean {
    return code.includes('def ') || code.includes('import ') || code.includes('from ') || code.includes('class ') || code.includes('print(');
  }

  private isValidJava(code: string): boolean {
    return code.includes('public class') || code.includes('private ') || code.includes('public static') || code.includes('System.out.println');
  }

  private isValidCSharp(code: string): boolean {
    return code.includes('using ') || code.includes('namespace ') || code.includes('public class') || code.includes('Console.WriteLine');
  }

  private isValidCpp(code: string): boolean {
    return code.includes('#include') || code.includes('int main') || code.includes('std::') || code.includes('cout');
  }

  private isValidGo(code: string): boolean {
    return code.includes('package ') || code.includes('func ') || code.includes('import (') || code.includes('fmt.Println');
  }

  private isValidRust(code: string): boolean {
    return code.includes('fn ') || code.includes('use ') || code.includes('mod ') || code.includes('println!');
  }

  private isValidPHP(code: string): boolean {
    return code.includes('<?php') || code.includes('$') || code.includes('function ') || code.includes('echo ');
  }

  private isValidRuby(code: string): boolean {
    return code.includes('def ') || code.includes('class ') || code.includes('require ') || code.includes('puts ');
  }

  private isValidSQL(code: string): boolean {
    return code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE') || code.includes('DELETE') || code.includes('FROM');
  }

  private isValidJSON(code: string): boolean {
    try {
      JSON.parse(code);
      return true;
    } catch {
      return false;
    }
  }

  private isValidYAML(code: string): boolean {
    return code.includes(':') && (code.includes('-') || code.includes('|') || code.includes('>'));
  }

  private isValidMarkdown(code: string): boolean {
    return code.includes('#') || code.includes('*') || code.includes('[') || code.includes('```');
  }

  private isValidBash(code: string): boolean {
    return code.includes('#!/bin/bash') || code.includes('$') || code.includes('echo ') || code.includes('cd ');
  }

  private isValidDocker(code: string): boolean {
    return code.includes('FROM ') || code.includes('RUN ') || code.includes('COPY ') || code.includes('WORKDIR ');
  }

  private isValidGit(code: string): boolean {
    return code.includes('git ') || code.includes('commit') || code.includes('push') || code.includes('pull');
  }

  private isValidGenericCode(code: string): boolean {
    // Generic validation for unknown languages
    return code.includes('{') || code.includes('}') || code.includes('(') || code.includes(')') || code.includes(';');
  }

  // Normalize language name
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase();
    
    // Map common variations
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c++': 'cpp',
      'c': 'c',
      'go': 'go',
      'golang': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'sql': 'sql',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml',
      'md': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'dockerfile': 'docker',
      'docker': 'docker',
      'git': 'git',
    };

    return languageMap[normalized] || normalized;
  }

  // Format code with syntax highlighting
  formatCodeWithSyntaxHighlighting(code: string, language: string): string {
    try {
      const normalizedLanguage = this.normalizeLanguage(language);
      
      if (this.supportedLanguages.includes(normalizedLanguage)) {
        return Prism.highlight(code, Prism.languages[normalizedLanguage], normalizedLanguage);
      }
      
      return code;
    } catch (error) {
      console.error('Syntax highlighting error:', error);
      return code;
    }
  }

  // Extract code blocks and format them
  extractAndFormatCodeBlocks(text: string): Array<{
    code: string;
    language: string;
    formattedCode: string;
    confidence: number;
  }> {
    const parsed = this.parseCodeFromText(text);
    
    return parsed.codeBlocks.map(block => ({
      code: block.code,
      language: block.language,
      formattedCode: this.formatCodeWithSyntaxHighlighting(block.code, block.language),
      confidence: block.confidence,
    }));
  }

  // Get code statistics
  getCodeStatistics(text: string): {
    totalCodeBlocks: number;
    languages: { [language: string]: number };
    totalCodeLength: number;
    averageCodeLength: number;
  } {
    const parsed = this.parseCodeFromText(text);
    
    const languages: { [language: string]: number } = {};
    let totalCodeLength = 0;
    
    parsed.codeBlocks.forEach(block => {
      languages[block.language] = (languages[block.language] || 0) + 1;
      totalCodeLength += block.code.length;
    });
    
    const averageCodeLength = parsed.codeBlocks.length > 0 
      ? totalCodeLength / parsed.codeBlocks.length 
      : 0;
    
    return {
      totalCodeBlocks: parsed.codeBlocks.length,
      languages,
      totalCodeLength,
      averageCodeLength,
    };
  }
}

// Export the service
export const codeParserService = new CodeParserService();
