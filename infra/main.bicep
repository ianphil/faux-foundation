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

@description('Mind repo to clone on boot')
param mindRepo string = 'ianphil/faux-foundation'

@description('Star poll interval')
param pollInterval string = '30s'

@description('Copilot SDK response timeout in ms')
param copilotResponseTimeoutMs string = '600000'

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

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_APP_NAME string = macgyver.outputs.name
output AZURE_CONTAINER_APP_FQDN string = macgyver.outputs.fqdn
