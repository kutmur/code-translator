// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { detectLanguage, isProbablyPaste } from './languageDetector';

// Global variable to store the target language (current file's language)
let targetLang: string | null = null;

// Create output channel for logging
let outputChannel: vscode.OutputChannel;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "codetranslator" is now active!');

	// Create output channel for logging CodeTranslator activity
	outputChannel = vscode.window.createOutputChannel("CodeTranslator");
	outputChannel.appendLine('CodeTranslator extension activated');

	/**
	 * Function to detect and update the current file language (target language)
	 * This determines what language the pasted code should be translated into
	 */
	function updateTargetLanguage(): void {
		// Check if there's an active text editor
		const activeEditor = vscode.window.activeTextEditor;
		
		if (activeEditor) {
			// Get the language ID of the current document
			const currentLanguageId = activeEditor.document.languageId;
			
			// Update the target language
			targetLang = currentLanguageId;
			
			// Log to output panel
			outputChannel.appendLine(`Target language detected: ${targetLang}`);
			outputChannel.appendLine(`File: ${activeEditor.document.fileName}`);
			
			// Log to console for debugging
			console.log(`CodeTranslator: Target language set to '${targetLang}'`);
			console.log(`CodeTranslator: Active file is '${activeEditor.document.fileName}'`);
		} else {
			// No active editor, clear target language
			targetLang = null;
			outputChannel.appendLine('No active editor - target language cleared');
			console.log('CodeTranslator: No active editor, target language cleared');
		}
	}

	// Detect target language on activation
	updateTargetLanguage();

	// Listen for active editor changes to update target language
	const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => {
		updateTargetLanguage();
	});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('codetranslator.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from CodeTranslator!');
	});

	// Subscribe to text document changes to detect paste operations
	const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
		try {
			// Check if this looks like a paste operation
			if (!isProbablyPaste(event.contentChanges)) {
				return;
			}

			// Ensure we have valid content changes
			if (!event.contentChanges || event.contentChanges.length === 0) {
				return;
			}

			// Get the pasted text from the first (and only) content change
			const pastedText = event.contentChanges[0].text;
			
			// Skip if the pasted text is empty or just whitespace
			if (!pastedText || pastedText.trim().length === 0) {
				return;
			}
			
			// Detect the language of the pasted code
			const detectedLanguage = detectLanguage(pastedText);
			
			if (detectedLanguage) {
				// Get the current file's language (target language) with safety check
				// Update target language using centralized logic
				updateTargetLanguage();
				
				// Retrieve the updated target language
				const currentLanguage = targetLang;
				
				// Log detection results to output panel
				outputChannel.appendLine(`--- Paste Detection ---`);
				outputChannel.appendLine(`Detected source language: ${detectedLanguage}`);
				outputChannel.appendLine(`Target language: ${targetLang || 'unknown'}`);
				
				// Show detection result to user
				if (detectedLanguage === targetLang) {
					vscode.window.showInformationMessage(
						`✅ Detected Language: ${detectedLanguage} (matches current file)`
					);
					outputChannel.appendLine(`Status: Source and target languages match - no translation needed`);
				} else {
					vscode.window.showInformationMessage(
						`🔍 Detected Language: ${detectedLanguage} (target: ${targetLang || 'unknown'})`
					);
					outputChannel.appendLine(`Status: Translation will be needed from ${detectedLanguage} to ${targetLang || 'unknown'}`);
				}
				
				// Log for debugging purposes
				console.log(`CodeTranslator: Detected language '${detectedLanguage}' for pasted code`);
				console.log(`CodeTranslator: Target language is '${targetLang}'`);
			} else {
				// Language couldn't be detected with confidence
				outputChannel.appendLine(`--- Paste Detection ---`);
				outputChannel.appendLine(`Could not detect language of pasted code`);
				outputChannel.appendLine(`Target language: ${targetLang || 'unknown'}`);
				console.log('CodeTranslator: Could not detect language of pasted code');
			}
		} catch (error) {
			console.error('CodeTranslator: Error processing text change event:', error);
		}
	});

	// Add all disposables to the context
	context.subscriptions.push(
		disposable,
		onDidChangeTextDocument,
		onDidChangeActiveTextEditor,
		outputChannel
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
