# Sync tokens into azd env before deploy.
# Runs automatically as an azd predeploy hook.
#
# GITHUB_TOKEN  — from gh CLI (stars, cloning, pushing)
# COPILOT_TOKEN — from Windows Credential Manager (LLM API access)

# --- GITHUB_TOKEN ---
$ghToken = gh auth token 2>$null
if (-not $ghToken) {
    Write-Error "gh CLI not authenticated. Run 'gh auth login' first."
    exit 1
}
azd env set GITHUB_TOKEN $ghToken
Write-Host "GITHUB_TOKEN synced from gh CLI ($($ghToken.Substring(0,8))...)"

# --- COPILOT_TOKEN ---
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CredReader {
    [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
    static extern bool CredEnumerate(string filter, int flags, out int count, out IntPtr creds);
    [DllImport("advapi32.dll")]
    static extern void CredFree(IntPtr cred);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct CRED { public int Flags; public int Type; public string TargetName; public string Comment;
        public long LastWritten; public int BlobSize; public IntPtr Blob; public int Persist;
        public int AttrCount; public IntPtr Attrs; public string Alias; public string UserName; }
    public static string Read(string filter) {
        if (CredEnumerate(filter, 0, out int count, out IntPtr arr)) {
            try {
                for (int i = 0; i < count; i++) {
                    var p = Marshal.ReadIntPtr(arr, i * IntPtr.Size);
                    var c = Marshal.PtrToStructure<CRED>(p);
                    if (c.BlobSize > 0) {
                        var b = new byte[c.BlobSize];
                        Marshal.Copy(c.Blob, b, 0, c.BlobSize);
                        return Encoding.UTF8.GetString(b);
                    }
                }
            } finally { CredFree(arr); }
        }
        return null;
    }
}
'@ -ErrorAction SilentlyContinue

$copilotToken = [CredReader]::Read("copilot-cli/*")
if (-not $copilotToken) {
    Write-Warning "No Copilot CLI credential found. Run 'copilot' and complete /login first."
} else {
    azd env set COPILOT_TOKEN $copilotToken
    Write-Host "COPILOT_TOKEN synced from Credential Manager ($($copilotToken.Substring(0,8))...)"
}
