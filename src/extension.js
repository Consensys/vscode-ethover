'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */



/** imports */
const vscode = require("vscode");
const settings = require('./settings');
const { EtherScanIo } = require('./features/etherscan');
const hover = require('./features/hover');
const eveem = require('./features/eveem');
const evmTrace = require('./features/evm');


const DOC_SELECTOR = [
    { language: "markdown" },
    { language: "solidity" },
    { language: "javascript" },
    { language: "typescript" },
    { language: "python" },
];

function openEvmTrace(uri) {
    let fileUri = vscode.Uri.file(uri.concat('.evmtrace'));
    let evmTraceUri = fileUri.with({ scheme: 'evmtrace' });

    vscode.commands.executeCommand('vscode.open', evmTraceUri);
}

/** event funcs */
function onActivate(context) {

    const etherscan = new EtherScanIo(settings.extensionConfig().default.apikey, settings.extensionConfig().default.apiurl);

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(DOC_SELECTOR, {
            provideHover(document, position, token) {
                return hover.provideAddressActionHover(document, position, token, etherscan);
            }
        })
    );

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(DOC_SELECTOR, {
            provideHover(document, position, token) {
                return hover.provideBalanceHover(document, position, token);
            }
        })
    );

    context.subscriptions.push(
        vscode.languages.registerHoverProvider({ language: 'evmtrace' }, {
            provideHover(document, position, token) {
                return hover.provideGenericEvmTraceAsmHover(document, position, token);
            }
        })
    );

    /* doc content provider */
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('evmtrace', new evmTrace.EvmTraceContentProvider()));

    /* commands */

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getByteCode", async () => {
            vscode.window.showInputBox({
                prompt: "Ethereum Account Address",
                placeHolder: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
            }).then(address => {
                etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                    vscode.workspace.openTextDocument({ content: resp.result, language: "evmbytecode" })
                        .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                }).catch(err => {
                    vscode.window.showWarningMessage(err);
                });
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getDisassembledByteCode", async (address) => {

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `ETHover: disassembling ...`,
                cancellable: false
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });

                progress.report({ increment: 10 });

                if (address) {
                    await etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                        progress.report({ increment: 20 });
                        vscode.workspace.openTextDocument({ content: evmTrace.getPrintEvmDisassemblyView(resp.result), language: "evmtrace" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)).then(editor => evmTrace.decorateEvmTrace(editor));
                    }).catch(err => {
                        vscode.window.showWarningMessage(err);
                    });
                } else {
                    progress.report({ increment: 10, message:"awaiting user input" });
                    await vscode.window.showInputBox({
                        prompt: "Ethereum Account Address",
                        placeHolder: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
                    }).then(address => {
                        progress.report({ increment: 10, message:"fetching bytecode" });
                        etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                            progress.report({ increment: 20, message:"" });
                            vscode.workspace.openTextDocument({ content: evmTrace.getPrintEvmDisassemblyView(resp.result), language: "evmtrace" })
                                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                        }).catch(err => {
                            vscode.window.showWarningMessage(err);
                        });
                    });
                }

            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.activeFile.getDisassembledByteCode", async () => {
            let activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document) return;

            vscode.workspace.openTextDocument({ content: evmTrace.getPrintEvmDisassemblyView(activeEditor.document.getText()), language: "evmtrace" })
                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)).then(editor => evmTrace.decorateEvmTrace(editor));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.evmjs.getDecompiledSourceCode", async (address) => {

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `ETHover: decompiling ...`,
                cancellable: false
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });

                progress.report({ increment: 10 });

                if (address) {
                    progress.report({ increment: 10 });
                    await etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                        progress.report({ increment: 20 });
                        vscode.workspace.openTextDocument({ content: evmTrace.getDecompiledByteCode(resp.result), language: "solidity" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    }).catch(err => {
                        if(err.message){
                            vscode.window.showErrorMessage(`Decompiler returned error: ${err.message}`);
                        } else {
                            vscode.window.showWarningMessage(err);
                        }
                    });
                } else {
                    progress.report({ increment: 5, message:"awaiting user input" });
                    await vscode.window.showInputBox({
                        prompt: "Ethereum Account Address",
                        placeHolder: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
                    }).then(address => {
                        progress.report({ increment: 10, message:"fetching bytecode" });
                        etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                            progress.report({ increment: 10, message:"" });
                            vscode.workspace.openTextDocument({ content: evmTrace.getDecompiledByteCode(resp.result), language: "solidity" })
                                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                        }).catch(err => {
                            if(err.message){
                                vscode.window.showErrorMessage(`Decompiler returned error: ${err.message}`);
                            } else {
                                vscode.window.showWarningMessage(err);
                            }
                        });
                    });
                }

            });
        })
    );


    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.activeFile.evmjs.getDecompiledByteCode", async () => {
            let activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document) return;

            vscode.workspace.openTextDocument({ content: evmTrace.getDecompiledByteCode(activeEditor.document.getText()), language: "solidity" })
                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getVerifiedSource", async () => {
            vscode.window.showInputBox({
                prompt: "Ethereum Account Address",
                placeHolder: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
            }).then(address => {
                etherscan.getVerifiedSource(address)
                    .then(content => {
                        vscode.workspace.openTextDocument({ content: content, language: "solidity" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    })
                    .catch(err => {
                        vscode.window.showWarningMessage(err.message);
                    });
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getDecompiledSourceCode", async () => {
            vscode.window.showInputBox({
                prompt: "Ethereum Account Address",
                placeHolder: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
            }).then(address => {
                etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                    vscode.commands.executeCommand("vscode-decompiler.decompileShowContent", `${address}.evm`, resp.result)
                        .catch(err => {
                            vscode.window.showWarningMessage(`Please install and configure 'tintinweb.vscode-decompiler' to use this feature.`);
                        });
                }).catch(err => {
                    vscode.window.showWarningMessage(err);
                });
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.eveem.getDecompiledSourceCode", async (address) => {

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `ETHover: fetching contract from eveem.org ...`,
                cancellable: false
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });

                progress.report({ increment: 10 });

                if (address) {
                    await eveem.eveemGetDecompiledSource(address).then(resp => {
                        progress.report({ increment: 20 });
                        vscode.workspace.openTextDocument({ content: resp, language: "python" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    })
                        .catch(err => {
                            vscode.window.showWarningMessage(err.message);
                        });
                } else {
                    progress.report({ increment: 10, message:"awaiting user input" });
                    vscode.window.showInputBox({
                        prompt: "Ethereum Account Address",
                        placeHolder: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
                    }).then(address => {
                        progress.report({ increment: 10, message:"fetching source" });
                        eveem.eveemGetDecompiledSource(address).then(resp => {
                            progress.report({ increment: 20, message:"" });
                            vscode.workspace.openTextDocument({ content: resp, language: "python" })
                                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                        }).catch(err => {
                            vscode.window.showWarningMessage(err.message);
                        });
                    });
                }

            });
        })
    );



    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.account.getCode", async (args) => {
            if (!args) {
                return;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `ETHover: fetching contract ...`,
                cancellable: false
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });

                progress.report({ increment: 10, message:args.type });

                switch (args.type) {
                    case 'byteCode':
                        await etherscan.api.proxy.eth_getCode(args.address, 'latest').then(resp => {
                            progress.report({ increment: 20 });
                            vscode.workspace.openTextDocument({ content: resp.result, language: "evmbytecode" })
                                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                        }).catch(err => {
                            vscode.window.showWarningMessage(err);
                        });
                        break;
                    case 'byteCodeDecompiled':
                        await etherscan.api.proxy.eth_getCode(args.address, 'latest').then(resp => {
                            progress.report({ increment: 20 });
                            vscode.commands.executeCommand("vscode-decompiler.decompileShowContent", `${args.address}.evm`, resp.result)
                                .catch(err => {
                                    vscode.window.showWarningMessage(`Please install and configure 'tintinweb.vscode-decompiler' to use this feature.`);
                                });
                        }).catch(err => {
                            vscode.window.showWarningMessage(err);
                        });
                        break;
                    case 'sourceCode':
                        await etherscan.getVerifiedSource(args.address)
                            .then(content => {
                                progress.report({ increment: 20 });
                                vscode.workspace.openTextDocument({ content: content, language: "solidity" })
                                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                            })
                            .catch(err => {
                                vscode.window.showWarningMessage(err.message);
                            });
                        break;
                }
            });
        })
    );

    //* events */

    let activeEditor;

    vscode.workspace.onDidChangeTextDocument(e => {
        if (e && e.document) {
            if (e.document.uri.scheme === 'evmtrace' || e.document.languageId == 'evmtrace') {
                evmTrace.decorateEvmTrace(activeEditor);
            } else if (e.document.uri.scheme === 'evmbytecode' || e.document.languageId == 'evmbytecode') {
                evmTrace.decorateEvmByteCode(activeEditor);
            }
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveTextEditor(e => {
        if (e && e.document) {
            if (e.document.uri.scheme === 'evmtrace' || e.document.languageId == 'evmtrace') {
                activeEditor = e;
                evmTrace.decorateEvmTrace(e);
            } else if (e.document.uri.scheme === 'evmbytecode' || e.document.languageId == 'evmbytecode') {
                activeEditor = e;
                evmTrace.decorateEvmByteCode(e);
            }
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeTextEditorSelection(e => {
        if (!e || !e.textEditor || !e.selections) {
            return;
        }
        if (e.textEditor.document.uri.scheme === 'evmbytecode' || e.textEditor.document.languageId == 'evmbytecode') {
            activeEditor = e.textEditor;
            evmTrace.decorateEvmByteCodeSelection(e.textEditor, e.selections[0].anchor);
        }

    }, null, context.subscriptions);
}

/* exports */
exports.activate = onActivate;