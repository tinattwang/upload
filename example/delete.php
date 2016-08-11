<?php
/**
 * Created by PhpStorm.
 * User: tian
 * Date: 16/8/2
 * Time: 下午5:59
 */

function delete()
{
    header('Access-Control-Allow-Origin:*');
    return json_encode(
        array(
            'code'    => 0,
            'message' => 'DELETE '. $_POST['file_id'],
        )
    );
}

echo delete();