# PLAUSIBLE Protocol
### W3C Compliant DIDs, Verifiable Credentials and OpenBadges powered by Algorand Blockchain
![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)

### This documentation is subject to update for newer updates please refer to [GoPlausible FAQ](https://goplausible.gitbook.io/goplausible/)
### PLAUSIBLE is a W3C Compliant DIDs, Verifiable Credentials, OpenBadges, and smart utility NFTs protocol built on [Algorand](https://algorand.co).

- [PLAUSIBLE protocol Concept](#plausible-protocol-concept)

- [GoPlausible Links](#goplausible-links)

- [GoPlausible Repositories](#goplausible-code-repositories)

- [PLAUSIBLE protocol Technical Design](#plausible-protocol-technical-design)
  - [Issuer's Journey](#issuers-journey)
  - [Claimer's Journey](#claimers-journey)
  - [Smart Contracts](#plausible-smart-contracts)

## GoPlausible links
[top↑](#plausible_protocol)

- [GoPlausible Github Repos & Documentation](https://github.com/GoPlausible)

- [GoPlausible Website (plausible.com)](https://goplausible.com)

- [GoPlausible dApp (plausible.xyz)](https://goplausible.xyz)
  
- [GoPlausible Universal DID/URL Resolver (ThisDID.com)](https://thisdid.com)

- [GoPlausible TESTNET dApp (testnet.plausible.xyz)](https://testnet.goplausible.xyz)
 
- [PLAUSIBLE protocol verified NFD (plausible.algo)](https://app.nf.domains/name/plausible.algo)
  
- [GoPLAUSIBLE account verified NFD (goplausible.algo)](https://app.nf.domains/name/goplausible.algo)


## PLAUSIBLE protocol concept:
[top↑](#plausible_protocol)


GoPlausible dApp is consisted of a frontend calling an PLAUSIBLE protocol smart contract ABIs and APIS. Some contract to contarct (C2C) calls are made by PLAUSIBLE parent contract to PLAUS contracts.

PLAUSIBLE protocol complies to [ARC3](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md) and [ARC4](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md) living standards on Algorand.

![PLAUSIBLE protocol Concept Diagram](https://github.com/GoPlausible/.github/blob/main/profile/Plausible%20Concept%20Diagram.jpeg)



# PLAUSIBLE protocol technical design:
[top↑](#plausible_protocol)

PLAUSIBLE protocol features :

- All operations are in full compliance and conformance to W3C DID, VC, VP , DRL and other standards.

- Geo (allow and ban lists), Time, List, Token, Github, SSI and email constraint features.
  
- WebAuthn, Oauth 2.2, OIDC, OIDC-VC integration.
  
- Double pinning of all IPFS content (media and metadata) into Pinata and CrustNetwork (the best centralized and the best decentralized networks for IPFS pinning).
  
- Dynamic NFTs per PLAUS (PLAUSIBLE protocol is 100% token-less and NFTs are generated and owned by PLAUS contract which belongs to PLAUS issuer).
  


PLAUSIBLE protocol is consisted of a frontend and smart contracts on Algorand chain:
- Frontend (Cloudflare Pages React SPA/PWA )
- Edge workers (Cloudflare Workers for GoPlausible public and private APIs)
- Smart Contracts (Algorand smart contracts and GoPlausible ABIs)


PLAUSIBLE protocol's frontend has 3 major functions (all in a single view for simplicity):
- Wallet Session
- Issuer UI
- Claimer UI

Note: Frontend is accessible through cloudflare pages and page workers (heavily distributed globally on edge).


```mermaid
  flowchart LR
  subgraph PLAUSIBLE
    direction TB
    subgraph Frontend
        direction RL
        Issuer_UI
        Claimer_UI
    end
    subgraph ASC
        direction TB
        PLAUSIBLE_ASC
        PLAUS_ASC
        
    end
  end
  Issuer --> PLAUSIBLE
  Claimer --> PLAUSIBLE
  Frontend --> ASC
  
```

----

### PLAUS Issuer's Journey:
[top↑](#plausible_protocol)

1- Issuer easily gets onboard to GoPlausible by opting into PLAUSIBLE protocol's parent Algorand smart contract. This issues a DID and a Verifiable Credential by PLAUSIBLE protocol for the issuer and combined with account's NFD , creates a profile.

2- Then can Issue new PLAUS (W3C DID based verifiable credentials with NFTs in background).

3- Then activate the PLAUS to let claims begin (This differs than start time option).


Options available for PLAUS creation:

- Time (default enabled): Start time check (compared to LatestTimestamp)
- Geo: Country allow and ban lists.
- Signature: Issuer's signature is needed to make PLAUS claimable for every Claimer, individually. Each and every Claimer can receive their single claimed PLAUS (in NFT or TXN depending on PLAUS configuration) only after Issuer's authorization via a successful method call (which obviously should happen after both venue activation and venue start time). 
- QRCode: Upon activation a secret key will be generated and included in a transaction as a method input parameter and this TXN is then communicated by a QRCode in venue location and Claimer scans this QRCode during physical presence and claims (other arguments will be added to this raw transaction object after scan and when claiming).

Note: QRCode feature is still under heavy re-ideation, re-design and re-everything! So please, kindly consider it WIP and FUTURE release functionality!



```mermaid
sequenceDiagram 
actor Issuer
participant PLAUSIBLE
participant PLAUSIBLE_ASC
participant Plaus_ASC
Issuer ->> PLAUSIBLE: Connect wallet
Issuer ->> PLAUSIBLE: Sign Optin Call
PLAUSIBLE ->> PLAUSIBLE_ASC: Optin Call
PLAUSIBLE_ASC -->> PLAUSIBLE: Return
Note left of PLAUSIBLE: Onboarding
Issuer ->> PLAUSIBLE: Sign `create_plaus` Method TXN
PLAUSIBLE ->> PLAUSIBLE_ASC:  `create_plaus` Method Call
PLAUSIBLE_ASC -->> PLAUSIBLE: Return
Note left of PLAUSIBLE_ASC: Create PLAUS
Issuer ->> PLAUSIBLE: Sign `activate_plaus` Method TXN
PLAUSIBLE ->> Plaus_ASC: `activate_plaus` Method Call (creates NFT as well)
Plaus_ASC -->> PLAUSIBLE: Return
Note right of PLAUSIBLE_ASC: Activate PLAUS
Issuer ->> PLAUSIBLE: Sign `sig_plaus` Method TXN
PLAUSIBLE ->> PLAUSIBLE_ASC: `sig_plaus` Method Call 
PLAUSIBLE_ASC -->> PLAUSIBLE: Return
Note right of PLAUSIBLE_ASC: Release SIG PLAUS
Note right of PLAUSIBLE_ASC: Only when SIG option is enabled on PLAUSIBLE



```
----
### Claimer's Journey:
[top↑](#plausible_protocol)

1- After PLAUS activation (by Issuer) and by satisfying what PLAUS configuration mandates from claimers, eligible users can claim the PLAUS and get NFT and attached Verifiable Credential if approved by PLAUS smart contract.

2- Claimer simply gets onboard by opting into parent ASC from UI (one button click).

3-  Then get a searchable list of claimed PLAUS so far and can activate the creator mode to Issue new PLAUS at any time given there is enough balance in the account.


```mermaid
sequenceDiagram 
actor Claimer
participant PLAUSIBLE
participant PLAUSIBLE_ASC
participant PLAUS_ASC
Claimer ->> PLAUSIBLE: Connect wallet
Claimer ->> PLAUSIBLE: Sign Optin Call
PLAUSIBLE ->> PLAUSIBLE_ASC: Optin Call
PLAUSIBLE_ASC -->> PLAUSIBLE: Return
Note left of PLAUSIBLE: Onboarding

Claimer ->> PLAUSIBLE: Sign `apply_plaus` Method TXN
PLAUSIBLE ->> PLAUS_ASC:  `apply_plaus` Method Call
PLAUS_ASC -->> PLAUSIBLE: Return
Note right of PLAUSIBLE_ASC: Apply for PLAUS


Claimer ->> PLAUSIBLE: Sign `claim_plaus` Method TXN
PLAUSIBLE ->> PLAUS_ASC: `claim_plaus` Method Call ( plus optin TXN to PLAUS NFT, if required)
Note right of PLAUSIBLE_ASC: Claim PLAUS
Note right of PLAUSIBLE_ASC: Needs providing required options if configured (Geo, Time, QR)
PLAUS_ASC -->> Claimer: Send NFT
Note right of PLAUSIBLE_ASC: Requires existence of signed release by issuer in global state
PLAUS_ASC -->> PLAUSIBLE: Return

```

----

## PLAUSIBLE protocol Smart Contracts 
[top↑](#plausible_protocol)

PLAUSIBLE protocol smart contract system is designed on basis of features & opcodes in TEAL v 8.0 on AVM8. PLAUSIBLE Parent contract generates and configures and controls only the lifecycles step of each PLAUS. The PLAUS internals and operations are solely controlled by PLAUS issuer.


### Entities Relations:

```mermaid
  graph TD;
      GoPlausible_Service== manages ==>Parent_PLAUSIBLE_ASC;
      Parent_PLAUSIBLE_ASC== manages ==>PLAUS_ASC;
      
      PLAUS_Claimer== interacts ==>PLAUS_ASC;
      PLAUS_Issuer== interacts ==>Parent_PLAUSIBLE_ASC;
      PLAUS_Issuer== interacts ==>PLAUS_ASC;
```

----

### Lifecycle:

```mermaid
  stateDiagram-v2
    [*] --> GoPlausible_Service
    GoPlausible_Service --> Parent_PLAUSIBLE_ASC
    Parent_PLAUSIBLE_ASC --> PLAUS_ASC
    PLAUS_ASC --> close
    Parent_PLAUSIBLE_ASC --> eol
    close --> archive
    eol --> archive
    archive --> [*]
```
----


### UseCase:

**Note: The NoOp calls without args will be rejected with error. This is being examined as a security practice**

```mermaid
  flowchart TB

    id1([Issuer]) --uses--> parentMethodCalls
    id1([Issuer]) --uses--> parentAppCalls
    id1([Issuer]) --uses--> plausMethodCalls
    

    id2([Claimer]) --uses--> parentAppCalls 
    id2([Claimer]) --uses--> plausMethodCalls 
  

    subgraph PLAUSIBLE
      
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
      subgraph plausASC
        
        
        subgraph plausAppCalls
        id13([create]) 
        id14([update]) 
        id15([delete]) 
        id17([closeout]) 
        end
        subgraph plausMethodCalls
        id18([setup]) 
        id18([activate]) 
        id19([claim]) 
        id20([release]) 
        end
      end
      
    end 
   
    
    

```
----

### PLAUSIBLE prtocol contract TEAL Graph:
[top↑](#plausible_protocol)

![PLAUSIBLE protocol ASC TEAL Graph](./main_contract.svg)

----

### PLAUSIBLE protocol ASC ABI :
[top↑](#plausible_protocol)

Note 1: Data fields are global states and boxes of PLAUSIBLE parent smart contract.


```mermaid
  classDiagram
    class PLAUSIBLE_ASC
    PLAUSIBLE_ASC : +Uint64 plaus_onboard_count
    PLAUSIBLE_ASC : +Uint64 plaus_count
    PLAUSIBLE_ASC : +Byte plaus_last_appid
    PLAUSIBLE_ASC : +Byte plaus_last_author
    PLAUSIBLE_ASC : +setup(string)string
    PLAUSIBLE_ASC : +item_create(pay,byte[],byte[])string
    PLAUSIBLE_ASC : +item_update(application,byte[],byte[])string
    PLAUSIBLE_ASC : +item_delete(application)void

    
```

----

### PLAUSIBLE ASC ABI Schema :
[top↑](#plausible_protocol)

```javascript
{
  "name":"plausible-contract",
  "desc": "PLAUSIBLE Parent smart contract",
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
          "desc": "Sets up the PLAUSIBLE main contract, sets and logs the version and returns"
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
          "desc": "Creates a new PLAUS smart contract and returns the app id"
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
          "desc": "Updates an PLAUS smart contract and returns item application ID"
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
          "desc": "Deletes an PLAUS smart contract and returns void (approve only)"
        }
  ]
}

```
----

### PLAUS ASC TEAL Graph:
[top↑](#plausible_protocol)

![PLAUS ASC TEAL Graph](./item_contract.svg)
----

### PLAUS ASC ABI :
[top↑](#plausible_protocol)

Note 1: Data fields are global states and boxes of PLAUS smart contract.

```mermaid
  classDiagram
    class PLAUS_ASC

    PLAUS_ASC : +Uint64 plaus_item_onboard_count
    PLAUS_ASC : +Uint64 plaus_item_txn_count
    PLAUS_ASC : +Uint64 plaus_item_claim_count

    PLAUS_ASC : +Uint64 plaus_start_timestamp
    PLAUS_ASC : +Uint64 plaus_end_timestamp
    PLAUS_ASC : +Byte plaus_name
    PLAUS_ASC : +Byte plaus_logo
    PLAUS_ASC : +Byte plaus_timezone
    PLAUS_ASC : +Byte plaus_desc
    PLAUS_ASC : +Byte plaus_address
    PLAUS_ASC : +Byte plaus_url
    PLAUS_ASC : +Byte plaus_web2
    PLAUS_ASC : +Byte plaus_nft_media
    PLAUS_ASC : +Byte plaus_has_geo
    PLAUS_ASC : +Byte plaus_has_release
    PLAUS_ASC : +Byte plaus_has_shared_secret
    PLAUS_ASC : +Byte plaus_claimer_qty
    PLAUS_ASC : +Byte author_pays_fee
    PLAUS_ASC : +Byte plaus_qr_secret
    PLAUS_ASC : +Byte plaus_hash


    PLAUS_ASC : +Uint64 plaus_parent_id
    PLAUS_ASC : +Byte plaus_parent_address
    PLAUS_ASC : +Byte plaus_author_address
    PLAUS_ASC : +Uint64 plaus_asa_id

    PLAUS_ASC : +Uint64 plaus_setup_time
    PLAUS_ASC : +Uint64 plaus_activate_time
    PLAUS_ASC : +Uint64 plaus_release_time


     PLAUS_ASC : +Byte plaus_is_activated
    PLAUS_ASC : +Byte plaus_is_setup
    PLAUS_ASC : +Byte plaus_is_released



 

    PLAUS_ASC : +setup(pay,account,application,string,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    PLAUS_ASC : +re_setup(pay,account,application,asset,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    PLAUS_ASC : +activate(pay,axfer,application,asset)string
    PLAUS_ASC : +claim(asset,application,pay,axfer,string,(uint64,uint64,uint64,uint64,uint64))string
    PLAUS_ASC : +release(application)string
    PLAUS_ASC : +get_metric(string)string
    PLAUS_ASC : +get_metrics()string
    
  
    
```

----

### PLAUS ASC ABI Schema :
[top↑](#plausible_protocol)

```javascript
{
    "name": "plaus-contract",
    "desc": "PLAUS smart contract",
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
            "desc": "Sets up an PLAUS contract"
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
            "desc": "Activates an PLAUS smart contract and returns string"
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
            "desc": "Claims a PLAUS for a claimer and returns NFT sending inner-transaction hash"
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
            "desc": "Releases PLAUS and allows all PLAUS claimer's to start claiming"
        }
    ]
}

```
----

***Since PLAUSIBLE protocol is totally decentralized, trustless and permission-less: Every Issuer has full authority of the created PLAUS, enforced by PLAUS smart contract.***

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




