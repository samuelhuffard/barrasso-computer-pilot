param(
    [Parameter(Mandatory = $true)][string]$To,
    [Parameter(Mandatory = $true)][string]$Subject,
    [Parameter(Mandatory = $true)][string]$Body
)

$From = "triage_alert@$($env:COMPUTERNAME).senate.ussenate.us"
$SmtpServer = 'imail.senate.gov'
$SmtpPort = 25

$Recipients = $To -split ';' | Where-Object { $_.Trim() -ne '' }

Send-MailMessage -From $From -To $Recipients -Subject $Subject -Body $Body -SmtpServer $SmtpServer -Port $SmtpPort
