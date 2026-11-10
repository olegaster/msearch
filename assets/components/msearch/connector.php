<?php
/**
 * mSearch Connector
 */

use MODX\Revolution\modX;

require_once dirname(__FILE__, 4) . '/config.core.php';
require_once MODX_CORE_PATH . 'config/' . MODX_CONFIG_KEY . '.inc.php';
require_once MODX_CONNECTORS_PATH . 'index.php';

$modx->lexicon->load('msearch:default');

$path = $modx->getOption(
    'msearch_core_path',
    null,
    $modx->getOption('core_path') . 'components/msearch/'
);

// Handle API requests via Router
$route = $_REQUEST['route'] ?? null;
if ($route) {
    $router = new \MSearch\Router\Router($modx);
    $router->setContext('manager');
    $router->handle($route);
    exit;
}

// Standard processor requests
$action = $_REQUEST['action'] ?? '';
$processorPath = $path . 'src/Processors/';

$modx->request->handleRequest([
    'processors_path' => $processorPath,
    'location' => '',
]);
