<?php
/**
 * Created by PhpStorm.
 * User: tian
 * Date: 16/8/2
 * Time: 上午9:27
 */

function getUploadInfo($params)
{
    $url     = 'http://172.16.208.9:8080/interface/getVideoUploadInfo.php?'.$params;

    $handler = curl_init();

    curl_setopt($handler, CURLOPT_URL, $url);
    curl_setopt($handler, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);
    curl_setopt($handler, CURLOPT_RETURNTRANSFER, TRUE);

    $response = curl_exec($handler);
    curl_close($handler);

    $response = json_decode($response, TRUE);

    $response['data']['file_id'] = '0010';

    header('Access-Control-Allow-Origin:*');

    return json_encode(
        array(
            'code'    => $response['code'],
            'message' => $response['message'],
            'data'    => $response['data']
        )
    );
}

echo getUploadInfo($_SERVER["QUERY_STRING"]);
