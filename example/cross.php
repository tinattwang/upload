<?php
/**
 * Created by PhpStorm.
 * User: tian
 * Date: 16/8/2
 * Time: 下午3:02
 */


/**
 * 跨域中转
 */
function cross()
{
    $stateUrl = isset($_GET['stateURL']) ? $_GET['stateURL'] : '';

    try {
        $content = @file_get_contents($stateUrl);
        echo $content;
    } catch (Exception $e) {

    }
    exit();
}

cross();