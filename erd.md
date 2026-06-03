# Entity Relationship Diagram - Deploy Control Plane

The diagram below defines database relationships for the _Deploy_ system. This system applies _Global Role_ for the platform level, _Scoped Role_ for projects, and infrastructure metadata (_Execution Nodes_).

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string passwordHash
        string globalRole "SYSADMIN, MANAGER, DEVELOPER"
        datetime createdAt
    }

    EXECUTION_NODE {
        string id PK
        string name UK
        string ipAddress
        string nodeType "DEV, STAGING, PROD"
        boolean isActive
    }

    PROJECT {
        string id PK
        string name UK
        string repoUrl
        datetime deletedAt
    }

    PROJECT_ROLE {
        string id PK
        string userId FK
        string projectId FK
        string role "OWNER, EDITOR, VIEWER"
    }

    ENVIRONMENT {
        string id PK
        string projectId FK
        string nodeId FK
        string name
        int assignedPort UK
        string stackType
        string lifecycle "ACTIVE, DELETING, DELETED"
        datetime deletedAt
    }

    ENVIRONMENT_ACCESS {
        string id PK
        string userId FK
        string environmentId FK
        boolean canDeploy
    }

    DEPLOYMENT {
        string id PK
        string environmentId FK
        string status "PENDING, BUILDING, SUCCESS, FAILED"
        string logFilePath
        json envVariables
        string commitHash
    }

    AUDIT_LOG {
        string id PK
        string userId FK
        string action
        string targetType
        string targetId
    }

    USER ||--o{ PROJECT_ROLE : "has_role_in"
    USER ||--o{ ENVIRONMENT_ACCESS : "has_deploy_rights"
    USER ||--o{ AUDIT_LOG : "performs"
    PROJECT ||--o{ PROJECT_ROLE : "managed_by"
    PROJECT ||--o{ ENVIRONMENT : "contains"
    EXECUTION_NODE ||--o{ ENVIRONMENT : "hosts"
    ENVIRONMENT ||--o{ ENVIRONMENT_ACCESS : "restricted_to"
    ENVIRONMENT ||--o{ DEPLOYMENT : "executes"
```
