[<img width="200" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



# ETHover

Ethereum Account Address Hover Info and Actions

![vscode-ethover](https://user-images.githubusercontent.com/2865694/86650152-bd707780-bfe2-11ea-819d-a9e3dacb2034.gif)

[Marketplace](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-ethover)

Hover over an ethereum address and:

* Open it in etherscan (or whatever you configure)
* Show address balance in hover (mainnet) (note: might be rate-limited, configure your API key in settings)
* Download the bytecode and disassemble it. 
  * With hover info on instructions
  * Representation of data as ASCII and resolving 4bytes to funcsigs, Color code reflects the type of instruction: stack, memory, storage, arithm., logic, system, environment, …
* Download the bytecode and show it. 
  * With hover info
  * Click to see instruction boundaries
  * Color coded bytes to reflect type of instruction)
* Show verified contract source (etherscan.io)
* Show reconstructed contract source from eveem.org
* Show reconstructed contract source from [evm.js](https://www.npmjs.com/package/evm)
* run [vscode-decompiler](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-decompiler) to decompile it manually using panoramix (eveem.org) locally

### Currently enabled for the following filetypes

* TypeScript
* JavaScript
* Markdown
* Solidity

Let me know if you want to enable this extension for more filetypes.

## Credits

* https://etherscan.io (get your API-Key there <3)
* https://www.npmjs.com/package/evm
* https://eveem.org
* [vscode-decompiler](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-decompiler)

## Release Notes

see [CHANGELOG](./CHANGELOG.md)


-----------------------------------------------------------------------------------------------------------
