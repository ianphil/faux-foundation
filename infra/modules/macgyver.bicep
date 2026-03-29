@description('Name of the container app')
param name string

@description('Azure region')
param location string

param tags object = {}

@description('Container Apps environment resource ID')
param environmentId string

@description('Container image name')
param imageName string

@secure()
@description('GitHub token')
param githubToken string

@description('Mind repo to clone')
param mindRepo string

@description('Poll interval')
param pollInterval string

@description('SDK response timeout')
param copilotResponseTimeoutMs string

@description('ACR login server')
param registryServer string

@description('ACR name')
param registryName string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'macgyver' })
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      dapr: {
        enabled: true
        appId: 'macgyver'
        appPort: 3000
        appProtocol: 'http'
      }
      registries: [
        {
          server: registryServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'github-token'
          value: githubToken
        }
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'macgyver'
          image: imageName
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'HOST', value: '0.0.0.0' }
            { name: 'PORT', value: '3000' }
            { name: 'GITHUB_TOKEN', secretRef: 'github-token' }
            { name: 'MIND_REPO', value: mindRepo }
            { name: 'POLL_INTERVAL', value: pollInterval }
            { name: 'COPILOT_RESPONSE_TIMEOUT_MS', value: copilotResponseTimeoutMs }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.?fqdn ?? 'no-ingress'
