import { CredentialIssuerEIP712 } from '../agent/CredentialEIP712'
import { DIDResolutionResult } from '@veramo/core'
import { IRequiredContext } from '..'
import Web3 from 'web3'
// import PrivateKeyProvider from 'truffle-privatekey-provider';
import HookedWalletSubprovider from "web3-provider-engine";
import HDWalletProvider from '@truffle/hdwallet-provider'
import Ganache from "ganache-core";
import ethers from "ethers";
import { Wallet } from "ethers";

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

describe('credential-eip712', () => {
  let server;
  const port = 8545;

  // beforeAll(done => {
  //   server = Ganache.server({
  //     miner: {
  //       instamine: "strict"
  //     },
  //     logging: {
  //       quiet: true
  //     }
  //   });
  //   server.listen(port, done);
  // });
  
  //var privateKey = "62537136911bca3a7e2b....";
  // Or, alternatively pass in a zero-based address index.
  const mnemonicPhrase = "sense prepare hotel ladder soon option word salmon gym frost rubber task";
  const provider = new HDWalletProvider({
    mnemonic: mnemonicPhrase,
    providerOrUrl: "https://mainnet.infura.io/v3/b28f5c9bf2964b5fa2814b679a28611b",
    addressIndex: 5
  });

  const privateKeyHex = '9ba4417ca5f5c56be5c264f8248629291d1a0a820fa7fc9d803ea9a9aa51aba7'
  const wallet = new Wallet(privateKeyHex);
  const account = "0x8141Ba515A7Fce6736813196ecA1d9A0109eC913";

    
  // const testProvider = new HookedWalletSubprovider({
  //   signTypedData: function (web3: any, from: any, data: any) {
  //     return new Promise(async (resolve, reject) => {
  //       function cb(err: any, result: any) {
  //         if (err) {
  //           return reject(err);
  //         }
  //         if (result.error) {
  //           return reject(result.error);
  //         }
  
  //         const sig = result.result;
  //         const sig0 = sig.substring(2);
  //         const r = "0x" + sig0.substring(0, 64);
  //         const s = "0x" + sig0.substring(64, 128);
  //         const v = parseInt(sig0.substring(128, 130), 16);
  
  //         resolve({
  //           data,
  //           sig,
  //           v, r, s
  //         });
  //       }
  //       if (web3.currentProvider.isMetaMask) {
  //         web3.currentProvider.sendAsync({
  //           jsonrpc: "2.0",
  //           method: "eth_signTypedData_v4",
  //           params: [from, JSON.stringify(data)],
  //           id: new Date().getTime()
  //         }, cb);
  //       } else {
  //         let send = web3.currentProvider.sendAsync;
  //         if (!send) send = web3.currentProvider.send;
  //         send.bind(web3.currentProvider)({
  //           jsonrpc: "2.0",
  //           method: "eth_signTypedData",
  //           params: [from, data],
  //           id: new Date().getTime()
  //         }, cb);
  //       }
  //     }); 
  //   }
  // })

  // provider.engine.addProvider(testProvider)

  const web3 = new Web3(provider);
  //var provider = new PrivateKeyProvider(privateKey, "http://localhost:8545");
  // const tempWeb3 = new Web3()
  // const account = tempWeb3.eth.accounts.create();
  // const privateKey = account.privateKey;
  // const provider = new PrivateKeyProvider(privateKey, 'https://mainnet.infura.io/v3/b28f5c9bf2964b5fa2814b679a28611b');
  // const web3 = new Web3(provider);
  // const ethAddress = account.address;

  // var privateKey = Buffer.from('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex')
  // var address = Buffer.from('1234362ef32bcd26d3dd18ca749378213625ba0b', 'hex')
  // var addressHex = '0x'+address.toString('hex')

  // // sign all tx's
  // var providerA = new HookedWalletProvider({
  //   getAccounts: function(cb){
  //     cb(null, [addressHex])
  //   },
  //   signTransaction: function(txParams, cb){
  //     const tx = TransactionFactory.fromTxData(txParams)
  //     const signedTransaction = tx.sign(privateKey)
  //     var rawTx = '0x'+signedTransaction.serialize().toString('hex')
  //     cb(null, rawTx)
  //   },
  // })



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


    //const provider = ganache.provider();
    // const etherprovider = new ethers.providers.Web3Provider(ganache.provider());
    //const web3 = new Web3(<any>provider);
    const ethAddress = account; //((await web3.eth.getAccounts())[0]).toLowerCase();
    console.log("account:", ethAddress);

    const resolver = new CredentialIssuerEIP712(wallet)
    // console.log("account: ", account);
    const did = "did:ethr:" + ethAddress;
    const cred = constructSocialMediaProfileLinkage(did, new Date().toISOString(), "test");
    console.log("cred: ", cred);
    let issued;
    try{ 
      issued = await resolver.createVerifiableCredentialEIP712({ credential: cred, ethereumAccountId: ethAddress}, context);
    } catch (ex) {
      console.error("what: ", ex);
    }
      expect(issued?.issuer === did);
    // expect(false).toBeTruthy();
  })

  // it('should fail with bad web3', () =>{

  //   expect(() => {}).toThrow()
  // })

  
  // it('should fail with bad DID Resolver', () =>{

  //   expect(() => {}).toThrow()
  // })

  
  // it('should fail with wrong eth account as signer', () =>{

  //   expect(() => {}).toThrow()
  // })
  
  // it('should fail to without issuer in credential', () =>{

  //   expect(() => {}).toThrow()
  // })

})
