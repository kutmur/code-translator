// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { detectLanguage, isProbablyPaste } from './languageDetector';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "codetranslator" is now active!');

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
				// Get the current file's language for comparison
				const currentLanguage = event.document.languageId;
				
				// Show detection result to user
				if (detectedLanguage === currentLanguage) {
					vscode.window.showInformationMessage(
						`✅ Detected Language: ${detectedLanguage} (matches current file)`
					);
				} else {
					vscode.window.showInformationMessage(
						`🔍 Detected Language: ${detectedLanguage} (current file: ${currentLanguage})`
					);
				}
				
				// Log for debugging purposes
				console.log(`CodeTranslator: Detected language '${detectedLanguage}' for pasted code`);
				console.log(`CodeTranslator: Current file language is '${currentLanguage}'`);
			} else {
				// Language couldn't be detected with confidence
				console.log('CodeTranslator: Could not detect language of pasted code');
			}
		} catch (error) {
			console.error('CodeTranslator: Error processing text change event:', error);
		}
	});

	// Add all disposables to the context
	context.subscriptions.push(onDidChangeTextDocument);
}

// This method is called when your extension is deactivated
export function deactivate() {}
