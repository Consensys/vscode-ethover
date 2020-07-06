'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
/** globals - const */
const vscode = require('vscode');

function extensionConfig() {
    return vscode.workspace.getConfiguration('vscode-ethover');
}

function extension() {
    return vscode.extensions.getExtension('tintinweb.vscode-ethover');
}

module.exports = {
    extensionConfig: extensionConfig,
    extension: extension,
};