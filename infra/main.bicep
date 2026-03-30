targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, prod)')
param environmentName string

@minLength(1)
@description('Azure region for all resources')
param location string

@secure()
@description('GitHub token for MacGyver')
param githubToken string

@secure()
@description('Copilot API token for llm-proxy')
param copilotToken string

@description('Mind repo to clone on boot')
param mindRepo string = 'ianphil/macgyver'

@description('Star poll interval')
param pollInterval string = '30s'

@description('Copilot SDK response timeout in ms')
param copilotResponseTimeoutMs string = '600000'

@description('Entra ID app client ID for chat Easy Auth')
param authClientId string

@secure()
@description('Entra ID app client secret for chat Easy Auth')
param authClientSecret string

@description('Allowed principal object ID for chat Easy Auth')
param authAllowedPrincipal string

@description('Custom domain for chat app (e.g., chat.ianp.io)')
param chatCustomDomain string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'container-registry'
  scope: rg
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: tags
  }
}

module containerAppsEnvironment './modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  scope: rg
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: tags
    customDomainName: chatCustomDomain
    stateStoreAccountName: storageAccount.outputs.name
    stateStoreAccountKey: storageAccount.outputs.accountKey
  }
}

module keyVault './modules/key-vault.bicep' = {
  name: 'key-vault'
  scope: rg
  params: {
    name: '${abbrs.keyVaultVaults}${resourceToken}'
    location: location
    tags: tags
    copilotToken: copilotToken
    githubToken: githubToken
  }
}

module storageAccount './modules/storage-account.bicep' = {
  name: 'storage-account'
  scope: rg
  params: {
    name: '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
  }
}

module macgyver './modules/macgyver.bicep' = {
  name: 'macgyver'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}macgyver-${resourceToken}'
    location: location
    tags: tags
    environmentId: containerAppsEnvironment.outputs.environmentId
    imageName: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    githubToken: githubToken
    mindRepo: mindRepo
    pollInterval: pollInterval
    copilotResponseTimeoutMs: copilotResponseTimeoutMs
    registryServer: containerRegistry.outputs.loginServer
    registryName: containerRegistry.outputs.name
  }
}

module llmProxy './modules/llm-proxy.bicep' = {
  name: 'llm-proxy'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}llm-proxy-${resourceToken}'
    location: location
    tags: tags
    environmentId: containerAppsEnvironment.outputs.environmentId
    imageName: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    copilotToken: copilotToken
    registryServer: containerRegistry.outputs.loginServer
    registryName: containerRegistry.outputs.name
  }
}

module tools './modules/tools.bicep' = {
  name: 'tools'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}tools-${resourceToken}'
    location: location
    tags: tags
    environmentId: containerAppsEnvironment.outputs.environmentId
    imageName: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    registryServer: containerRegistry.outputs.loginServer
    registryName: containerRegistry.outputs.name
  }
}

module chat './modules/chat.bicep' = {
  name: 'chat'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}chat-${resourceToken}'
    location: location
    tags: tags
    environmentId: containerAppsEnvironment.outputs.environmentId
    imageName: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    registryServer: containerRegistry.outputs.loginServer
    registryName: containerRegistry.outputs.name
    authClientId: authClientId
    authClientSecret: authClientSecret
    authAllowedPrincipal: authAllowedPrincipal
    customDomainName: chatCustomDomain
    customDomainCertId: containerAppsEnvironment.outputs.chatCertId
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_APP_NAME string = macgyver.outputs.name
output AZURE_CONTAINER_APP_FQDN string = macgyver.outputs.fqdn
output CHAT_FQDN string = chat.outputs.fqdn
