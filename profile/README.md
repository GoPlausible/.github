![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)
# AlgoPoaP

### **AlgoPoaP** is the Proof of Attendance Protocol built on Algorand (AVM V1.1) which aims to be elevated into a Proof Of Anything Protocol in future (with use of coming state proofs feature on Algorand).

The original idea of PoaP on blockchain is developed for Ethereum ecosystem and is Token based and lacks many features. **AlgoPoaP** elevates, extends and expands that original idea and implements it on Algorand. 

**AlgoPoaP** dApp is consisted of a frontend calling an Algorand ASC system in which ASCs use each other via C2C calls introduced in Algorand AVM V1.1


----
![AlgoPoaP Concept Diagram](https://user-images.githubusercontent.com/1900448/184663576-6df8a93b-5537-4082-9d94-3c12f94a5ac1.png)
----

## AlgoPoaP's frontend application and landing page, SPA-PWA:


- [AlgoPoaP's Smart Contracts Repository](https://github.com/AlgoPoaP/algopoap-smartcontracts)

- [AlgoPoaP's Frontend Repository](https://github.com/AlgoPoaP/algopoap)

** Both will be public soon, WIP! **

**AlgoPoaP** features that are not available on ETH PoaP (it actually only supports time currently!):

- Geo constraint option (location + buffer area radius)
- Authorization Signature constraint option (Author must sign the release before PoaP issuance for claimed Attendees)
- QRCode constraint option (Attendee must scan and then call the AlgoPoaP Item ASC with it in order to claim).
- NFT based or NFT-less (Using transaction note only)

Note: AlgoPoaP does not use a single token for issuing PoaPs , instead it uses a per AlgoPoaP item NFT generation (if selected by Author) approach. 


**AlgoPoaP** is consisted of a frontend and smart contracts on Algorand chain:
- Frontend
- Smart Contracts


**AlgoPoaP** frontend has 3 major functions (all in a single view for simplicity):
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

AlgoPoaP ASC System is designed on basis of newest TEAL features came with TEAL v 6.0 on AVM V1.1. AlgoPoaP Parent contract is created and thereafter every AlgoPoaP item is created by this parent contract based on configurations needed.


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
        id6([setup]) 
        id6([optin]) 
        id7([closeout]) 
        end
        subgraph parentMethodCalls
        id8([create]) 
        id9([update]) 
        id10([delete]) 
        id11([get_metrics]) 
        end
      end
      subgraph itemASC
        
        
        subgraph itemAppCalls
        id12([optin])
        id13([create]) 
        id14([update]) 
        id15([delete]) 
        id16([setup]) 
        id17([closeout]) 
        end
        subgraph itemMethodCalls
        id18([activate]) 
        id19([claim]) 
        id20([release]) 
        id21([get_metrics]) 
        end
      end
      
    end 
   
    
    

```
----

### AlgoPoaP ASC TEAL Graph:

```mermaid
  stateDiagram-v2
    [*] --> b_main
    b_main --> b_general_checks
    b_main --> b_on_completion
    b_on_completion --> b_creation
    b_creation --> Log_and_Return
    b_on_completion --> b_optin
    b_optin --> Log_and_Return
    b_on_completion --> b_deletion
    b_deletion --> Log_and_Return
    b_on_completion --> b_update
    b_update --> Log_and_Return
    b_on_completion --> b_closeout
    b_closeout --> Log_and_Return

    b_on_completion --> b_noop
    b_noop --> b_setup
    b_setup --> Log_and_Return

    abi_methods --> c2c_create
    c2c_create --> Log_and_Return
    abi_methods --> c2c_delete
    c2c_delete --> Log_and_Return
    abi_methods --> c2c_update
    c2c_update --> Log_and_Return

   
    abi_methods --> get_metrics
    get_metrics --> sub_metrics_update
    sub_metrics_update --> get_metrics
    get_metrics --> Log_and_Return

    Log_and_Return --> [*]
    
```
----

### AlgoPoaP ASC ABI :

Note 1: Data fields are global states of AlgoPoaP parent smart contract.

Note 2: Fee collection is not included anywhere at this phase of AlgoPoaP MVP development but certainly is a priority prior to public TESTNET deployment. It happens on parent smart contract.

```mermaid
  classDiagram
    class AlgoPoaP_ASC
    AlgoPoaP_ASC : +Uint64 poap_onboard_count
    AlgoPoaP_ASC : +Uint64 poap_count
    AlgoPoaP_ASC : +Uint64 poap_txn_count
    AlgoPoaP_ASC : +Uint64 poap_claim_count
    AlgoPoaP_ASC : +Uint64 poap_issuance_count
    AlgoPoaP_ASC : +Uint64 poap_nft_issuance_count
    AlgoPoaP_ASC : +Uint64 poap_txn_issuance_count

    AlgoPoaP_ASC : +Uint64 poap_geo_check_count
    AlgoPoaP_ASC : +Uint64 poap_qr_check_count
    AlgoPoaP_ASC : +Uint64 poap_sig_check_count

    AlgoPoaP_ASC : +Uint64 poap_author_count
    AlgoPoaP_ASC : +Uint64 poap_attendee_count
    AlgoPoaP_ASC : +Byte poap_last_appid
    AlgoPoaP_ASC : +Byte poap_last_author
    AlgoPoaP_ASC : +Byte poap_last_attendee
    AlgoPoaP_ASC : +create(pay,byte[],byte[])uint64
    AlgoPoaP_ASC : +update(application,byte[],byte[])bool
    AlgoPoaP_ASC : +delete(application)bool
    AlgoPoaP_ASC : +get_metrics()byte[]
    AlgoPoaP_ASC : +get_metric(string)byte[]
    
```
Note 1: Author has all metrics in localState of AlgoPoaP Item smart contract and all Authored AlgoPoaPs (upt to 16 item) in localState of AlgoPoaP smart contract (parent) 

----

### AlgoPoaP Item ASC TEAL Graph:

```mermaid
  stateDiagram-v2
    [*] --> b_main
    b_main --> b_general_checks
    b_general_checks --> b_on_completion
    
    b_on_completion --> b_creation
    b_creation --> Log_and_Return
    b_on_completion --> b_optin
    b_optin --> Log_and_Return
    b_on_completion --> b_deletion
    b_deletion --> Log_and_Return
    b_on_completion --> b_update
    b_update --> Log_and_Return
    b_on_completion --> b_closeout
    b_closeout --> Log_and_Return

    b_on_completion --> b_noop
    b_noop --> b_setup
    b_setup --> sub_nft_create
    sub_nft_create --> b_setup
    b_setup --> Log_and_Return
   


    abi_methods --> activate
    activate --> Log_and_Return

    abi_methods --> release
    release --> Log_and_Return

    abi_methods --> claim
    claim --> sub_geo
    sub_geo --> claim
    claim --> sub_time
    sub_time --> claim
    claim --> sub_qr
    sub_qr --> claim
    claim --> sub_sig
    sub_sig --> claim
    claim --> sub_nft_send
    sub_nft_send --> claim
    claim --> Log_and_Return


    
  
    abi_methods --> get_metrics
    get_metrics --> Log_and_Return
  
    
    Log_and_Return --> [*]
    
```
----
### AlgoPoaP ASC ITEM ABI :

Note: Data fields are global states of AlgoPoaP item smart contract.

```mermaid
  classDiagram
    class AlgoPoaP_ASC_ITEM
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_onboard_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_txn_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_apply_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_issuance_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_nft_issuance_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_txn_issuance_count

    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_geo_check_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_qr_check_count
    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_sig_check_count

    AlgoPoaP_ASC_ITEM : +Uint64 poap_item_attendee_count
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_attendee
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_apply
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_issuance
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_nft_issuance
    AlgoPoaP_ASC_ITEM : +Byte poap_item_last_txn_issuance
    AlgoPoaP_ASC_ITEM : +activate(appl,pay)byte[]
    AlgoPoaP_ASC_ITEM : +claim(appl,pay,account,uint16,uint48,uint24,uint48,uint24,uint64,string)string
    AlgoPoaP_ASC_ITEM : +release(appl)byte[]
    AlgoPoaP_ASC_ITEM : +get_metric(string)byte[]
    AlgoPoaP_ASC_ITEM : +get_metrics()byte[]
    
  
    
```

----



Since AlgoPoaP is totally decentralized, trustless and permission-less: Every AlgoPoaP item author has full authority of the created PoaPs (AlgoPoaP-DAO is coming with dao, voting and governance features in near future, after startup formation. Preferably I will use integration to an already working service with ABI)!

The algopoap_contract.json contains the ABI Schema for parent AlgoPoaP contract and algopoap_item_contract.json is the full ABI Schema of AlgoPoaP item contract which will be created by an C2C call via an inner transaction.





