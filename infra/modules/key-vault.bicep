@description('Name of the Key Vault')
param name string

@description('Azure region')
param location string

param tags object = {}

@secure()
@description('Copilot API token')
param copilotToken string

@secure()
@description('GitHub token for MacGyver')
param githubToken string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 7
  }
}

resource copilotTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'copilot-token'
  properties: {
    value: copilotToken
  }
}

resource githubTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'github-token'
  properties: {
    value: githubToken
  }
}

output vaultUri string = keyVault.properties.vaultUri
output vaultName string = keyVault.name
output copilotTokenSecretUri string = copilotTokenSecret.properties.secretUri
output githubTokenSecretUri string = githubTokenSecret.properties.secretUri
