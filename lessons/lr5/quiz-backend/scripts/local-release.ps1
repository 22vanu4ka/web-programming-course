# scripts/local-release.ps1
Write-Host "=== Local Release Script ===" -ForegroundColor Cyan

# 1. Сборка нового образа с временной меткой
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$newTag = "quiz-backend:$timestamp"
Write-Host "Building image: $newTag" -ForegroundColor Yellow
docker build -t $newTag .

# 2. Сохраняем текущий образ как previous (если существует)
$currentImage = "quiz-backend:latest"
$currentExists = docker images -q $currentImage
if ($currentExists) {
    Write-Host "Saving current image as previous" -ForegroundColor Yellow
    docker tag $currentImage quiz-backend:previous
}

# 3. Тегируем новый образ как latest
Write-Host "Tagging as latest" -ForegroundColor Yellow
docker tag $newTag quiz-backend:latest

# 4. Останавливаем старый стек и запускаем новый
Write-Host "Stopping old containers..." -ForegroundColor Yellow
docker compose down
Write-Host "Starting new stack..." -ForegroundColor Yellow
docker compose up -d

# 5. Ожидание инициализации
Write-Host "Waiting for services to become ready (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 6. Smoke-check: health endpoint
$healthCheck = curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/health
if ($healthCheck -ne 200) {
    Write-Host "Health check failed (HTTP $healthCheck). Rolling back..." -ForegroundColor Red
    & "$PSScriptRoot\rollback-local.ps1"
    exit 1
}
Write-Host "Health check passed" -ForegroundColor Green

# 7. Дополнительный smoke-check: проверка аутентификации
$tokenResponse = curl.exe -s -X POST http://localhost:3000/api/auth/github/callback -H "Content-Type: application/json" -d '{\"code\":\"test_code\"}'
$token = ($tokenResponse | ConvertFrom-Json).token
if (-not $token) {
    Write-Host "Auth endpoint smoke check failed. Rolling back..." -ForegroundColor Red
    & "$PSScriptRoot\rollback-local.ps1"
    exit 1
}
Write-Host "Auth endpoint works" -ForegroundColor Green

Write-Host "=== Release successful ===" -ForegroundColor Green