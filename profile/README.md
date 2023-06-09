# Plausible (Formerly AlgoPOAP)
![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)

### This documentation is subject to update for newer updates please refer to [AlgoPOAP FAQ](https://algopoap.gitbook.io/algopoap/)
### AlgoPOAP is the Proof Of Anything Protocol on [Algorand](https://algorand.com) (AVM8), aiming at being extended into a Muti-Chain Protocol in future using Algorand State Proofs.

- [AlgoPOAP Concept](#algopoap-concept)

- [AlgoPOAP Links](#algopoap-links)

- [AlgoPOAP Repos](#algopoap-code-repositories)
  
- [AlgoPOAP Credits](#algopoap-credits)

- [AlgoPOAP Technical Design](#algopoap-technical-design)
  - [Author's Journey](#authors-journey)
  - [Claimer's Journey](#claimers-journey)
  - [Smart Contracts](#algopoap-smart-contracts)

## AlgoPOAP links
[top↑](#algopoap)

- [AlgoPOAP Github Repos & Documentation](https://github.com/AlgoPOAP)

- [AlgoPOAP Website (algopoap.com)](https://algopoap.com)

- [AlgoPOAP dApp (algopoap.xyz)](https://algopoap.xyz)

- [AlgoPOAP TESTNET dApp (testnet.algopoap.xyz)](https://testnet.algopoap.xyz)
 
- [Algorand NFDomain (algopoap.algo)](https://app.nf.domains/name/algopoap.algo)

## AlgoPOAP public code repositories:
[top↑](#algopoap)

- [AlgoPOAP's Smart Contracts Repository](https://github.com/AlgoPOAP/algopoap-smartcontracts)


## AlgoPOAP concept:
[top↑](#algopoap)


AlgoPOAP dApp is consisted of a frontend calling an Algorand ASC system in which ASCs use each other via inner transactions and C2C calls.

AlgoPOAP complies to [ARC3](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md) and [ARC4](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md) living standards on Algorand.

![AlgoPOAP Concept Diagram](https://raw.githubusercontent.com/AlgoPOAP/.github/main/profile/AlgoPOAP_Poster.jpeg)



## AlgoPOAP Credits
[top↑](#algopoap)

@emg110 and @sheghzo are grateful to Algorand Inc and Algorand Foundation for everything!

And special thanks to all AlgoPOAP Slack channel distinguished members for great ideas and comments which we used in AlgoPOAP.


# AlgoPOAP technical design:
[top↑](#algopoap)

AlgoPOAP features :

- Geo constraint option (Geofencing using connecting ISP country and allow and ban lists ).
  
- Authorization Signature constraint option (Author must sign the release before AlgoPOAP issuance for claimed claimers).
  
- Shared Secret constraint option (Claimer must scan a QRCode during calling the AlgoPOAP Item ASC with it in order to claim successfully).
  
- Dynamic NFTs per AlgoPOAP item (AlgoPOAP is 100% token-less and NFTs are generated and owned by AlgoPOAP item contract and that belongs to AlgoPOAP item's author).
  


AlgoPOAP is consisted of a frontend and smart contracts on Algorand chain:
- Frontend
- Smart Contracts


AlgoPOAP frontend has 3 major functions (all in a single view for simplicity):
- Wallet Session
- Author UI
- Claim UI

Note: Frontend will be available through both cloudflare (heavily distributed on edge) and IPFS to ensure decentralization (with transparent routing for best UX).


```mermaid
  flowchart LR
  subgraph AlgoPOAP
    direction TB
    subgraph Frontend
        direction RL
        Author_UI
        Claim_UI
    end
    subgraph ASC
        direction TB
        Parent_ASC
        Item_ASC
        
    end
  end
  Author --> AlgoPOAP
  Claimer --> AlgoPOAP
  Frontend --> ASC
  
```

----

### Author's Journey:
[top↑](#algopoap)

1- Author easily gets onboard by opting into AlgoPOAP's parent ASC.

2- Then can create a new AlgoPOAP venue.

3- Then activate the venue to let claims begin (This differs than start time option of AlgoPOAP).

Note : If SIG is not enabled for AlgoPOAP Venue, Claim approval will send AlgoPOAP NFT or TXN to Claimer's wallet but if SIG is enabled then after signing of Author, AlgoPOAP NFT or TXN will be sent automatically to Claimer's wallet, after author signs and sends a release method call transaction to release all successfully claimed AlgoPOAP Claimer. 

Options available for AlgoPOAP creation:

- Time (default enabled): Start time check (compared to LatestTimestamp)
- Geo: Country allow and ban lists.
- Signature: Author's signature is needed to make AlgoPOAP claimable for every Claimer, individually. Each and every Claimer can receive their single claimed AlgoPOAP (in NFT or TXN depending on AlgoPOAP config) only after Author's authorization via a successful method call (which obviously should happen after both venue activation and venue start time). 
- QRCode: Upon activation a secret key will be generated and included in a transaction as a method input parameter and this TXN is then communicated by a QRCode in venue location and Claimer scans this QRCode during physical presence and claims (other arguments will be added to this raw transaction object after scan and when claiming).

Note: QRCode feature is still under heavy re-ideation, re-design and re-everything! So please, kindly consider it WIP and FUTURE release functionality!



```mermaid
sequenceDiagram 
actor Author
participant AlgoPOAP
participant AlgoPoaP_ASC
participant AlgoPoaP_Item_ASC
Author ->> AlgoPOAP: Connect wallet
Author ->> AlgoPOAP: Sign Optin Call
AlgoPOAP ->> AlgoPoaP_ASC: Optin Call
AlgoPoaP_ASC -->> AlgoPOAP: Return
Note left of AlgoPOAP: Onboarding
Author ->> AlgoPOAP: Sign `create_algopoap` Method TXN
AlgoPOAP ->> AlgoPoaP_ASC:  `create_algopoap` Method Call
AlgoPoaP_ASC -->> AlgoPOAP: Return
Note left of AlgoPoaP_ASC: Create AlgoPOAP Venue
Author ->> AlgoPOAP: Sign `activate_algopoap` Method TXN
AlgoPOAP ->> AlgoPoaP_Item_ASC: `activate_algopoap` Method Call (creates NFT as well)
AlgoPoaP_Item_ASC -->> AlgoPOAP: Return
Note right of AlgoPoaP_ASC: Activate AlgoPOAP Venue
Author ->> AlgoPOAP: Sign `sig_algopoap` Method TXN
AlgoPOAP ->> AlgoPoaP_ASC: `sig_algopoap` Method Call 
AlgoPoaP_ASC -->> AlgoPOAP: Return
Note right of AlgoPoaP_ASC: Release SIG AlgoPOAP
Note right of AlgoPoaP_ASC: Only when SIG option is enabled on AlgoPOAP



```
----
### Claimer's Journey:
[top↑](#algopoap)

1- Claimer simply gets onboard by opting into parent ASC.

2- Then get a searchable list of AlgoPOAP venues and applys to one by opting into it.

3- Then after general venue activation (by author) and by satisfying what AlgoPOAP venue options require, claim the AlgoPOAP and get AlgoPOAP NFT if approved.

Note : If SIG is not enabled for AlgoPOAP Venue, Claim approval will send AlgoPOAP NFT to Claimer's wallet but if SIG is enabled then after signing of Author, it'l be sent automatically to Claimer's wallet.

```mermaid
sequenceDiagram 
actor Claimer
participant AlgoPOAP
participant AlgoPoaP_ASC
participant AlgoPoaP_Item_ASC
Claimer ->> AlgoPOAP: Connect wallet
Claimer ->> AlgoPOAP: Sign Optin Call
AlgoPOAP ->> AlgoPoaP_ASC: Optin Call
AlgoPoaP_ASC -->> AlgoPOAP: Return
Note left of AlgoPOAP: Onboarding

Claimer ->> AlgoPOAP: Sign `apply_algopoap` Method TXN
AlgoPOAP ->> AlgoPoaP_Item_ASC:  `apply_algopoap` Method Call
AlgoPoaP_Item_ASC -->> AlgoPOAP: Return
Note right of AlgoPoaP_ASC: Apply for AlgoPOAP Venue


Claimer ->> AlgoPOAP: Sign `claim_algopoap` Method TXN
AlgoPOAP ->> AlgoPoaP_Item_ASC: `claim_algopoap` Method Call ( plus optin TXN to AlgoPOAP NFT, if required)
Note right of AlgoPoaP_ASC: Claim AlgoPOAP
Note right of AlgoPoaP_ASC: Needs providing required options if configured (Geo, Time, QR)
AlgoPoaP_Item_ASC -->> Claimer: Send NFT
Note right of AlgoPoaP_ASC: Requires existence of signed release by author in global state
AlgoPoaP_Item_ASC -->> AlgoPOAP: Return

```

----

## AlgoPOAP Smart Contracts 
[top↑](#algopoap)

AlgoPOAP ASC System is designed on basis of newest TEAL features came with TEAL v 8.0 on AVM8. AlgoPOAP Parent contract is created and thereafter every AlgoPOAP item is created by this parent contract based on configurations needed.

All methods expenses and fee details are in following table (those not in this table have just normal 1 MinFee):

Note: This section (Fees) is subject to further updates and changes and is work in progress!

| Method | Fee           | Amount|
| ------------- |:-------------:| -----:|
| New AlgoPOAP                     | 1 MinFee      |   2 MinFee |
| Setup AlgoPOAP                   | 1 MinFee      |   1 MinFee |
| Activate AlgoPOAP(Author pays)   | 3 MinFee      |   Claimer_Qty * 4 * MinFee |
| Activate AlgoPOAP(Claimer pays) | 3 MinFee      |   1 MinFee |
| Release AlgoPOAP| 1 MinFee       | 1 MinFee      |   0  |
| Claim AlgoPOAP(Author pays)      | 1 MinFee      |   0  |
| Claim AlgoPOAP(Claimer pays)    | 4 MinFee      |   0  |

----

### Entities Relations:

```mermaid
  graph TD;
      AlgoPoaP_Service== manages ==>Parent_AlgoPoaP_ASC;
      Parent_AlgoPoaP_ASC== manages ==>AlgoPoaP_item_ASC;
      
      AlgoPoaP_Claimer== interacts ==>AlgoPoaP_item_ASC;
      AlgoPoaP_Author== interacts ==>Parent_AlgoPoaP_ASC;
      AlgoPoaP_Author== interacts ==>AlgoPoaP_item_ASC;
```

----

### Lifecycle:

```mermaid
  stateDiagram-v2
    [*] --> AlgoPoaP_Service
    AlgoPoaP_Service --> Parent_AlgoPoaP_ASC
    Parent_AlgoPoaP_ASC --> AlgoPoaP_item_ASC
    AlgoPoaP_item_ASC --> close
    Parent_AlgoPoaP_ASC --> eol
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
  

    subgraph AlgoPOAP
      
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

### AlgoPOAP ASC TEAL Graph:
[top↑](#algopoap)

![AlgoPOAP Item ASC TEAL Graph](./main_contract.svg)

----

### AlgoPOAP ASC ABI :
[top↑](#algopoap)

Note 1: Data fields are global states of AlgoPOAP parent smart contract.

Note 2: Fee collection is not included anywhere at this phase of AlgoPOAP MVP development but certainly is a priority prior to public TESTNET deployment. It happens on parent smart contract.

```mermaid
  classDiagram
    class AlgoPoaP_ASC
    AlgoPoaP_ASC : +Uint64 algopoap_onboard_count
    AlgoPoaP_ASC : +Uint64 algopoap_count
    AlgoPoaP_ASC : +Byte algopoap_last_appid
    AlgoPoaP_ASC : +Byte algopoap_last_author
    AlgoPoaP_ASC : +setup(string)string
    AlgoPoaP_ASC : +item_create(pay,byte[],byte[])string
    AlgoPoaP_ASC : +item_update(application,byte[],byte[])string
    AlgoPoaP_ASC : +item_delete(application)void

    
```
Note 3: Author user has all metrics in localState of AlgoPOAP Item smart contract and all Authored AlgoPoaPs (upt to 16 item) in localState of AlgoPOAP smart contract (parent) 

----

### AlgoPOAP ASC ABI Schema :
[top↑](#algopoap)

```javascript
{
  "name":"algopoap-contract",
  "desc": "AlgoPOAP Parent smart contract",
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
          "desc": "Sets up the AlgoPOAP main contract, sets and logs the version and returns"
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
          "desc": "Creates a new AlgoPOAP item smart contract and returns the app id"
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
          "desc": "Updates an AlgoPOAP item smart contract and returns item application ID"
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
          "desc": "Deletes an AlgoPOAP item smart contract and returns void (approve only)"
        }
  ]
}

```
----

### AlgoPOAP Item ASC TEAL Graph:
[top↑](#algopoap)

![AlgoPOAP Item ASC TEAL Graph](./item_contract.svg)
----

### AlgoPOAP ASC ITEM ABI :
[top↑](#algopoap)

Note 1: Data fields are global states of AlgoPOAP item smart contract.

```mermaid
  classDiagram
    class AlgoPoaP_ASC_ITEM

    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_item_onboard_count
    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_item_txn_count
    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_item_claim_count

    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_start_timestamp
    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_end_timestamp
    AlgoPoaP_ASC_ITEM : +Byte algopoap_name
    AlgoPoaP_ASC_ITEM : +Byte algopoap_logo
    AlgoPoaP_ASC_ITEM : +Byte algopoap_timezone
    AlgoPoaP_ASC_ITEM : +Byte algopoap_desc
    AlgoPoaP_ASC_ITEM : +Byte algopoap_address
    AlgoPoaP_ASC_ITEM : +Byte algopoap_url
    AlgoPoaP_ASC_ITEM : +Byte algopoap_web2
    AlgoPoaP_ASC_ITEM : +Byte algopoap_nft_media
    AlgoPoaP_ASC_ITEM : +Byte algopoap_has_geo
    AlgoPoaP_ASC_ITEM : +Byte algopoap_has_release
    AlgoPoaP_ASC_ITEM : +Byte algopoap_has_shared_secret
    AlgoPoaP_ASC_ITEM : +Byte algopoap_claimer_qty
    AlgoPoaP_ASC_ITEM : +Byte author_pays_fee
    AlgoPoaP_ASC_ITEM : +Byte algopoap_qr_secret
    AlgoPoaP_ASC_ITEM : +Byte algopoap_hash


    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_parent_id
    AlgoPoaP_ASC_ITEM : +Byte algopoap_parent_address
    AlgoPoaP_ASC_ITEM : +Byte algopoap_author_address
    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_asa_id

    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_setup_time
    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_activate_time
    AlgoPoaP_ASC_ITEM : +Uint64 algopoap_release_time


     AlgoPoaP_ASC_ITEM : +Byte algopoap_is_activated
    AlgoPoaP_ASC_ITEM : +Byte algopoap_is_setup
    AlgoPoaP_ASC_ITEM : +Byte algopoap_is_released



 

    AlgoPoaP_ASC_ITEM : +setup(pay,account,application,string,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    AlgoPoaP_ASC_ITEM : +re_setup(pay,account,application,asset,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    AlgoPoaP_ASC_ITEM : +activate(pay,axfer,application,asset)string
    AlgoPoaP_ASC_ITEM : +claim(asset,application,pay,axfer,string,(uint64,uint64,uint64,uint64,uint64))string
    AlgoPoaP_ASC_ITEM : +release(application)string
    AlgoPoaP_ASC_ITEM : +get_metric(string)string
    AlgoPoaP_ASC_ITEM : +get_metrics()string
    
  
    
```

----

### AlgoPOAP ASC ITEM ABI Schema :
[top↑](#algopoap)

```javascript
{
    "name": "algopoap-item-contract",
    "desc": "AlgoPOAP Item smart contract",
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
                    "name": "algopoap_name"
                },
                {
                    "type": "string",
                    "name": "algopoap_logo"
                },
                {
                    "type": "string",
                    "name": "algopoap_desc"
                },
                {
                    "type": "string",
                    "name": "algopoap_timezone"
                },
                {
                    "type": "string",
                    "name": "algopoap_address"
                },
                {
                    "type": "string",
                    "name": "algopoap_url"
                },
                {
                    "type": "string",
                    "name": "algopoap_web2"
                },
                {
                    "type": "(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)",
                    "name": "algopoap_uint64_tuple"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Sets up an AlgoPOAP smart contract item for the first time"
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
                    "name": "optin_algopoap_nft"
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
            "desc": "Activates an AlgoPOAP item smart contract and returns string"
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
            "desc": "Claims an AlgoPOAP for a claimer and returns NFT sending inner-transaction hash"
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
            "desc": "Releases AlgoPOAP and allows all AlgoPOAP claimer's to start claiming"
        }
    ]
}

```
----

Since AlgoPOAP is totally decentralized, trustless and permission-less: Every AlgoPOAP item author has full authority of the created PoaPs (AlgoPOAP-DAO is coming with dao, voting and governance features in near future, after startup formation. Preferably I will use integration to an already working service with ABI)!

The algopoap_contract.json contains the ABI Schema for parent AlgoPOAP contract and algopoap_item_contract.json is the full ABI Schema of AlgoPOAP item contract which will be created via an inner transaction.


### Simple basic deployment and unit tests included

Note: These are available under [AlgoPOAP's Smart Contracts Repository](https://github.com/AlgoPOAP/algopoap-smartcontracts) and more unit test scenarios are to be added for audit process.

```shell
> algopoap-smartcontracts@0.0.4 start
[ALGOPOAP: ] [2022-08-30T16:26:36.462Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:26:36.463Z] [info]: AlgoPOAP Item Contract ABI Exec method = ABIMethod {
  name: 'item_update',
  description: 'Updates an AlgoPOAP item smart contract and returns item application ID',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:26:42.933Z] [info]: AlgoPOAP Main Contract ABI Exec method result = 107325601
[ALGOPOAP: ] [2022-08-30T16:26:43.294Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:26:43.295Z] [info]: AlgoPOAP Item Contract ABI Exec method = ABIMethod {
  name: 're_setup',
  description: 'Sets up an AlgoPOAP smart contract item after first setup',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:26:51.351Z] [info]: AlgoPOAP Main Contract ABI Exec method result = 107325874
[ALGOPOAP: ] [2022-08-30T16:26:51.786Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:26:51.786Z] [info]: AlgoPOAP Item Contract ABI Exec method = ABIMethod {
  name: 'activate',
  description: 'Activates an AlgoPOAP item smart contract and returns string',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:26:59.712Z] [info]: AlgoPOAP Main Contract ABI Exec method result = algopoap_item_activate
[ALGOPOAP: ] [2022-08-30T16:27:00.134Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:27:00.134Z] [info]: AlgoPOAP Item Contract ABI Exec method = ABIMethod {
  name: 'release',
  description: "Releases AlgoPOAP and allows all AlgoPOAP claimers to start claiming",
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:27:07.941Z] [info]: AlgoPOAP Main Contract ABI Exec method result = algopoap_item_released
[ALGOPOAP: ] [2022-08-30T16:27:08.290Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:27:08.291Z] [info]: AlgoPOAP Item Contract ABI Exec method = ABIMethod {
  name: 'claim',
  description: 'Claims an AlgoPOAP for a claimer and returns NFT sending inner-transaction hash',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:27:16.355Z] [info]: AlgoPOAP Main Contract ABI Exec method result = algopoap_item_claimed


```





