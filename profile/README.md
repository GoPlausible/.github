# PLAUSIBLE Protocol
### W3C Compliant DIDs, Verifiable Credentials and OpenBadges powered by Algorand Blockchain
![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)

### This documentation is subject to update for newer updates please refer to [Plausible FAQ](https://goplausible.gitbook.io/goplausible/)
### Plausible is W3C Compliant DIDs, Verifiable Credentials, OpenBadges, and smart utility NFTs protocol built on [Algorand](https://algorand.com).

- [Plausible Concept](#plausible-concept)

- [Plausible Links](#plausible-links)

- [Plausible Repos](#plausible-code-repositories)
  
- [Plausible gratitudes](#plausible-credits)

- [Plausible Technical Design](#plausible-technical-design)
  - [Author's Journey](#authors-journey)
  - [Claimer's Journey](#claimers-journey)
  - [Smart Contracts](#plausible-smart-contracts)

## Plausible links
[top↑](#plausible)

- [Plausible Github Repos & Documentation](https://github.com/GoPlausible)

- [Plausible Website (plausible.com)](https://goplausible.com)

- [Plausible dApp (plausible.xyz)](https://goplausible.xyz)

- [Plausible TESTNET dApp (testnet.plausible.xyz)](https://testnet.goplausible.xyz)
 
- [Algorand NFDomain (plausible.algo)](https://app.nf.domains/name/plausible.algo)


## Plausible concept:
[top↑](#plausible)


Plausible dApp is consisted of a frontend calling an Algorand ASC system in which ASCs use each other via inner transactions and C2C calls.

Plausible complies to [ARC3](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md) and [ARC4](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md) living standards on Algorand.

![Plausible Concept Diagram](https://github.com/GoPlausible/.github/blob/main/profile/Plausible%20Concept%20Diagram.jpeg)



## Plausible Gratitudes
[top↑](#plausible)

@emg110 and @sheghzo are grateful to Algorand, Algorand Foundation, Algorand Ecosystem, AXL Ventures and AlgoFam!


# Plausible technical design:
[top↑](#plausible)

Plausible protocol features :

- All operations are in full compliance and conformance to W3C DID, VC, VP , DRL and other standards.

- Geo (allow and ban lists), Time, List, Token, Github, SSI and email constraint features.
  
- WebAuthn, Oauth 2.2, OIDC, OIDC-VC integration.
  
- Double pinning of all IPFS content (media and metadata) into Pinata and CrustNetwork (the best centralized and the best decentralized networks for IPFS pinning).
  
- Dynamic NFTs per PLAUS (Plausible is 100% token-less and NFTs are generated and owned by PLAUS contract which belongs to PLAUS author).
  


Plausible is consisted of a frontend and smart contracts on Algorand chain:
- Frontend (Cloudflare Pages React SPA/PWA )
- Edge workers (Cloudflare Workers for GoPlausible public and private APIs)
- Smart Contracts (Algorand smart contracts and GoPlausible ABIs)


Plausible frontend has 3 major functions (all in a single view for simplicity):
- Wallet Session
- Issuer UI
- Claimer UI

Note: Frontend will be available through both cloudflare (heavily distributed on edge) and IPFS to ensure decentralization (with transparent routing for best UX).


```mermaid
  flowchart LR
  subgraph Plausible
    direction TB
    subgraph Frontend
        direction RL
        Issuer_UI
        Claimer_UI
    end
    subgraph ASC
        direction TB
        Plausible_ASC
        Plaus_ASC
        
    end
  end
  Issuer --> Plausible
  Claimer --> Plausible
  Frontend --> ASC
  
```

----

### PLAUS Issuer's Journey:
[top↑](#plausible)

1- Issuer easily gets onboard to GoPlausible by opting into Plausible protocol's parent Algorand smart contract. This issues a DID and a Verifiable Credential by PLAUSIBLE protocol for the issuer and combined with account's NFD , creates a profile.

2- Then can Issue new PLAUS (W3C DID based verifiable credentials with NFTs in background).

3- Then activate the venue to let claims begin (This differs than start time option of Plausible).


Options available for PLAUS creation:

- Time (default enabled): Start time check (compared to LatestTimestamp)
- Geo: Country allow and ban lists.
- Signature: Issuer's signature is needed to make Plausible claimable for every Claimer, individually. Each and every Claimer can receive their single claimed Plausible (in NFT or TXN depending on Plausible config) only after Issuer's authorization via a successful method call (which obviously should happen after both venue activation and venue start time). 
- QRCode: Upon activation a secret key will be generated and included in a transaction as a method input parameter and this TXN is then communicated by a QRCode in venue location and Claimer scans this QRCode during physical presence and claims (other arguments will be added to this raw transaction object after scan and when claiming).

Note: QRCode feature is still under heavy re-ideation, re-design and re-everything! So please, kindly consider it WIP and FUTURE release functionality!



```mermaid
sequenceDiagram 
actor Issuer
participant Plausible
participant Plausible_ASC
participant Plaus_ASC
Issuer ->> Plausible: Connect wallet
Issuer ->> Plausible: Sign Optin Call
Plausible ->> Plausible_ASC: Optin Call
Plausible_ASC -->> Plausible: Return
Note left of Plausible: Onboarding
Issuer ->> Plausible: Sign `create_plaus` Method TXN
Plausible ->> Plausible_ASC:  `create_plaus` Method Call
Plausible_ASC -->> Plausible: Return
Note left of Plausible_ASC: Create Plausible Venue
Issuer ->> Plausible: Sign `activate_plaus` Method TXN
Plausible ->> Plaus_ASC: `activate_plaus` Method Call (creates NFT as well)
Plaus_ASC -->> Plausible: Return
Note right of Plausible_ASC: Activate Plausible Venue
Issuer ->> Plausible: Sign `sig_plaus` Method TXN
Plausible ->> Plausible_ASC: `sig_plaus` Method Call 
Plausible_ASC -->> Plausible: Return
Note right of Plausible_ASC: Release SIG Plausible
Note right of Plausible_ASC: Only when SIG option is enabled on Plausible



```
----
### Claimer's Journey:
[top↑](#plausible)

1- After PLAUS activation (by Issuer) and by satisfying what PLAUS configuration mandates from claimers, eligible users can claim the PLAUS and get NFT and attached Verifiable Credential if approved by PLAUS smart contract.

2- Claimer simply gets onboard by opting into parent ASC from UI (one button click).

3-  Then get a searchable list of claimed PLAUS so far and can activate the creator mode to Issue new PLAUS at any time given there is enough balance in the account.


```mermaid
sequenceDiagram 
actor Claimer
participant Plausible
participant Plausible_ASC
participant Plausible_Item_ASC
Claimer ->> Plausible: Connect wallet
Claimer ->> Plausible: Sign Optin Call
Plausible ->> Plausible_ASC: Optin Call
Plausible_ASC -->> Plausible: Return
Note left of Plausible: Onboarding

Claimer ->> Plausible: Sign `apply_plaus` Method TXN
Plausible ->> Plausible_Item_ASC:  `apply_plaus` Method Call
Plausible_Item_ASC -->> Plausible: Return
Note right of Plausible_ASC: Apply for Plausible Venue


Claimer ->> Plausible: Sign `claim_plaus` Method TXN
Plausible ->> Plausible_Item_ASC: `claim_plaus` Method Call ( plus optin TXN to Plausible NFT, if required)
Note right of Plausible_ASC: Claim Plausible
Note right of Plausible_ASC: Needs providing required options if configured (Geo, Time, QR)
Plausible_Item_ASC -->> Claimer: Send NFT
Note right of Plausible_ASC: Requires existence of signed release by author in global state
Plausible_Item_ASC -->> Plausible: Return

```

----

## Plausible Smart Contracts 
[top↑](#plausible)

Plausible ASC System is designed on basis of newest TEAL features came with TEAL v 8.0 on AVM8. Plausible Parent contract is created and thereafter every Plausible item is created by this parent contract based on configurations needed.

All methods expenses and fee details are in following table (those not in this table have just normal 1 MinFee):

Note: This section (Fees) is subject to further updates and changes and is work in progress!

| Method | Fee           | Amount|
| ------------- |:-------------:| -----:|
| New Plausible                     | 1 MinFee      |   2 MinFee |
| Setup Plausible                   | 1 MinFee      |   1 MinFee |
| Activate Plausible(Author pays)   | 3 MinFee      |   Claimer_Qty * 4 * MinFee |
| Activate Plausible(Claimer pays) | 3 MinFee      |   1 MinFee |
| Release Plausible| 1 MinFee       | 1 MinFee      |   0  |
| Claim Plausible(Author pays)      | 1 MinFee      |   0  |
| Claim Plausible(Claimer pays)    | 4 MinFee      |   0  |

----

### Entities Relations:

```mermaid
  graph TD;
      Plausible_Service== manages ==>Parent_Plausible_ASC;
      Parent_Plausible_ASC== manages ==>Plausible_item_ASC;
      
      Plausible_Claimer== interacts ==>Plausible_item_ASC;
      Plausible_Author== interacts ==>Parent_Plausible_ASC;
      Plausible_Author== interacts ==>Plausible_item_ASC;
```

----

### Lifecycle:

```mermaid
  stateDiagram-v2
    [*] --> Plausible_Service
    Plausible_Service --> Parent_Plausible_ASC
    Parent_Plausible_ASC --> Plausible_item_ASC
    Plausible_item_ASC --> close
    Parent_Plausible_ASC --> eol
    close --> archive
    eol --> archive
    archive --> [*]
```
----


### UseCase:

**Note: The NoOp calls without args will be rejected with error. This is being examined as a security practice**

```mermaid
  flowchart TB

    id1([Author]) --uses--> parentMethodCalls
    id1([Author]) --uses--> parentAppCalls
    id1([Author]) --uses--> itemMethodCalls
    

    id2([Claimer]) --uses--> parentAppCalls 
    id2([Claimer]) --uses--> itemMethodCalls 
  

    subgraph Plausible
      
      subgraph parentASC
        subgraph parentAppCalls
        id3([create]) 
        id4([update]) 
        id5([delete]) 
        id6([optin]) 
        id7([closeout]) 
        end
        subgraph parentMethodCalls
        id61([setup]) 
        id8([item_create]) 
        id9([item_update]) 
        id10([item_delete]) 
 
        end
      end
      subgraph itemASC
        
        
        subgraph itemAppCalls
        id12([optin])
        id13([create]) 
        id14([update]) 
        id15([delete]) 
        id17([closeout]) 
        end
        subgraph itemMethodCalls
        id18([setup]) 
        id18([activate]) 
        id19([claim]) 
        id20([release]) 
        end
      end
      
    end 
   
    
    

```
----

### Plausible ASC TEAL Graph:
[top↑](#plausible)

![Plausible Item ASC TEAL Graph](./main_contract.svg)

----

### Plausible ASC ABI :
[top↑](#plausible)

Note 1: Data fields are global states of Plausible parent smart contract.

Note 2: Fee collection is not included anywhere at this phase of Plausible MVP development but certainly is a priority prior to public TESTNET deployment. It happens on parent smart contract.

```mermaid
  classDiagram
    class Plausible_ASC
    Plausible_ASC : +Uint64 plaus_onboard_count
    Plausible_ASC : +Uint64 plaus_count
    Plausible_ASC : +Byte plaus_last_appid
    Plausible_ASC : +Byte plaus_last_author
    Plausible_ASC : +setup(string)string
    Plausible_ASC : +item_create(pay,byte[],byte[])string
    Plausible_ASC : +item_update(application,byte[],byte[])string
    Plausible_ASC : +item_delete(application)void

    
```
Note 3: Author user has all metrics in localState of Plausible Item smart contract and all Authored Plausibles (upt to 16 item) in localState of Plausible smart contract (parent) 

----

### Plausible ASC ABI Schema :
[top↑](#plausible)

```javascript
{
  "name":"plausible-contract",
  "desc": "Plausible Parent smart contract",
  "networks":{
      "MainNet":{
          "appID": 0
      },
      "TestNet":{
          "appID": 0
      }
  },
  "methods":[
    {
          "name": "setup",
          "args": [
            {
              "type": "string",
              "name": "version"
            }
          ],
          "returns": {
            "type": "string"
          },
          "desc": "Sets up the Plausible main contract, sets and logs the version and returns"
        },
      {
          "name": "item_create",
          "args": [
            {
              "type": "pay",
              "name": "pay"
            },
            {
              "type": "byte[]",
              "name": "asc_approval_bytes"
            },
            {
              "type": "byte[]",
              "name": "asc_clear_bytes"
            }
          ],
          "returns": {
            "type": "string"
          },
          "desc": "Creates a new Plausible item smart contract and returns the app id"
        },
        {
          "name": "item_update",
          "args": [
            {
              "type": "application",
              "name": "application"
            },
            {
              "type": "byte[]",
              "name": "asc_approval_bytes"
            },
            {
              "type": "byte[]",
              "name": "asc_clear_bytes"
            }
          ],
          "returns": {
            "type": "string"
          },
          "desc": "Updates an Plausible item smart contract and returns item application ID"
        },
        {
          "name": "item_delete",
          "args": [
            {
              "type": "application",
              "name": "application"
            }
          ],
          "returns": {
            "type": "void"
          },
          "desc": "Deletes an Plausible item smart contract and returns void (approve only)"
        }
  ]
}

```
----

### Plausible Item ASC TEAL Graph:
[top↑](#plausible)

![Plausible Item ASC TEAL Graph](./item_contract.svg)
----

### Plausible ASC ITEM ABI :
[top↑](#plausible)

Note 1: Data fields are global states of Plausible item smart contract.

```mermaid
  classDiagram
    class Plausible_ASC_ITEM

    Plausible_ASC_ITEM : +Uint64 plaus_item_onboard_count
    Plausible_ASC_ITEM : +Uint64 plaus_item_txn_count
    Plausible_ASC_ITEM : +Uint64 plaus_item_claim_count

    Plausible_ASC_ITEM : +Uint64 plaus_start_timestamp
    Plausible_ASC_ITEM : +Uint64 plaus_end_timestamp
    Plausible_ASC_ITEM : +Byte plaus_name
    Plausible_ASC_ITEM : +Byte plaus_logo
    Plausible_ASC_ITEM : +Byte plaus_timezone
    Plausible_ASC_ITEM : +Byte plaus_desc
    Plausible_ASC_ITEM : +Byte plaus_address
    Plausible_ASC_ITEM : +Byte plaus_url
    Plausible_ASC_ITEM : +Byte plaus_web2
    Plausible_ASC_ITEM : +Byte plaus_nft_media
    Plausible_ASC_ITEM : +Byte plaus_has_geo
    Plausible_ASC_ITEM : +Byte plaus_has_release
    Plausible_ASC_ITEM : +Byte plaus_has_shared_secret
    Plausible_ASC_ITEM : +Byte plaus_claimer_qty
    Plausible_ASC_ITEM : +Byte author_pays_fee
    Plausible_ASC_ITEM : +Byte plaus_qr_secret
    Plausible_ASC_ITEM : +Byte plaus_hash


    Plausible_ASC_ITEM : +Uint64 plaus_parent_id
    Plausible_ASC_ITEM : +Byte plaus_parent_address
    Plausible_ASC_ITEM : +Byte plaus_author_address
    Plausible_ASC_ITEM : +Uint64 plaus_asa_id

    Plausible_ASC_ITEM : +Uint64 plaus_setup_time
    Plausible_ASC_ITEM : +Uint64 plaus_activate_time
    Plausible_ASC_ITEM : +Uint64 plaus_release_time


     Plausible_ASC_ITEM : +Byte plaus_is_activated
    Plausible_ASC_ITEM : +Byte plaus_is_setup
    Plausible_ASC_ITEM : +Byte plaus_is_released



 

    Plausible_ASC_ITEM : +setup(pay,account,application,string,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    Plausible_ASC_ITEM : +re_setup(pay,account,application,asset,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    Plausible_ASC_ITEM : +activate(pay,axfer,application,asset)string
    Plausible_ASC_ITEM : +claim(asset,application,pay,axfer,string,(uint64,uint64,uint64,uint64,uint64))string
    Plausible_ASC_ITEM : +release(application)string
    Plausible_ASC_ITEM : +get_metric(string)string
    Plausible_ASC_ITEM : +get_metrics()string
    
  
    
```

----

### Plausible ASC ITEM ABI Schema :
[top↑](#plausible)

```javascript
{
    "name": "plausible-item-contract",
    "desc": "Plausible Item smart contract",
    "networks": {
        "MainNet": {
            "appID": 0
        },
        "TestNet": {
            "appID": 109691598
        }
    },
    "methods": [
        {
            "name": "setup",
            "args": [
                {
                    "type": "pay",
                    "name": "pay_min_fee"
                },
                {
                    "type": "account",
                    "name": "author_account"
                },
                {
                    "type": "application",
                    "name": "parent_application"
                },
                {
                    "type": "string",
                    "name": "reserved"
                },
                {
                    "type": "string",
                    "name": "plaus_name"
                },
                {
                    "type": "string",
                    "name": "plaus_logo"
                },
                {
                    "type": "string",
                    "name": "plaus_desc"
                },
                {
                    "type": "string",
                    "name": "plaus_timezone"
                },
                {
                    "type": "string",
                    "name": "plaus_address"
                },
                {
                    "type": "string",
                    "name": "plaus_url"
                },
                {
                    "type": "string",
                    "name": "plaus_web2"
                },
                {
                    "type": "(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)",
                    "name": "plaus_uint64_tuple"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Sets up an Plausible smart contract item for the first time"
        },
        {
            "name": "activate",
            "args": [
                {
                    "type": "pay",
                    "name": "pay_min_fees"
                },
                {
                    "type": "axfer",
                    "name": "optin_plaus_nft"
                },
                {
                    "type": "application",
                    "name": "parent_application"
                },
                {
                    "type": "asset",
                    "name": "nft_asa"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Activates an Plausible item smart contract and returns string"
        },
        {
            "name": "claim",
            "args": [
                {
                    "type": "pay",
                    "name": "pay_min_fee"
                },
                {
                    "type": "asset",
                    "name": "nft_asset"
                },
                {
                    "type": "application",
                    "name": "parent_application"
                },
                {
                    "type": "account",
                    "name": "claimer_account"
                },
                {
                    "type": "string",
                    "name": "qr_secret"
                },
                {
                    "type": "(uint64,uint64,uint64,uint64,uint64)",
                    "name": "claim_uint64_tuple"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Claims an Plausible for a claimer and returns NFT sending inner-transaction hash"
        },
        {
            "name": "release",
            "args": [
                {
                    "type": "application",
                    "name": "parent_contract"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Releases Plausible and allows all Plausible claimer's to start claiming"
        }
    ]
}

```
----

***Since Plausible is totally decentralized, trustless and permission-less: Every author has full authority of the created PLAUS, enforced by PLAUS smart contract.***

## GoPlausible API

- **OpenAPI Version**: 3.1.0  
- **Base URL**: [https://api.goplausible.xyz](https://api.goplausible.xyz)  
- **Docs URL**: [https://api.goplausible.xyz/docs](https://api.goplausible.xyz/docs)  

This API is designed to handle different aspects of W3C Decentralized Identifiers (DIDs), W3C Verifiable Credentials (VCs), Self-Sovereign Identity (SSI), IPFS content management, authentication, revocation, rotation of DIDs, and more.

---

## Table of Contents

1. [REGISTRAR](#registrar)
2. [IDENTIFIERS](#identifiers)
3. [CREDENTIALS](#credentials)
4. [SSI](#ssi)
5. [ISSUANCE (Tickets)](#issuance)
6. [VERIFICATION](#verification)
7. [AUTH](#auth)
8. [REVOKE](#revoke)
9. [ROTATE](#rotate)
10. [RESOLVE](#resolve)
11. [IPFS](#ipfs)
12. [RENEW-AUTH](#renew-auth)
13. [DID-LINKED-RESOURCE (DLR)](#did-linked-resource)

---

## REGISTRAR

### GET `/registrar`

- **Description**: Fetches registrar records matching an optional DID uid (query parameter).
- **Query Parameters**:
  - `uid` (string, required): DID UID to search for.  

- **Responses**:
  - **200**: Returns a JSON object containing:
    ```json
    {
      "openapi": "3.1.0",
      "registrar": [
        {
          "id": "string",
          "did": "string",
          "didDocument": "string",
          "vcDocument": "string",
          "publicKey": "string",
          "isVc": true,
          "isSsi": true,
          "chain": "string",
          "network": "string",
          "project": "string"
        }
      ]
    }
    ```

### POST `/registrar`

- **Description**: Registers a project in the protocol.
- **Request Body** (`application/json`):
  ```json
  {
    "publicKey": { "type": "string", "nullable": false },
    "signedTxn": { "type": "string", "nullable": false },
    "ssi": { "type": "string", "nullable": true },
    "chain": {
      "type": "string",
      "nullable": true,
      "default": "algorand"
    },
    "network": {
      "type": "string",
      "nullable": true,
      "default": "mainnet"
    },
    "project": { "type": "string", "nullable": false }
  }
  ```
### POST `/registrar`

- **Description**: Registers a project in the protocol.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "signedTxn": { "type": "string", "nullable": false },
        "ssi": { "type": "string", "nullable": true },
        "chain": {
            "type": "string",
            "nullable": true,
            "default": "algorand"
        },
        "network": {
            "type": "string",
            "nullable": true,
            "default": "mainnet"
        },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**: Returns the newly created registry entry:
        ```json
        {
            "openapi": "3.1.0",
            "registry": {
                "id": "string",
                "did": "string",
                "didDocument": "string",
                "vcDocument": "string",
                "publicKey": "string",
                "isVc": true,
                "isSsi": true,
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## IDENTIFIERS

### GET `/identifiers`

- **Description**: Queries for DIDs in the registry.
- **Query Parameters**:
    - `uid` (string, required): DID identifier to filter by.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "identifiers": [
                {
                    "id": "string",
                    "did": "string",
                    "didDocument": "string",
                    "issuance": "string",
                    "isVc": true,
                    "isSsi": true,
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/identifiers`

- **Description**: Issues and registers W3C-compliant DIDs.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "ssi": { "type": "string", "nullable": true },
        "isVc": {
            "type": "boolean",
            "nullable": true,
            "default": false
        },
        "isSsi": {
            "type": "boolean",
            "nullable": true,
            "default": false
        },
        "chain": {
            "type": "string",
            "nullable": true,
            "default": "algorand"
        },
        "network": {
            "type": "string",
            "nullable": true,
            "default": "mainnet"
        },
        "project": { "type": "string", "nullable": true }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "registry": {
                "id": "string",
                "publicKey": "string",
                "did": "string",
                "didDocument": "string",
                "issuance": "string",
                "isVc": true,
                "isSsi": true,
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## CREDENTIALS

### GET `/credentials`

- **Description**: Queries Verifiable Credentials (VC) by a DID’s UID.
- **Query Parameters**:
    - `uid` (string, required): DID identifier to search for credentials.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "credentials": [
                {
                    "id": "string",
                    "did": "string",
                    "ssi": "string",
                    "cid": "string",
                    "publicKey": "string",
                    "didDocument": "string",
                    "vcDocument": "string",
                    "asset": "string",
                    "issuance": "string",
                    "expiration": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/credentials`

- **Description**: Issues a new Verifiable Credential.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "signedTxn": { "type": "string", "nullable": false },
        "ssi": { "type": "string", "nullable": true },
        "title": { "type": "string", "nullable": true },
        "fullName": { "type": "string", "nullable": true },
        "description": { "type": "string", "nullable": true },
        "subject": { "type": "string", "nullable": true },
        "subjectSsi": { "type": "string", "nullable": true },
        "media": { "type": "string", "nullable": true },
        "avatar": { "type": "string", "nullable": true },
        "document": { "type": "string", "nullable": true },
        "metadata": { "type": "object", "nullable": true },
        "claims": { "type": ["string"], "nullable": true },
        "tags": { "type": ["string"], "nullable": true },
        "expiration": { "type": "string", "nullable": true },
        "chain": {
            "type": "string",
            "nullable": true,
            "default": "algorand"
        },
        "network": {
            "type": "string",
            "nullable": true,
            "default": "mainnet"
        },
        "project": { "type": "string", "nullable": true }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "credential": {
                "id": "string",
                "publicKey": "string",
                "did": "string",
                "cid": "string",
                "ssi": "string",
                "asset": "string",
                "didDocument": "string",
                "vcDocument": "string",
                "issuance": "string",
                "expiration": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## SSI

### GET `/ssi`

- **Description**: Queries SSI (Self-Sovereign Identity) entries by an optional UID.
- **Query Parameters**:
    - `uid` (string, required): SSI UID to search.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "ssis": [
                {
                    "id": "string",
                    "did": "string",
                    "publicKey": "string",
                    "ssiId": "string",
                    "didDocument": "string",
                    "vcDocument": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/ssi`

- **Description**: Issues a Self-Sovereign Identity in the GoPlausible protocol.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": true },
        "fullName": { "type": "string", "nullable": true },
        "project": { "type": "string", "nullable": false },
        "chain": { "type": "string", "nullable": false },
        "network": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "ssi": {
                "id": "string",
                "did": "string",
                "publicKey": "string",
                "didDocument": "string",
                "vcDocument": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## ISSUANCE

### GET `/issuance`

- **Description**: Queries issued verifiable tickets.
- **Query Parameters**:
    - `q` (string, required): A query string to filter issued tickets.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "tickets": [
                {
                    "id": "string",
                    "did": "string",
                    "ssi": "string",
                    "publicKey": "string",
                    "title": "string",
                    "fullName": "string",
                    "description": "string",
                    "subject": "string",
                    "media": "string",
                    "avatar": "string",
                    "metadata": {},
                    "claims": [],
                    "tags": [],
                    "didDocument": "string",
                    "vcDocument": "string",
                    "asset": "string",
                    "issuance": "string",
                    "expiration": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/issuance`

- **Description**: Issues a verifiable ticket.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": true },
        "ssi": { "type": "string", "nullable": true },
        "title": { "type": "string", "nullable": true },
        "fullName": { "type": "string", "nullable": true },
        "description": { "type": "string", "nullable": true },
        "subject": { "type": "string", "nullable": true },
        "media": { "type": "string", "nullable": true },
        "avatar": { "type": "string", "nullable": true },
        "document": { "type": "string", "nullable": true },
        "metadata": { "type": "object", "nullable": true },
        "claims": { "type": ["string"], "nullable": true },
        "tags": { "type": ["string"], "nullable": true },
        "expiration": { "type": "string", "nullable": true },
        "chain": { "type": "string", "nullable": true },
        "network": { "type": "string", "nullable": true },
        "project": { "type": "string", "nullable": true }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "ticket": {
                "id": "string",
                "did": "string",
                "cid": "string",
                "publicKey": "string",
                "fullName": "string",
                "ssi": "string",
                "didDocument": "string",
                "vcDocument": "string",
                "asset": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## VERIFICATION

### GET `/verification`

- **Description**: Fetches verifiable credential verification results.
- **Query Parameters**:
    - `uid` (string, required): The VC Verification identifier.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "tickets": [
                {
                    "id": "string",
                    "did": "string",
                    "publicKey": "string",
                    "ssiId": "string",
                    "didDocument": "string",
                    "vcDocument": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```


        

### POST `/verification`

- **Description**: Verifies a verifiable credential.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "did": { "type": "string", "nullable": false },
        "ssiId": { "type": "string", "nullable": true },
        "project": { "type": "string", "nullable": false },
        "chain": { "type": "string", "nullable": false },
        "network": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "ticket": {
                "id": "string",
                "did": "string",
                "publicKey": "string",
                "ssiId": "string",
                "didDocument": "string",
                "vcDocument": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## AUTH

### GET `/auth`

- **Description**: Checks the status of a JWT token.
- **Query Parameters**:
    - `token` (string, required): The JWT token to verify.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "auth": [
                {
                    "token": "string",
                    "issuance": "string",
                    "expiration": "string",
                    "status": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/auth`

- **Description**: Authenticates a user in the protocol and returns a JWT.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "signedTxn": { "type": "string", "nullable": false },
        "ssi": { "type": "string", "nullable": true },
        "chain": { "type": "string", "nullable": true, "default": "algorand" },
        "network": { "type": "string", "nullable": true, "default": "mainnet" },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "auth": {
                "id": "string",
                "did": "string",
                "didDocument": "string",
                "issuance": "string",
                "expiration": "string",
                "token": "string",
                "publicKey": "string",
                "fullName": "string",
                "asset": "string",
                "status": "string",
                "isSsi": true,
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## REVOKE

### GET `/revoke`

- **Description**: Checks if a DID has been revoked.
- **Query Parameters**:
    - `did` (string, required): The DID to check for revocation.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "revocations": [
                {
                    "did": "string",
                    "issuance": "string",
                    "expiration": "string",
                    "status": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/revoke`

- **Description**: Revokes a DID in the protocol. Only the issuer can revoke it.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "signedTxn": { "type": "string", "nullable": false },
        "did": { "type": "string", "nullable": true },
        "chain": { "type": "string", "nullable": true, "default": "algorand" },
        "network": { "type": "string", "nullable": true, "default": "mainnet" },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "revoked": {
                "id": "string",
                "did": "string",
                "didDocument": "string",
                "isSSi": true,
                "isVc": true,
                "issuance": "string",
                "expiration": "string",
                "publicKey": "string",
                "status": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## ROTATE

### GET `/rotate`

- **Description**: Checks DID rotation status.
- **Query Parameters**:
    - `did` (string, required): The DID to check rotation status for.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "rotations": [
                {
                    "did": "string",
                    "issuance": "string",
                    "expiration": "string",
                    "status": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

### POST `/rotate`

- **Description**: Rotates a DID in the protocol. Only the issuer can rotate it.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "signedTxn": { "type": "string", "nullable": false },
        "did": { "type": "string", "nullable": true },
        "chain": { "type": "string", "nullable": true, "default": "algorand" },
        "network": { "type": "string", "nullable": true, "default": "mainnet" },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "rotated": {
                "id": "string",
                "did": "string",
                "didDocument": "string",
                "isSSi": true,
                "isVc": true,
                "issuance": "string",
                "expiration": "string",
                "publicKey": "string",
                "status": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## RESOLVE

### GET `/resolve`

- **Description**: Resolves and returns a DID document.
- **Query Parameters**:
    - `did` (string, required): The DID to resolve.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "dids": [
                {
                    "did": "string",
                    "didDocument": "string",
                    "issuance": "string",
                    "expiration": "string",
                    "status": "string",
                    "chain": "string",
                    "network": "string",
                    "project": "string"
                }
            ]
        }
        ```

## IPFS

### GET `/ipfs`

- **Description**: Fetches IPFS content by CID.
- **Query Parameters**:
    - `cid` (string, required): The CID to fetch.

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "ipfs": {
                "did": "string",
                "cid": "string",
                "content": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

### POST `/ipfs`

- **Description**: Pins content to IPFS and returns a CID (pinned to Pinata and CrustNetwork).
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "content": { "type": "string", "nullable": false },
        "chain": { "type": "string", "nullable": true, "default": "algorand" },
        "network": { "type": "string", "nullable": true, "default": "mainnet" },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "ipfs": {
                "cid": "string",
                "publicKey": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```
        
## RENEW-AUTH

### POST `/renew-auth`

- **Description**: Renews an existing JWT token.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "token": { "type": "string", "nullable": false },
        "chain": { "type": "string", "nullable": true, "default": "algorand" },
        "network": { "type": "string", "nullable": true, "default": "mainnet" },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "auth": {
                "id": "string",
                "did": "string",
                "didDocument": "string",
                "issuance": "string",
                "expiration": "string",
                "token": "string",
                "publicKey": "string",
                "asset": "string",
                "status": "string",
                "isSsi": true,
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```

## DID-LINKED-RESOURCE (DLR)

### POST `/dlr`

- **Description**: Registers a DID-linked resource and adds it to a DID’s document metadata.
- **Request Body** (`application/json`):
    ```json
    {
        "publicKey": { "type": "string", "nullable": false },
        "signedTxn": { "type": "string", "nullable": false },
        "did": { "type": "string", "nullable": true },
        "linkedResource": { "type": "string", "nullable": false },
        "chain": { "type": "string", "nullable": true, "default": "algorand" },
        "network": { "type": "string", "nullable": true, "default": "mainnet" },
        "project": { "type": "string", "nullable": false }
    }
    ```

- **Responses**:
    - **200**:
        ```json
        {
            "openapi": "3.1.0",
            "dlr": {
                "id": "string",
                "did": "string",
                "didDocument": "string",
                "linkedResource": "string",
                "publicKey": "string",
                "chain": "string",
                "network": "string",
                "project": "string"
            }
        }
        ```


## Contributing

We welcome contributions and suggestions. Please open a pull request or an issue on our GitHub repository if you have any questions or ideas.

## License

This API and its documentation are provided for informational and integration purposes. For licensing information, consult the official GoPlausible or contact the team members on socials.




