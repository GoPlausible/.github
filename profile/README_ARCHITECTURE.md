# PLAUSIBLE protocol:

This document provides a technical overview and reference guide for the PLAUSIBLE protocol architecture, smart contracts, and design principles.

- [Back to GoPlausible](./README.md)
- [PLAUSIBLE Protocol API Docs guide](./README_API.md)

---


[top↑](#plausible-protocol)

### PLAUSIBLE Protocol Table of Contents:

  - [Protocl features](#plausible-protocol-features)
  - [Issuer's Journey](#issuers-journey)
  - [Claimer's Journey](#claimers-journey)
  - [Smart Contracts](#plausible-protocol-smart-contracts)

### PLAUSIBLE protocol features :
[top↑](#plausible-protocol)

- All operations are in full compliance and conformance to W3C DID, VC, VP , DRL and other standards.

- Geo (allow and ban lists), Time, List, Token, Github, SSI and email constraint features.
  
- WebAuthn, Oauth 2.2, OIDC, OIDC-VC integration.
  
- Double pinning of all IPFS content (media and metadata) into Pinata and CrustNetwork (the best centralized and the best-decentralized networks for IPFS pinning).
  
- Dynamic NFTs per PLAUS (PLAUSIBLE protocol is 100% token-less and NFTs are generated and owned by PLAUS contract which belongs to PLAUS issuer).
  


PLAUSIBLE protocol consists of a frontend and smart contracts on the Algorand chain:
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

### Issuers Journey:
[top↑](#plausible-protocol)

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
### Claimers Journey:
[top↑](#plausible-protocol)

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
[top↑](#plausible-protocol)

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
[top↑](#plausible-protocol)

![PLAUSIBLE protocol ASC TEAL Graph](./main_contract.svg)

----

### PLAUSIBLE protocol ASC ABI :
[top↑](#plausible-protocol)

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
[top↑](#plausible-protocol)

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
[top↑](#plausible-protocol)

![PLAUS ASC TEAL Graph](./item_contract.svg)
----

### PLAUS ASC ABI :
[top↑](#plausible-protocol)

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
[top↑](#plausible-protocol)

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
## Contributing

We welcome contributions and suggestions. Please open a pull request or an issue on our GitHub repository if you have any questions or ideas.

## License

This API and its documentation are provided for informational and integration purposes. For licensing information, consult the official GoPlausible or contact the team members on socials.

