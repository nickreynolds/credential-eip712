import {
  IAgentPlugin,
  VerifiableCredential,
  CredentialPayload,
  DIDResolutionResult,
} from "@veramo/core"
import {
  _ExtendedIKey,
  extractIssuer,
  MANDATORY_CREDENTIAL_CONTEXT,
  processEntryToArray,
} from "@veramo/utils"
import { schema } from '../index'

import {
  ICreateVerifiableCredentialEIP712Args,
  ICredentialIssuerEIP712,
  IRequiredContext,
} from '../types/ICredentialEIP712'

// import { promisify } from "util";

import { canonicalize } from "json-canonicalize";
import Web3 from "web3";
import { getEthTypesFromInputDoc } from "eip-712-types-generation";

const promisify = (inner:any) =>
  new Promise((resolve, reject) =>
    inner((err:any, res:any) => {
      if (err) { reject(err) }
      resolve(res);
    })
  );

/**
 * A Veramo plugin that implements the {@link ICredentialIssuerEIP712} methods.
 *
 * @public
 */
export class CredentialIssuerEIP712 implements IAgentPlugin {
  readonly methods: ICredentialIssuerEIP712
  readonly schema = schema.ICredentialIssuer
  readonly web3: Web3

  constructor(web3:Web3) {
    if (!web3) throw Error('Missing Web3')
    this.methods = {
      createVerifiableCredentialEIP712: this.createVerifiableCredentialEIP712.bind(this),
    }
    this.web3 = web3;
  }

  /** {@inheritdoc ICredentialIssuerEIP712.createVerifiableCredentialEIP712} */
  public async createVerifiableCredentialEIP712(
    args: ICreateVerifiableCredentialEIP712Args,
    context: IRequiredContext,
  ): Promise<VerifiableCredential> {
    const credentialContext = processEntryToArray(
      args?.credential?.['@context'],
      MANDATORY_CREDENTIAL_CONTEXT,
    )
    const credentialType = processEntryToArray(args?.credential?.type, 'VerifiableCredential')
    let issuanceDate = args?.credential?.issuanceDate || new Date().toISOString()
    if (issuanceDate instanceof Date) {
      issuanceDate = issuanceDate.toISOString()
    }
    const credential: CredentialPayload = {
      ...args?.credential,
      '@context': credentialContext,
      type: credentialType,
      issuanceDate,
    }

    const issuer = extractIssuer(credential)
    if (!issuer || typeof issuer === 'undefined') {
      throw new Error('invalid_argument: args.credential.issuer must not be empty')
    }


    // use resolveOrThrow util
    let did: DIDResolutionResult;
    try {
      did = await context.agent.resolveDid({ didUrl: issuer });
    } catch (e) {
      throw new Error(`Unable to resolve specified DID: ${issuer}. ${e}`);
    }

    // TODO: use util to get properly formatted blockchainAccountId
    const blockchainAccountId = did.didDocument?.verificationMethod![0].blockchainAccountId?.split("@")[0];

    if(this.web3.utils.toChecksumAddress(args.ethereumAccountId) !== this.web3.utils.toChecksumAddress(blockchainAccountId!)) {
      throw new Error(`Controller of specified DID does not match Ethereum Account given.`);
    }

    const message = credential;
    const domain = {
      chainId: 1,
      name: "VerifiableCredential",
      version: "1",
    };

    const types = getEthTypesFromInputDoc(message, "VerifiableCredential");
    const from = args.ethereumAccountId;
    const obj = canonicalize({ types, domain, primaryType: "VerifiableCredential", message });

    const signature = await promisify((cb: any) => {
      /* @ts-ignore: Ignore TS issue */
      this.web3?.currentProvider?.send({ method: "eth_signTypedData_v4", params: [from, obj], from }, cb)
    });

    
    const newObj = JSON.parse(JSON.stringify(message));

    newObj.proof = {
      verificationMethod: did + "#controller",
      created: issuanceDate,
      proofPurpose: "assertionMethod",
      type: "EthereumEip712Signature2021",
    }

    newObj.proof.proofValue = signature;

    newObj.proof.eip712Domain = {
      domain,
      messageSchema: types,
      primaryType: "VerifiableCredential",
    };

    return newObj;
  }
}
