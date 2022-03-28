# Credential EIP712 Veramo Plugin

This plugin allows for the signing of EIP712 Credentials, via a passed ethers `Signer`

## Quick start

* Copy this repo
* `yarn`
* `yarn build` or `yarn watch`
* `yarn generate-plugin-schema`
* `yarn start` or VSCode Debugger (CMD + Shift + D) > Run `OpenAPI server`

## Usage
* Add this plugin to your Veramo agent, with an `ethersjs Signer` object:

```
import { createAgent, IResolver } from "@veramo/core";
import { CredentialIssuerEIP712, ICredentialIssuerEIP712 } from "credential-eip712";

....

const agent = createAgent<IResolver & ICredentialIssuerEIP712 & ...>({
    new CredentialIssuerEIP712(signer)
});


const credential = await agent.createVerifiableCredentialEIP712({ credential, ethereumAccountId });
```

## Template
* This project was created by following the instructions on this repo: `https://github.com/uport-project/veramo-plugin`