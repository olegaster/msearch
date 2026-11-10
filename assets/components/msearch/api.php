<?php
/**
 * mSearch Public API Endpoint (no auth required)
 * Routes via Router in 'web' context
 */

use MODX\Revolution\modX;
use MSearch\Router\Router;

require_once dirname(__FILE__, 4) . '/config.core.php';
require_once MODX_CORE_PATH . 'vendor/autoload.php';

$modx = new modX();
$modx->initialize('web');
$modx->getService('error', 'error.modError');

// CORS headers — restrict to configured origins
$allowedOrigin = $modx->getOption('mse_cors_origin', null, '');
if (!empty($allowedOrigin)) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
} elseif (!empty($_SERVER['HTTP_ORIGIN'])) {
    // Same-origin: allow only requests from the same site
    $siteUrl = rtrim($modx->getOption('site_url', null, ''), '/');
    $origin = rtrim($_SERVER['HTTP_ORIGIN'], '/');
    if ($origin === rtrim(parse_url($siteUrl, PHP_URL_SCHEME) . '://' . parse_url($siteUrl, PHP_URL_HOST), '/')) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Route via Router in 'web' context
$router = new Router($modx);
$router->setContext('web');

$route = $_REQUEST['route'] ?? $_SERVER['PATH_INFO'] ?? '';

if (empty($route)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Route is required']);
    exit;
}

$router->handle($route);
