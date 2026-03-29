@description('Name of the Container Apps environment')
param name string

@description('Azure region')
param location string

param tags object = {}

@description('Custom domain hostname (e.g., chat.ianp.io). Leave empty to skip.')
param customDomainName string = ''

@description('Storage account name for state store')
param stateStoreAccountName string = ''

@secure()
@description('Storage account key for state store')
param stateStoreAccountKey string = ''

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${name}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    daprConfiguration: {}
  }
}

resource managedCert 'Microsoft.App/managedEnvironments/managedCertificates@2024-03-01' existing = if (!empty(customDomainName)) {
  parent: environment
  name: 'mc-cae-2limhnlrdo-chat-ianp-io-1645'
}

// NOTE: conversation.openai requires Dapr 1.15+
// Container Apps currently runs Dapr 1.13.6 which does NOT support this component type.
// Uncomment when Container Apps upgrades its Dapr runtime.
// resource llmConversation 'Microsoft.App/managedEnvironments/daprComponents@2024-03-01' = {
//   parent: environment
//   name: 'llm'
//   properties: {
//     componentType: 'conversation.openai'
//     version: 'v1'
//     metadata: [
//       { name: 'key', value: 'proxy-managed' }
//       { name: 'model', value: 'claude-opus-4.6' }
//       { name: 'endpoint', value: 'http://llm-proxy:5100/v1' }
//     ]
//     scopes: [ 'chat', 'macgyver' ]
//   }
// }

resource stateStore 'Microsoft.App/managedEnvironments/daprComponents@2024-03-01' = if (!empty(stateStoreAccountName)) {
  parent: environment
  name: 'statestore'
  properties: {
    componentType: 'state.azure.tablestorage'
    version: 'v1'
    metadata: [
      { name: 'accountName', value: stateStoreAccountName }
      { name: 'accountKey', secretRef: 'storage-account-key' }
      { name: 'tableName', value: 'fauxstate' }
    ]
    secrets: [
      { name: 'storage-account-key', value: stateStoreAccountKey }
    ]
    scopes: [ 'chat', 'macgyver' ]
  }
}

output environmentId string = environment.id
output environmentName string = environment.name
output chatCertId string = !empty(customDomainName) ? managedCert.id : ''
