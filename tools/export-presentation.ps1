param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
$powerPoint = $null
$deck = $null
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $deck = $powerPoint.Presentations.Open($sourcePath, -1, 0, 0)
  $width = 2200
  $height = [int][Math]::Round($width * $deck.PageSetup.SlideHeight / $deck.PageSetup.SlideWidth)
  for ($page = 1; $page -le $deck.Slides.Count; $page++) {
    $deck.Slides.Item($page).Export((Join-Path $destinationPath "page-$page.jpg"), 'JPG', $width, $height)
  }
  $deck.SaveAs((Join-Path $destinationPath 'presentation.pdf'), 32)
  Write-Output "Exported $($deck.Slides.Count) slides at ${width}x${height}."
} finally {
  if ($null -ne $deck) { $deck.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($deck) }
  if ($null -ne $powerPoint) { $powerPoint.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) }
}
