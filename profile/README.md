![](https://avatars.githubusercontent.com/u/106061767?s=96&v=4)
# AlgoPoaP
### **AlgoPoaP** is the Proof of Attendance Protocol built on Algorand (AVM V1.1) which aims to be elevated into a Proof Of Anything Protocol in future (with use of coming state proofs feature on Algorand).

The original idea of PoaP on blockchain is developed for Etherium ecosystem and is Token based and lacks many features. **AlgoPoaP** elevates, extends and expands that original idea and implements it on Algorand. 

**AlgoPoaP** dApp is consisted of a frontend calling an Algorand ASC system in which ASCs use each other via C2C calls introduced in Algorand AVM V1.1


----
![AlgoPoaP Concept Diagram (1)](https://user-images.githubusercontent.com/1900448/183914899-d078b770-d736-4b30-b23b-8012ec9fe281.png)
----

## AlgoPoaP's frontend application and landing page, SPA-PWA:


- [AlgoPoaP's Smart Contracts Repository](https://github.com/AlgoPoaP/algopoap-smartcontracts)

- [AlgoPoaP's Frontend Repository](https://github.com/AlgoPoaP/algopoap)

** Both will be public soon, WIP! **

**AlgoPoaP** features that are not available on ETH PoaP:

- Geo
- Tokenless
- Parametrized NFT
- Signature
- QRCode



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





