/*
 Uploader.js for upload file which cooperate with nginx.

 The MIT License (MIT)

 Copyright (c) 2016 Wang Tiantian

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */


//标志当前会话
if(!sessionStorage.getItem('sessionId')) {
    sessionStorage.setItem('sessionId', md5(Date.parse(new Date()).toString()));
}


function createXmlHttpRequest() {
    try
    {
        return new window.XMLHttpRequest();
    }
    catch (e)
    {
        try
        {
            return new window.ActiveXObject("Microsoft.XMLHTTP");
        }
        catch (e)
        {
            throw new Error("您的浏览器不支持AJAX！");
        }
    }
}


function Uploader() {
    this.sessionId      = sessionStorage.getItem('sessionId');
    this.options        = {
        file            : null,                 //上传文件
        data            : {},                   //表单数据
        wrapper         : null,                 //容器标识
        onloadstart     : false,
        onload          : false,
        onloadend       : false,
        onprogress      : false,
        oncomplete      : false,
        onabort         : false,
        onerror         : false
    };
    this.fileName       = '';                       //视频文件名
    this.fileUploadId   = null;                     //会话标识
    this.uploadId       = 0;                        //上传标识
    this.uploadURL      = null;                     //上传地址
    this.stateURL       = null;                     //上传分片状态地址
    this.XHR            = createXmlHttpRequest();   //XMLHttpRequest
    this.fileId         = null;                     //会话标识
    this.pausing        = false;                    //暂停
    this.position       = 0;                        //已发送位置
    this.packet         = 5 * 1024 * 1024;          //包字节数
    this.buffer         = null;

    this.createFileUrl  = 'http://127.0.0.1:8093/create.php';     //生成一条文件记录, 返回file_id
    this.deleteFileUrl  = 'http://127.0.0.1:8093/delete.php';     //删除file_id对应的文件记录

    this.file       = function() {
        this.options.file = arguments[0];
        return this;
    };

    this.data       = function() {
        this.options.data = arguments[0];
        return this;
    };

    this.wrapper    = function() {
        this.options.wrapper = arguments[0];
        return this;
    };

    this.onloadstart= function() {
        this.options.onloadstart = arguments[0];
        return this;
    };

    this.onload     = function() {
        this.options.onload = arguments[0];
        return this;
    };

    this.onloadend  = function() {
        this.options.onloadend = arguments[0];
        return this;
    };

    this.onprogress = function() {
        this.options.onprogress = arguments[0];
        return this;
    };

    this.oncomplete = function() {
        this.options.oncomplete = arguments[0];
        return this;
    };

    this.onabort    = function() {
        this.options.onabort = arguments[0];
        return this;
    };

    this.onerror    = function() {
        this.options.onerror = arguments[0];
        return this;
    };
};


Uploader.prototype.execute = function() {
    var pairs       = this.options.file.name.split('.');
    pairs.length > 1 && pairs.pop();

    this.fileName   = pairs.join('.');
    this.fileId     = md5(this.options.file.name);
    this.packet     = (this.options.file.size / 99) > this.packet ? Math.ceil(this.options.file.size / 99) : this.packet;

    if($('#'+ this.fileId).length) {
        this.ifAllCompleted();
        return;
    }

    var process = localStorage.getItem(this.fileId);
    try {
        process        = $.parseJSON(process);

        this.uploadId  = process.uploadId;
        this.uploadURL = process.uploadURL;
        this.stateURL  = process.stateURL;

        console.log('process');
    } catch(e) {
        console.log('process is null');
    }

    if(this.uploadId && this.uploadURL && this.stateURL) {
        console.log('Continue the process: uploadId:'+ this.uploadId);
        this.render();
        this.resume();
    } else {
        console.log('Start a new process.');
        this.create();
    }

    return this;
};


Uploader.prototype.create = function() {
    var instance     = this;
    instance.render();

    var createURL    = instance.createFileUrl;

    //初始位置 0
    instance.position    = 0;

    var values      = instance.options.data;
    values.fileName = instance.fileName;
    values.fileSize = instance.options.file.size/1024/1024;

    $.ajax({
        async    : false,
        url      : createURL,
        data     : values,
        type     : 'GET',
        dataType : 'json',
        success  : function(response) {
            console.log('Start a new create.code:'+response.message);
            if(response.code != '0') {
                localStorage.removeItem(instance.fileId);
                throw new Error(response.message);
            }

            console.log('uploadData : ', response.data);

            instance.uploadId     = response.data.uploadId;
            instance.uploadURL    = response.data.uploadUrl;
            instance.stateURL     = response.data.stateUrl;
            instance.fileUploadId = response.data.file_id;

            //保存会话
            localStorage.setItem(instance.fileId, '{"uploadId":'+ instance.uploadId + ',"uploadURL":"' + instance.uploadURL + '","stateURL":"' + instance.stateURL +'"}');

            console.log('Create file: '+ response.message +', uploadId:'+ instance.uploadId );

            instance.send();
        },
        error   : function(xhr, status, message) {
            console.log('status: '+ status +'; message:'+ message);
        }
    });

    //保存会话
    localStorage.setItem(instance.fileId, '{"uploadId":'+ instance.uploadId + ',"uploadURL":"' + instance.uploadURL + '","stateURL":"' + instance.stateURL +'"}');

    console.log('Create file: '+ response.message +', file_id:'+ instance.fileUploadId );
    instance.send();
};


/**
 * 续传
 */
Uploader.prototype.resume = function() {
    var instance = this;
    var crossURL = '/cross.php';

    var xhr = createXmlHttpRequest();
    var url = crossURL +'?stateURL='+ instance.stateURL + instance.uploadId +'.state&_=' + new Date().getTime();

    xhr.open('GET', url, true);
    xhr.send(null);

    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4 && xhr.status == 200) {
            instance.pausing = false;

            var lines = xhr.responseText;
            if(lines.length == 0) {
                instance.position = 0;
                console.log('0/'+ instance.options.file.size);
                instance.send();
                return;
            }

            var ranges = lines.split("\r\n");
            if(ranges.length == 0) {
                instance.position = 0;
                console.log('0/'+ instance.options.file.size);
                instance.send();
                return;
            }

            var range     = ranges[ranges.length - 1].split("/");
            var positions = range[0].split("-");

            instance.position = parseInt(positions[1]) + 1;
            console.log('0-'+ instance.position +'/'+ instance.options.file.size);

            instance.send();
            return;
        }
    };
    console.log('Resume');
};


/**
 * 渲染元素
 */
Uploader.prototype.render = function() {
    var instance = this;
    if($('#'+ instance.fileId).length != 0) {
        return;
    }

    var fileContainer      = $('<div class="col-sm-12" id="file-' + instance.fileId + '"></div>');
    var fileNode           = $('<div class="col-lg-offset-3 col-lg-4" id="node-' + instance.fileId + '"></div>');
    var fileInfo           = $('<span id="info-' + instance.fileId + '">' + instance.file.name + '</span>');
    var buttonNode         = $('<div class="col-lg-2" id="info-button-' + instance.fileId + '"></div>');
    var buttonStyle        = $('<div class="btn-group btn-group-justified" id="style-button-' + instance.fileId + '"></div>');
    var pauseButton        = $('<span class="btn btn-success btn-xs" id="pause-' + instance.fileId + '">暂停</span>');
    var deleteButton       = $('<span class="btn btn-info btn-xs" id="delete-' + instance.fileId + '">删除</span>');
    var editButton         = $('<span class="btn btn-danger btn-xs" id="edit-' + instance.fileId + '">修改</span>');

    var progressContainer  = $('<div class="col-sm-12" id="progress-'+ instance.fileId + '"></div>');
    var progressNode       = $('<div class="col-lg-offset-3 col-lg-6"></div>');
    var progressStyle      = $('<div class="progress progress-striped active progress-xm" id="progress_style-' + instance.fileId + '"></div>');
    var progressBackground = $('<div name="Progress" class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>');
    var progressNumber     = $('<span name="Number">0.00%</span>');

    fileNode.appendTo(fileContainer);
    buttonNode.appendTo(fileContainer);
    fileInfo.appendTo(fileNode);
    buttonStyle.appendTo(buttonNode);
    pauseButton.appendTo(buttonStyle);
    deleteButton.appendTo(buttonStyle);
    editButton.appendTo(buttonStyle);

    progressNode.appendTo(progressContainer);
    progressStyle.appendTo(progressNode);
    progressBackground.appendTo(progressStyle);
    progressNumber.appendTo(progressBackground);

    fileContainer.appendTo($('#'+ this.options.wrapper));
    progressContainer.appendTo($('#'+ this.options.wrapper));

    pauseButton.bind('click', function() {
        if(instance.pausing) {
            pausing = false;
            $(this).html(' 暂停 ');
            instance.resume();
        } else {
            instance.pausing = true;
            $(this).html(' 继续 ');
            instance.pause();
        }
    });

    deleteButton.bind('click', function() {
        alert('确定删除吗？');
        instance.cancel();
    }
    );
};


Uploader.prototype.progress = function(byteLength) {
    var progress = (this.position + byteLength) / this.options.file.size * 100;
    progress = progress > 100 ? 100 : progress;

    $('#progress_style-'+ this.fileId +' [name="Progress"]').attr('aria-valuenow', progress.toFixed(2)).css('width', progress.toFixed(2) +'%');
    $('#progress_style-'+ this.fileId +' [name="Number"]').html(progress.toFixed(2) +'%');
};


/**
 * 发送
 */
Uploader.prototype.send = function() {
    var instance = this;
    if(this.pausing) {
        return;
    }

    if(instance.position > instance.options.file.size) {
        instance.complete();
        return;
    }

    function send(offset) {
        instance.XHR.open('POST', instance.uploadURL, true);

        instance.XHR.setRequestHeader("X-Session-ID",        instance.uploadId);
        instance.XHR.setRequestHeader("Content-Type",        "application/octet-stream");
        instance.XHR.setRequestHeader("Content-Disposition", "attachment; name=\"file\"; filename=\""+ escape(instance.options.file.name) +"\"");
        instance.XHR.setRequestHeader("X-Content-Range",     "bytes "+ instance.position +"-"+ (offset - 1) +"/"+ instance.options.file.size);

        instance.XHR.onreadystatechange = function() {
            if(instance.XHR.readyState == 4) {
                var status = instance.XHR.status;
                if(status == 200) {
                    instance.progress(offset);
                    instance.complete();
                    return;
                } else if(status == 201) {
                    instance.position = offset;
                    instance.send();
                    return;
                } else if (instance.pausing == true){
                    return;
                }else {
                    alert('服务器异常 status code: ' + status);
                    return;
                }
            }
        };

        instance.XHR.send(instance.buffer);
        console.log('send:'+offset);


        instance.XHR.upload.onloadstart = function(event) {
            if(instance.options.onloadstart) {
                eval('instance.options.onloadstart');
            }
            console.log('send.loadstart');
        };
        instance.XHR.upload.onload = function(event) {
            instance.progress(event.loaded);

            if(instance.options.onload) {
                eval('instance.options.onload');
            }
            console.log('send.load');
        };
        instance.XHR.upload.onloadend = function(event) {
            if(instance.options.onloadend) {
                eval('instance.options.onloadend');
            }
            console.log('send.loadend');
        };
        instance.XHR.upload.onabort = function() {
            if(instance.options.onabort) {
                eval('instance.options.onabort');
            }
            console.log('send.abort');
        };
        instance.XHR.upload.onprogress = function(event) {
            instance.progress(event.loaded);

            if(instance.options.onprogress) {
                eval('instance.options.onprogress');
            }
            console.log('send.progress');
        };
        instance.XHR.upload.onerror = function(event) {
            if(instance.options.onerror) {
                eval('instance.options.onerror');
            }
            console.log('send.error');
        };
        instance.XHR.upload.ontimeout = function(event) {
            if(instance.options.ontimeout) {
                eval('instance.options.ontimeout');
            }
            console.log('send.timeout');
        };
    }

    function read(offset) {
        var blob = null;

        if(instance.options.file.slice){
            blob = instance.options.file.slice(instance.position, offset);
        }
        if(instance.options.file.webkitSlice) {
            blob = instance.options.file.webkitSlice(instance.position, offset);
        }
        if(instance.options.file.mozSlice) {
            blob = instance.options.file.mozSlice(instance.position, offset);
        }

        if(blob == null) {
            throw new Error('Slice Blob error.');
        }

        instance.buffer = blob;
        send(offset);
        return;
    };

    var offset = (instance.position + instance.packet) > instance.options.file.size ? instance.options.file.size : (instance.position + instance.packet);

    //开始读数据
    read(offset);

    //记录上传
    var items = localStorage.getItem(instance.sessionId);
    items = $.parseJSON(items) || {};
    items[instance.uploadId] = 0;

    localStorage.setItem(instance.sessionId, $.toJSON(items));
};


Uploader.prototype.complete = function() {
    var instance = this;
    new PNotify({
        title: '上传成功！',
        text: instance.options.file.name,
        type: 'success'
    });

    $('#pause-'+ instance.fileId).unbind();

    var items = localStorage.getItem(instance.sessionId);
    items = $.parseJSON(items) || {};
    items[instance.uploadId] = 1;
    localStorage.setItem(instance.sessionId, $.toJSON(items));

    instance.ifAllCompleted();

    localStorage.removeItem(this.fileId);

    if(this.options.oncomplete) {
        eval('this.options.oncomplete');
    }

    console.log('Uploader.complete');
};


Uploader.prototype.pause = function() {
    this.pausing = true;
    this.XHR.abort();
    console.log('Uploader.pause');
};


Uploader.prototype.cancel = function() {
    var instance = this;

    this.XHR.abort();
    var file = instance.fileId;
    var values = {};
    values.file_id = instance.fileUploadId;
    $.ajax({
        async    : false,
        url      : instance.deleteFileUrl,
        data     : values,
        type     : 'post',
        dataType : 'json',

        success  : function(response) {
            console.log('code:'+response.code);
            if(response.code == 0){
                $('#file-' + file ).remove();
                $('#progress-' + file ).remove();
                $('#file').val("");
                console.log(response.message);
            }

            var items = localStorage.getItem(instance.sessionId);
            items = $.parseJSON(items) || {};
            delete items[instance.uploadId];
            localStorage.setItem(instance.sessionId, $.toJSON(items));

            instance.ifAllCompleted();
        },
        error:
            console.log('DELETE ERROR!')
    });

    localStorage.removeItem(this.fileId);
    $('#'+ this.fileId).remove();

};


Uploader.prototype.ifAllCompleted = function() {
    var uploadIds          = [];
    var items              = localStorage.getItem(this.sessionId);

    items = $.parseJSON(items);

    for(var uploadId in items) {
        if(!items[uploadId]) {
            return;
        }
        uploadIds.push(uploadId);
    }
    if(uploadIds.length == 0) {
        return;
    }
};

