@description('Name of the container app')
param name string

@description('Azure region')
param location string

param tags object = {}

@description('Container Apps environment resource ID')
param environmentId string

@description('Container image name')
param imageName string

@description('ACR login server')
param registryServer string

@description('ACR name')
param registryName string

@secure()
@description('Brave Search API key')
param braveApiKey string = ''

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'tools' })
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      dapr: {
        enabled: true
        appId: 'tool-service'
        appPort: 3100
        appProtocol: 'http'
      }
      ingress: {
        external: false
        targetPort: 3100
        transport: 'http'
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
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        ...(!empty(braveApiKey) ? [
          {
            name: 'brave-api-key'
            value: braveApiKey
          }
        ] : [])
      ]
    }
    template: {
      containers: [
        {
          name: 'tools'
          image: imageName
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'PORT', value: '3100' }
            ...(!empty(braveApiKey) ? [
              { name: 'BRAVE_API_KEY', secretRef: 'brave-api-key' }
            ] : [])
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3100
              }
              periodSeconds: 30
            }
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
