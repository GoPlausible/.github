# AlgoPoaP
![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)

### AlgoPoaP (WIP) is the Proof of Attendance Protocol built on [Algorand](https://algorand.com) (AVM6) aims to be elevated into a Proof Of Anything Protocol in future with use of already in beta state proofs feature on Algorand (Proof of Anything is Parallel WIP in R&D phase using DevNET).

- [AlgoPoaP Concept](#algopoap-concept)

- [AlgoPoaP Links](#algopoap-links)

- [AlgoPoaP Repos](#algopoap-code-repositories)
  
- [AlgoPoaP Credits](#algopoap-credits)

- [AlgoPoaP Technical Design](#algopoap-technical-design)
  - [Author's Journey](#authors-journey)
  - [Attendee's Journey](#attendees-journey)
  - [Smart Contracts](#algopoap-smart-contracts)

## AlgoPoaP links
[top↑](#algopoap)

- [AlgoPoaP Github Repos & Documentation](https://github.com/AlgoPoaP)

- [AlgoPoaP Website (algopoap.com)](https://algopoap.com)

- [AlgoPoaP dApp (algopoap.xyz)](https://algopoap.xyz)
 
- [Algorand NFDomain (algopoap.algo)](https://app.nf.domains/name/algopoap.algo)

## AlgoPoaP public code repositories:
[top↑](#algopoap)

- [AlgoPoaP's Smart Contracts Repository](https://github.com/AlgoPoaP/algopoap-smartcontracts)


## AlgoPoaP concept:
[top↑](#algopoap)

The original idea of PoaP on blockchain is developed for Ethereum ecosystem and is Token based and lacks many features. AlgoPoaP elevates, extends and expands that original idea and implements it on Algorand. 

AlgoPoaP dApp is consisted of a frontend calling an Algorand ASC system in which ASCs use each other via inner transactions and C2C calls!

AlgoPoaP complies to [ARC3](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md) and [ARC4](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md) living standards on Algorand.

![AlgoPoaP Concept Diagram](https://user-images.githubusercontent.com/1900448/185964383-27897992-9d72-4847-b989-9fadb16c6a0e.png)

## Geo considerations:

Geo approximations on latitude and longitude unit changes (4 decimal place unit e.g. 0.0001):

- The latitude unit of change per 0.0001 change ~ 11 meters
- For longitude, the simplified approximation is used based on this schema generated using Geolib library (distance in meters per 0.0001 lng change on specific lat range).
  
```javascript
[
  {
    "lat": 0,
    "distance": 11
  },
  {
    "lat": 20,
    "distance": 10
  },
  {
    "lat": 32,
    "distance": 9
  },
  {
    "lat": 41,
    "distance": 8
  },
  {
    "lat": 48,
    "distance": 7
  },
  {
    "lat": 55,
    "distance": 6
  },
  {
    "lat": 61,
    "distance": 5
  },
  {
    "lat": 67,
    "distance": 4
  },
  {
    "lat": 72,
    "distance": 3
  },
  {
    "lat": 78,
    "distance": 2
  },
  {
    "lat": 83,
    "distance": 1
  },
  {
    "lat": 88,
    "distance": 0
  }
]

```
Latitudes are "parallels" while longitudes are "meridians" that all meet at the poles. For latitude, there is a set distance traveled per degree latitude no matter where you are on a spherical globe. For longitude, it depends what latitude you are at.

[Use this link to play around distance change per unit of lng on each lat](https://www.movable-type.co.uk/scripts/latlong.html)

![Lines of Latitude and Longitude](https://i.stack.imgur.com/BBmMe.gif)
----

## AlgoPoaP Credits
[top↑](#algopoap)

@emg110 and @sheghzo are grateful to Algorand Inc and Algorand Foundation for creating such amazing technologies , ecosystem and community in which we proudly BUIDL!

Also would like to express great gratitude toward:

- Adriana Belotti (The original idea and initiative of having PoaP on Algorand).
- Johana Moran for endless support and guidance.
- Jason Lee for being a mountain of support and motivation.
- David Greaney for all support and productive guidlines
- Joe Polney for precious technical guidance and endless help.

And eternal gratitude toward:
- Jason Weathersby who I learned everything I know on TEAL from.
- Ryan R Fox: Who started my new life chapter with Algorand, helps me and mentors me.
- Russ Fustino: Who kindly tutored me and helped me greatly.
- Benjamin Guidarelli : A super Dev and great person who always helps me in time of need and endures all my questions!
- Nullun: A super Dev and amazing person who always helps me .

And special thanks to David Greaney, Joe Polney, and Evangelina Machado for great ideas and comments which we used in AlgoPoaP.


# AlgoPoaP technical design:
[top↑](#algopoap)

AlgoPoaP features that are not available on ETH PoaP (it actually only supports time currently!):

- Geo constraint option (location + buffer area radius).
  
- Authorization Signature constraint option (Author must sign the release before PoaP issuance for claimed Attendees).
  
- QRCode constraint option (Attendee must scan and then call the AlgoPoaP Item ASC with it in order to claim).
  
- NFT based or NFT-less (Using transaction note only).
  

Note: AlgoPoaP does not use a single token for issuing PoaPs and is token-less , instead it uses a per AlgoPoaP item NFT generation (if desired by Author) approach. 


AlgoPoaP is consisted of a frontend and smart contracts on Algorand chain:
- Frontend
- Smart Contracts


AlgoPoaP frontend has 3 major functions (all in a single view for simplicity):
- Wallet Session
- Author UI
- Attend UI

Note: Frontend will be available through both cloudflare (heavily distributed on edge) and IPFS to ensure decentralization (with transparent routing for best UX).


```mermaid
  flowchart LR
  subgraph AlgoPoaP
    direction TB
    subgraph Frontend
        direction RL
        Author_UI
        Attend_UI
    end
    subgraph ASC
        direction TB
        Parent_ASC
        Item_ASC
        
    end
  end
  Author --> AlgoPoaP
  Attendee --> AlgoPoaP
  Frontend --> ASC
  
```

----

### Author's Journey:
[top↑](#algopoap)

1- Author easily gets onboard by opting into AlgoPoaP's parent ASC.

2- Then can create a new PoaP venue.

3- Then activate the venue to let claims begin (This differs than start time option of PoaP).

Note : If SIG is not enabled for PoaP Venue, Claim approval will send PoaP NFT or TXN to Attendee's wallet but if SIG is enabled then after signing of Author, PoaP NFT or TXN will be sent automatically to attendee's wallet, after author signs and sends a release method call transaction to release all successfully claimed AlgoPoaP attendees. 

Options available for PoaP creation:

- Time (default enabled): Start time check (compared to LatestTimestamp)
- Geo: Location point check to be inside a geofence with desired radius (in meters with min of 5m and max of 1000m).
- Signature: Author's signature is needed to make PoaP claimable for every attendee, individually. Each and every attendee can receive their single claimed PoaP (in NFT or TXN depending on PoaP config) only after Author's authorization via a successful method call (which obviously should happen after both venue activation and venue start time). 
- QRCode: Upon activation a secret key will be generated and included in a transaction as a method input parameter and this TXN is then communicated by a QRCode in venue location and Attendee scans this QRCode during physical presence and claims (other arguments will be added to this raw transaction object after scan and when claiming).

Note: QRCode feature is still under heavy re-ideation, re-design and re-everything! So please, kindly consider it WIP and FUTURE release functionality!



```mermaid
sequenceDiagram 
actor Author
participant AlgoPoaP
participant AlgoPoaP_ASC
participant AlgoPoaP_Item_ASC
Author ->> AlgoPoaP: Connect wallet
Author ->> AlgoPoaP: Sign Optin Call
AlgoPoaP ->> AlgoPoaP_ASC: Optin Call
AlgoPoaP_ASC -->> AlgoPoaP: Return
Note left of AlgoPoaP: Onboarding
Author ->> AlgoPoaP: Sign `create_poap` Method TXN
AlgoPoaP ->> AlgoPoaP_ASC:  `create_poap` Method Call
AlgoPoaP_ASC -->> AlgoPoaP: Return
Note left of AlgoPoaP_ASC: Create PoaP Venue
Author ->> AlgoPoaP: Sign `activate_poap` Method TXN
AlgoPoaP ->> AlgoPoaP_Item_ASC: `activate_poap` Method Call (creates NFT as well)
AlgoPoaP_Item_ASC -->> AlgoPoaP: Return
Note right of AlgoPoaP_ASC: Activate PoaP Venue
Author ->> AlgoPoaP: Sign `sig_poap` Method TXN
AlgoPoaP ->> AlgoPoaP_ASC: `sig_poap` Method Call 
AlgoPoaP_ASC -->> AlgoPoaP: Return
Note right of AlgoPoaP_ASC: Release SIG PoaP
Note right of AlgoPoaP_ASC: Only when SIG option is enabled on PoaP



```
----
### Attendee's Journey:
[top↑](#algopoap)

1- Attendee simply gets onboard by opting into parent ASC.

2- Then get a searchable list of PoaP venues and applys to one by opting into it.

3- Then after general venue activation (by author) and by satisfying what PoaP venue options require, claim the PoaP and get PoaP NFT if approved.

Note : If SIG is not enabled for PoaP Venue, Claim approval will send PoaP NFT to Attendee's wallet but if SIG is enabled then after signing of Author, it'l be sent automatically to attendee's wallet.

```mermaid
sequenceDiagram 
actor Attendee
participant AlgoPoaP
participant AlgoPoaP_ASC
participant AlgoPoaP_Item_ASC
Attendee ->> AlgoPoaP: Connect wallet
Attendee ->> AlgoPoaP: Sign Optin Call
AlgoPoaP ->> AlgoPoaP_ASC: Optin Call
AlgoPoaP_ASC -->> AlgoPoaP: Return
Note left of AlgoPoaP: Onboarding

Attendee ->> AlgoPoaP: Sign `apply_poap` Method TXN
AlgoPoaP ->> AlgoPoaP_Item_ASC:  `apply_poap` Method Call
AlgoPoaP_Item_ASC -->> AlgoPoaP: Return
Note right of AlgoPoaP_ASC: Apply for PoaP Venue


Attendee ->> AlgoPoaP: Sign `claim_poap` Method TXN
AlgoPoaP ->> AlgoPoaP_Item_ASC: `claim_poap` Method Call ( plus optin TXN to PoaP NFT, if required)
Note right of AlgoPoaP_ASC: Claim PoaP
Note right of AlgoPoaP_ASC: Needs providing required options if configured (Geo, Time, QR)
AlgoPoaP_Item_ASC -->> Attendee: Send NFT
Note right of AlgoPoaP_ASC: Requires existence of signed release by author in global state
AlgoPoaP_Item_ASC -->> AlgoPoaP: Return

```

----

## AlgoPoaP Smart Contracts 
[top↑](#algopoap)

AlgoPoaP ASC System is designed on basis of newest TEAL features came with TEAL v 6.0 on AVM6. AlgoPoaP Parent contract is created and thereafter every AlgoPoaP item is created by this parent contract based on configurations needed.

All methods expenses and fee details are in following table (those not in this table have just normal 1 MinFee):

| Method | Fee           | Amount|
| ------------- |:-------------:| -----:|
| New PoaP                     | 1 MinFee      |   2 MinFee |
| Setup PoaP                   | 1 MinFee      |   1 MinFee |
| Activate PoaP(Author pays)   | 3 MinFee      |   Attendee_Qty * 3 * MinFee |
| Activate PoaP(Attendee pays) | 3 MinFee      |   1 MinFee |
| Release PoaP| 1 MinFee       | 1 MinFee      |   0  |
| Claim PoaP(Author pays)      | 1 MinFee      |   0  |
| Claim PoaP(Attendee pays)    | 2 MinFee      |   0  |

----

### Entities Relations:

```mermaid
  graph TD;
      AlgoPoaP_Service== manages ==>Parent_AlgoPoaP_ASC;
      Parent_AlgoPoaP_ASC== manages ==>AlgoPoaP_item_ASC;
      
      AlgoPoaP_Attendee== interacts ==>AlgoPoaP_item_ASC;
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
    

    id2([Attendee]) --uses--> parentAppCalls 
    id2([Attendee]) --uses--> itemMethodCalls 
  

    subgraph AlgoPoaP
      
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
        id11([get_metric]) 
        id11([get_metrics]) 
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
        id21([get_metric]) 
        id21([get_metrics]) 
        end
      end
      
    end 
   
    
    

```
----

### AlgoPoaP ASC TEAL Graph:
[top↑](#algopoap)

```mermaid
  stateDiagram-v2
    [*] --> b_main
   
    b_main --> b_method_check
    b_main --> b_creation
    b_creation --> b_log_return

    b_main --> b_optin
    b_optin --> b_log_return

    b_main --> b_deletion
    b_deletion --> b_log_return

    b_main --> b_update
    b_update --> b_log_return

    b_main --> b_closeout
    b_closeout --> b_log_return


    b_method_check --> setup
    setup --> b_log_return
    
    b_method_check --> item_create
    item_create --> b_log_return

    b_method_check --> item_delete
    item_delete --> b_log_return

    b_method_check --> item_update
    item_update --> b_log_return

   
    b_method_check --> get_metrics
    get_metrics --> sub_metrics_update
    sub_metrics_update --> get_metrics
    get_metrics --> b_log_return

    b_method_check --> get_metric
    get_metric --> sub_metric_update
    sub_metric_update --> get_metric
    get_metric --> b_log_return

    b_main --> b_noop
    b_noop --> b_error

    b_main --> b_error

    b_log_return --> [*]
    
```
----

### AlgoPoaP ASC ABI :
[top↑](#algopoap)

Note 1: Data fields are global states of AlgoPoaP parent smart contract.

Note 2: Fee collection is not included anywhere at this phase of AlgoPoaP MVP development but certainly is a priority prior to public TESTNET deployment. It happens on parent smart contract.

```mermaid
  classDiagram
    class AlgoPoaP_ASC
    AlgoPoaP_ASC : +Uint64 poap_onboard_count
    AlgoPoaP_ASC : +Uint64 poap_count
    AlgoPoaP_ASC : +Byte poap_last_appid
    AlgoPoaP_ASC : +setup(string)string
    AlgoPoaP_ASC : +item_create(pay,byte[],byte[])string
    AlgoPoaP_ASC : +item_update(application,byte[],byte[])string
    AlgoPoaP_ASC : +item_delete(application)void
    AlgoPoaP_ASC : +get_metrics()string
    AlgoPoaP_ASC : +get_metric(string)string
    
```
Note 3: Author user has all metrics in localState of AlgoPoaP Item smart contract and all Authored AlgoPoaPs (upt to 16 item) in localState of AlgoPoaP smart contract (parent) 

----

### AlgoPoaP ASC ABI Schema :
[top↑](#algopoap)

```javascript
{
  "name":"algopoap-contract",
  "desc": "AlgoPoaP Parent smart contract",
  "networks":{
      "MainNet":{
          "appID": 0
      },
      "TestNet":{
          "appID": 106595642
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
          "desc": "Sets up the AlgoPoaP main contract, sets and logs the version and returns"
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
          "desc": "Creates a new AlgoPoaP item smart contract and returns the app id"
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
          "desc": "Updates an AlgoPoaP item smart contract and returns item application ID"
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
          "desc": "Deletes an AlgoPoaP item smart contract and returns void (approve only)"
        },
        {
          "name": "get_metric",
          "args": [
            {
              "type": "string",
              "name": "metric_signature"
            }
          ],
          "returns": {
            "type": "string"
          },
          "desc": "Gets an specific metric by signature string"
        },
        {
          "name": "get_metrics",
          "args": [],
          "returns": {
              "type": "string"
          },
          "desc": "Gets all metrics"
      }
  ]
}

```
----

### AlgoPoaP Item ASC TEAL Graph:
[top↑](#algopoap)

```mermaid
  stateDiagram-v2
    [*] --> b_main
    b_main --> b_method_check
    b_main --> b_creation
    b_creation --> b_log_return
    b_main --> b_optin
    b_optin --> b_log_return
    b_main --> b_deletion
    b_deletion --> b_log_return
    b_main --> b_update
    b_update --> b_log_return
    b_main --> b_closeout
    b_closeout --> b_log_return

 
    b_main --> b_noop
    
    b_noop --> b_error
    b_main --> b_error
  

    b_method_check --> setup
    setup --> sub_create_nft
    setup --> b_nft_create
    sub_create_nft --> setup
    b_nft_create --> b_log_return
    setup --> b_log_return

    b_method_check --> activate
    activate --> b_log_return

    b_method_check --> release
    release --> b_log_return

    b_method_check --> claim

    claim --> sub_check_timestamp
    sub_check_timestamp --> claim
   

    claim --> b_has_sig
    b_has_sig --> sub_check_release
    sub_check_release --> b_has_sig
    b_has_sig --> b_has_geo
    b_has_sig --> b_has_qr
    b_has_sig --> b_finalize_claim
    b_has_geo --> sub_check_geo
    sub_check_geo --> b_has_geo
    b_has_geo --> b_has_qr
    
    b_has_qr --> sub_check_qr
    sub_check_qr --> b_has_qr

  


    claim --> b_finalize_claim
    b_finalize_claim --> sub_nft_send
    sub_nft_send --> b_finalize_claim
    b_finalize_claim --> b_log_return

  
    b_method_check --> get_metric
    get_metric --> b_log_return
    
  
    b_method_check --> get_metrics
    get_metrics --> b_log_return
    b_method_check --> b_error
    
    b_log_return --> [*]
    
```
----

### AlgoPoaP ASC ITEM ABI :
[top↑](#algopoap)

Note 1: Data fields are global states of AlgoPoaP item smart contract.

```mermaid
  classDiagram
    class AlgoPoaP_ASC_ITEM
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_attendee_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_claim_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_nft_issuance_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_txn_issuance_count
  
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_attendee
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_claim
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_nft_issuance
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_txn_issuance


    AlgoPoaP_ASC_ITEM : +Uint64 poap_lat
    AlgoPoaP_ASC_ITEM : +Uint64 poap_lat_dec
    AlgoPoaP_ASC_ITEM : +Uint64 poap_lng
    AlgoPoaP_ASC_ITEM : +Uint64 poap_lng_dec
    AlgoPoaP_ASC_ITEM : +Uint64 poap_geo_buffer
    AlgoPoaP_ASC_ITEM : +Uint64 poap_start_timestamp
    AlgoPoaP_ASC_ITEM : +Uint64 poap_end_timestamp
    AlgoPoaP_ASC_ITEM : +Byte poap_name
    AlgoPoaP_ASC_ITEM : +Byte poap_logo
    AlgoPoaP_ASC_ITEM : +Byte poap_timezone
    AlgoPoaP_ASC_ITEM : +Byte poap_desc
    AlgoPoaP_ASC_ITEM : +Byte poap_address
    AlgoPoaP_ASC_ITEM : +Byte poap_url
    AlgoPoaP_ASC_ITEM : +Byte poap_email
    AlgoPoaP_ASC_ITEM : +Byte poap_has_nft
    AlgoPoaP_ASC_ITEM : +Byte poap_has_geo
    AlgoPoaP_ASC_ITEM : +Byte poap_has_sig
    AlgoPoaP_ASC_ITEM : +Byte poap_has_qrcode
    AlgoPoaP_ASC_ITEM : +Byte poap_attendee_qty
    AlgoPoaP_ASC_ITEM : +Byte author_pays_fee
    AlgoPoaP_ASC_ITEM : +Byte poap_qr_secret


    AlgoPoaP_ASC_ITEM : +Uint64 poap_parent_id
    AlgoPoaP_ASC_ITEM : +Byte poap_parent_address
    AlgoPoaP_ASC_ITEM : +Byte poap_author_address
    AlgoPoaP_ASC_ITEM : +Uint64 poap_asa_id

    AlgoPoaP_ASC_ITEM : +Uint64 poap_setup_time
    AlgoPoaP_ASC_ITEM : +Uint64 poap_activate_time
    AlgoPoaP_ASC_ITEM : +Uint64 poap_release_time


     AlgoPoaP_ASC_ITEM : +Byte poap_is_activated
    AlgoPoaP_ASC_ITEM : +Byte poap_is_setup
    AlgoPoaP_ASC_ITEM : +Byte poap_is_released



 

    AlgoPoaP_ASC_ITEM : +setup(pay,account,application,string,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    AlgoPoaP_ASC_ITEM : +re_setup(pay,account,application,asset,string,string,string,string,string,string,string,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))string
    AlgoPoaP_ASC_ITEM : +activate(pay,axfer,application,asset)string
    AlgoPoaP_ASC_ITEM : +claim(asset,application,pay,axfer,string,(uint64,uint64,uint64,uint64,uint64))string
    AlgoPoaP_ASC_ITEM : +release(application)string
    AlgoPoaP_ASC_ITEM : +get_metric(string)string
    AlgoPoaP_ASC_ITEM : +get_metrics()string
    
  
    
```

----

### AlgoPoaP ASC ITEM ABI Schema :
[top↑](#algopoap)

```javascript
{
    "name": "algopoap-item-contract",
    "desc": "AlgoPoaP Item smart contract",
    "networks": {
        "MainNet": {
            "appID": 0
        },
        "TestNet": {
            "appID": 0
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
                    "name": "poap_name"
                },
                {
                    "type": "string",
                    "name": "poap_logo"
                },
                {
                    "type": "string",
                    "name": "poap_desc"
                },
                {
                    "type": "string",
                    "name": "poap_timezone"
                },
                {
                    "type": "string",
                    "name": "poap_address"
                },
                {
                    "type": "string",
                    "name": "poap_url"
                },
                {
                    "type": "string",
                    "name": "poap_email"
                },
                {
                    "type": "(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)",
                    "name": "poap_uint64_tuple"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Sets up an AlgoPoaP smart contract item for the first time"
        },
        {
            "name": "re_setup",
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
                    "type": "asset",
                    "name": "item_nft"
                },
                {
                    "type": "string",
                    "name": "poap_name"
                },
                {
                    "type": "string",
                    "name": "poap_logo"
                },
                {
                    "type": "string",
                    "name": "poap_desc"
                },
                {
                    "type": "string",
                    "name": "poap_timezone"
                },
                {
                    "type": "string",
                    "name": "poap_address"
                },
                {
                    "type": "string",
                    "name": "poap_url"
                },
                {
                    "type": "string",
                    "name": "poap_email"
                },
            
                {
                    "type": "(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)",
                    "name": "poap_uint64_tuple"
                }
              
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Sets up an AlgoPoaP smart contract item after first setup"
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
            "desc": "Activates an AlgoPoaP item smart contract and returns string"
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
                    "name": "attendee_account"
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
            "desc": "Claims an AlgoPoaP for an attendee and returns NFT sending inner-transaction hash"
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
            "desc": "Releases AlgoPoaP and allows all AlgoPoaP attendee's to start claiming"
        },
        {
            "name": "get_metric",
            "args": [
                {
                    "type": "string",
                    "name": "metric_signature"
                }
            ],
            "returns": {
                "type": "string"
            },
            "desc": "Gets an specific metric by signature string"
        },
        {
            "name": "get_metrics",
            "args": [],
            "returns": {
                "type": "string"
            },
            "desc": "Gets all metrics"
        }
    ]
}

```
----

Since AlgoPoaP is totally decentralized, trustless and permission-less: Every AlgoPoaP item author has full authority of the created PoaPs (AlgoPoaP-DAO is coming with dao, voting and governance features in near future, after startup formation. Preferably I will use integration to an already working service with ABI)!

The algopoap_contract.json contains the ABI Schema for parent AlgoPoaP contract and algopoap_item_contract.json is the full ABI Schema of AlgoPoaP item contract which will be created via an inner transaction.


### Simple basic deployment and unit tests included

```shell
> algopoap-smartcontracts@0.0.4 start
[ALGOPOAP: ] [2022-08-30T16:26:36.462Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:26:36.463Z] [info]: AlgoPoaP Item Contract ABI Exec method = ABIMethod {
  name: 'item_update',
  description: 'Updates an AlgoPoaP item smart contract and returns item application ID',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:26:42.933Z] [info]: AlgoPoaP Main Contract ABI Exec method result = 107325601
[ALGOPOAP: ] [2022-08-30T16:26:43.294Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:26:43.295Z] [info]: AlgoPoaP Item Contract ABI Exec method = ABIMethod {
  name: 're_setup',
  description: 'Sets up an AlgoPoaP smart contract item after first setup',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:26:51.351Z] [info]: AlgoPoaP Main Contract ABI Exec method result = 107325874
[ALGOPOAP: ] [2022-08-30T16:26:51.786Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:26:51.786Z] [info]: AlgoPoaP Item Contract ABI Exec method = ABIMethod {
  name: 'activate',
  description: 'Activates an AlgoPoaP item smart contract and returns string',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:26:59.712Z] [info]: AlgoPoaP Main Contract ABI Exec method result = algopoap_item_activate
[ALGOPOAP: ] [2022-08-30T16:27:00.134Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:27:00.134Z] [info]: AlgoPoaP Item Contract ABI Exec method = ABIMethod {
  name: 'release',
  description: "Releases AlgoPoaP and allows all AlgoPoaP attendee's to start claiming",
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:27:07.941Z] [info]: AlgoPoaP Main Contract ABI Exec method result = algopoap_item_released
[ALGOPOAP: ] [2022-08-30T16:27:08.290Z] [info]: ------------------------------
[ALGOPOAP: ] [2022-08-30T16:27:08.291Z] [info]: AlgoPoaP Item Contract ABI Exec method = ABIMethod {
  name: 'claim',
  description: 'Claims an AlgoPoaP for an attendee and returns NFT sending inner-transaction hash',
  args: [Array],
  returns: [Object]
}
[ALGOPOAP: ] [2022-08-30T16:27:16.355Z] [info]: AlgoPoaP Main Contract ABI Exec method result = algopoap_item_claimed


```





