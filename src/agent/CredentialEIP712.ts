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
  resolveDidOrThrow,
  getEthereumAddress
} from "@veramo/utils"
import { schema } from '../index'

import {
  ICreateVerifiableCredentialEIP712Args,
  ICredentialIssuerEIP712,
  IRequiredContext,
} from '../types/ICredentialEIP712'

import { getEthTypesFromInputDocEthers, getEthTypesFromInputDoc } from "eip-712-types-generation";
import { Signer, ethers } from "ethers";

import { interpretIdentifier } from "ethr-did-resolver";

/**
 * A Veramo plugin that implements the {@link ICredentialIssuerEIP712} methods.
 *
 * @public
 */
export class CredentialIssuerEIP712 implements IAgentPlugin {
  readonly methods: ICredentialIssuerEIP712
  readonly schema = schema.ICredentialIssuer
  readonly signer: Signer

  constructor(signer:Signer) {
    if (!signer) throw Error('Missing Signer')
    this.methods = {
      createVerifiableCredentialEIP712: this.createVerifiableCredentialEIP712.bind(this),
    }
    this.signer = signer;
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

    const didDocument = await resolveDidOrThrow(issuer, context);

    const blockchainAccountId = getEthereumAddress(didDocument.verificationMethod![0])
    if(ethers.utils.getAddress(args.ethereumAccountId) !== ethers.utils.getAddress(blockchainAccountId!)) {
      throw new Error(`Controller of specified DID does not match Ethereum Account given.`);
    }

    const chainId = didDocument.verificationMethod![0].blockchainAccountId?.split(":").slice(-1)[0];

    const message = credential;
    const domain = {
      chainId,
      name: "VerifiableCredential",
      version: "1",
    };

    const types = getEthTypesFromInputDocEthers(message, "VerifiableCredential");
    const typesWithDomain = getEthTypesFromInputDoc(message, "VerifiableCredential");

    /* @ts-ignore: Ignore TS issue */
    const signature = await this.signer._signTypedData(domain, types, message)
    
    const newObj = JSON.parse(JSON.stringify(message));

    newObj.proof = {
      verificationMethod: issuer + "#controller",
      created: issuanceDate,
      proofPurpose: "assertionMethod",
      type: "EthereumEip712Signature2021",
    }

    newObj.proof.proofValue = signature;

    newObj.proof.eip712Domain = {
      domain,
      messageSchema: typesWithDomain,
      primaryType: "VerifiableCredential",
    };

    return newObj;
  }
}
