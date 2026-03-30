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

@description('Entra ID app client ID for Easy Auth')
param authClientId string

@secure()
@description('Entra ID app client secret for Easy Auth')
param authClientSecret string

@description('Allowed principal object ID for Easy Auth')
param authAllowedPrincipal string

@description('Custom domain hostname (e.g., chat.ianp.io). Leave empty to skip.')
param customDomainName string = ''

@description('Managed certificate resource ID for custom domain')
param customDomainCertId string = ''

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'chat' })
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      dapr: {
        enabled: true
        appId: 'chat'
        appPort: 8080
        appProtocol: 'http'
      }
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        customDomains: !empty(customDomainName) && !empty(customDomainCertId) ? [
          {
            name: customDomainName
            certificateId: customDomainCertId
            bindingType: 'SniEnabled'
          }
        ] : []
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
        {
          name: 'microsoft-provider-authentication-secret'
          value: authClientSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'chat'
          image: imageName
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource authConfig 'Microsoft.App/containerApps/authConfigs@2024-03-01' = {
  parent: containerApp
  name: 'current'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
      allowedPrincipals: {
        identities: [
          authAllowedPrincipal
        ]
      }
    }
    identityProviders: {
      azureActiveDirectory: {
        registration: {
          clientId: authClientId
          clientSecretSettingName: 'microsoft-provider-authentication-secret'
          openIdIssuer: 'https://login.microsoftonline.com/common/v2.0'
        }
        validation: {
          allowedAudiences: [
            authClientId
          ]
        }
      }
    }
  }
}

output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
