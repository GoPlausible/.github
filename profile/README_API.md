# GoPlausible API - README

This document provides a technical overview and reference guide for the GoPlausible API. The API follows an OpenAPI 3.1.0 specification. Below you will find details of each endpoint, including HTTP methods, parameters, request bodies, and response schemas.

---

## Overview

- **OpenAPI Version**: 3.1.0  
- **Base URL**: [https://api.goplausible.xyz](https://api.goplausible.xyz)  
- **Docs URL**: [https://api.goplausible.xyz/docs](https://api.goplausible.xyz/docs)  

This API is designed to handle different aspects of W3C Decentralized Identifiers (DIDs), W3C Verifiable Credentials (VCs), Self-Sovereign Identity (SSI), IPFS content management, authentication, revocation, rotation of DIDs, and more.

---


## PLAUSIBLE protocol endpoints:
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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
[top↑](#goplausible-service-integration-api)

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

