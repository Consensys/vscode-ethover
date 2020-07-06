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
    { language: "solidity" },
    { language: "javascript" },
    { language: "typescript" }
];

function openEvmTrace(uri){
    let fileUri = vscode.Uri.file(uri.concat('.evmtrace'));
    let evmTraceUri = fileUri.with({ scheme: 'evmtrace' });

    vscode.commands.executeCommand('vscode.open', evmTraceUri);
}

/** event funcs */
function onActivate(context) {

    const etherscan = new EtherScanIo(settings.extensionConfig().apikey);

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
                return hover.provideBalanceHover(document, position, token, etherscan);
            }
        })
    );

    context.subscriptions.push(
        vscode.languages.registerHoverProvider({language: 'evmtrace'}, {
            provideHover(document, position, token) {
                return hover.provideGenericEvmTraceAsmHover(document, position, token);
            }
        })
    );

    /* doc content provider */
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('evmtrace',  new evmTrace.EvmTraceContentProvider()));

    /* commands */

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getByteCode", async () => {
            vscode.window.showInputBox({
                prompt:"Ethereum Account Address",
                placeHolder:"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
            }).then(address => {
                etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                    vscode.workspace.openTextDocument({ content: resp.result, language: "evmbytecode" })
                        .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                }).catch(err => {
                    vscode.window.showWarningMessage(err.message);
                });
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getDisassembledByteCode", async (address) => {
            if(address){
                etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                    vscode.workspace.openTextDocument({ content: evmTrace.getPrintEvmDisassemblyView(resp.result), language: "evmtrace" })
                        .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)).then(editor => evmTrace.decorateEvmTrace(editor));
                }).catch(err => {
                    vscode.window.showWarningMessage(err);
                });
            } else {
                vscode.window.showInputBox({
                    prompt:"Ethereum Account Address",
                    placeHolder:"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
                }).then(address => {
                    etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                        vscode.workspace.openTextDocument({ content: evmTrace.getPrintEvmDisassemblyView(resp.result), language: "evmtrace" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    }).catch(err => {
                        vscode.window.showWarningMessage(err);
                    });
                });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.activeFile.getDisassembledByteCode", async () => {
            let activeEditor = vscode.window.activeTextEditor;
            if(!activeEditor ||!activeEditor.document) return;

            vscode.workspace.openTextDocument({ content: evmTrace.getPrintEvmDisassemblyView(activeEditor.document.getText()), language: "evmtrace" })
                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)).then(editor => evmTrace.decorateEvmTrace(editor));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.evmjs.getDecompiledSourceCode", async (address) => {
            if(address){
                etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                    vscode.workspace.openTextDocument({ content: evmTrace.getDecompiledByteCode(resp.result), language: "solidity" })
                        .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                }).catch(err => {
                    vscode.window.showWarningMessage(err);
                });
            } else {
                vscode.window.showInputBox({
                    prompt:"Ethereum Account Address",
                    placeHolder:"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
                }).then(address => {
                    etherscan.api.proxy.eth_getCode(address, 'latest').then(resp => {
                        vscode.workspace.openTextDocument({ content: evmTrace.getDecompiledByteCode(resp.result), language: "solidity" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    }).catch(err => {
                        vscode.window.showWarningMessage(err);
                    });
                });
            }
        })
    );


    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.activeFile.evmjs.getDecompiledByteCode", async () => {
            let activeEditor = vscode.window.activeTextEditor;
            if(!activeEditor ||!activeEditor.document) return;

            vscode.workspace.openTextDocument({ content: evmTrace.getDecompiledByteCode(activeEditor.document.getText()), language: "solidity" })
                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.ui.getVerifiedSource", async () => {
            vscode.window.showInputBox({
                prompt:"Ethereum Account Address",
                placeHolder:"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
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
                prompt:"Ethereum Account Address",
                placeHolder:"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
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
            if(address){
                eveem.eveemGetDecompiledSource(address).then(resp => {
                    vscode.workspace.openTextDocument({ content: resp, language: "python" })
                        .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                })
                .catch(err => {
                    vscode.window.showWarningMessage(err.message);
                });
            } else {
                vscode.window.showInputBox({
                    prompt:"Ethereum Account Address",
                    placeHolder:"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae"
                }).then(address => {
                    eveem.eveemGetDecompiledSource(address).then(resp => {
                        vscode.workspace.openTextDocument({ content: resp, language: "python" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    })
                    .catch(err => {
                        vscode.window.showWarningMessage(err.message);
                    });
                });
            }
        })
    );

    

    context.subscriptions.push(
        vscode.commands.registerCommand("vscode-ethover.account.getCode", async (args) => {
            if (!args) {
                return;
            }
            switch (args.type) {
                case 'byteCode':
                    etherscan.api.proxy.eth_getCode(args.address, 'latest').then(resp => {
                        vscode.workspace.openTextDocument({ content: resp.result, language: "evmbytecode" })
                            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                    }).catch(err => {
                        vscode.window.showWarningMessage(err);
                    });
                    break;
                case 'byteCodeDecompiled':
                    etherscan.api.proxy.eth_getCode(args.address, 'latest').then(resp => {
                        vscode.commands.executeCommand("vscode-decompiler.decompileShowContent", `${args.address}.evm`, resp.result)
                            .catch(err => {
                                vscode.window.showWarningMessage(`Please install and configure 'tintinweb.vscode-decompiler' to use this feature.`);
                            });
                    }).catch(err => {
                        vscode.window.showWarningMessage(err);
                    });
                    break;
                case 'sourceCode':
                    etherscan.getVerifiedSource(args.address)
                        .then(content => {
                            vscode.workspace.openTextDocument({ content: content, language: "solidity" })
                                .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                        })
                        .catch(err => {
                            vscode.window.showWarningMessage(err.message);
                        });
                    break;
            }
        })
    );

    //* events */

    let activeEditor;

    vscode.workspace.onDidChangeTextDocument(e => {
        if (e && e.document) {
            if(e.document.uri.scheme === 'evmtrace' || e.document.languageId=='evmtrace'){
                evmTrace.decorateEvmTrace(activeEditor);
            } else if (e.document.uri.scheme === 'evmbytecode' || e.document.languageId=='evmbytecode'){
                evmTrace.decorateEvmByteCode(activeEditor);
            } 
        }
    },  null, context.subscriptions);

    vscode.window.onDidChangeActiveTextEditor(e => {
        if (e && e.document) {
            if(e.document.uri.scheme === 'evmtrace' || e.document.languageId=='evmtrace'){
                activeEditor = e;
                evmTrace.decorateEvmTrace(e);
            } else if (e.document.uri.scheme === 'evmbytecode' || e.document.languageId=='evmbytecode'){
                activeEditor = e;
                evmTrace.decorateEvmByteCode(e);
            } 
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeTextEditorSelection(e => {
        if (!e || !e.textEditor || !e.selections) {
            return;
        }
        if (e.textEditor.document.uri.scheme === 'evmbytecode' || e.textEditor.document.languageId=='evmbytecode'){
            activeEditor = e.textEditor;
            evmTrace.decorateEvmByteCodeSelection(e.textEditor, e.selections[0].anchor);
        } 
        
    }, null, context.subscriptions);
}

/* exports */
exports.activate = onActivate;