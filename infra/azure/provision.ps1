$ErrorActionPreference = "Stop"

param(
  [string]$ResourceGroup = "telugusocial-prod-rg",
  [string]$Location = "centralindia",
  [string]$Suffix = ""
)

if ([string]::IsNullOrWhiteSpace($Suffix)) {
  $Suffix = Get-Random -Minimum 1000 -Maximum 9999
}

$apiContainerApp = "telugu-social-api-ca-$Suffix"
$webStorage = "telugusocialweb$Suffix"
$staffStorage = "telugusocialstaff$Suffix"

Write-Host "Provisioning with suffix: $Suffix"

az group create --name $ResourceGroup --location $Location | Out-Null

az storage account create `
  --name $webStorage `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --allow-blob-public-access true | Out-Null

az storage account create `
  --name $staffStorage `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --allow-blob-public-access true | Out-Null

az storage blob service-properties update --account-name $webStorage --static-website --index-document index.html --404-document index.html | Out-Null
az storage blob service-properties update --account-name $staffStorage --static-website --index-document index.html --404-document index.html | Out-Null

az containerapp up `
  --name $apiContainerApp `
  --resource-group $ResourceGroup `
  --location $Location `
  --source "apps/api" `
  --ingress external `
  --target-port 4000 `
  --env-vars PORT=4000 API_PORT=4000 DATABASE_URL=file:./prisma/dev.db | Out-Null

$webKey = az storage account keys list --account-name $webStorage --resource-group $ResourceGroup --query "[0].value" -o tsv
$staffKey = az storage account keys list --account-name $staffStorage --resource-group $ResourceGroup --query "[0].value" -o tsv

Write-Host ""
Write-Host "Provisioned Resources"
Write-Host "API Container App: $apiContainerApp"
Write-Host "API URL: https://$apiContainerApp.lemonforest-8009da98.centralindia.azurecontainerapps.io"
Write-Host "Web Storage: $webStorage"
Write-Host "Web URL: https://$webStorage.z29.web.core.windows.net"
Write-Host "Staff Storage: $staffStorage"
Write-Host "Staff URL: https://$staffStorage.z29.web.core.windows.net"
Write-Host ""
Write-Host "GitHub Secrets Needed"
Write-Host "AZURE_STORAGE_WEB_KEY=$webKey"
Write-Host "AZURE_STORAGE_STAFF_KEY=$staffKey"

