import {entropyToMnemonic, mnemonicToEntropy, mnemonicToSeedHex} from 'bip39'
import PrivateKey from './PrivateKey'
import {privateToPublic, isValidPublic, isValidPrivate} from 'ethereumjs-util'
import {SecureStorageInterface} from './../SecureStorage/SecureStorageInterface';
import {AES, enc} from 'crypto-js';

export class EthKeyAlreadyExist extends Error{}

export class EthKeyDoesNotExist extends Error{}

export class InvalidPrivateKey extends Error{}

export class InvalidPublicKey extends Error{}

/**
 * Contains helper method's to interact with everything that is ethereum related
 */
export class EthUtils {

    /**
     * key name for the secure storage
     * @type {string}
     */
    static PRIV_KEY_SS_NAME = 'private_ethereum_key';

    /**
     *
     * @param {SecureStorageInterface} secStorage
     * @param {typeof PrivateKey} privateKey
     */
    constructor (private secStorage:SecureStorageInterface, privateKey: typeof PrivateKey) {}

    /**
     * Create's an ethereum keypair and save it encrypted by the given password
     * @param {string} password
     */
    async createEthKeyPair(password:string) : Promise<{pubKey: string, privKeyMnemonic: string}>
    {
        //Exit if key exist
        if(true === await this.secStorage.hasItem(EthUtils.PRIV_KEY_SS_NAME)){
            throw new EthKeyAlreadyExist();
        }

        //Private key
        const privKey:PrivateKey = PrivateKey.factory();

        if(!isValidPrivate(privKey.getPrivKeyBuffer())){
            throw new InvalidPrivateKey();
        }

        //Public key
        const pubKey:Buffer = privateToPublic(privKey.getPrivKeyBuffer());

        if(!isValidPublic(pubKey)){
            throw new InvalidPublicKey();
        }

        //Save encrypted key
        await this.secStorage.setItem(
            EthUtils.PRIV_KEY_SS_NAME,
            AES.encrypt(privKey.getPrivKey(), password).toString()
        );

        return {
            pubKey: pubKey.toString(),
            privKeyMnemonic: entropyToMnemonic(privKey.getPrivKey())
        }
    }

    /**
     * Return's the private key as mnemonic (bip39) or throw error if decryption fail's / private key is invalid
     * @param {string} password
     * @returns {string}
     */
    async getPrivKey(password:string) : Promise<{privKey: string, privKeyMnemonic: string}>
    {
        //Exit if not exist
        if(!await this.secStorage.hasItem(EthUtils.PRIV_KEY_SS_NAME)){
            throw new EthKeyDoesNotExist();
        }

        //Fetched encrypted private key
        const encrPrivKey:string = await this.secStorage.getItem(EthUtils.PRIV_KEY_SS_NAME);

        //Decrypted priv key
        const decrPrivKey:PrivateKey = new PrivateKey(new Buffer(AES.decrypt(encrPrivKey, password).toString(enc.Utf8), 'hex'));

        //@todo add check if encryption failed

        //Exit if decryption failed or private key is invalid
        if(!isValidPrivate(decrPrivKey.getPrivKeyBuffer())){
            throw new InvalidPrivateKey("The private key is invalid or the decryption failed");
        }

        return {
            privKey: decrPrivKey.getPrivKey(),
            privKeyMnemonic: entropyToMnemonic(decrPrivKey.getPrivKey())
        };
    }

    /**
     * Proves if user has a private key
     * @returns {Promise<boolean>}
     */
    async hasPrivKey() : Promise <boolean>
    {
        return this.secStorage.hasItem(EthUtils.PRIV_KEY_SS_NAME);
    }

}