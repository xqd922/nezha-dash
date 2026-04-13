param(
    [string]$TitleLike,
    [string]$ProcessName,
    [string]$MatchPattern = 'exceeded retry limit, last status:\s*429 Too Many Requests|429 Too Many Requests',
    [string]$ContinueText = 'continue',
    [int]$PollMs = 1500,
    [int]$CooldownSeconds = 20,
    [switch]$DryRun,
    [switch]$TriggerOnExistingMatch,
    [switch]$ListWindows
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class CodexWin32
{
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@

$windowStates = @{}
$regex = [regex]::new($MatchPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

function Get-WindowCandidates {
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $windows = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition
    )

    foreach ($window in $windows) {
        $title = $window.Current.Name
        $handle = [int]$window.Current.NativeWindowHandle
        $processId = $window.Current.ProcessId

        if ($handle -eq 0) {
            continue
        }

        $process = $null
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
        } catch {
            continue
        }

        if ($TitleLike -and $title -notlike "*$TitleLike*") {
            continue
        }

        if ($ProcessName -and $process.ProcessName -notlike "*$ProcessName*") {
            continue
        }

        [pscustomobject]@{
            Title       = $title
            Handle      = $handle
            ProcessId   = $processId
            ProcessName = $process.ProcessName
            Element     = $window
        }
    }
}

function Get-TextPatternText {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Automation.AutomationElement]$Element
    )

    $pattern = $null
    if (-not $Element.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$pattern)) {
        return $null
    }

    try {
        return $pattern.DocumentRange.GetText(-1)
    } catch {
        return $null
    }
}

function Get-AutomationText {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Automation.AutomationElement]$Element
    )

    $chunks = New-Object System.Collections.Generic.List[string]
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)

    $rootText = Get-TextPatternText -Element $Element
    if ($rootText) {
        $trimmed = $rootText.Trim()
        if ($trimmed) {
            $null = $seen.Add($trimmed)
            $chunks.Add($trimmed)
        }
    }

    $controlConditions = @(
        [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Document
        ),
        [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Edit
        ),
        [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Text
        ),
        [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Pane
        )
    )
    $orCondition = [System.Windows.Automation.OrCondition]::new($controlConditions)
    $nodes = $Element.FindAll([System.Windows.Automation.TreeScope]::Descendants, $orCondition)

    foreach ($node in $nodes) {
        $name = $node.Current.Name
        if ($name) {
            $trimmed = $name.Trim()
            if ($trimmed -and $seen.Add($trimmed)) {
                $chunks.Add($trimmed)
            }
        }

        $nodeText = Get-TextPatternText -Element $node
        if ($nodeText) {
            $trimmed = $nodeText.Trim()
            if ($trimmed -and $seen.Add($trimmed)) {
                $chunks.Add($trimmed)
            }
        }
    }

    return ($chunks -join "`n")
}

function Send-Continue {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Window
    )

    $targetHandle = [IntPtr]::new($Window.Handle)
    $previousHandle = [CodexWin32]::GetForegroundWindow()

    [CodexWin32]::ShowWindowAsync($targetHandle, 9) | Out-Null
    [CodexWin32]::SetForegroundWindow($targetHandle) | Out-Null
    Start-Sleep -Milliseconds 250

    $shell = New-Object -ComObject WScript.Shell
    $shell.AppActivate($Window.ProcessId) | Out-Null
    Start-Sleep -Milliseconds 150

    [System.Windows.Forms.SendKeys]::SendWait($ContinueText)
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')

    if ($previousHandle -ne [IntPtr]::Zero -and $previousHandle -ne $targetHandle) {
        Start-Sleep -Milliseconds 150
        [CodexWin32]::SetForegroundWindow($previousHandle) | Out-Null
    }
}

if ($ListWindows) {
    Get-WindowCandidates |
        Select-Object ProcessName, ProcessId, Title |
        Sort-Object ProcessName, ProcessId |
        Format-Table -AutoSize
    return
}

if (-not $TitleLike -and -not $ProcessName) {
    throw 'Please provide -TitleLike or -ProcessName.'
}

Write-Host ("Watching windows for pattern: {0}" -f $MatchPattern)
if ($TitleLike) {
    Write-Host ("Title filter : *{0}*" -f $TitleLike)
}
if ($ProcessName) {
    Write-Host ("Process filter: *{0}*" -f $ProcessName)
}
Write-Host ("Cooldown     : {0}s" -f $CooldownSeconds)
Write-Host ("Dry run      : {0}" -f $DryRun.IsPresent)
Write-Host ("Trigger old  : {0}" -f $TriggerOnExistingMatch.IsPresent)
Write-Host 'Press Ctrl+C to stop.'

while ($true) {
    $windows = @(Get-WindowCandidates)

    if ($windows.Count -eq 0) {
        Start-Sleep -Milliseconds $PollMs
        continue
    }

    foreach ($window in $windows) {
        $text = $null
        try {
            $text = Get-AutomationText -Element $window.Element
        } catch {
            Write-Warning ("Failed to read window text: {0} ({1})" -f $window.Title, $_.Exception.Message)
            continue
        }

        $matchCount = $regex.Matches($text).Count
        $stateKey = '{0}:{1}' -f $window.ProcessId, $window.Handle

        if (-not $windowStates.ContainsKey($stateKey)) {
            $windowStates[$stateKey] = [pscustomobject]@{
                LastMatchCount = $matchCount
                LastSentAt     = [datetime]::MinValue
            }

            if ($matchCount -gt 0 -and $TriggerOnExistingMatch) {
                $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
                if ($DryRun) {
                    Write-Host ("[{0}] Existing match found in '{1}', dry run only." -f $timestamp, $window.Title)
                } else {
                    Write-Host ("[{0}] Existing match found in '{1}', sending continue." -f $timestamp, $window.Title)
                    Send-Continue -Window $window
                }

                $windowStates[$stateKey].LastSentAt = [datetime]::Now
            }

            continue
        }

        $state = $windowStates[$stateKey]
        if ($matchCount -le $state.LastMatchCount) {
            $state.LastMatchCount = $matchCount
            continue
        }

        $secondsSinceLastSend = ([datetime]::Now - $state.LastSentAt).TotalSeconds
        if ($secondsSinceLastSend -lt $CooldownSeconds) {
            $state.LastMatchCount = $matchCount
            continue
        }

        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        if ($DryRun) {
            Write-Host ("[{0}] Match detected in '{1}', dry run only." -f $timestamp, $window.Title)
        } else {
            Write-Host ("[{0}] Match detected in '{1}', sending continue." -f $timestamp, $window.Title)
            Send-Continue -Window $window
        }

        $state.LastMatchCount = $matchCount
        $state.LastSentAt = [datetime]::Now
    }

    Start-Sleep -Milliseconds $PollMs
}
