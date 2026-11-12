# Converts data/osm-raw.json (Overpass "out geom") into data/map.json,
# a compact local-metre format the game loads.
#   x = east (m), z = south (m), origin = centre of the play area.
# Usage (from repo root):  powershell -ExecutionPolicy Bypass -File tools\build-map.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$raw = [IO.File]::ReadAllText("$root\data\osm-raw.json", [Text.Encoding]::UTF8) | ConvertFrom-Json

$LAT0 = 24.17885; $LON0 = 120.6035
$MX = 111320 * [math]::Cos($LAT0 * [math]::PI / 180)
$MZ = 110574
$inv = [Globalization.CultureInfo]::InvariantCulture

function Pts($geom) {
  $a = New-Object System.Collections.Generic.List[double]
  foreach ($g in $geom) {
    if ($null -eq $g) { continue }
    $a.Add([math]::Round(($g.lon - $LON0) * $MX, 1))
    $a.Add([math]::Round(-($g.lat - $LAT0) * $MZ, 1))
  }
  return ,$a.ToArray()
}

$buildings = New-Object System.Collections.Generic.List[object]
$roads = New-Object System.Collections.Generic.List[object]
$areas = New-Object System.Collections.Generic.List[object]
$campus = $null

$areaClass = @{
  'wood'='wood'; 'forest'='wood'; 'tree_row'='trees'; 'grass'='grass'; 'meadow'='grass'; 'park'='park';
  'village_green'='grass'; 'recreation_ground'='grass'; 'garden'='park'; 'flowerbed'='park'; 'grassgarden'='park';
  'farmyard'='farm'; 'allotments'='farm'; 'horse_riding'='farm'; 'pitch'='pitch'; 'track'='track';
  'water'='water'; 'swimming_pool'='water'; 'playground'='plaza'; 'sports_centre'='plaza';
  'cemetery'='grass'; 'residential'='urban'; 'commercial'='urban'; 'retail'='urban'; 'industrial'='urban';
  'construction'='dirt'; 'garages'='urban'; 'religious'='plaza'; 'parking'='plaza'
}

foreach ($e in $raw.elements) {
  $t = $e.tags
  if ($e.type -eq 'way' -and $e.id -eq 347094469) { $campus = Pts $e.geometry; continue }
  if ($null -eq $t) { continue }

  if ($t.building) {
    $geoms = @()
    if ($e.type -eq 'way') { $geoms = @(,$e.geometry) }
    elseif ($e.type -eq 'relation') { $geoms = @($e.members | Where-Object { $_.role -eq 'outer' -and $_.geometry } | ForEach-Object { ,$_.geometry }) }
    foreach ($g in $geoms) {
      $p = Pts $g
      if ($p.Count -lt 8) { continue }
      $b = [ordered]@{ t = [string]$t.building; p = $p }
      if ($t.name) { $b.n = [string]$t.name }
      if ($t.amenity) { $b.a = [string]$t.amenity }
      if ($t.'building:levels') { $l = 0.0; if ([double]::TryParse(($t.'building:levels' -split '[;,]')[0], [Globalization.NumberStyles]::Float, $inv, [ref]$l)) { $b.l = $l } }
      if ($t.height) { $h = 0.0; if ([double]::TryParse(($t.height -replace '[^0-9.]', ''), [Globalization.NumberStyles]::Float, $inv, [ref]$h)) { $b.h = $h } }
      $buildings.Add($b)
    }
    continue
  }

  if ($e.type -eq 'way' -and $t.highway -and $t.highway -notin @('proposed','construction')) {
    $r = [ordered]@{ t = [string]$t.highway; p = (Pts $e.geometry) }
    if ($t.name) { $r.n = [string]$t.name }
    $roads.Add($r); continue
  }

  if ($e.type -eq 'way' -and $t.waterway) { $roads.Add([ordered]@{ t = 'waterway'; p = (Pts $e.geometry) }); continue }

  if ($e.type -eq 'way') {
    $k = $null
    foreach ($key in @($t.leisure, $t.natural, $t.landuse, $t.amenity)) { if ($key -and $areaClass.ContainsKey([string]$key)) { $k = $areaClass[[string]$key]; break } }
    if ($k) {
      $a = [ordered]@{ c = $k; p = (Pts $e.geometry) }
      if ($t.name) { $a.n = [string]$t.name }
      $areas.Add($a)
    }
  }
}

$out = [ordered]@{
  origin = @{ lat = $LAT0; lon = $LON0 }
  attribution = 'Map data (c) OpenStreetMap contributors, ODbL'
  campus = $campus
  buildings = $buildings
  roads = $roads
  areas = $areas
}
$json = $out | ConvertTo-Json -Depth 6 -Compress
[IO.File]::WriteAllText("$root\data\map.json", $json, (New-Object Text.UTF8Encoding($false)))
"buildings=$($buildings.Count) roads=$($roads.Count) areas=$($areas.Count) bytes=$($json.Length)"
