import {
  IAgentPlugin,
  VerifiableCredential,
} from '@veramo/core'
import { schema } from '../index'

import {
  ContextDoc,
  ICreateVerifiableCredentialEIP712Args,
  ICredentialIssuerEIP712,
  IRequiredContext,
} from '../types/ICredentialEIP712'

import { promisify } from "util";

import { canonicalize } from "json-canonicalize";
import Web3 from "web3";
import { getEthTypesFromInputDoc } from "eip-712-types-generation";

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
    this.methods = {
      createVerifiableCredentialEIP712: this.createVerifiableCredentialEIP712.bind(this),
    }
    this.web3 = web3;
  }

  /** {@inheritdoc ICredentialIssuerLD.createVerifiableCredentialLD} */
  public async createVerifiableCredentialEIP712(
    args: ICreateVerifiableCredentialEIP712Args,
    context: IRequiredContext,
  ): Promise<VerifiableCredential> {
  //   const credentialContext = processEntryToArray(
  //     args?.credential?.['@context'],
  //     MANDATORY_CREDENTIAL_CONTEXT,
  //   )
  //   const credentialType = processEntryToArray(args?.credential?.type, 'VerifiableCredential')
  //   let issuanceDate = args?.credential?.issuanceDate || new Date().toISOString()
  //   if (issuanceDate instanceof Date) {
  //     issuanceDate = issuanceDate.toISOString()
  //   }
  //   const credential: CredentialPayload = {
  //     ...args?.credential,
  //     '@context': credentialContext,
  //     type: credentialType,
  //     issuanceDate,
  //   }

  //   const issuer = extractIssuer(credential)
  //   if (!issuer || typeof issuer === 'undefined') {
  //     throw new Error('invalid_argument: args.credential.issuer must not be empty')
  //   }

  //   let identifier: IIdentifier
  //   try {
  //     identifier = await context.agent.didManagerGet({ did: issuer })
  //   } catch (e) {
  //     throw new Error(`invalid_argument: args.credential.issuer must be a DID managed by this agent. ${e}`)
  //   }
  //   try {
  //     const { signingKey, verificationMethodId } = await this.findSigningKeyWithId(
  //       context,
  //       identifier,
  //       args.keyRef,
  //     )

  //     return await this.ldCredentialModule.issueLDVerifiableCredential(
  //       credential,
  //       identifier.did,
  //       signingKey,
  //       verificationMethodId,
  //       context,
  //     )
  //   } catch (error) {
  //     debug(error)
  //     return Promise.reject(error)
  //   }
  // }

    const profileUrl = "http://twitter.com/test1";
    const ethAddress = "0xcEC56F1D4Dc439E298D5f8B6ff3Aa6be58Cd6Fdf"

    const did = "did:ethr:" + ethAddress;
    const date = new Date().toISOString();

    let message = constructSocialMediaProfileLinkage(did, date, profileUrl);

    const domain = {
      chainId: 1,
      name: "SocialMediaProfileLinkage",
      version: "1",
    };

    const types = getEthTypesFromInputDoc(message, "VerifiableCredential");
    const from = ethAddress;
    const obj = { types, domain, primaryType: "VerifiableCredential", message };
    const canonicalizedObj = canonicalize(obj);
    console.log("canonicalizedObj: ", canonicalizedObj);

    /* @ts-ignore: Ignore TS issue */
    const signature = await promisify(web3?.currentProvider?.sendAsync({ method: "eth_signTypedData_v4", params: [from, canonicalizedObj], from }));

    
    const newObj = JSON.parse(JSON.stringify(message));

    newObj.proof.proofValue = signature;

    newObj.proof.eip712Domain = {
      domain,
      messageSchema: types,
      primaryType: "VerifiableCredential",
    };

    return newObj;
  }
}

function constructSocialMediaProfileLinkage(did: string, date: string, profileUrl: string) {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://beta.api.schemas.serto.id/v1/public/social-media-linkage-credential/1.0/ld-context.json",
    ],
    type: ["VerifiableCredential", "SocialMediaProfileLinkage"],
    issuer: did,
    issuanceDate: date,
    credentialSubject: {
      socialMediaProfileUrl: profileUrl,
      id: did,
    },
    credentialSchema: {
      id: "https://beta.api.schemas.serto.id/v1/public/social-media-linkage-credential/1.0/json-schema.json",
      type: "JsonSchemaValidator2018",
    },
    proof: {
      verificationMethod: did + "#controller",
      created: date,
      proofPurpose: "assertionMethod",
      type: "EthereumEip712Signature2021",
    }
  };
}

const socialMediaProfileLinkageTypes = 
{
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  VerifiableCredential: [
    {
      name: "@context",
      type: "string[]",
    },
    {
      name: "type",
      type: "string[]",
    },

    {
      name: "issuer",
      type: "string",
    },
    {
      name: "issuanceDate",
      type: "string",
    },
    {
      name: "credentialSubject",
      type: "CredentialSubject",
    },
    {
      name: "credentialSchema",
      type: "CredentialSchema",
    },
    {
      name: "proof",
      type: "Proof",
    },
  ],
  CredentialSchema: [
    {
      name: "id",
      type: "string",
    },
    {
      name: "type",
      type: "string",
    },
  ],
  CredentialSubject: [
    {
      name: "socialMediaProfileUrl",
      type: "string",
    },
    {
      name: "id",
      type: "string",
    },
  ],
  Proof: [
    {
      name: "verificationMethod",
      type: "string",
    },
    {
      name: "created",
      type: "string",
    },
    {
      name: "proofPurpose",
      type: "string",
    },
    {
      name: "type",
      type: "string",
    },
  ],
};