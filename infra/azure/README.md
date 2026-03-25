# Azure Deployment

This repo is wired for:

- API on Azure Container Apps
- User web app on Azure Storage static website
- Staff dashboard on Azure Storage static website

## Provision

```powershell
pwsh ./infra/azure/provision.ps1
```

## GitHub Secrets for CD

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_STORAGE_WEB_KEY`
- `AZURE_STORAGE_STAFF_KEY`

## Workflow Files

- `.github/workflows/ci.yml`
- `.github/workflows/cd-azure.yml`

