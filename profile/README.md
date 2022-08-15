![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)
# AlgoPoaP
### **AlgoPoaP** is the Proof of Attendance Protocol built on Algorand (AVM V1.1) which aims to be elevated into a Proof Of Anything Protocol in future (with use of coming state proofs feature on Algorand).

The original idea of PoaP on blockchain is developed for Ethereum ecosystem and is Token based and lacks many features. **AlgoPoaP** elevates, extends and expands that original idea and implements it on Algorand. 

**AlgoPoaP** dApp is consisted of a frontend calling an Algorand ASC system in which ASCs use each other via C2C calls introduced in Algorand AVM V1.1


----
![AlgoPoaP Concept Diagram (1)](https://user-images.githubusercontent.com/1900448/183914899-d078b770-d736-4b30-b23b-8012ec9fe281.png)
----

## AlgoPoaP's frontend application and landing page, SPA-PWA:


- [AlgoPoaP's Smart Contracts Repository](https://github.com/AlgoPoaP/algopoap-smartcontracts)

- [AlgoPoaP's Frontend Repository](https://github.com/AlgoPoaP/algopoap)

** Both will be public soon, WIP! **

**AlgoPoaP** features that are not available on ETH PoaP (it actually only supports time currently!):

- Geo constraint option
- Authorization Signature constraint option
- QRCode constraint option
- NFT based or NFT-less (Using transaction note only)



**AlgoPoaP** frontend has 3 major functions:
- Wallet Session
- Author UI
- Attend UI


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
        Item_ASC-->Controllers_ASCs 
        
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

Note : If SIG is not enabled for PoaP Venue, Claim approval will send PoaP NFT or TXN to Attendee's wallet but if SIG is enabled then after signing of Author, PoaP NFT or TXN will be sent automatically to attendee's wallet, after author signs and sends a release method call transaction for each PoaP attendee. Author's must be careful not to use the SIG feature for venues with too many attendees or it may take time to manually authorize them all through AlgoPoaP UI (No mass authorization scenario exists or thought about at the moment!).

Options available for PoaP creation:

- Time (default enabled): Start time check (compared to LatestTimestamp)
- Geo: Location point check to be inside a geofence with desired radius (in meters with min of 5m and max of 1000m).
- Signature: Author's signature is needed to make PoaP claimable for every attendee, individually. Each and every attendee can receive their single claimed PoaP (in NFT or TXN depending on PoaP config) only after Author's authorization via a successful method call (which obviously should happen after both venue activation and venue start time). 
- QRCode: Upon activation a secret key will be generated and included in a transaction as a method input parameter and this TXN is then communicated by a QRCode in venue location and Attendee scans this QRCode during physical presence and claims.

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
AlgoPoaP_Item_ASC -->> Attendee: Send NFT
AlgoPoaP_Item_ASC -->> AlgoPoaP: Return

Note right of AlgoPoaP_ASC: Claim PoaP
Note right of AlgoPoaP_ASC: Needs providing required options if configured (Geo, Time, QR)
AlgoPoaP_Item_ASC -->> Attendee: Send NFT
Note right of AlgoPoaP_ASC: Claim PoaP in case of SIG option enabled



```

----
## AlgoPoaP Smart Contracts 

AlgoPoaP ASC System is designed on basis of newest TEAL features came with TEAL v 6.0 on AVM V1.1. AlgoPoaP Parent contract is created and thereafter every AlgoPoaP item is created by this parent contract based on configurations needed.


----
### Entities Relations:

```mermaid
  graph TD;
      AlgoPoaP_Service== creates ==>Parent_AlgoPoaP_ASC;
      Parent_AlgoPoaP_ASC== creates ==>AlgoPoaP_Controler_ASC;
      Parent_AlgoPoaP_ASC== creates ==>AlgoPoaP_item_ASC;
      
      AlgoPoaP_User== interacts ==>AlgoPoaP_item_ASC;
      AlgoPoaP_item_ASC== interacts ==>AlgoPoaP_Controler_ASC;
      AlgoPoaP_Author== interacts ==>Parent_AlgoPoaP_ASC;
      AlgoPoaP_Author== interacts ==>AlgoPoaP_item_ASC;
```

----
### Lifecycle:

```mermaid
  stateDiagram-v2
    [*] --> AlgoPoaP_Service
    AlgoPoaP_Service --> Parent_AlgoPoaP_ASC
    Parent_AlgoPoaP_ASC --> AlgoPoaP_Controler_ASC
    Parent_AlgoPoaP_ASC --> AlgoPoaP_item_ASC
    AlgoPoaP_item_ASC --> Archive
    Archive --> [*]
```
----
### PoaP ASC TEAL Graph:

```mermaid
  stateDiagram-v2
    [*] --> ASC_ENTRY
    ASC_ENTRY --> b_general_checks
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
    b_noop --> b_c2c_create
    b_c2c_create --> Log_and_Return
    b_noop --> b_c2c_delete
    b_c2c_create --> Log_and_Return
    b_noop --> b_c2cn_update
    b_c2c_create --> Log_and_Return
    b_noop --> b_c2c_closeout
    b_c2c_create --> Log_and_Return
    b_noop --> b_c2c_noop
    b_c2c_noop --> Log_and_Return
    Log_and_Return --> [*]
    
```
----

### PoaP Item ASC TEAL Graph:

```mermaid
  stateDiagram-v2
    [*] --> ITEM_ASC_ENTRY
    ITEM_ASC_ENTRY --> b_general_checks
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
    b_setup --> b_nft_create
    b_setup --> b_c2c_optin
    b_noop --> b_release
    b_release --> b_nft_send
    b_release --> b_c2c_geo
    b_release --> b_c2c_time
    b_release --> b_c2c_sig
    b_release --> b_c2c_qr
    b_release --> Log_and_Return
   
    
    Log_and_Return --> [*]
    
```
----
### UseCase:

```mermaid
  flowchart TB
    id1([Author]) --uses--> parentASC
    id1([Author]) --uses--> itemASC
    id2([User]) --uses--> itemASC 
    id2([User]) --uses--> parentASC 
    id2([User]) --uses--> controllerASC 

    subgraph -

      subgraph parentASC
      id6([optin])--uses-->id7([update states]) 
      
      id9([closeout])
      end
      subgraph itemASC
      id8([create]) 
      id9([optin]) 
      id10([update states])
      id13([Respond C2C])
      id9([closeout]) 
      end
      subgraph controllerASC
      id13([Respond C2C])
      end
    end 
   
    controllerASC --extends--> itemASC
    itemASC --extends--> parentASC

```


Since AlgoPoaP is totally decentralized, trustless and permissionless: Every AlgoPoaP item author has full authority of the created PoaPs (AlgoPoaP-DAO is coming with dao, voting and governance features in near future, after startup formation. Preferably I will use integration to an already working service with ABI)!

The algopoap_contract.json contains the ABI Schema for parent AlgoPoaP contract and algopoap_item_contract.json is the full ABI Schema of AlgoPoaP item contract which will be created by an C2C call via an inner transaction.





