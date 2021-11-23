'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */

const vscode = require('vscode');
const settings = require('../settings');
const asmArr = require('./hover/asm.json');
const {TimeoutCache, makeCommandUri} = require('./utils');
const { EtherScanIo } = require('./etherscan');

const ADDRESS_STRING_SIZE = 42;  //0x{40} = 42
const ONE_ETH = 10**18;
const CACHE = new TimeoutCache(30*1000); //30sek cache


const chainConfigDefault = {
    "mainnet": {
        "name": "Mainnet",
        "enabled": true,
        "apiurl": "https://api.etherscan.io/api",
        "apikey": "YourApiKeyToken",
        "url": "https://etherscan.io/address/{address}"
    },
    "ropsten": {
        "name": "Ropsten",
        "enabled": true,
        "apiurl": "https://api-ropsten.etherscan.io/api",
        "apikey": "YourApiKeyToken",
        "url": "https://etherscan.io/address/{address}"
    },
    "kovan": {
        "name": "Kovan",
        "enabled": true,
        "apiurl": "https://api-kovan.etherscan.io/api",
        "apikey": "YourApiKeyToken",
        "url": "https://kovan.etherscan.io/address/{address}"
    },
    "rinkeby": {
        "name": "Rinkeby",
        "enabled": true,
        "apiurl": "https://api-rinkeby.etherscan.io/api",
        "apikey": "YourApiKeyToken",
        "url": "https://rinkeby.etherscan.io/address/{address}"
    },
    "polygon": {
        "name": "Polygon",
        "enabled": true,
        "apiurl": "https://api-polygon.etherscan.io/api",
        "apikey": "YourApiKeyToken",
        "url": "https://polygonscan.com/address/{address}"
    }
}


function editorGetAddressWordAtPosition(document, position, token){
    let range = document.getWordRangeAtPosition(position, /(0x[a-fA-F0-9]{40})(?:[^a-zA-Z0-9]|$)/);

    if (!range) {
        return;
    }

    //fix range to 40+2 bytes
    range = range.with({end: new vscode.Position(range.end.line, range.start.character + ADDRESS_STRING_SIZE)});

    const word = document.getText(range);

    if(token.isCancellationRequested){
        return;
    }

    return word;
}

function provideAddressActionHover(document, position, token) {
    
    let word = editorGetAddressWordAtPosition(document, position, token);
    if(!word){
        return;
    }

    let addressHover = `🌎  [Bloxy.info](https://bloxy.info/address/${word})
    |  [ByteCode](${makeCommandUri("vscode-ethover.account.getCode",{address:word, type:"byteCode"})})
    |  [Disassemble](${makeCommandUri("vscode-ethover.ui.getDisassembledByteCode",[word])})
    |  [VerifiedContract](${makeCommandUri("vscode-ethover.account.getCode",{address:word, type:"sourceCode"})})
    |  [Decompile](${makeCommandUri("vscode-ethover.account.getCode",{address:word, type:"byteCodeDecompiled"})})
    |  [eveem.org](${makeCommandUri("vscode-ethover.ui.eveem.getDecompiledSourceCode",[word])})
    |  [evm.js](${makeCommandUri("vscode-ethover.ui.evmjs.getDecompiledSourceCode",[word])})
    `;

    const contents = new vscode.MarkdownString(addressHover);
    contents.isTrusted = true;
    return new vscode.Hover(contents);
}



async function provideBalanceHover(document, position, token) {

    

    const hoverEnabled = settings.extensionConfig().hover.getBalance;

    if(hoverEnabled=="no"){
        return;
    }
    
    let address = editorGetAddressWordAtPosition(document, position, token);
    if(!address){
        return;
    }


    const chainConfig = {...chainConfigDefault, ...settings.extensionConfig().chain.config}; //merge default and user config

    let addressHover = [];
    let errors = [];
    let totalBalance = 0;

    for(let cconf of Object.values(chainConfig)){
        if(!cconf.enabled){
            continue;
        }
        let balance = CACHE.get(`balance_${cconf.name}`, address);
        //cconf.name, enabled

        try {
            
            if(balance === undefined){
                let etherscan = new EtherScanIo(cconf.apiKey, cconf.apiurl);
                balance = await etherscan.balanceForAddress(address);
                //balance = await etherscan.api.account.balance(address); //etherscanapi does not support custom chains
                balance = parseInt(balance);
                if(Number.isNaN(balance)){
                    throw new Error(balance); //is an errormsg
                }
                CACHE.set(`balance_${cconf.name}`, address, balance);
            }
            addressHover.push(`(${balance >0 ? '•' : ''}[${cconf.name}](${cconf.url.replace("{address}",address)}))`);
            totalBalance += balance;
        } catch(e) {
            errors.push(`Error: ${cconf.name} (\`${e}\`)`);
        }
    }

    addressHover.unshift(`∑ 💰 **${(totalBalance/ONE_ETH).toFixed(2)}** Ether `)
    if(errors.length){
        addressHover.push(`(\`rate limit error, try again\`)`);
    }

    if(hoverEnabled=="yes-ask"){
        addressHover.push(` |  ([settings](${makeCommandUri('workbench.action.openSettings', `vscode-ethover.hover.getBalance`)}))`);
    }
    

    const contents = new vscode.MarkdownString(addressHover.join(''));
    contents.isTrusted = true;
    return new vscode.Hover(contents);
}

function provideGenericEvmTraceAsmHover(document, position, token) {

    const range = document.getWordRangeAtPosition(position);
    if (!range) {
        return;
    }

    const word = document.getText(range);
    if(!word){
        return;
    }
    if(token.isCancellationRequested){
        return token;
    }

    let hoverinfo = asmArr[word.toLowerCase()];
    if(hoverinfo){
        let hoverText = `**${hoverinfo.description}**\n`;
        if(hoverinfo.instr_args && hoverinfo.instr_args.length){
            hoverText += `\n**Args**: ${hoverinfo.instr_args.join(', ')}  `;
        }
        if(hoverinfo.instr_returns && hoverinfo.instr_returns.length){
            hoverText += `\n**Returns**: ${hoverinfo.instr_returns.join(', ')}  `;
        }

        hoverText +=`\n\n**Category**: ${hoverinfo.instr_category}  `;
        if(hoverinfo.instr_fork){
            hoverText += `\n**Fork**: ${hoverinfo.instr_fork}  `;
        }

        hoverText += `\n\n**Stack**:\n`;
        hoverText += `\n → pops: ${hoverinfo.instr_pops}  `;
        hoverText += `\n → pushes: ${hoverinfo.instr_pushes}  `;

        const contents = new vscode.MarkdownString(hoverText);
        contents.isTrusted = true;
        return new vscode.Hover(contents);
    }
}



module.exports = {
    provideAddressActionHover,
    provideBalanceHover,
    provideGenericEvmTraceAsmHover
};