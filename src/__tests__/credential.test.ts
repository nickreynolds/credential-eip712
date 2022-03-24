import { CredentialIssuerEIP712 } from '../agent/CredentialEIP712'
import { DIDResolutionResult } from '@veramo/core'
import { IRequiredContext } from '..'
import { Wallet, ethers } from "ethers";

const context: IRequiredContext = {
  agent: {
    getSchema: jest.fn(),
    execute: jest.fn(),
    availableMethods: jest.fn(),
    emit: jest.fn(),
    resolveDid: async (args?): Promise<DIDResolutionResult> => {
      if (!args?.didUrl) throw Error('DID required')

      return {
        didResolutionMetadata: {},
        didDocumentMetadata: {},
        didDocument: {
          '@context': 'https://w3id.org/did/v1',
          id: args?.didUrl,
          verificationMethod: [
            {
              id: `${args?.didUrl}#owner`,
              type: 'EcdsaSecp256k1RecoveryMethod2020',
              controller: args?.didUrl,
              blockchainAccountId: `${args?.didUrl.slice(-42)}@eip155:1`,
            },
          ],
          authentication: [`${args?.didUrl}#owner`],
        },
      }
    },
    getDIDComponentById: jest.fn(),
  },
}

const randomAccount1 = "0x8131Ba515A7Fce6736813196ecA1d9A0109eC914";
const randomAccount2 = "0x8131Ba515A7Fce6736813196ecA1d9A0109eC915";

const badResolverContext: IRequiredContext = {
  agent: {
    getSchema: jest.fn(),
    execute: jest.fn(),
    availableMethods: jest.fn(),
    emit: jest.fn(),
    resolveDid: async (args?): Promise<DIDResolutionResult> => {
      if (!args?.didUrl) throw Error('DID required')

      return {
        didResolutionMetadata: {},
        didDocumentMetadata: {},
        didDocument: {
          '@context': 'https://w3id.org/did/v1',
          id: args?.didUrl,
          verificationMethod: [
            {
              id: `${args?.didUrl}#owner`,
              type: 'EcdsaSecp256k1RecoveryMethod2020',
              controller: args?.didUrl,
              blockchainAccountId: `${randomAccount1}@eip155:1`,
            },
          ],
          authentication: [`${args?.didUrl}#owner`],
        },
      }
    },
    getDIDComponentById: jest.fn(),
  },
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

function constructBadSocialMediaProfileLinkage(did: string, date: string, profileUrl: string) {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://beta.api.schemas.serto.id/v1/public/social-media-linkage-credential/1.0/ld-context.json",
    ],
    type: ["VerifiableCredential", "SocialMediaProfileLinkage"],
    issuer: undefined,
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

describe('credential-eip712', () => {

  const privateKeyHex = '9ba4417ca5f5c56be5c264f8248629291d1a0a820fa7fc9d803ea9a9aa51aba7'
  const wallet = new Wallet(privateKeyHex);

  it('should throw error when misconfigured', () => {
    expect(() => {
      new CredentialIssuerEIP712(
        //@ts-ignore
        undefined
      )
    }).toThrow()
  })

  it('should have resolve method', () => {
    const resolver = new CredentialIssuerEIP712(wallet)
    expect(resolver).toHaveProperty("createVerifiableCredentialEIP712")
  })

  it('should issue credential', async () =>{
    const ethAddress = await wallet.getAddress();

    const resolver = new CredentialIssuerEIP712(wallet)
    const did = "did:ethr:" + ethAddress;
    const cred = constructSocialMediaProfileLinkage(did, new Date().toISOString(), "test");
    const issued = await resolver.createVerifiableCredentialEIP712({ credential: cred, ethereumAccountId: ethAddress}, context);
    expect(issued.issuer === did);

    const types = issued.proof.eip712Domain.messageSchema;
    delete types.EIP712Domain;
    const domain = issued.proof.eip712Domain.domain;
    const proofWithoutValue = { verificationMethod: issued.proof.verificationMethod, created: issued.proof.created, proofPurpose: issued.proof.proofPurpose, type: issued.proof.type }
    const message = { ...issued, proof: proofWithoutValue};

    const recoveredAddress = ethers.utils.verifyTypedData(domain, types, message, issued.proof.proofValue);

    expect(recoveredAddress === ethAddress);
  })
  
  it('should fail with bad DID Resolver', async () =>{
    const ethAddress = await wallet.getAddress();

    const resolver = new CredentialIssuerEIP712(wallet)
    const did = "did:ethr:" + ethAddress;
    const cred = constructSocialMediaProfileLinkage(did, new Date().toISOString(), "test");
    await expect(resolver.createVerifiableCredentialEIP712({ credential: cred, ethereumAccountId: ethAddress}, badResolverContext)).rejects.toThrow()
  })

  
  it('should fail with wrong eth account as signer', async () =>{
    const ethAddress = await wallet.getAddress();

    const resolver = new CredentialIssuerEIP712(wallet)
    const did = "did:ethr:" + randomAccount2;
    const cred = constructSocialMediaProfileLinkage(did, new Date().toISOString(), "test");
    await expect(resolver.createVerifiableCredentialEIP712({ credential: cred, ethereumAccountId: ethAddress}, context)).rejects.toThrow()
  })
  
  it('should fail to without issuer in credential', async () =>{
    const ethAddress = await wallet.getAddress();

    const resolver = new CredentialIssuerEIP712(wallet)
    const did = "did:ethr:" + ethAddress;
    const cred = constructBadSocialMediaProfileLinkage(did, new Date().toISOString(), "test");

    //@ts-ignore
    await expect(resolver.createVerifiableCredentialEIP712({ credential: cred, ethereumAccountId: ethAddress}, context)).rejects.toThrow()
  })

})
