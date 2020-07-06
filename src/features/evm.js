'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
const vscode = require("vscode");
const { EVM, Transaction } = require("evm");
const { table } = require("table");

const EVMTRACE_STYLE = {
    stack: createSimpleStyle("GoldenRod", "DarkGoldenRod"),
    memory: createSimpleStyle("YellowGreen", "DarkGreen"),
    storage: createSimpleStyle("YellowGreen", "DarkGreen",undefined,"bold"),
    jmp: createSimpleStyle(undefined, undefined, "Orange", undefined, undefined, true),
    jmpdst: createSimpleStyle(undefined, undefined, "Orange", undefined),
    logic: createSimpleStyle("DeepSkyBlue", "SteelBlue"),
    arithm: createSimpleStyle("Turquoise", "DarkTurquoise"),
    log: createSimpleStyle("Grey", "DarkGrey"),
    system: createSimpleStyle("Tomato", "FireBrick", undefined, "bold"),
    env: createSimpleStyle("IndianRed", "LightCoral"),
    invalid: createSimpleStyle("Grey", "DarkGrey"),
    default: createSimpleStyle()
};
let SEL_STYLE;
let evmByteCodeStyles = {};

const INSTR_CAT_REX = {
    stack: /\b(?:PUSH[\d]+|POP[\d]*|SWAP[\d]+|DUP[\d]*)\b/g,
    memory: /\b(?:MSTORE\d?|MLOAD\d?|SLOAD|SSTORE|MSIZE)\b/g,
    storage: /\b(?:SLOAD|SSTORE)\b/g,
    jmp: /\b(?:JUMP|JUMPI)\b/g,
    jmpdst: /\b(?:JUMPDEST)\b/g,
    logic: /\b(?:EQ|ISZERO|NOT|AND|OR|XOR|BYTE|LT|GT|SLT|SGT|SHR|SHL|SAR)\b/g,
    arithm: /\b(?:ADD(MOD)?|SUB|MUL(MOD)?|(S)?DIV|(S)?MOD|EXP|SIGNEXTEND)\b/g,
    log: /\b(?:LOG\d?)\b/g,
    system: /\b(?:STOP|SELFDESTRUCT|REVERT|[^\s]*CALL(CODE)?|CREATE\d*|RETURN|SHA3)\b/g,
    env: /\b(?:[^\s]*CALLDATA[^\s]*|RETURNDATA[^\s]*|EXTCODE(SIZE|COPY|HASH)|ADDRESS|BALANCE|ORIGIN|CALLER|CALLVALUE|CODESIZE|CODECOPY|GASPRICE|GAS)\b/g,
    invalid: /\b(?:INVALID)\b/g
};

function getInstructionType(instr) {
    Object.values(INSTR_CAT_REX).forEach(e => e.lastIndex = 0); // reset global regex indexes

    if (INSTR_CAT_REX.stack.test(instr)) {
        return "stack";
    } else if (INSTR_CAT_REX.memory.test(instr)) {
        return "memory";
    } else if (INSTR_CAT_REX.storage.test(instr)) {
        return "storage";
    } else if (INSTR_CAT_REX.jmp.test(instr)) {
        return "jmp";
    } else if (INSTR_CAT_REX.jmpdst.test(instr)) {
        return "jmpdst";
    } else if (INSTR_CAT_REX.logic.test(instr)) {
        return "logic";
    } else if (INSTR_CAT_REX.arithm.test(instr)) {
        return "arithm";
    } else if (INSTR_CAT_REX.env.test(instr)) {
        return "env";
    } else if (INSTR_CAT_REX.log.test(instr)) {
        return "log";
    } else if (INSTR_CAT_REX.system.test(instr)) {
        return "system";
    } else if (INSTR_CAT_REX.invalid.test(instr)) {
        return "invalid";
    }
    return "default";
}
function isASCII(str) {
    return /^[\x20-\x7F]*$/.test(str);
}

function getDecompiledByteCode(bytecode) {

    return new EVM(bytecode).decompile();
}

function getAnnotatedEvmDisassembly(bytecode) {
    const evm = new EVM(bytecode);
    let tableData = [];

    let i = 0, totalGas = 0;
    for (let op of evm.getOpcodes()) {
        totalGas += op.fee;

        let len = 1;
        let data = "";
        let dataAscii = "";
        let funcName = "";

        if (op.pushData) {


            len += op.pushData.byteLength;
            data = "0x" + Array.from(op.pushData, function (byte) {
                return ('0' + (byte & 0xFF).toString(16)).slice(-2);
            }).join('');

            //check for PUSH4 funcsig
            if (op.name == "PUSH4") {
                let transaction = new Transaction();
                transaction.setInput(data);
                funcName = transaction.getFunction();
            }

            if (isASCII(op.pushData.toString())) {
                dataAscii = op.pushData.toString();
            }
        }
        let dataLine = `${data}${dataAscii ? `   \`${dataAscii}\`` : ''}`;
        if (funcName) {
            dataLine = `${dataLine} → \`${funcName}\``;
        }

        let name = op.name;
        if (op.name == "JUMP" || op.name == "JUMPI") {
            //name += " ⬆";
        } else if (op.name == "JUMPDEST") {
            //name += " ⬇";
        }

        tableData.push([i.toString(), op.pc.toString() + ` (0x${op.pc.toString(16)})`, len, op.fee.toString(), totalGas.toString(), `0x${op.opcode.toString(16)}`, name, dataLine]);
        ++i;
    }
    return tableData;
}

function getPrintEvmDisassemblyView(bytecode) {

    const header = ["Step", "Loc", "Len", "Gas", "Consumed", "Opcode", "Instruction", "Data"];
    const tableData = getAnnotatedEvmDisassembly(bytecode);

    const config = {
        drawHorizontalLine: (index, size) => {
            return index === 0 || index === 1 || index === size;
        },
        columns: {
            0: {
                alignment: 'right',
            },
            2: {
                alignment: 'right',
            },
            3: {
                alignment: 'right',
            },
            4: {
                alignment: 'right',
            },
        }
    };

    let asmTable = table([header, ...tableData], config);
    return '\n' + asmTable;
}

function createSimpleStyle(color, lightColor, borderColor, bold, before, notWholeLine, backgroundColor) {
    return vscode.window.createTextEditorDecorationType({
        fontWeight: bold,
        borderWidth: borderColor ? "1px" : undefined,
        borderStyle: borderColor ? 'dotted' : undefined,
        overviewRulerColor: color,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            // this color will be used in light color themes
            color: lightColor,
            borderColor: borderColor ? lightColor : undefined,
            backgroundColor: backgroundColor
        },
        dark: {
            // this color will be used in dark color themes
            color: color,
            borderColor: borderColor ? borderColor : undefined,
            backgroundColor: backgroundColor
        },
        before: before,
        isWholeLine: notWholeLine ? false : true
    });
}

async function decorateEvmTrace(editor) {
    if (!editor) {
        return;
    }
    Object.values(INSTR_CAT_REX).forEach(e => e.lastIndex = 0); // reset global regex indexes
    //stack
    _decorateEvmTrace(editor, INSTR_CAT_REX.stack, EVMTRACE_STYLE.stack);
    //jmp
    _decorateEvmTrace(editor, INSTR_CAT_REX.jmp, EVMTRACE_STYLE.jmp);
    /**
     * 
     * {
        contentText:"⬆",
        fontStyle: "normal",
        color: "Orange"
    }
     */
    _decorateEvmTrace(editor, INSTR_CAT_REX.jmpdst, EVMTRACE_STYLE.jmpdst);
    /**
     * {
        contentText:"⬇",
        fontStyle: "normal",
        color: "Orange"
    }
     */
    //memory
    _decorateEvmTrace(editor, INSTR_CAT_REX.memory, EVMTRACE_STYLE.memory);
    //control + logic/compare
    _decorateEvmTrace(editor, INSTR_CAT_REX.logic, EVMTRACE_STYLE.logic);
    //arithm.
    _decorateEvmTrace(editor, INSTR_CAT_REX.arithm, EVMTRACE_STYLE.arithm);

    //env
    _decorateEvmTrace(editor, INSTR_CAT_REX.env, EVMTRACE_STYLE.env);
    //BLOCKHASH|COINBASE|TIMESTAMP|NUMBER|DIFFICULTY|GASLIMIT
    //log
    _decorateEvmTrace(editor, INSTR_CAT_REX.log, EVMTRACE_STYLE.log);
    //system
    _decorateEvmTrace(editor, INSTR_CAT_REX.system, EVMTRACE_STYLE.system);
    _decorateEvmTrace(editor, INSTR_CAT_REX.invalid, EVMTRACE_STYLE.invalid);


    //text
    //_decorateEvmTrace(editor, /\b(?:\`.*\`)\b/g, createSimpleStyle("Blue", true));DarkTurquoise

    //header bold:
    _decorateEvmTrace(editor, /\b(?:Consumed)\b/g, createSimpleStyle(undefined, undefined, undefined, "bold"));
}

function _decorateEvmTrace(editor, regEx, decoStyle) {
    var decos = [];
    const text = editor.document.getText();

    let match;
    while (match = regEx.exec(text)) {
        var startPos = editor.document.positionAt(match.index);
        var endPos = editor.document.positionAt(match.index + match[0].trim().length);

        var decoration = {
            range: new vscode.Range(startPos, endPos),
        };
        decos.push(decoration);
    }

    editor.setDecorations(decoStyle, decos);
}


async function decorateEvmByteCode(editor) {
    if (!editor) {
        return;
    }

    Object.values(evmByteCodeStyles).forEach(s => s.dispose()); // clear all decos
    evmByteCodeStyles = {
        stack: createSimpleStyle("GoldenRod", "DarkGoldenRod", undefined, undefined, undefined, true),
        memory: createSimpleStyle("YellowGreen", "DarkGreen", undefined, undefined, undefined, true),
        storage: createSimpleStyle("YellowGreen", "DarkGreen", undefined, "bold", undefined, true),
        jmp: createSimpleStyle("Orange", "Orange", undefined, undefined, undefined, true),
        jmpdst: createSimpleStyle("Orange", "Orange", undefined, "bold", undefined, true),
        logic: createSimpleStyle("DeepSkyblue", "SteelBlue", undefined, undefined, undefined, true),
        arithm: createSimpleStyle("DarkTurquoise", "DarkTurquoise", undefined, undefined, undefined, true),
        log: createSimpleStyle("Grey", "DarkGrey", undefined, undefined, undefined, true),
        system: createSimpleStyle("Tomato", "FireBrick", undefined, undefined, undefined, true),
        env: createSimpleStyle("IndianRed", "LightCoral", undefined, undefined, undefined, true),
        invalid: createSimpleStyle("Grey", "DarkGrey", undefined, undefined, undefined, true),
        default: createSimpleStyle()
    };

    const byteCode = editor.document.getText();
    const tableData = getAnnotatedEvmDisassembly(byteCode);

    const START = 2; //skip 0x

    let decos = {};

    let index = START;
    for (let row of tableData) {
        var startPos = editor.document.positionAt(index);
        index += parseInt(row[2]) * 2;
        var endPos = editor.document.positionAt(index);

        let hoverMessage = `(${row[5]}) **${row[6]}** ${row[7]}

**Step**: ${row[0]}  
**Loc**: ${row[1]}  
**Len**: ${row[2]}  
**Gas**: ${row[3]}  
**Consumed**: ${row[4]}  

[Disassemble](command:vscode-ethover.activeFile.getDisassembledByteCode) | [Decompile: evm.js](command:vscode-ethover.activeFile.evmjs.getDecompiledByteCode)`;

        let contents = new vscode.MarkdownString(hoverMessage);
        contents.isTrusted = true;


        var decoration = {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: contents
        };

        let decoType = getInstructionType(row[6]);

        if (!decos[decoType]) {
            decos[decoType] = [];
        }
        decos[decoType].push(decoration);
    }


    for (const [decoType, decoList] of Object.entries(decos)) {
        if(evmByteCodeStyles[decoType]){
            editor.setDecorations(evmByteCodeStyles[decoType], decoList);
        }
    }


}

class EvmTraceContentProvider {

    constructor() {
        this._onDidChange = new vscode.EventEmitter();
        if (EvmTraceContentProvider.s_instance) {
            EvmTraceContentProvider.s_instance.dispose();
        }
        EvmTraceContentProvider.s_instance = this;
    }

    static get instance() {
        return EvmTraceContentProvider.s_instance;
    }

    dispose() {
        this._onDidChange.dispose();
        if (EvmTraceContentProvider.s_instance) {
            EvmTraceContentProvider.s_instance.dispose();
            EvmTraceContentProvider.s_instance = null;
        }
    }

    provideTextDocumentContent(uri) {
        return new Promise(async (resolve, reject) => {
            this.getBuffer(uri).then(content => resolve(getPrintEvmDisassemblyView(content)));
        });
    }

    get onDidChange() {
        return this._onDidChange.event;
    }

    update(uri) {
        this._onDidChange.fire(uri);
    }

    getBuffer(uri) {
        return new Promise((resolve, reject) => {
            if (uri.scheme !== 'evmtrace') {
                return reject("unsupported file scheme: " + uri.scheme);
            }
            vscode.workspace.openTextDocument(vscode.Uri.parse(uri)).then(document => {
                resolve(document.getText());
            });
        });
    }
}

async function decorateEvmByteCodeSelection(editor, anchor) {
    if (!editor) {
        return;
    }
    const evm = new EVM(editor.document.getText());
    const START = 2; //skip 0x

    let loc = START;
    for (let op of evm.getOpcodes()) {
        let len = op.pushData ? op.pushData.byteLength + 1 : 1; //instr. length
        let end = loc + len * 2;

        if (anchor.character >= loc && anchor.character <= end) {
            if (SEL_STYLE) { SEL_STYLE.dispose(); }
            SEL_STYLE = vscode.window.createTextEditorDecorationType({
                borderWidth: "1px",
                borderStyle: 'solid',
                light: {
                    borderColor: "Black",
                },
                dark: {
                    borderColor: "White"
                },
                xbefore: {
                    contentText:" ",
                },
                xafter: {
                    contentText:" ",
                }
            });

            editor.setDecorations(SEL_STYLE, [{
                range: new vscode.Range(editor.document.positionAt(loc), editor.document.positionAt(end)),
            }]);
            break;
        }

        loc = end;
    }
}

module.exports = {
    getPrintEvmDisassemblyView,
    getDecompiledByteCode,
    decorateEvmTrace,
    decorateEvmByteCode,
    EvmTraceContentProvider,
    decorateEvmByteCodeSelection
};