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
@description('Copilot API token')
param copilotToken string

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
  tags: union(tags, { 'azd-service-name': 'llm-proxy' })
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      dapr: {
        enabled: true
        appId: 'llm-proxy'
        appPort: 5100
        appProtocol: 'http'
      }
      ingress: {
        external: false
        targetPort: 5100
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
          name: 'copilot-token'
          value: copilotToken
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
          name: 'llm-proxy'
          image: imageName
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'COPILOT_TOKEN', secretRef: 'copilot-token' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 5100
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
