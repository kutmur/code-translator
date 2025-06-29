/**
 * Language Detection Module for CodeTranslator Extension
 * 
 * This module provides functionality to detect the programming language
 * of code snippets based on keywords, syntax patterns, and common constructs.
 */

import * as vscode from 'vscode';

/**
 * Language detection rules interface
 */
interface LanguageRule {
    /** VS Code language identifier */
    id: string;
    /** Array of keyword patterns to match */
    keywords: string[];
    /** Array of regex patterns to match */
    patterns: RegExp[];
    /** Weight/priority of this language (higher = more specific) */
    priority: number;
}

/**
 * Language detection rules ordered by specificity and common usage
 */
const LANGUAGE_RULES: LanguageRule[] = [
    // TypeScript - Check before JavaScript as it's more specific
    {
        id: 'typescript',
        keywords: ['interface', 'type', 'enum', 'namespace', 'declare', 'abstract'],
        patterns: [
            /:\s*(string|number|boolean|any|void|unknown|never)\b/,
            /\w+\s*:\s*\w+(\[\])?(\s*\|\s*\w+)*\s*[=;,)]/,
            /<T>/,
            /export\s+(interface|type|enum|namespace)/,
            /as\s+\w+/
        ],
        priority: 90
    },

    // Python - High priority due to distinctive indentation and keywords
    {
        id: 'python',
        keywords: ['def', 'import', 'from', 'class', 'if __name__', 'elif', 'pass', 'lambda', 'yield', 'with'],
        patterns: [
            /^[ \t]+(def|class|if|for|while|try|except|with)\s/m,
            /import\s+\w+(\.\w+)*/,
            /from\s+\w+\s+import/,
            /:\s*$\n[ \t]+/m,
            /#.*$/m,
            /'''[\s\S]*?'''/,
            /"""[\s\S]*?"""/
        ],
        priority: 85
    },

    // Java - Distinctive package and class structure
    {
        id: 'java',
        keywords: ['public class', 'private', 'protected', 'static', 'final', 'extends', 'implements', 'package'],
        patterns: [
            /public\s+(static\s+)?void\s+main\s*\(/,
            /import\s+java\./,
            /package\s+[\w.]+;/,
            /public\s+class\s+\w+/,
            /System\.out\.print/,
            /@\w+/
        ],
        priority: 80
    },

    // C++ - System includes and namespace std
    {
        id: 'cpp',
        keywords: ['#include', 'std::', 'namespace', 'using namespace', 'template', 'class', 'struct'],
        patterns: [
            /#include\s*<[\w.]+>/,
            /std::/,
            /using\s+namespace\s+std/,
            /int\s+main\s*\(/,
            /template\s*<.*>/,
            /cout\s*<<|cin\s*>>/,
            /#pragma/
        ],
        priority: 85
    },

    // C - System includes without C++ features
    {
        id: 'c',
        keywords: ['#include', 'int main', 'printf', 'scanf', 'malloc', 'free'],
        patterns: [
            /#include\s*<stdio\.h>/,
            /#include\s*<stdlib\.h>/,
            /int\s+main\s*\(/,
            /printf\s*\(/,
            /scanf\s*\(/,
            /\*[\s\S]*?\*\//
        ],
        priority: 70
    },

    // Go - Distinctive package and func syntax
    {
        id: 'go',
        keywords: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface'],
        patterns: [
            /package\s+main/,
            /import\s*\(/,
            /func\s+main\s*\(/,
            /func\s+\w+\s*\([^)]*\)\s*\w*/,
            /fmt\./,
            /:=/
        ],
        priority: 85
    },

    // Rust - Distinctive syntax and keywords
    {
        id: 'rust',
        keywords: ['fn', 'let', 'mut', 'use', 'mod', 'pub', 'struct', 'enum', 'impl', 'trait'],
        patterns: [
            /fn\s+main\s*\(/,
            /use\s+std::/,
            /let\s+mut/,
            /println!\s*\(/,
            /&str|&mut/,
            /match\s+\w+\s*\{/
        ],
        priority: 85
    },

    // C# - .NET specific patterns
    {
        id: 'csharp',
        keywords: ['using System', 'namespace', 'class', 'static void Main', 'public', 'private', 'protected'],
        patterns: [
            /using\s+System/,
            /static\s+void\s+Main/,
            /Console\./,
            /public\s+static\s+void/,
            /\[.*\]/,
            /get\s*;\s*set\s*;/
        ],
        priority: 80
    },

    // PHP - Distinctive opening tag and syntax
    {
        id: 'php',
        keywords: ['<?php', 'function', 'class', 'echo', 'print', '$'],
        patterns: [
            /<\?php/,
            /\$\w+/,
            /echo\s+/,
            /function\s+\w+\s*\(/,
            /->/,
            /\$this->/
        ],
        priority: 90
    },

    // Ruby - Distinctive syntax patterns
    {
        id: 'ruby',
        keywords: ['def', 'class', 'module', 'require', 'puts', 'print', 'end'],
        patterns: [
            /def\s+\w+/,
            /class\s+\w+/,
            /require\s+['"`]/,
            /puts\s+/,
            /\|\w+\|/,
            /\.each\s+do/
        ],
        priority: 75
    },

    // Shell/Bash - Shebang and common commands
    {
        id: 'shellscript',
        keywords: ['#!/bin/bash', '#!/bin/sh', 'echo', 'if', 'fi', 'then', 'else'],
        patterns: [
            /^#!/,
            /echo\s+/,
            /if\s*\[.*\]/,
            /\$\{?\w+\}?/,
            /;\s*then/,
            /\|\s*\w+/
        ],
        priority: 75
    },

    // JavaScript - Must come after TypeScript check
    {
        id: 'javascript',
        keywords: ['function', 'const', 'let', 'var', 'import', 'export', 'class', 'extends'],
        patterns: [
            /function\s+\w+\s*\(/,
            /const\s+\w+\s*=/,
            /let\s+\w+\s*=/,
            /=>\s*{?/,
            /import\s+.*from/,
            /export\s+(default\s+)?/,
            /console\./
        ],
        priority: 60
    },

    // JSON - Simple structure check
    {
        id: 'json',
        keywords: [],
        patterns: [
            /^\s*\{[\s\S]*\}\s*$/,
            /^\s*\[[\s\S]*\]\s*$/,
            /"[\w\s]+":\s*"[\w\s]*"/,
            /"[\w\s]+":\s*\d+/,
            /"[\w\s]+":\s*(true|false|null)/
        ],
        priority: 95
    },

    // HTML - Tag-based detection
    {
        id: 'html',
        keywords: ['<!DOCTYPE', '<html', '<head', '<body', '<div', '<span'],
        patterns: [
            /<!DOCTYPE\s+html/i,
            /<html[\s>]/i,
            /<\/?\w+[^>]*>/,
            /<\w+\s+[\w-]+=["'].*?["']/
        ],
        priority: 85
    },

    // CSS - Style rules
    {
        id: 'css',
        keywords: [],
        patterns: [
            /[\w-]+\s*:\s*[\w\s,#()%-]+;/,
            /\.[\w-]+\s*\{/,
            /#[\w-]+\s*\{/,
            /@media\s*\(/,
            /@import\s+/
        ],
        priority: 80
    },

    // SQL - Database queries
    {
        id: 'sql',
        keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'TABLE'],
        patterns: [
            /SELECT\s+[\w*,\s]+\s+FROM/i,
            /INSERT\s+INTO/i,
            /UPDATE\s+\w+\s+SET/i,
            /CREATE\s+TABLE/i,
            /DELETE\s+FROM/i,
            /WHERE\s+[\w\s=<>!']+/i
        ],
        priority: 85
    }
];

/**
 * Detects the programming language of a given code snippet
 * 
 * @param code - The code snippet to analyze
 * @returns The detected language identifier or null if no confident match found
 */
export function detectLanguage(code: string): string | null {
    if (!code || code.trim().length === 0) {
        return null;
    }

    // Normalize the code for analysis
    const normalizedCode = code.trim();
    const lowerCode = normalizedCode.toLowerCase();
    
    // Track matches for each language
    const languageScores = new Map<string, number>();

    for (const rule of LANGUAGE_RULES) {
        let score = 0;

        // Check keywords
        for (const keyword of rule.keywords) {
            if (lowerCode.includes(keyword.toLowerCase())) {
                score += 10;
            }
        }

        // Check regex patterns
        for (const pattern of rule.patterns) {
            if (pattern.test(normalizedCode)) {
                score += 15;
            }
        }

        // Apply priority weighting
        score = score * (rule.priority / 100);

        if (score > 0) {
            languageScores.set(rule.id, score);
        }
    }

    // Find the language with the highest score
    if (languageScores.size === 0) {
        return null;
    }

    let bestLanguage = '';
    let bestScore = 0;

    for (const [language, score] of languageScores) {
        if (score > bestScore) {
            bestScore = score;
            bestLanguage = language;
        }
    }

    // Only return a result if we have reasonable confidence
    // This threshold can be adjusted based on testing
    return bestScore >= 10 ? bestLanguage : null;
}

/**
 * Checks if a text change event likely represents a paste operation
 * 
 * @param contentChanges - Array of text document content changes
 * @returns True if the change appears to be a paste operation
 */
export function isProbablyPaste(contentChanges: readonly vscode.TextDocumentContentChangeEvent[]): boolean {
    // Safety check for undefined or empty changes
    if (!contentChanges || contentChanges.length === 0) {
        return false;
    }

    // Heuristic: A paste is likely a single change with substantial text
    // containing newlines (multi-line paste) or significant length
    if (contentChanges.length !== 1) {
        return false;
    }

    const change = contentChanges[0];
    const text = change.text;

    // Safety check for undefined text
    if (typeof text !== 'string') {
        return false;
    }

    // Check if it's a substantial paste (either multi-line or long single line)
    const hasNewlines = text.includes('\n');
    const isLongText = text.length > 50;
    const hasMultipleWords = text.split(/\s+/).length > 3;

    return hasNewlines || (isLongText && hasMultipleWords);
}
