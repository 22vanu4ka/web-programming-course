# scripts/rollback-local.ps1
Write-Host "=== Local Rollback Script ===" -ForegroundColor Cyan

# 1. Останавливаем текущий стек
Write-Host "Stopping current stack..." -ForegroundColor Yellow
docker compose down

# 2. Определяем предыдущий образ
$previousImage = "quiz-backend:previous"
$hasPrevious = docker images -q $previousImage
if ($hasPrevious) {
    Write-Host "Rolling back to $previousImage" -ForegroundColor Yellow
    docker tag $previousImage quiz-backend:latest
} else {
    # Если нет previous, ищем последний образ, кроме latest
    Write-Host "No 'previous' image found, looking for last built image..." -ForegroundColor Yellow
    $lastImage = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -match "quiz-backend:" -and $_ -ne "quiz-backend:latest" } | Select-Object -First 1
    if ($lastImage) {
        Write-Host "Using $lastImage as fallback" -ForegroundColor Yellow
        docker tag $lastImage quiz-backend:latest
    } else {
        Write-Host "No previous image found. Cannot rollback." -ForegroundColor Red
        exit 1
    }
}

# 3. Запускаем стек с откатной версией
Write-Host "Starting stack with rollback image..." -ForegroundColor Yellow
docker compose up -d

# 4. Ожидание и проверка здоровья
Start-Sleep -Seconds 10
$healthCheck = curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/health
if ($healthCheck -ne 200) {
    Write-Host "Rollback health check failed. Manual intervention required." -ForegroundColor Red
    exit 1
}
Write-Host "Rollback successful, service is healthy." -ForegroundColor Green